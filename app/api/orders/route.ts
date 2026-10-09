import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, requirePermissionApi, requireSessionUser } from "@/lib/api-auth";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { checkDatabaseConnection, databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import { listAdminOrderRows, listOrders } from "@/lib/orders";
import { orderCreateSchema, orderStatusSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

function calcCouponDiscount(
  coupon: { type: string; value: number; minOrder: number | null; maxUses: number | null; usedCount: number; isActive: boolean; expiresAt: Date | null },
  subtotal: number,
): number {
  if (!coupon.isActive) return 0;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return 0;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return 0;
  if (coupon.minOrder != null && subtotal < coupon.minOrder) return 0;
  if (coupon.type === "fixed") return Math.min(coupon.value, subtotal);
  return Math.min(Math.round((subtotal * coupon.value) / 100), subtotal);
}

function isUniqueConflict(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

const checkoutOrderInclude = { store: true, items: true, payments: true } as const;

async function replayCheckoutOrder(userId: string, idempotencyKey: string) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: checkoutOrderInclude,
  });
  if (!existing || existing.userId !== userId) return null;
  return {
    ...existing,
    transactionId: existing.payments[0]?.transactionId ?? null,
    checkoutUrl: null as string | null,
  };
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const isAdminRequest = searchParams.get("admin") === "true";

  if (isAdminRequest) {
    const { error } = await requirePermissionApi("orders.view");
    if (error) return error;
  } else if (!sessionUser) {
    return NextResponse.json({ error: "Buyurtmalarni ko‘rish uchun tizimga kiring." }, { status: 401 });
  }

  const source = await resolveDataSource();

  if (source === "database") {
    const where = isAdminRequest ? {} : { userId: sessionUser?.id };
    const statusWhere = status && status !== "all" && status !== "active" ? { status: status as never } : {};
    const rows = await prisma.order.findMany({
      where: { ...where, ...statusWhere },
      include: { store: true, items: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    const orders = status === "active" ? rows.filter((order: { status: string }) => !["delivered", "cancelled", "returned"].includes(order.status)) : rows;
    return NextResponse.json({ orders });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  if (isAdminRequest) {
    const rows = await listAdminOrderRows();
    let orders = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      total: row.total,
      status: row.status,
      paymentMethod: row.payment,
      deliveryType: row.delivery === "Punkt" ? "pickup" : "courier",
      createdAt: new Date().toISOString(),
      user: { name: row.buyer, phone: row.phone },
      store: { name: row.store },
      items: row.product === "—" ? [] : [{ name: row.product, quantity: 1 }],
    }));
    if (status && status !== "all") {
      if (status === "active") {
        orders = orders.filter((order) => !["delivered", "cancelled", "returned"].includes(order.status));
      } else {
        orders = orders.filter((order) => order.status === status);
      }
    }
    return NextResponse.json({ orders });
  }

  let orders = await listOrders(sessionUser?.id);
  if (status && status !== "all") {
    if (status === "active") {
      orders = orders.filter((order) => !["delivered", "cancelled", "returned"].includes(order.status));
    } else {
      orders = orders.filter((order) => order.status === status);
    }
  }

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;

  if (await checkDatabaseConnection()) {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;
    try {
      if (idempotencyKey) {
        const replay = await replayCheckoutOrder(user.id, idempotencyKey);
        if (replay) {
          return NextResponse.json(
            { success: true, orderId: replay.id, orders: [replay], reused: true },
            { status: 200 },
          );
        }
      }

      const data = orderCreateSchema.parse(await request.json().catch(() => ({})));
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: user.id },
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          },
          variant: true,
        },
      });

      if (cartItems.length === 0) return NextResponse.json({ error: "Savat bo‘sh" }, { status: 400 });

      const { createCheckoutOrders, notifyCheckoutCreated } = await import(
        "@/lib/commerce/create-checkout-orders"
      );

      let addressId = data.addressId ?? null;
      if (!addressId && data.address && data.deliveryType === "courier") {
        const createdAddress = await prisma.address.create({
          data: {
            userId: user.id,
            name: data.address.name,
            phone: data.address.phone,
            city: data.address.city,
            district: data.address.district ?? null,
            street: data.address.street,
            building: data.address.building ?? null,
            apartment: data.address.apartment ?? null,
            isDefault: true,
          },
        });
        addressId = createdAddress.id;
      }

      const couponCode = data.couponCode?.trim().toUpperCase() || null;
      const coupon = couponCode
        ? await prisma.coupon.findUnique({ where: { code: couponCode } })
        : null;
      if (couponCode && !coupon) {
        return NextResponse.json({ error: "Kupon kodi topilmadi" }, { status: 400 });
      }

      const grandSubtotal = cartItems.reduce((sum, item) => {
        const variantPrice = item.variant?.price;
        const price = variantPrice ?? item.product.price;
        return sum + price * item.quantity;
      }, 0);
      const deliveryCost = data.deliveryType === "pickup" ? 0 : grandSubtotal >= 500_000 ? 0 : 30_000;
      const totalDiscount = coupon ? calcCouponDiscount(coupon, grandSubtotal) : 0;
      if (couponCode && totalDiscount <= 0) {
        return NextResponse.json({ error: "Kupon ushbu buyurtmaga qo‘llanilmaydi" }, { status: 400 });
      }

      const created = await createCheckoutOrders({
        userId: user.id,
        cartItems: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        deliveryType: data.deliveryType,
        paymentMethod: data.paymentMethod,
        addressId,
        pickupPointId: data.pickupPointId ?? null,
        couponCode,
        note: data.note ?? null,
        totalDiscount,
        deliveryCost,
        idempotencyKey,
        couponId: coupon?.id ?? null,
      });

      if (!created.reused) {
        await notifyCheckoutCreated(user.id, created.orders);
      }

      return NextResponse.json(
        { success: true, orderId: created.orders[0]?.id, orders: created.orders, reused: created.reused },
        { status: created.reused ? 200 : 201 },
      );
    } catch (err) {
      if (idempotencyKey && isUniqueConflict(err)) {
        const replay = await replayCheckoutOrder(user.id, idempotencyKey);
        if (replay) {
          return NextResponse.json(
            { success: true, orderId: replay.id, orders: [replay], reused: true },
            { status: 200 },
          );
        }
      }
      const { ApiError } = await import("@/lib/api-error");
      const { ProviderNotConfiguredError, ProviderMockForbiddenError } = await import(
        "@/lib/providers/errors"
      );
      if (err instanceof ApiError) {
        return NextResponse.json(err.toJSON(), { status: err.status });
      }
      if (err instanceof ProviderNotConfiguredError || err instanceof ProviderMockForbiddenError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      return NextResponse.json(validationError(err), { status: 400 });
    }
  }

  return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
}

