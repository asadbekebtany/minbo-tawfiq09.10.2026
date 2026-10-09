import { NextResponse } from "next/server";
import { canAccessOrder, requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import { orderStatusSchema, validationError } from "@/lib/marketplace-schemas";
import { getOrderDetailById, updateOrderStatus } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { isSellerAllowedOrderStatus } from "@/lib/order-state";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;

  const order = await getOrderDetailById(id);
  if (!order) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }
  if (!canAccessOrder(user, order.userId, order.storeSellerUserId)) {
    return NextResponse.json({ error: "Bu buyurtmani ko‘rish huquqingiz yo‘q" }, { status: 403 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;

  const body = (await request.json()) as { status?: string };
  const parsed = orderStatusSchema.safeParse({ status: body.status });
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 });
  }

  const order = await getOrderDetailById(id);
  if (!order) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  if (!canAccessOrder(user, order.userId, order.storeSellerUserId)) {
    return NextResponse.json({ error: "Bu buyurtmani boshqarish huquqingiz yo‘q" }, { status: 403 });
  }

  if (user.role === "seller" && !isSellerAllowedOrderStatus(parsed.data.status)) {
    return NextResponse.json({ error: "Seller bu statusni o‘rnatolmaydi" }, { status: 403 });
  }

  if (await checkDatabaseConnection()) {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    if (existing.status === parsed.data.status) {
      const order = await getOrderDetailById(id);
      return NextResponse.json({ success: true, order });
    }
    const { assertOrderTransition } = await import("@/lib/order-state");
    try {
      assertOrderTransition(existing.status, parsed.data.status);
    } catch {
      return NextResponse.json(
        { error: `${existing.status} → ${parsed.data.status} ruxsat etilmagan` },
        { status: 409 },
      );
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id },
        data: { status: parsed.data.status },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          store: true,
          items: true,
        },
      });
      if (parsed.data.status === "cancelled" && existing.status !== "cancelled") {
        const { restockOnCancel } = await import("@/lib/commerce/stock");
        for (const item of row.items) {
          await restockOnCancel(
            tx,
            item.productId,
            item.quantity,
            `seller-cancel:${id}`,
            item.variantId,
          );
        }
      }
      await tx.orderStatusEvent.create({
        data: {
          orderId: id,
          fromStatus: existing.status,
          toStatus: parsed.data.status,
          actorId: user.id,
        },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "order_status_update",
          entityType: "order",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: { status: parsed.data.status },
        },
        tx,
      );
      return row;
    });
    if (parsed.data.status === "delivered") {
      const { creditOrderCashback } = await import("@/lib/bonus");
      await creditOrderCashback(id);
    }
    return NextResponse.json({ success: true, order: updated });
  }

  const updated = await updateOrderStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ success: true, order: updated });
}
