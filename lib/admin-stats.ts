import "server-only";
import { resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export type AdminDashboardStats = {
  users: number;
  orders: number;
  products: number;
  sellers: number;
  pendingProducts: number;
  pendingSellers: number;
  pendingReturns: number;
  openTickets: number;
  unansweredQuestions: number;
  monthlyRevenue: number;
  fromDatabase: boolean;
};

export type AdminPendingProduct = {
  id: string;
  name: string;
  storeName: string;
  createdAt: Date;
};

export type AdminRecentOrder = {
  id: string;
  buyer: string;
  store: string;
  total: number;
  status: string;
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export function formatAdminStat(value: number, suffix = ""): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} M${suffix}`;
  }
  return fmt(value) + suffix;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const source = await resolveDataSource();
  if (source !== "database") {
    return {
      users: 0,
      orders: 0,
      products: 0,
      sellers: 0,
      pendingProducts: 0,
      pendingSellers: 0,
      pendingReturns: 0,
      openTickets: 0,
      unansweredQuestions: 0,
      monthlyRevenue: 0,
      fromDatabase: false,
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    users,
    orders,
    products,
    sellers,
    pendingProducts,
    pendingSellers,
    pendingReturns,
    openTickets,
    unansweredQuestions,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true, isApproved: true } }),
    prisma.seller.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isApproved: false } }),
    prisma.seller.count({ where: { isActive: false, isBanned: false } }),
    prisma.returnRequest.count({ where: { status: "pending" } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.question.count({ where: { answers: { none: {} } } }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: monthStart },
        status: { notIn: ["cancelled", "returned"] },
      },
      _sum: { total: true },
    }),
  ]);

  return {
    users,
    orders,
    products,
    sellers,
    pendingProducts,
    pendingSellers,
    pendingReturns,
    openTickets,
    unansweredQuestions,
    monthlyRevenue: revenueAgg._sum.total ?? 0,
    fromDatabase: true,
  };
}

export async function getAdminPendingProducts(limit = 5): Promise<AdminPendingProduct[]> {
  const source = await resolveDataSource();
  if (source !== "database") return [];

  const rows = await prisma.product.findMany({
    where: { isApproved: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { store: { select: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    storeName: row.store.name,
    createdAt: row.createdAt,
  }));
}

export async function getAdminRecentOrders(limit = 5): Promise<AdminRecentOrder[]> {
  const source = await resolveDataSource();
  if (source !== "database") return [];

  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { name: true } },
      store: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    buyer: row.user.name ?? "Foydalanuvchi",
    store: row.store.name,
    total: row.total,
    status: row.status,
  }));
}
