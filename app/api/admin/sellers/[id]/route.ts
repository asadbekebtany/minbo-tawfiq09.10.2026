import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { computeSellerBalance } from "@/lib/commerce/seller-balance";
import { listAuditLogs } from "@/lib/audit-log";
import { isSuperAdminSession } from "@/lib/demo-staff";
import { serializeWarehouseAccess } from "@/lib/warehouse-access";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { error, user } = await requirePermissionApi("sellers.view");
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const { id } = await context.params;
  const seller = await prisma.seller.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true, isBanned: true } },
      store: {
        include: {
          products: { take: 20, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, stock: true, isApproved: true } },
          _count: { select: { products: true, orders: true } },
        },
      },
      application: true,
    },
  });
  if (!seller) return NextResponse.json({ error: "Seller topilmadi" }, { status: 404 });
  const storeId = seller.store?.id;
  const balance = storeId ? await computeSellerBalance(storeId) : null;
  const payouts = storeId
    ? await prisma.payoutRequest.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 20 })
    : [];
  const orders = storeId
    ? await prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, publicNumber: true, status: true, total: true, createdAt: true },
      })
    : [];
  const orderStats = storeId
    ? await prisma.order.findMany({
        where: { storeId },
        select: { status: true, total: true, commissionAmount: true },
      })
    : [];
  const returns = storeId
    ? await prisma.returnRequest.count({ where: { order: { storeId } } })
    : 0;
  const delivered = orderStats.filter((o) => o.status === "delivered");
  const sales = delivered.reduce((s, o) => s + o.total, 0);
  const commission = orderStats.reduce((s, o) => s + (o.commissionAmount ?? 0), 0);
  const returnRate = orderStats.length ? returns / orderStats.length : 0;
  const audit = await listAuditLogs({ entityId: seller.id, limit: 30 });
  return NextResponse.json({
    seller: {
      id: seller.id,
      status: seller.isBanned ? "banned" : seller.isActive ? "approved" : seller.application?.status ?? "pending",
      profile: seller.application,
      user: seller.user,
      store: seller.store,
      balance,
      payouts,
      sales,
      returnRate,
      commission,
      orders: orders.map((o) => ({
        id: o.id,
        publicNumber: o.publicNumber,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
      })),
      audit: audit.logs,
      warehouseAccess: serializeWarehouseAccess(seller),
      canManageWarehouseAccess: user.role === "super_admin" || isSuperAdminSession(user),
    },
  });
}
