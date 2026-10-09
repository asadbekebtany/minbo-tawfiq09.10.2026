import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getRuntimeSettings } from "@/lib/system-settings";
import { nextReturnNumber } from "@/lib/public-ids";
import { notifyUser } from "@/lib/commerce/notify";
import { writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(3).max(200),
  comment: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1),
});

export async function GET() {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const returns = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { id: true, total: true, status: true, store: { select: { name: true } } } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    returns: returns.map((row) => ({
      id: row.id,
      publicNumber: row.publicNumber,
      reason: row.reason,
      comment: row.comment,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      orderId: row.order.id,
      orderTotal: row.order.total,
      storeName: row.order.store.name,
      items: row.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const settings = await getRuntimeSettings();
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, userId: user.id },
      include: { items: true, store: { include: { seller: true } } },
    });
    if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Faqat yetkazilgan buyurtmani qaytarish mumkin" },
        { status: 400 },
      );
    }

    const deadline = new Date(order.updatedAt);
    deadline.setDate(deadline.getDate() + settings.returnDays);
    if (Date.now() > deadline.getTime()) {
      return NextResponse.json(
        { error: `Qaytarish muddati (${settings.returnDays} kun) o‘tgan` },
        { status: 400 },
      );
    }

    const existing = await prisma.returnRequest.findFirst({
      where: {
        orderId: order.id,
        status: { notIn: ["rejected", "cancelled", "completed"] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu buyurtma uchun ariza allaqachon mavjud" }, { status: 409 });
    }

    const orderProductQty = new Map(order.items.map((item) => [item.productId, item.quantity]));
    for (const item of data.items) {
      const maxQty = orderProductQty.get(item.productId) ?? 0;
      if (maxQty < item.quantity) {
        return NextResponse.json({ error: "Qaytarish miqdori buyurtmadan oshib ketdi" }, { status: 400 });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.returnRequest.create({
        data: {
          publicNumber: nextReturnNumber(),
          userId: user.id,
          orderId: order.id,
          reason: data.reason,
          comment: data.comment ?? null,
          status: "requested",
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { name: true } } } },
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "return_requested" },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: "delivered",
          toStatus: "return_requested",
          actorId: user.id,
        },
      });

      await notifyUser(tx, {
        userId: order.store.seller.userId,
        type: "return",
        title: "Qaytarish so‘rovi",
        message: `${row.publicNumber} — ${order.publicNumber ?? order.id.slice(0, 8)}`,
        link: "/seller/returns",
        eventKey: `return-requested-seller:${row.id}`,
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "return_status_update",
          entityType: "return",
          entityId: row.id,
          newValue: { status: "requested", reason: data.reason },
        },
        tx,
      );
      return row;
    });

    return NextResponse.json({ success: true, returnRequest: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Arizani yaratib bo‘lmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
