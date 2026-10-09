import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { returnStatusSchema, validationError } from "@/lib/marketplace-schemas";
import { assertReturnTransition } from "@/lib/return-state";
import { writeAuditLog } from "@/lib/audit-log";
import { notifyUser } from "@/lib/commerce/notify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ returns: [] });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";

  const returns = await prisma.returnRequest.findMany({
    where: {
      order: { storeId: store.id },
      ...(status &&
      status !== "all" &&
      ["pending", "requested", "approved", "rejected", "received", "completed", "awaiting_item"].includes(
        status,
      )
        ? { status: status as "pending" | "requested" | "approved" | "rejected" | "received" | "completed" }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, phone: true } },
      order: { select: { id: true, total: true, status: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    returns: returns.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      comment: r.comment,
      images: r.images,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      buyer: { name: r.user.name, phone: r.user.phone },
      order: {
        id: r.order.id,
        orderNumber: r.order.id.slice(-8).toUpperCase(),
        total: r.order.total,
        status: r.order.status,
      },
      items: r.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        name: it.product.name,
        image: it.product.images[0]?.url ?? null,
      })),
    })),
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const store = await getSellerStoreForUser(user.id, user.role);
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id majburiy" }, { status: 400 });
    const { status } = returnStatusSchema.parse(body);

    if (!["approved", "rejected", "received"].includes(status)) {
      return NextResponse.json(
        { error: "Seller faqat approved / rejected / received qo‘yishi mumkin" },
        { status: 400 },
      );
    }

    const existing = await prisma.returnRequest.findFirst({
      where: { id, order: { storeId: store.id } },
      include: { order: { select: { id: true, userId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Qaytarish topilmadi" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      assertReturnTransition(existing.status, status);
      const row = await tx.returnRequest.update({ where: { id }, data: { status } });
      if (status === "approved") {
        await tx.order.update({
          where: { id: existing.orderId },
          data: { status: "return_approved" },
        });
      }
      await notifyUser(tx, {
        userId: existing.order.userId,
        type: "return",
        title: "Qaytarish yangilandi",
        message: `Sotuvchi qaytarish holatini o‘zgartirdi: ${status}`,
        link: "/profile/returns",
        eventKey: `return-seller-${status}:${id}`,
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "return_status_update",
          entityType: "return",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: { status },
        },
        tx,
      );
      return row;
    });

    return NextResponse.json({ success: true, returnRequest: updated });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
