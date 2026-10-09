import prisma from "@/lib/prisma";
import { getRuntimeSettings } from "@/lib/system-settings";

export type SellerBalance = {
  pending: number;
  available: number;
  withdrawn: number;
  grossSales: number;
  commission: number;
  refund: number;
  payout: number;
};

export async function computeSellerBalance(storeId: string): Promise<SellerBalance> {
  const settings = await getRuntimeSettings();
  const rows = await prisma.sellerFinance.findMany({ where: { storeId } });
  const cutoff = Date.now() - settings.payoutHoldDays * 24 * 60 * 60 * 1000;

  let pending = 0;
  let available = 0;
  let withdrawn = 0;
  let grossSales = 0;
  let commission = 0;
  let refund = 0;
  let payout = 0;

  for (const row of rows) {
    const type = row.type.toUpperCase();
    if (type === "ORDER_REVENUE") grossSales += row.amount;
    if (type === "COMMISSION") commission += Math.abs(row.amount);
    if (type === "REFUND") refund += Math.abs(row.amount);
    if (type === "PAYOUT") {
      payout += Math.abs(row.amount);
      withdrawn += Math.abs(row.amount);
      continue;
    }

    const ts = row.createdAt.getTime();
    if (ts > cutoff && (type === "ORDER_REVENUE" || type === "COMMISSION")) {
      pending += row.amount;
    } else {
      available += row.amount;
    }
  }

  return {
    pending: Math.max(0, pending),
    available: Math.max(0, available),
    withdrawn,
    grossSales,
    commission,
    refund,
    payout,
  };
}
