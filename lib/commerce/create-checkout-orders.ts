import type { PaymentMethodType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { splitOrderFinance, postSellerLedger } from "@/lib/commerce/ledger";
import { captureReservedStock, reserveProductStock } from "@/lib/commerce/stock";
import { notifyUser } from "@/lib/commerce/notify";
import { initialOrderStatus } from "@/lib/order-state";
import { getPaymentProvider, type PaymentProviderName } from "@/lib/providers/payment-provider";
import { redactProviderPayload } from "@/lib/providers/redact";
import { getLogisticsProvider } from "@/lib/providers/logistics-provider";
import { nextOrderNumber, nextPaymentTxId } from "@/lib/public-ids";
import { ApiError } from "@/lib/api-error";
import { getRuntimeSettings } from "@/lib/system-settings";

type CartLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export async function createCheckoutOrders(input: {
  userId: string;
  cartItems: CartLine[];
  deliveryType: "courier" | "pickup";
  paymentMethod: PaymentMethodType;
  addressId: string | null;
  pickupPointId: string | null;
  couponCode: string | null;
  note: string | null;
  totalDiscount: number;
  deliveryCost: number;
  commissionPercent?: number;
  idempotencyKey?: string | null;
  couponId?: string | null;
}) {
  const settings = await getRuntimeSettings();
  if (input.paymentMethod === "cash" && !settings.codEnabled) {
    throw new ApiError("COD_DISABLED", "Naqd to‘lov o‘chirilgan", 400);
  }
  if (input.paymentMethod === "click" && !settings.clickEnabled) {
    throw new ApiError("CLICK_DISABLED", "Click hozircha o‘chirilgan", 400);
  }
  if (input.paymentMethod === "payme" && !settings.paymeEnabled) {
    throw new ApiError("PAYME_DISABLED", "Payme hozircha o‘chirilgan", 400);
  }

  const commissionPercent = input.commissionPercent ?? settings.defaultCommission;
  const online = input.paymentMethod === "payme" || input.paymentMethod === "click";
  const startStatus = initialOrderStatus(input.paymentMethod);

  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { store: true, items: true, payments: true },
      });
      if (existing) return { orders: [existing], reused: true };
    }

    const priced: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      storeId: string;
      categoryId: string;
      name: string;
      price: number;
      sku: string | null;
      image: string | null;
    }> = [];

    for (const item of input.cartItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: true,
          store: { include: { seller: true } },
        },
      });
      if (
        !product ||
        !product.isActive ||
        !product.isApproved ||
        product.deletedAt ||
        product.moderationStatus !== "active"
      ) {
        throw new ApiError("PRODUCT_UNAVAILABLE", "Mahsulot mavjud emas", 409);
      }
      if (product.store.seller.isBanned || !product.store.seller.isActive) {
        throw new ApiError("SELLER_UNAVAILABLE", "Sotuvchi hozir buyurtma qabul qilmaydi", 409);
      }
      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId && v.isActive)
        : null;
      if (item.variantId && !variant) {
        throw new ApiError("SKU_UNAVAILABLE", "SKU mavjud emas", 409);
      }
      const price = variant?.price ?? product.price;
      priced.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity: item.quantity,
        storeId: product.storeId,
        categoryId: product.categoryId,
        name: variant ? `${product.name} (${variant.value})` : product.name,
        price,
        sku: variant?.sku ?? product.sku,
        image: product.images[0]?.url ?? null,
      });
    }

    const byStore = new Map<string, typeof priced>();
    for (const item of priced) {
      const items = byStore.get(item.storeId) ?? [];
      items.push(item);
      byStore.set(item.storeId, items);
    }
    const storeEntries = [...byStore.entries()];
    const grandSubtotal = priced.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const created = [];
    let remainingDiscount = input.totalDiscount;

    for (let i = 0; i < storeEntries.length; i++) {
      const [storeId, items] = storeEntries[i];
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const share =
        i === storeEntries.length - 1
          ? remainingDiscount
          : Math.round((input.totalDiscount * subtotal) / Math.max(grandSubtotal, 1));
      remainingDiscount -= share;
      const storeDelivery = i === 0 ? input.deliveryCost : 0;
      const total = Math.max(0, subtotal + storeDelivery - share);
      const categoryIds = [...new Set(items.map((item) => item.categoryId))];
      let storeCommission = commissionPercent;
      if (categoryIds.length === 1) {
        const categoryRate = await tx.commission.findFirst({
          where: { categoryId: categoryIds[0] },
          select: { rate: true },
        });
        if (categoryRate) storeCommission = categoryRate.rate;
      }
      const finance = splitOrderFinance(total, storeCommission);
      const publicNumber = nextOrderNumber();

      const order = await tx.order.create({
        data: {
          publicNumber,
          userId: input.userId,
          storeId,
          addressId: input.addressId,
          pickupPointId: input.deliveryType === "pickup" ? input.pickupPointId : null,
          deliveryType: input.deliveryType,
          paymentMethod: input.paymentMethod,
          paymentStatus: online ? "pending" : "paid",
          status: startStatus,
          subtotal,
          deliveryCost: storeDelivery,
          discount: share,
          total,
          commissionRate: finance.rate,
          commissionAmount: finance.commissionAmount,
          sellerRevenue: finance.sellerRevenue,
          couponCode: input.couponCode,
          note: input.note,
          idempotencyKey: i === 0 ? input.idempotencyKey ?? null : null,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              skuSnapshot: item.sku,
              name: item.name,
              image: item.image,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity,
            })),
          },
        },
        include: { store: true, items: true },
      });

      await tx.orderStatusEvent.create({
        data: { orderId: order.id, fromStatus: null, toStatus: startStatus },
      });

      for (const item of items) {
        await reserveProductStock(
          tx,
          item.productId,
          item.quantity,
          `order:${order.id}`,
          item.variantId,
        );
        if (!online) {
          await captureReservedStock(
            tx,
            item.productId,
            item.quantity,
            `cod:${order.id}`,
            item.variantId,
          );
        }
      }

      const provider = getPaymentProvider(input.paymentMethod as PaymentProviderName);
      const pay = await provider.createPayment({
        orderId: order.id,
        amount: total,
        idempotencyKey: nextPaymentTxId(input.paymentMethod),
        returnUrl:
          input.paymentMethod === "click"
            ? process.env.CLICK_RETURN_URL || undefined
            : input.paymentMethod === "payme"
              ? process.env.PAYME_RETURN_URL || undefined
              : undefined,
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.paymentMethod,
          amount: total,
          status: pay.status,
          lifecycle: pay.status === "paid" ? "paid" : "pending",
          transactionId: pay.transactionId,
          providerTransactionId: pay.providerTransactionId,
          paidAt: pay.status === "paid" ? new Date() : null,
          rawResponse: (redactProviderPayload(pay.raw) as object) ?? undefined,
        },
      });

      if (input.deliveryType === "pickup" && input.pickupPointId) {
        await tx.pvzParcel.create({
          data: {
            pickupPointId: input.pickupPointId,
            orderId: order.id,
            status: "incoming",
          },
        });
      }

      if (!online) {
        await postSellerLedger(tx, {
          storeId,
          amount: finance.sellerRevenue,
          type: "ORDER_REVENUE",
          description: `Order ${publicNumber}`,
          orderId: order.id,
        });
        await postSellerLedger(tx, {
          storeId,
          amount: -finance.commissionAmount,
          type: "COMMISSION",
          description: `Commission ${finance.rate}%`,
          orderId: order.id,
        });
        const shipment = await getLogisticsProvider().createShipment({
          orderId: order.id,
          to: input.deliveryType,
        });
        await tx.shipment.create({
          data: {
            trackingNumber: shipment.trackingNumber,
            orderId: order.id,
            status: "created",
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { trackingNumber: shipment.trackingNumber },
        });
      }

      created.push({ ...order, checkoutUrl: pay.checkoutUrl ?? null, transactionId: pay.transactionId });
    }

    if (input.couponId && input.totalDiscount > 0) {
      await tx.coupon.update({
        where: { id: input.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId: input.userId } });
    await tx.analyticsEvent.createMany({
      data: priced.map((item) => ({
        type: "checkout_started" as const,
        userId: input.userId,
        entityId: item.productId,
        metadata: { quantity: item.quantity },
      })),
    });
    return { orders: created, reused: false };
  });
}