export async function PATCH(request: NextRequest) {
  const { error, user: actor } = await requirePermissionApi("orders.status");
  if (error || !actor) return error;

  const body = (await request.json()) as { orderId?: string; status?: string };
  const statusResult = orderStatusSchema.safeParse({ status: body.status });
  if (!body.orderId || !statusResult.success) {
    return NextResponse.json({ error: "orderId va to‘g‘ri status majburiy" }, { status: 400 });
  }

  if (await checkDatabaseConnection()) {
    const existing = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    if (existing.status === statusResult.data.status) {
      return NextResponse.json({ success: true, order: existing });
    }

    const { assertOrderTransition } = await import("@/lib/order-state");
    try {
      assertOrderTransition(existing.status, statusResult.data.status);
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_TRANSITION_DENIED",
          message: `${existing.status} → ${statusResult.data.status} ruxsat etilmagan`,
        },
        { status: 409 },
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: body.orderId },
        data: { status: statusResult.data.status },
        include: { items: true, store: true },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: body.orderId!,
          fromStatus: existing.status,
          toStatus: statusResult.data.status,
          actorId: actor.id,
        },
      });
      if (statusResult.data.status === "cancelled" && existing.status !== "cancelled") {
        const { restockOnCancel } = await import("@/lib/commerce/stock");
        for (const item of existing.items) {
          await restockOnCancel(
            tx,
            item.productId,
            item.quantity,
            `cancel:${existing.id}`,
            item.variantId,
          );
        }
      }
      return updated;
    });

    if (statusResult.data.status === "delivered") {
      const { creditOrderCashback } = await import("@/lib/bonus");
      await creditOrderCashback(body.orderId);
    }

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "order_status_update",
      entityType: "order",
      entityId: body.orderId,
      metadata: {
        orderId: body.orderId,
        previousStatus: existing.status,
        newStatus: statusResult.data.status,
        customerUserId: existing.userId,
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, order });
  }

  return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
}
