import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getRuntimeSettings } from "@/lib/system-settings";
import { computeSellerBalance } from "@/lib/commerce/seller-balance";
import { postSellerLedger } from "@/lib/commerce/ledger";
import { writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payoutSchema = z.object({
  storeId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  description: z.string().trim().max(300).optional().nullable(),
});

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const settings = await getRuntimeSettings();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthAgg, deliveredAgg, stores, ledgers, payouts] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: monthStart }, status: { notIn: ["cancelled", "returned"] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: "delivered" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.store.findMany({
      include: {
        seller: { include: { user: { select: { name: true, phone: true } } } },
      },
    }),
    prisma.sellerFinance.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { store: { select: { name: true } } },
    }),
    prisma.payoutRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: { select: { phone: true, name: true } },
      },
    }),
  ]);

  const settlements = await Promise.all(
    stores.map(async (store) => {
      const balance = await computeSellerBalance(store.id);
      return {
        storeId: store.id,
        storeName: store.name,
        sellerName: store.seller.user.name ?? "—",
        sellerPhone: store.seller.user.phone ?? "—",
        gmv: balance.grossSales,
        delivered: balance.grossSales,
        commission: balance.commission,
        paidOut: balance.payout,
        held: balance.pending,
        payable: balance.available,
        refund: balance.refund,
      };
    }),
  );

  const totalPayable = settlements.reduce((s, row) => s + row.payable, 0);
  const totalCommission = settlements.reduce((s, row) => s + row.commission, 0);

  return NextResponse.json({
    commissionPercent: settings.defaultCommission,
    payoutHoldDays: settings.payoutHoldDays,
    minPayout: settings.minPayout,
    summary: {
      monthGmv: monthAgg._sum.total ?? 0,
      monthOrders: monthAgg._count,
      deliveredGmv: deliveredAgg._sum.total ?? 0,
      deliveredOrders: deliveredAgg._count,
      totalCommission,
      totalPayable,
    },
    settlements: settlements.sort((a, b) => b.payable - a.payable),
    ledger: ledgers.map((row) => ({
      id: row.id,
      storeName: row.store.name,
      amount: row.amount,
      type: row.type,
      description: row.description,
      orderId: row.orderId,
      createdAt: row.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      publicNumber: p.publicNumber,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      storeId: p.storeId,
      storeName: stores.find((s) => s.id === p.storeId)?.name ?? p.storeId,
      sellerPhone: p.user.phone,
      sellerName: p.user.name,
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = payoutSchema.parse(await request.json());
    const store = await prisma.store.findUnique({ where: { id: data.storeId } });
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    const balance = await computeSellerBalance(data.storeId);
    if (data.amount > balance.available) {
      return NextResponse.json({ error: "Mavjud balans yetarli emas" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await postSellerLedger(tx, {
        storeId: data.storeId,
        amount: -data.amount,
        type: "PAYOUT",
        description: data.description || "Super admin payout",
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "payout_update",
          entityType: "payout",
          entityId: data.storeId,
          metadata: { storeId: data.storeId, amount: data.amount, type: "PAYOUT" },
        },
        tx,
      );
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "To‘lov yozilmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
