import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { computeSellerBalance } from "@/lib/commerce/seller-balance";
import { requestPayout } from "@/lib/commerce/payout";
import { getRuntimeSettings } from "@/lib/system-settings";
import { ApiError } from "@/lib/api-error";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) {
    return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });
  }

  const settings = await getRuntimeSettings();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [balance, finance, payouts, monthAgg] = await Promise.all([
    computeSellerBalance(store.id),
    prisma.sellerFinance.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.payoutRequest.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.aggregate({
      where: { storeId: store.id, status: "delivered", createdAt: { gte: monthStart } },
      _sum: { total: true, commissionAmount: true },
    }),
  ]);

  return NextResponse.json({
    storeName: store.name,
    commissionPercent: settings.defaultCommission,
    payoutHoldDays: settings.payoutHoldDays,
    minPayout: settings.minPayout,
    summary: {
      pending: balance.pending,
      available: balance.available,
      withdrawn: balance.withdrawn,
      gmv: balance.grossSales,
      delivered: balance.grossSales,
      inProgress: balance.pending,
      commission: balance.commission,
      paidOut: balance.payout,
      held: balance.pending,
      refund: balance.refund,
      payout: balance.payout,
      monthDelivered: monthAgg._sum.total ?? 0,
      monthCommission: monthAgg._sum.commissionAmount ?? 0,
      orderCount: finance.filter((f) => f.type.toUpperCase() === "ORDER_REVENUE").length,
    },
    ledger: finance.map((f) => ({
      id: f.id,
      amount: f.amount,
      type: f.type,
      description: f.description,
      orderId: f.orderId,
      createdAt: f.createdAt.toISOString(),
    })),
    payouts,
  });
}

const payoutSchema = z.object({
  amount: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

  try {
    const data = payoutSchema.parse(await request.json());
    const row = await requestPayout({ userId: user.id, storeId: store.id, amount: data.amount });
    return NextResponse.json({ success: true, payout: row }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.toJSON(), { status: err.status });
    const message = err instanceof Error ? err.message : "Payout so‘rovi yuborilmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
