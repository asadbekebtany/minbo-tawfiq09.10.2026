import { getRuntimeSettings } from "@/lib/system-settings";
import { restockOnCancel } from "@/lib/commerce/stock";
import { notifyUser } from "@/lib/commerce/notify";
import { writeAuditLog } from "@/lib/audit-log";
import prisma from "@/lib/prisma";

export async function expirePendingOrders(now = new Date()) {
  const settings = await getRuntimeSettings();
  const cutoff = new Date(now.getTime() - settings.orderAutoCancelMinutes * 60 * 1000);

  const stale = await prisma.order.findMany({
    where: {
      status: { in: ["awaiting_payment", "pending"] },
      createdAt: { lte: cutoff },
    },
    include: { items: true, payments: true },
  });

  let expired = 0;
  for (const order of stale) {
    const applied = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: ["awaiting_payment", "pending"] },
        },
        data: { status: "cancelled", paymentStatus: "expired" },
      });
      if (claimed.count === 0) return false;

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "cancelled",
          note: "auto-cancel timeout",
        },
      });
      for (const item of order.items) {
        await restockOnCancel(
          tx,
          item.productId,
          item.quantity,
          `expire:${order.id}`,
          item.variantId,
        );
      }
      for (const payment of order.payments) {
        if (payment.lifecycle === "pending" || payment.lifecycle === "created") {
          await tx.payment.update({
            where: { id: payment.id },
            data: { lifecycle: "cancelled", status: "cancelled", cancelledAt: now },
          });
        }
      }
      await notifyUser(tx, {
        userId: order.userId,
        type: "order",
        title: "Buyurtma bekor qilindi",
        message: "To‘lov muddati o‘tdi. Buyurtma avtomatik bekor qilindi.",
        link: `/profile/orders/${order.id}`,
        eventKey: `order-expired:${order.id}`,
      });
      await writeAuditLog(
        {
          actorId: order.userId,
          actorRole: "customer",
          action: "order_status_update",
          entityType: "order",
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: { status: "cancelled", reason: "auto-cancel timeout" },
        },
        tx,
      );
      return true;
    });
    if (applied) expired += 1;
  }

  return { expired };
}
