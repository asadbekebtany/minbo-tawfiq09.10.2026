import { NextResponse } from "next/server";
import type { OrderStatus, Prisma, ShipmentStatus } from "@prisma/client";
import { z } from "zod";
import { requirePvzApi } from "@/lib/api-auth";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { notifyUser } from "@/lib/commerce/notify";
import { checkDatabaseConnection } from "@/lib/db";
import { canTransitionOrder } from "@/lib/order-state";
import { canSearchPvzCustomerPhone } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  PVZ_TO_ORDER_STATUS,
  PVZ_TO_SHIPMENT_STATUS,
  assertPvzParcelTransition,
  isOpenPvzReturnStatus,
  isPvzParcelStatus,
  type PvzParcelStatus,
} from "@/lib/pvz-state";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  parcelId: z.string().min(1),
  status: z.enum(["incoming", "received", "ready", "delivered", "return_accepted"]),
});

const ORDER_INCLUDE = {
  user: { select: { id: true, name: true, phone: true } },
  store: {
    select: {
      name: true,
      seller: { select: { userId: true, user: { select: { name: true } } } },
    },
  },
  items: {
    select: { name: true, quantity: true, price: true, skuSnapshot: true, image: true },
  },
  shipments: { orderBy: { createdAt: "asc" as const } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  returnRequests: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OrderInclude;

type HydratedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

async function scopedPoints(user: { id: string; role: string }) {
  return prisma.pickupPoint.findMany({
    where: user.role === "pvz_operator" ? { operatorId: user.id } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, district: true, city: true },
  });
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function serializeParcel(
  parcel: { id: string; orderId: string; status: string; pickupPointId: string; createdAt: Date; updatedAt: Date },
  order: HydratedOrder | undefined,
  point: { id: string; name: string; address: string },
  showPhone: boolean,
  detail: boolean,
) {
  const tracking =
    order?.trackingNumber ??
    order?.shipments.find((s) => s.trackingNumber)?.trackingNumber ??
    null;
  const items = (order?.items ?? []).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    sku: item.skuSnapshot,
    image: item.image,
  }));
  const hasOpenReturn = (order?.returnRequests ?? []).some((r) => isOpenPvzReturnStatus(r.status));

  const base = {
    id: parcel.id,
    orderId: parcel.orderId,
    status: parcel.status,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
    pickupPointId: point.id,
    pickupPointName: point.name,
    pickupPointAddress: point.address,
    publicNumber: order?.publicNumber ?? null,
    trackingNumber: tracking,
    buyerName: order?.user.name ?? null,
    buyerPhone: showPhone ? (order?.user.phone ?? null) : null,
    sellerName: order?.store.seller.user.name ?? null,
    storeName: order?.store.name ?? null,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    itemSummary: items[0]?.name ?? null,
    orderStatus: order?.status ?? null,
    hasOpenReturn,
  };

  if (!detail) return base;

  const timeline = [
    {
      at: parcel.createdAt.toISOString(),
      label: "PVZ ga yo‘naltirildi",
      source: "parcel" as const,
    },
    ...(order?.statusHistory ?? []).map((event) => ({
      at: event.createdAt.toISOString(),
      label: `${event.fromStatus ?? "—"} → ${event.toStatus}`,
      source: "order" as const,
    })),
    ...(parcel.updatedAt.getTime() !== parcel.createdAt.getTime()
      ? [
          {
            at: parcel.updatedAt.toISOString(),
            label: `PVZ: ${parcel.status}`,
            source: "parcel" as const,
          },
        ]
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return {
    ...base,
    items,
    shipments: (order?.shipments ?? []).map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      status: s.status,
      shippedAt: s.shippedAt?.toISOString() ?? null,
      arrivedAt: s.arrivedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
    })),
    timeline,
    returns: (order?.returnRequests ?? []).map((r) => ({
      id: r.id,
      publicNumber: r.publicNumber,
      status: r.status,
      reason: r.reason,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

async function hydrateOrders(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, HydratedOrder>();
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: ORDER_INCLUDE,
  });
  return new Map(orders.map((order) => [order.id, order]));
}

function notifyCopy(status: PvzParcelStatus, publicNumber: string | null) {
  const num = publicNumber ? ` (${publicNumber})` : "";
  switch (status) {
    case "received":
      return {
        type: "order" as const,
        title: "Posilka PVZ ga yetib keldi",
        message: `Buyurtmangiz${num} qabul qilindi. Tez orada olishga tayyor bo‘ladi.`,
      };
    case "ready":
      return {
        type: "order" as const,
        title: "Buyurtma olishga tayyor",
        message: `Buyurtmangiz${num} PVZ da kutmoqda. Pasport/telefon bilan keling.`,
      };
    case "delivered":
      return {
        type: "order" as const,
        title: "Buyurtma topshirildi",
        message: `Buyurtmangiz${num} muvaffaqiyatli topshirildi.`,
      };
    case "return_accepted":
      return {
        type: "return" as const,
        title: "Qaytarish PVZ da qabul qilindi",
        message: `Buyurtma${num} qaytarishi qabul qilindi.`,
      };
    default:
      return {
        type: "order" as const,
        title: "PVZ holati yangilandi",
        message: `Buyurtma${num} holati yangilandi.`,
      };
  }
}

export async function GET(request: Request) {
  const { error, user } = await requirePvzApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const url = new URL(request.url);
  const detailId = url.searchParams.get("id")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const statusFilter = url.searchParams.get("status")?.trim() || "";
  const pointId = url.searchParams.get("pointId")?.trim() || "";
  const days = url.searchParams.get("days")?.trim() || "";
  const showPhone = canSearchPvzCustomerPhone(user.role);

  const points = await scopedPoints(user);
  const scopedIds = points.map((p) => p.id);
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const canSearchPhone = showPhone;
  const assigned = scopedIds.length > 0;

  if (detailId) {
    if (!assigned) {
      return NextResponse.json({ error: "Posilka topilmadi" }, { status: 404 });
    }
    const parcel = await prisma.pvzParcel.findFirst({
      where: { id: detailId, pickupPointId: { in: scopedIds } },
    });
    if (!parcel) {
      return NextResponse.json({ error: "Posilka topilmadi" }, { status: 404 });
    }
    const orders = await hydrateOrders([parcel.orderId]);
    const point = pointMap.get(parcel.pickupPointId);
    if (!point) {
      return NextResponse.json({ error: "Posilka topilmadi" }, { status: 404 });
    }
    return NextResponse.json({
      parcel: serializeParcel(parcel, orders.get(parcel.orderId), point, showPhone, true),
      canSearchPhone,
      role: user.role,
    });
  }

  if (!assigned) {
    return NextResponse.json({
      points: [],
      parcels: [],
      assigned: false,
      canSearchPhone,
      role: user.role,
    });
  }

  if (pointId && !scopedIds.includes(pointId)) {
    return NextResponse.json({
      points,
      parcels: [],
      assigned: true,
      canSearchPhone,
      role: user.role,
    });
  }

  const where: Prisma.PvzParcelWhereInput = {
    pickupPointId: { in: pointId ? [pointId] : scopedIds },
  };

  if (statusFilter) {
    if (!isPvzParcelStatus(statusFilter)) {
      return NextResponse.json({ error: "Noto‘g‘ri filter" }, { status: 400 });
    }
    where.status = statusFilter;
  }

  if (days === "7" || days === "30") {
    const from = new Date();
    from.setDate(from.getDate() - Number(days));
    where.updatedAt = { gte: from };
  }

  if (q) {
    const phoneDigits = digitsOnly(q);
    const orderOr: Prisma.OrderWhereInput[] = [
      { publicNumber: { contains: q, mode: "insensitive" } },
      { trackingNumber: { contains: q, mode: "insensitive" } },
      { id: q },
      { shipments: { some: { trackingNumber: { contains: q, mode: "insensitive" } } } },
    ];
    if (showPhone && phoneDigits.length >= 9) {
      orderOr.push({ user: { phone: { contains: phoneDigits } } });
      orderOr.push({ user: { phone: { contains: q } } });
    }
    const matched = await prisma.order.findMany({
      where: { OR: orderOr },
      select: { id: true },
      take: 100,
    });
    const matchedIds = matched.map((o) => o.id);
    where.AND = [
      {
        OR: [
          { id: q },
          { orderId: q },
          ...(matchedIds.length > 0 ? [{ orderId: { in: matchedIds } }] : []),
        ],
      },
    ];
  }

  const parcels = await prisma.pvzParcel.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  const orders = await hydrateOrders(parcels.map((p) => p.orderId));

  return NextResponse.json({
    points,
    assigned: true,
    canSearchPhone,
    role: user.role,
    parcels: parcels
      .map((parcel) => {
        const point = pointMap.get(parcel.pickupPointId);
        if (!point) return null;
        return serializeParcel(parcel, orders.get(parcel.orderId), point, showPhone, false);
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requirePvzApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "parcelId va status majburiy" }, { status: 400 });
  }

  const nextStatus = parsed.data.status as PvzParcelStatus;
  const points = await scopedPoints(user);
  const scopedIds = points.map((p) => p.id);
  if (scopedIds.length === 0) {
    return NextResponse.json({ error: "Posilka topilmadi" }, { status: 404 });
  }

  const parcel = await prisma.pvzParcel.findFirst({
    where: { id: parsed.data.parcelId, pickupPointId: { in: scopedIds } },
  });
  if (!parcel) {
    return NextResponse.json({ error: "Posilka topilmadi" }, { status: 404 });
  }

  try {
    assertPvzParcelTransition(parcel.status, nextStatus);
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "PVZ_TRANSITION_DENIED",
        error: "Bu status o‘tishiga ruxsat yo‘q",
      },
      { status: 409 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: parcel.orderId },
    include: ORDER_INCLUDE,
  });

  if (nextStatus === "return_accepted") {
    const hasOpenReturn = (order?.returnRequests ?? []).some((r) => isOpenPvzReturnStatus(r.status));
    if (!hasOpenReturn) {
      return NextResponse.json(
        {
          success: false,
          code: "PVZ_RETURN_REQUIRED",
          error: "Ochiq qaytarish so‘rovi yo‘q",
        },
        { status: 409 },
      );
    }
  }

  const targetOrder = PVZ_TO_ORDER_STATUS[nextStatus] as OrderStatus;
  const targetShipment = PVZ_TO_SHIPMENT_STATUS[nextStatus] as ShipmentStatus;
  const auditCtx = getAuditContextFromRequest(request);

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.pvzParcel.findFirst({
        where: { id: parcel.id, pickupPointId: { in: scopedIds } },
      });
      if (!fresh) {
        throw new Error("PVZ_NOT_FOUND");
      }
      assertPvzParcelTransition(fresh.status, nextStatus);

      if (nextStatus === "return_accepted") {
        const openReturnGate = await tx.returnRequest.findFirst({
          where: {
            orderId: fresh.orderId,
            status: { in: ["pending", "requested", "approved", "awaiting_item"] },
          },
        });
        if (!openReturnGate) {
          throw new Error("PVZ_RETURN_REQUIRED");
        }
      }

      await tx.pvzParcel.update({
        where: { id: fresh.id },
        data: { status: nextStatus },
      });

      if (order && canTransitionOrder(order.status, targetOrder) && order.status !== targetOrder) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: targetOrder },
        });
        await tx.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: targetOrder,
            actorId: user.id,
            note: `pvz:${fresh.status}->${nextStatus}`,
          },
        });
      }

      if (order) {
        const shipmentData: Prisma.ShipmentUpdateManyMutationInput = {
          status: targetShipment,
        };
        if (targetShipment === "arrived") shipmentData.arrivedAt = new Date();
        if (targetShipment === "delivered") shipmentData.deliveredAt = new Date();
        await tx.shipment.updateMany({
          where: { orderId: order.id },
          data: shipmentData,
        });
      }

      if (nextStatus === "return_accepted" && order) {
        const openReturn = await tx.returnRequest.findFirst({
          where: {
            orderId: order.id,
            status: { in: ["pending", "requested", "approved", "awaiting_item"] },
          },
        });
        if (openReturn) {
          await tx.returnRequest.update({
            where: { id: openReturn.id },
            data: { status: "received" },
          });
        }
      }

      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: nextStatus === "return_accepted" ? "return_status_update" : "order_status_update",
          entityType: "PvzParcel",
          entityId: fresh.id,
          metadata: {
            orderId: fresh.orderId,
            pickupPointId: fresh.pickupPointId,
            publicNumber: order?.publicNumber ?? null,
          },
          oldValue: { parcelStatus: fresh.status, orderStatus: order?.status ?? null },
          newValue: { parcelStatus: nextStatus, orderStatus: targetOrder },
          ...auditCtx,
        },
        tx,
      );

      if (order) {
        const copy = notifyCopy(nextStatus, order.publicNumber);
        await notifyUser(tx, {
          userId: order.userId,
          type: copy.type,
          title: copy.title,
          message: copy.message,
          link: `/profile/orders/${order.id}`,
          eventKey: `pvz:${fresh.id}:${nextStatus}`,
        });
        if (nextStatus === "return_accepted" && order.store.seller.userId) {
          await notifyUser(tx, {
            userId: order.store.seller.userId,
            type: "return",
            title: "PVZ qaytarishni qabul qildi",
            message: `Buyurtma ${order.publicNumber ?? order.id} qaytarishi PVZ da qabul qilindi.`,
            link: `/seller/orders/${order.id}`,
            eventKey: `pvz:${fresh.id}:${nextStatus}:seller`,
          });
        }
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "PVZ_NOT_FOUND") {
      return NextResponse.json({ error: "Posilka topilmadi" }, { status: 404 });
    }
    if (message === "PVZ_RETURN_REQUIRED" || message.startsWith("PVZ_TRANSITION_DENIED")) {
      return NextResponse.json(
        {
          success: false,
          code: message === "PVZ_RETURN_REQUIRED" ? "PVZ_RETURN_REQUIRED" : "PVZ_TRANSITION_DENIED",
          error:
            message === "PVZ_RETURN_REQUIRED"
              ? "Ochiq qaytarish so‘rovi yo‘q"
              : "Bu status o‘tishiga ruxsat yo‘q",
        },
        { status: 409 },
      );
    }
    console.error("[pvz] status update failed", err);
    return NextResponse.json({ error: "Status yangilanmadi" }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
