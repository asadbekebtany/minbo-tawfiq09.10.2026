import prisma from "@/lib/prisma";
import { postSellerLedger } from "@/lib/commerce/ledger";
import { notifyUser } from "@/lib/commerce/notify";
import { getPaymentProvider, type PaymentProviderName } from "@/lib/providers/payment-provider";
import { assertReturnTransition } from "@/lib/return-state";
import { assertOrderTransition } from "@/lib/order-state";
import { writeAuditLog } from "@/lib/audit-log";
import { syncProductStockFromVariants } from "@/lib/commerce/stock";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

async function applyStockDisposition(
  tx: Tx,
  returnId: string,
  items: Array<{ productId: string; quantity: number }>,
  disposition: "sellable" | "damaged",
  variantByProduct: Map<string, string | null>,
) {
  for (const item of items) {
    const variantId = variantByProduct.get(item.productId) ?? null;
    if (disposition === "damaged") {
      await tx.product.update({
        where: { id: item.productId },
        data: { damagedStock: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "return",
          quantity: item.quantity,
          reason: `damaged:${returnId}`,
        },
      });
    } else if (variantId) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: item.quantity } },
      });
      await syncProductStockFromVariants(tx, item.productId);
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "return",
          quantity: item.quantity,
          reason: `sellable:${returnId}`,
        },
      });
    } else {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "return",
          quantity: item.quantity,
          reason: `sellable:${returnId}`,
        },
      });
    }
  }
}

export async function completeRefund(
  returnId: string,
  actorId: string,
  disposition: "sellable" | "damaged" = "sellable",
) {
  const request = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      items: true,
      order: { include: { payments: true } },
    },
  });
  if (!request) throw new Error("RETURN_NOT_FOUND");

  const orderItems = await prisma.orderItem.findMany({ where: { orderId: request.orderId } });
  const amount = request.items.reduce((sum, ri) => {
    const oi = orderItems.find((x) => x.productId === ri.productId);
    return sum + (oi ? oi.price * ri.quantity : 0);
  }, 0);

  const payment =
    request.order.payments.find((p) => p.lifecycle === "paid") ?? request.order.payments[0];
  if (payment?.transactionId) {
    const provider = getPaymentProvider(payment.method as PaymentProviderName);
    await provider.refundPayment(payment.transactionId, amount);
  }

  return prisma.$transaction(async (tx) => {
    const fresh = await tx.returnRequest.findUnique({
      where: { id: returnId },
      include: { items: true, order: { include: { payments: true, store: { include: { seller: { select: { userId: true } } } } } } },
    });
    if (!fresh) throw new Error("RETURN_NOT_FOUND");
    if (fresh.status === "completed") {
      return { amount, duplicate: true as const };
    }

    let status = fresh.status;
    if (status === "inspection") {
      assertReturnTransition(status, "refund_pending");
      await tx.returnRequest.update({
        where: { id: fresh.id },
        data: { status: "refund_pending" },
      });
      status = "refund_pending";
    }
    assertReturnTransition(status, "completed");

    const order = fresh.order;
    if (order.status !== "refunded") {
      assertOrderTransition(order.status, "refunded");
    }
    const paid =
      order.payments.find((p) => p.lifecycle === "paid") ?? order.payments[0];

    if (paid) {
      await tx.payment.update({
        where: { id: paid.id },
        data: { lifecycle: "refunded", status: "refunded", refundedAt: new Date() },
      });
    }
    await tx.returnRequest.update({
      where: { id: fresh.id },
      data: { status: "completed" },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "refunded", paymentStatus: "refunded" },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "refunded",
        actorId,
      },
    });
    await postSellerLedger(tx, {
      storeId: order.storeId,
      amount: -amount,
      type: "REFUND",
      description: `Refund ${fresh.publicNumber ?? fresh.id}`,
      orderId: order.id,
    });
    const commissionShare = Math.round((amount * (order.commissionRate ?? 0)) / 100);
    if (commissionShare > 0) {
      await postSellerLedger(tx, {
        storeId: order.storeId,
        amount: commissionShare,
        type: "COMMISSION_REVERSAL",
        description: `Commission reversal ${fresh.publicNumber ?? fresh.id}`,
        orderId: order.id,
      });
    }

    await applyStockDisposition(
      tx,
      fresh.id,
      fresh.items,
      disposition,
      new Map(orderItems.map((oi) => [oi.productId, oi.variantId])),
    );

    await notifyUser(tx, {
      userId: fresh.userId,
      type: "return",
      title: "Pul qaytarildi",
      message: "Qaytarish bo‘yicha to‘lov refund qilindi.",
      link: `/profile/returns`,
      eventKey: `refund-completed:${fresh.id}`,
    });
    await notifyUser(tx, {
      userId: order.store.seller.userId,
      type: "return",
      title: "Refund yozildi",
      message: `${fresh.publicNumber ?? fresh.id.slice(0, 8)} — ${amount.toLocaleString("uz-UZ")} so‘m`,
      link: "/seller/finance",
      eventKey: `refund-completed-seller:${fresh.id}`,
    });
    await writeAuditLog(
      {
        actorId,
        actorRole: "admin",
        action: "refund_create",
        entityType: "return",
        entityId: fresh.id,
        metadata: { amount, orderId: order.id, disposition },
      },
      tx,
    );

    return { amount, duplicate: false as const };
  });
}

export async function disposeReturnedStock(
  returnId: string,
  disposition: "sellable" | "damaged",
) {
  const request = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: { items: true },
  });
  if (!request) return;
  const orderItems = await prisma.orderItem.findMany({ where: { orderId: request.orderId } });
  await prisma.$transaction(async (tx) => {
    await applyStockDisposition(
      tx,
      returnId,
      request.items,
      disposition,
      new Map(orderItems.map((oi) => [oi.productId, oi.variantId])),
    );
  });
}
