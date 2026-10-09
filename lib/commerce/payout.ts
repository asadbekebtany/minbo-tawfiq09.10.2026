import prisma from "@/lib/prisma";
import { computeSellerBalance } from "@/lib/commerce/seller-balance";
import { postSellerLedger } from "@/lib/commerce/ledger";
import { getRuntimeSettings } from "@/lib/system-settings";
import { nextPayoutNumber } from "@/lib/public-ids";
import { notifyUser } from "@/lib/commerce/notify";
import { writeAuditLog } from "@/lib/audit-log";
import { ApiError } from "@/lib/api-error";
import { getPayoutProvider } from "@/lib/providers/payout-provider";

export async function requestPayout(input: {
  userId: string;
  storeId: string;
  amount: number;
}) {
  const settings = await getRuntimeSettings();
  if (input.amount < settings.minPayout) {
    throw new ApiError("PAYOUT_MIN", `Minimal payout ${settings.minPayout} so‘m`, 400);
  }

  return prisma.$transaction(async (tx) => {
    const open = await tx.payoutRequest.findFirst({
      where: { storeId: input.storeId, status: { in: ["requested", "approved", "processing"] } },
    });
    if (open) {
      throw new ApiError("PAYOUT_OPEN", "Allaqachon ochiq payout so‘rovi bor", 409);
    }

    const balance = await computeSellerBalance(input.storeId);
    if (input.amount > balance.available) {
      throw new ApiError("PAYOUT_EXCEEDS_BALANCE", "Mavjud balans yetarli emas", 400);
    }

    const row = await tx.payoutRequest.create({
      data: {
        publicNumber: nextPayoutNumber(),
        userId: input.userId,
        storeId: input.storeId,
        amount: input.amount,
        status: "requested",
      },
    });
    await writeAuditLog(
      {
        actorId: input.userId,
        actorRole: "seller",
        action: "payout_create",
        entityType: "payout",
        entityId: row.id,
        metadata: { amount: input.amount },
      },
      tx,
    );
    await notifyUser(tx, {
      userId: input.userId,
      type: "system",
      title: "Payout so‘rovi yuborildi",
      message: `${row.publicNumber} — ${input.amount.toLocaleString("uz-UZ")} so‘m`,
      link: "/seller/finance",
      eventKey: `payout-requested:${row.id}`,
    });
    return row;
  });
}

export async function processPayout(
  payoutId: string,
  next: "approved" | "processing" | "paid" | "rejected" | "cancelled",
  actorId: string,
  reason?: string,
) {
  const current = await prisma.payoutRequest.findUnique({ where: { id: payoutId } });
  if (!current) throw new ApiError("NOT_FOUND", "Payout topilmadi", 404);

  const allowed: Record<string, string[]> = {
    requested: ["approved", "rejected", "cancelled"],
    approved: ["processing", "rejected", "cancelled"],
    processing: ["paid", "rejected"],
    paid: [],
    rejected: [],
    cancelled: [],
  };
  if (!allowed[current.status]?.includes(next)) {
    throw new ApiError("PAYOUT_TRANSITION", `${current.status} → ${next} ruxsat etilmagan`, 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (next === "processing") {
      await getPayoutProvider().createPayout({
        payoutId: current.id,
        storeId: current.storeId,
        amount: current.amount,
      });
    }
    if (next === "cancelled" || next === "rejected") {
      await getPayoutProvider().cancelPayout(`internal:${current.id}`).catch(() => undefined);
    }
    if (next === "paid") {
      const balance = await computeSellerBalance(current.storeId);
      if (current.amount > balance.available) {
        throw new ApiError("PAYOUT_EXCEEDS_BALANCE", "Mavjud balans yetarli emas", 400);
      }
    }
    const claimed = await tx.payoutRequest.updateMany({
      where: { id: payoutId, status: current.status },
      data: { status: next, note: reason ?? current.note },
    });
    if (claimed.count === 0) {
      throw new ApiError("PAYOUT_TRANSITION", `${current.status} → ${next} ruxsat etilmagan`, 409);
    }
    if (next === "paid") {
      await postSellerLedger(tx, {
        storeId: current.storeId,
        amount: -current.amount,
        type: "PAYOUT",
        description: `Payout ${current.publicNumber}`,
      });
    }
    const row = await tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId } });
    if (next === "approved" || next === "paid") {
      await notifyUser(tx, {
        userId: current.userId,
        type: "system",
        title: next === "paid" ? "Payout to‘landi" : "Payout tasdiqlandi",
        message: `${current.publicNumber} — ${current.amount.toLocaleString("uz-UZ")} so‘m`,
        link: "/seller/finance",
        eventKey: `payout-${next}:${payoutId}`,
      });
    }
    await writeAuditLog(
      {
        actorId,
        actorRole: "super_admin",
        action: "payout_update",
        entityType: "payout",
        entityId: payoutId,
        oldValue: { status: current.status },
        newValue: { status: next, reason: reason ?? null },
      },
      tx,
    );
    return row;
  });

  return updated;
}
