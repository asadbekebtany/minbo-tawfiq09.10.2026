import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { postSellerLedger } from "@/lib/commerce/ledger";
import { z } from "zod";
import { assertOrderTransition } from "@/lib/order-state";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["order_status", "payment_status", "stock", "balance_adjustment"]),
  reason: z.string().trim().min(5).max(500),
  orderId: z.string().optional(),
  status: z.string().optional(),
  paymentId: z.string().optional(),
  productId: z.string().optional(),
  stock: z.coerce.number().int().optional(),
  storeId: z.string().optional(),
  amount: z.coerce.number().int().optional(),
});

export async function POST(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const data = schema.parse(await request.json());

  if (data.type === "order_status") {
    if (!data.orderId || !data.status) {
      return NextResponse.json({ error: "orderId va status majburiy" }, { status: 400 });
    }
    const existing = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!existing) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    if (existing.status === data.status) {
      return NextResponse.json({ success: true, noop: true });
    }
    try {
      assertOrderTransition(existing.status, data.status);
    } catch {
      return NextResponse.json({ error: "Status o‘tishi ruxsat etilmagan" }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: data.orderId }, data: { status: data.status as never } });
      await tx.orderStatusEvent.create({
        data: {
          orderId: data.orderId!,
          fromStatus: existing.status,
          toStatus: data.status!,
          actorId: user.id,
          note: data.reason,
        },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "order_status_update",
          entityType: "order",
          entityId: data.orderId,
          oldValue: { status: existing.status },
          newValue: { status: data.status, reason: data.reason },
        },
        tx,
      );
    });
  }

  if (data.type === "payment_status") {
    if (!data.paymentId || !data.status) {
      return NextResponse.json({ error: "paymentId va status majburiy" }, { status: 400 });
    }
    const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
    if (!payment) return NextResponse.json({ error: "To‘lov topilmadi" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: data.paymentId },
        data: { status: data.status, lifecycle: data.status as never },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "payment_update",
          entityType: "payment",
          entityId: data.paymentId,
          oldValue: { status: payment.status },
          newValue: { status: data.status, reason: data.reason },
        },
        tx,
      );
    });
  }

  if (data.type === "stock") {
    if (!data.productId || data.stock == null) {
      return NextResponse.json({ error: "productId va stock majburiy" }, { status: 400 });
    }
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: data.productId }, data: { stock: data.stock } });
      await tx.stockMovement.create({
        data: {
          productId: data.productId!,
          type: "adjustment",
          quantity: Math.abs(data.stock! - product.stock),
          reason: data.reason,
        },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "stock_adjust",
          entityType: "product",
          entityId: data.productId,
          oldValue: { stock: product.stock },
          newValue: { stock: data.stock, reason: data.reason },
        },
        tx,
      );
    });
  }

  if (data.type === "balance_adjustment") {
    if (!data.storeId || data.amount == null) {
      return NextResponse.json({ error: "storeId va amount majburiy" }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await postSellerLedger(tx, {
        storeId: data.storeId!,
        amount: data.amount!,
        type: "ADJUSTMENT",
        description: data.reason,
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "payout_update",
          entityType: "seller_finance",
          entityId: data.storeId,
          newValue: { amount: data.amount, reason: data.reason },
        },
        tx,
      );
    });
  }

  return NextResponse.json({ success: true });
}
