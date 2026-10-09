import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function postSellerLedger(
  tx: Tx,
  input: {
    storeId: string;
    amount: number;
    type: "ORDER_REVENUE" | "COMMISSION" | "REFUND" | "COMMISSION_REVERSAL" | "PAYOUT" | "ADJUSTMENT";
    description: string;
    orderId?: string | null;
  },
) {
  await tx.sellerFinance.create({
    data: {
      storeId: input.storeId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      orderId: input.orderId ?? null,
    },
  });
}

export function splitOrderFinance(total: number, commissionPercent: number) {
  const rate = Math.max(0, Math.min(100, commissionPercent));
  const commissionAmount = Math.round((total * rate) / 100);
  const sellerRevenue = Math.max(0, total - commissionAmount);
  return { rate, commissionAmount, sellerRevenue };
}
