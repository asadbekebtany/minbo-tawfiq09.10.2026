import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import { processPayout } from "@/lib/commerce/payout";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const payouts = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { phone: true, name: true } } },
  });
  const storeIds = [...new Set(payouts.map((p) => p.storeId))];
  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });
  const storeName = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  return NextResponse.json({
    payouts: payouts.map((p) => ({
      ...p,
      storeName: storeName[p.storeId] ?? p.storeId,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  payoutId: z.string().min(1),
  status: z.enum(["approved", "processing", "paid", "rejected", "cancelled"]),
  reason: z.string().trim().min(3).max(300).optional(),
});

export async function PATCH(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  try {
    const data = patchSchema.parse(await request.json());
    const payout = await processPayout(data.payoutId, data.status, user.id, data.reason);
    return NextResponse.json({ success: true, payout });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.toJSON(), { status: err.status });
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
