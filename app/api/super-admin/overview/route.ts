import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getPaymentGatewayStatus, getPlatformSettingsRaw } from "@/lib/platform-settings";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;

  const dbConnected = await checkDatabaseConnection();
  const site = await getSiteSettings();
  const platform = getPlatformSettingsRaw();
  const gateways = getPaymentGatewayStatus();

  let counts = {
    users: 0,
    sellersActive: 0,
    sellersPending: 0,
    productsPending: 0,
    ordersToday: 0,
    returnsPending: 0,
    ticketsOpen: 0,
    lowStock: 0,
    admins: 0,
  };

  if (dbConnected) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [
      users,
      sellersActive,
      sellersPending,
      productsPending,
      ordersToday,
      returnsPending,
      ticketsOpen,
      lowStock,
      admins,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.seller.count({ where: { isActive: true, isBanned: false } }),
      prisma.sellerApplication.count({ where: { status: "pending" } }),
      prisma.product.count({ where: { isApproved: false, isActive: true } }),
      prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.returnRequest.count({
        where: { status: { in: ["pending", "requested"] } },
      }),
      prisma.supportTicket.count({ where: { status: { not: "closed" } } }),
      prisma.product.count({
        where: { isActive: true, stock: { lte: platform.lowStockThreshold } },
      }),
      prisma.user.count({ where: { role: { in: ["admin", "super_admin"] } } }),
    ]);
    counts = {
      users,
      sellersActive,
      sellersPending,
      productsPending,
      ordersToday,
      returnsPending,
      ticketsOpen,
      lowStock,
      admins,
    };
  }

  return NextResponse.json({
    health: {
      database: dbConnected,
      sms: gateways.smsConfigured,
      payme: gateways.paymeConfigured,
      click: gateways.clickConfigured,
      adminApiLocked: serverEnv.lockAdminApi,
      maintenanceMode: platform.maintenanceMode,
    },
    site: {
      siteName: site.siteName,
      commissionPercent: site.commissionPercent,
      freeDeliveryMin: site.freeDeliveryMin,
    },
    platform,
    counts,
  });
}
