import prisma from "@/lib/prisma";
import { resolveAnalyticsRange } from "@/lib/date-range";
import { computeSellerBalance } from "@/lib/commerce/seller-balance";

const PAID_STATUSES = [
  "paid",
  "confirmed",
  "accepted",
  "preparing",
  "packing",
  "ready_for_shipment",
  "shipped",
  "in_transit",
  "ready_for_pickup",
  "at_pickup_point",
  "delivered",
] as const;

export async function getMarketplaceAnalytics(preset: string, from?: string, to?: string) {
  const range = resolveAnalyticsRange(preset, from, to);
  const created = { gte: range.from, lte: range.to };

  const [
    gmv,
    paidGmv,
    deliveredGmv,
    commission,
    refunds,
    payouts,
    orderCount,
    paidOrders,
    delivered,
    cancelled,
    returned,
    buyers,
    sellers,
    activeSellers,
    products,
    lowStock,
    outOfStock,
    sellerRev,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: created }, _sum: { total: true } }),
    prisma.order.aggregate({
      where: { createdAt: created, status: { in: [...PAID_STATUSES] } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: created, status: "delivered" },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: created, status: { in: [...PAID_STATUSES] } },
      _sum: { commissionAmount: true, sellerRevenue: true },
    }),
    prisma.sellerFinance.aggregate({
      where: { createdAt: created, type: { in: ["REFUND", "refund"] } },
      _sum: { amount: true },
    }),
    prisma.payoutRequest.aggregate({
      where: { createdAt: created, status: "paid" },
      _sum: { amount: true },
    }),
    prisma.order.count({ where: { createdAt: created } }),
    prisma.order.count({ where: { createdAt: created, status: { in: [...PAID_STATUSES] } } }),
    prisma.order.count({ where: { createdAt: created, status: "delivered" } }),
    prisma.order.count({ where: { createdAt: created, status: "cancelled" } }),
    prisma.returnRequest.count({ where: { createdAt: created } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.seller.count(),
    prisma.seller.count({ where: { isActive: true, isBanned: false } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.product.count({ where: { stock: { lte: 0 }, isActive: true } }),
    prisma.order.aggregate({
      where: { createdAt: created, status: { in: [...PAID_STATUSES] } },
      _sum: { sellerRevenue: true },
    }),
  ]);

  const refundAmount = Math.abs(refunds._sum.amount ?? 0);
  const marketplaceRevenue = commission._sum.commissionAmount ?? 0;

  return {
    range,
    gmv: gmv._sum.total ?? 0,
    paidGmv: paidGmv._sum.total ?? 0,
    deliveredGmv: deliveredGmv._sum.total ?? 0,
    marketplaceRevenue,
    sellerRevenue: sellerRev._sum.sellerRevenue ?? 0,
    totalCommission: marketplaceRevenue,
    refundAmount,
    payoutAmount: payouts._sum.amount ?? 0,
    orderCount,
    paidOrders,
    delivered,
    cancelled,
    returned,
    buyers,
    sellers,
    activeSellers,
    products,
    lowStock,
    outOfStock,
  };
}

export async function getSellerAnalytics() {
  const stores = await prisma.store.findMany({
    include: {
      seller: { include: { user: { select: { phone: true, name: true } } } },
      _count: { select: { products: true, orders: true } },
    },
    take: 200,
  });

  const rows = [];
  for (const store of stores) {
    const [orders, productsLow] = await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id },
        select: { status: true, total: true, commissionAmount: true },
      }),
      prisma.product.count({ where: { storeId: store.id, stock: { lte: 5 } } }),
    ]);
    const delivered = orders.filter((o) => o.status === "delivered");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const returned = orders.filter((o) =>
      ["returned", "refunded", "return_requested"].includes(o.status),
    );
    const gmv = orders.reduce((s, o) => s + o.total, 0);
    const commission = orders.reduce((s, o) => s + (o.commissionAmount ?? 0), 0);
    const payouts = await prisma.payoutRequest.aggregate({
      where: { storeId: store.id, status: "paid" },
      _sum: { amount: true },
    });
    const balance = await computeSellerBalance(store.id);
    rows.push({
      storeId: store.id,
      storeName: store.name,
      sellerPhone: store.seller.user.phone,
      gmv,
      orders: orders.length,
      delivered: delivered.length,
      cancellationRate: orders.length ? cancelled.length / orders.length : 0,
      returnRate: orders.length ? returned.length / orders.length : 0,
      commission,
      payout: payouts._sum.amount ?? 0,
      currentBalance: balance.available,
      productCount: store._count.products,
      stockProblems: productsLow,
    });
  }
  return rows;
}

export async function getProductAnalytics() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      soldCount: true,
      viewCount: true,
      price: true,
    },
  });

  const productIds = products.map((p) => p.id);
  const [events, orderItems, returnItems, refunds] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["entityId", "type"],
      _count: { _all: true },
      where: { entityId: { in: productIds } },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, total: true },
      _count: { _all: true },
      where: { productId: { in: productIds } },
    }),
    prisma.returnItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      _count: { _all: true },
      where: { productId: { in: productIds } },
    }),
    prisma.sellerFinance.findMany({
      where: { type: { in: ["REFUND", "refund"] }, orderId: { not: null } },
      select: { amount: true, orderId: true },
    }),
  ]);

  const refundByOrder = new Map<string, number>();
  for (const row of refunds) {
    if (!row.orderId) continue;
    refundByOrder.set(row.orderId, (refundByOrder.get(row.orderId) ?? 0) + Math.abs(row.amount));
  }

  const orderRows = await prisma.orderItem.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, orderId: true, total: true, order: { select: { status: true } } },
  });

  return products.map((p) => {
    const views =
      p.viewCount ||
      events.find((e) => e.entityId === p.id && e.type === "product_view")?._count._all ||
      0;
    const addToCart =
      events.find((e) => e.entityId === p.id && e.type === "add_to_cart")?._count._all || 0;
    const checkoutStarted =
      events.find((e) => e.entityId === p.id && e.type === "checkout_started")?._count._all || 0;
    const oi = orderItems.find((x) => x.productId === p.id);
    const ri = returnItems.find((x) => x.productId === p.id);
    const lines = orderRows.filter((x) => x.productId === p.id);
    const gmv = lines.reduce((s, l) => s + l.total, 0);
    const deliveredGmv = lines
      .filter((l) => l.order.status === "delivered")
      .reduce((s, l) => s + l.total, 0);
    const refundAmount = lines.reduce((s, l) => s + (refundByOrder.get(l.orderId) ?? 0), 0);
    const returnCount = ri?._sum.quantity ?? 0;
    const orderCount = oi?._count._all ?? 0;
    const unitsSold = oi?._sum.quantity ?? p.soldCount;
    return {
      productId: p.id,
      name: p.name,
      slug: p.slug,
      views,
      addToCart,
      checkoutStarted,
      orderCount,
      unitsSold,
      gmv,
      deliveredGmv,
      refundAmount,
      returnCount,
      returnRate: unitsSold ? (ri?._sum.quantity ?? 0) / unitsSold : 0,
      conversion: views ? unitsSold / views : 0,
      conversionRate: views ? unitsSold / views : 0,
      sales: unitsSold,
      revenue: gmv,
    };
  });
}
