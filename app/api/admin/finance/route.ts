import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const COMPLETED_STATUSES = ["delivered"] as const;
const ACTIVE_STATUSES = ["pending", "paid", "accepted", "packing", "shipped", "ready_for_pickup"] as const;

export async function GET() {
  const { error } = await requirePermissionApi("finance.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { commissionPercent } = await getSiteSettings();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [totalAgg, monthlyAgg, activeAgg, stores, payments] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: [...COMPLETED_STATUSES] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: { notIn: ["cancelled", "returned"] }, createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.store.findMany({
      include: {
        seller: { include: { user: { select: { name: true, phone: true } } } },
        orders: {
          where: { status: { notIn: ["cancelled", "returned"] } },
          select: { total: true, status: true },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        order: {
          select: {
            id: true,
            store: { select: { name: true } },
            user: { select: { name: true, phone: true } },
          },
        },
      },
    }),
  ]);

  const rate = commissionPercent / 100;

  const sellers = stores
    .map((store) => {
      const revenue = store.orders.reduce((sum, order) => sum + order.total, 0);
      const deliveredRevenue = store.orders
        .filter((order) => order.status === "delivered")
        .reduce((sum, order) => sum + order.total, 0);
      const commission = Math.round(revenue * rate);
      return {
        storeId: store.id,
        storeName: store.name,
        sellerName: store.seller.user.name ?? "—",
        sellerPhone: store.seller.user.phone ?? "—",
        orders: store.orders.length,
        revenue,
        deliveredRevenue,
        commission,
        payout: revenue - commission,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = totalAgg._sum.total ?? 0;
  const monthlyRevenue = monthlyAgg._sum.total ?? 0;

  return NextResponse.json({
    commissionPercent,
    summary: {
      totalRevenue,
      totalOrders: totalAgg._count,
      totalCommission: Math.round(totalRevenue * rate),
      monthlyRevenue,
      monthlyOrders: monthlyAgg._count,
      monthlyCommission: Math.round(monthlyRevenue * rate),
      activeOrdersValue: activeAgg._sum.total ?? 0,
      activeOrders: activeAgg._count,
    },
    sellers,
    payments: payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt.toISOString(),
      orderId: payment.order.id,
      storeName: payment.order.store.name,
      buyer: payment.order.user.name ?? payment.order.user.phone ?? "—",
    })),
  });
}
