import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPlatformSettingsRaw } from "@/lib/platform-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { serverEnv } from "@/lib/env.server";

export type RuntimeSettings = {
  defaultCommission: number;
  minPayout: number;
  returnDays: number;
  otpExpiryMinutes: number;
  otpResendSeconds: number;
  otpMaxAttempts: number;
  otpMaxRequestsPerHour: number;
  codEnabled: boolean;
  clickEnabled: boolean;
  paymeEnabled: boolean;
  reviewModeration: boolean;
  sellerAutoApproval: boolean;
  orderAutoCancelMinutes: number;
  payoutHoldDays: number;
};

const DEFAULTS: RuntimeSettings = {
  defaultCommission: 10,
  minPayout: 50_000,
  returnDays: 14,
  otpExpiryMinutes: 5,
  otpResendSeconds: 60,
  otpMaxAttempts: 5,
  otpMaxRequestsPerHour: 5,
  codEnabled: true,
  clickEnabled: true,
  paymeEnabled: true,
  reviewModeration: true,
  sellerAutoApproval: false,
  orderAutoCancelMinutes: 30,
  payoutHoldDays: 7,
};

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const platform = getPlatformSettingsRaw();
  let siteCommission = DEFAULTS.defaultCommission;
  try {
    const site = await getSiteSettings();
    siteCommission = site.commissionPercent;
  } catch {
    /* ignore */
  }

  let stored: Partial<RuntimeSettings> = {};
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "marketplace" } });
    if (row && typeof row.value === "object" && row.value) {
      stored = row.value as Partial<RuntimeSettings>;
    }
  } catch {
    /* table may not exist yet */
  }

  return {
    ...DEFAULTS,
    defaultCommission: Number(stored.defaultCommission ?? siteCommission),
    minPayout: Number(stored.minPayout ?? DEFAULTS.minPayout),
    returnDays: Number(stored.returnDays ?? DEFAULTS.returnDays),
    otpExpiryMinutes: Number(stored.otpExpiryMinutes ?? serverEnv.auth.otpTtlMinutes ?? DEFAULTS.otpExpiryMinutes),
    otpResendSeconds: Number(stored.otpResendSeconds ?? serverEnv.auth.otpResendCooldownSec ?? DEFAULTS.otpResendSeconds),
    otpMaxAttempts: Number(stored.otpMaxAttempts ?? serverEnv.auth.otpMaxVerifyAttempts ?? DEFAULTS.otpMaxAttempts),
    otpMaxRequestsPerHour: Number(stored.otpMaxRequestsPerHour ?? serverEnv.rateLimit.otpSendPhoneMax ?? DEFAULTS.otpMaxRequestsPerHour),
    codEnabled: stored.codEnabled ?? platform.cashPaymentEnabled,
    clickEnabled: stored.clickEnabled ?? DEFAULTS.clickEnabled,
    paymeEnabled: stored.paymeEnabled ?? DEFAULTS.paymeEnabled,
    reviewModeration: stored.reviewModeration ?? DEFAULTS.reviewModeration,
    sellerAutoApproval: stored.sellerAutoApproval ?? DEFAULTS.sellerAutoApproval,
    orderAutoCancelMinutes: Number(stored.orderAutoCancelMinutes ?? DEFAULTS.orderAutoCancelMinutes),
    payoutHoldDays: Number(stored.payoutHoldDays ?? platform.payoutHoldDays),
  };
}

export async function setRuntimeSettings(
  patch: Partial<RuntimeSettings>,
  actorId?: string,
  tx?: Prisma.TransactionClient,
): Promise<RuntimeSettings> {
  const db = tx ?? prisma;
  const current = await getRuntimeSettings();
  const next = { ...current, ...patch };
  await db.systemSetting.upsert({
    where: { key: "marketplace" },
    create: { key: "marketplace", value: next, updatedBy: actorId ?? null },
    update: { value: next, updatedBy: actorId ?? null },
  });
  return next;
}
