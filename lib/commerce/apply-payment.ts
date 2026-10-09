import type { PaymentLifecycleStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { captureReservedStock, restockOnCancel } from "@/lib/commerce/stock";
import { postSellerLedger } from "@/lib/commerce/ledger";
import { notifyUser } from "@/lib/commerce/notify";
import { assertOrderTransition } from "@/lib/order-state";
import { getLogisticsProvider } from "@/lib/providers/logistics-provider";
import { writeAuditLog } from "@/lib/audit-log";
import { getPaymentProvider, type PaymentProviderName } from "@/lib/providers/payment-provider";
import { redactProviderPayload } from "@/lib/providers/redact";

type Tx = Prisma.TransactionClient;

async function recordStatus(tx: Tx, orderId: string, from: string, to: string, actorId?: string) {
  await tx.orderStatusEvent.create({
    data: { orderId, fromStatus: from, toStatus: to, actorId: actorId ?? null },
  });
}

export async function markPaymentPaid(input: {
  transactionId: string;
  providerTransactionId?: string | null;
  raw?: unknown;
  webhook?: { provider: string; eventId: string };
}) {
  return prisma.$transaction(async (tx) => {
    if (input.webhook) {
      try {
        await tx.processedWebhook.create({
          data: { provider: input.webhook.provider, eventId: input.webhook.eventId },
        });
      } catch {
        return { ok: true as const, duplicate: true, orderId: null };
      }
    }
    const payment = await tx.payment.findUnique({
      where: { transactionId: input.transactionId },
      include: {
        order: { include: { items: true, store: { include: { seller: true } } } },
      },
    });
    if (!payment) {
      if (input.webhook) throw new Error("PAYMENT_NOT_FOUND");
      return { ok: false as const, reason: "not_found" };
    }
    if (payment.lifecycle === "paid") return { ok: true as const, duplicate: true, orderId: payment.orderId };
    if (payment.lifecycle === "refunded") return { ok: true as const, duplicate: true, orderId: payment.orderId };

    const order = payment.order;
    if (order.status === "cancelled" || order.status === "refunded") {
      const provider = getPaymentProvider(payment.method as PaymentProviderName);
      if (payment.transactionId) {
        await provider.refundPayment(payment.transactionId, payment.amount);
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "refunded",
          lifecycle: "refunded" as PaymentLifecycleStatus,
          refundedAt: new Date(),
          providerTransactionId: input.providerTransactionId ?? payment.providerTransactionId,
          rawResponse: (redactProviderPayload(input.raw) as Prisma.InputJsonValue) ?? undefined,
        },
      });
      await writeAuditLog(
        {
          actorId: order.userId,
          actorRole: "customer",
          action: "payment_update",
          entityType: "order",
          entityId: order.id,
          oldValue: { status: order.status, payment: payment.lifecycle },
          newValue: { status: order.status, payment: "refunded", reason: "late_webhook_after_cancel" },
        },
        tx,
      );
      await notifyUser(tx, {
        userId: order.userId,
        type: "order",
        title: "To‘lov qaytarildi",
        message: "Buyurtma bekor qilingan. Kelgan to‘lov avtomatik refund qilindi.",
        link: `/profile/orders/${order.id}`,
        eventKey: `late-payment-refund:${order.id}`,
      });
      return { ok: true as const, late: true, orderId: order.id };
    }

    assertOrderTransition(order.status, "paid");
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        lifecycle: "paid" as PaymentLifecycleStatus,
        paidAt: new Date(),
        providerTransactionId: input.providerTransactionId ?? payment.providerTransactionId,
        rawResponse: (redactProviderPayload(input.raw) as Prisma.InputJsonValue) ?? undefined,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "paid", paymentStatus: "paid" },
    });
    await recordStatus(tx, order.id, order.status, "paid");
    assertOrderTransition("paid", "confirmed");
    await tx.order.update({ where: { id: order.id }, data: { status: "confirmed" } });
    await recordStatus(tx, order.id, "paid", "confirmed");

    for (const item of order.items) {
      await captureReservedStock(
        tx,
        item.productId,
        item.quantity,
        `paid:${order.id}`,
        item.variantId,
      );
    }

    if (order.sellerRevenue > 0) {
      await postSellerLedger(tx, {
        storeId: order.storeId,
        amount: order.sellerRevenue,
        type: "ORDER_REVENUE",
        description: `Order ${order.publicNumber ?? order.id}`,
        orderId: order.id,
      });
    }
    if (order.commissionAmount > 0) {
      await postSellerLedger(tx, {
        storeId: order.storeId,
        amount: -order.commissionAmount,
        type: "COMMISSION",
        description: `Commission ${order.commissionRate ?? 0}%`,
        orderId: order.id,
      });
    }

    const shipment = await getLogisticsProvider().createShipment({
      orderId: order.id,
      to: order.pickupPointId ? "PVZ" : "courier",
      pickupPointId: order.pickupPointId,
    });
    await tx.shipment.create({
      data: {
        trackingNumber: shipment.trackingNumber,
        orderId: order.id,
        status: "created",
        toLabel: shipment.status,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { trackingNumber: shipment.trackingNumber },
    });

    await notifyUser(tx, {
      userId: order.userId,
      type: "order",
      title: "To‘lov qabul qilindi",
      message: `Buyurtma ${order.publicNumber ?? order.id.slice(0, 8)} to‘landi.`,
      link: `/profile/orders/${order.id}`,
      eventKey: `payment-paid-buyer:${order.id}`,
    });
    await notifyUser(tx, {
      userId: order.store.seller.userId,
      type: "order",
      title: "Buyurtma to‘landi",
      message: `${order.publicNumber ?? order.id.slice(0, 8)} — ${(order.total).toLocaleString("uz-UZ")} so‘m`,
      link: `/seller/orders/${order.id}`,
      eventKey: `payment-paid-seller:${order.id}`,
    });
    await tx.analyticsEvent.create({
      data: {
        type: "payment_success",
        userId: order.userId,
        entityId: order.id,
        metadata: { orderId: order.id },
      },
    });
    await writeAuditLog(
      {
        actorId: order.userId,
        actorRole: "customer",
        action: "payment_update",
        entityType: "order",
        entityId: order.id,
        newValue: { status: "confirmed", payment: "paid" },
      },
      tx,
    );

    return { ok: true as const, duplicate: false, orderId: order.id };
  });
}

export async function markPaymentFailedOrCancelled(
  transactionId: string,
  lifecycle: "failed" | "cancelled",
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { transactionId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) return { ok: false as const };
    if (payment.lifecycle === "paid") return { ok: false as const, frozen: true };

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: lifecycle,
        lifecycle,
        cancelledAt: new Date(),
      },
    });
    const order = payment.order;
    if (order.status === "awaiting_payment" || order.status === "pending") {
      assertOrderTransition(order.status, "cancelled");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "cancelled", paymentStatus: lifecycle },
      });
      await recordStatus(tx, order.id, order.status, "cancelled");
      for (const item of order.items) {
        await restockOnCancel(
          tx,
          item.productId,
          item.quantity,
          `cancel:${order.id}`,
          item.variantId,
        );
      }
    }
    return { ok: true as const };
  });
}

export async function writePaymentAudit(actorId: string, actorRole: string, orderId: string) {
  await writeAuditLog({
    actorId,
    actorRole,
    action: "payment_update",
    entityType: "order",
    entityId: orderId,
    metadata: { orderId },
  });
}