export async function notifyCheckoutCreated(
  userId: string,
  orders: Array<{ id: string; storeId: string; total: number; publicNumber?: string | null }>,
) {
  const first = orders[0];
  if (!first) return;
  try {
    await notifyUser(prisma, {
      userId,
      type: "order",
      title: "Buyurtma yaratildi",
      message: `Buyurtma ${first.publicNumber ?? first.id.slice(0, 8)} qabul qilindi.`,
      link: `/profile/orders/${first.id}`,
      eventKey: `checkout-created-buyer:${first.id}`,
    });
    const stores = await prisma.store.findMany({
      where: { id: { in: orders.map((o) => o.storeId) } },
      include: { seller: { select: { userId: true } } },
    });
    await Promise.all(
      stores.map((s) => {
        const order = orders.find((o) => o.storeId === s.id);
        return notifyUser(prisma, {
          userId: s.seller.userId,
          type: "order",
          title: "Yangi buyurtma",
          message: `${order?.publicNumber ?? order?.id.slice(0, 8)} — ${(order?.total ?? 0).toLocaleString("uz-UZ")} so‘m`,
          link: order ? `/seller/orders/${order.id}` : "/seller/orders",
          eventKey: order ? `checkout-created-seller:${order.id}` : null,
        });
      }),
    );
  } catch {
    /* notifications optional */
  }
}

export function ensureStock() {
  /* stock is reserved atomically inside createCheckoutOrders */
}
