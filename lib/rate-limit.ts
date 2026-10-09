import "server-only";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import prisma from "@/lib/prisma";
import { getRuntimeSettings } from "@/lib/system-settings";

const RETENTION_MS = 24 * 60 * 60 * 1000;

export type RateLimitScope = "otp-send" | "otp-verify" | "auth-signin";

export type RateLimitCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterSec: number;
      message: string;
      scope: "ip" | "phone";
    };

type RateLimitRule = {
  bucketKey: string;
  max: number;
  windowMs: number;
  scope: "ip" | "phone";
  actionLabel: string;
};

function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

async function getRulesForScope(
  scope: RateLimitScope,
  ip: string,
  phone?: string,
): Promise<RateLimitRule[]> {
  const limits = serverEnv.rateLimit;
  const runtime = scope === "otp-send" ? await getRuntimeSettings() : null;
  const rules: RateLimitRule[] = [];

  if (scope === "otp-send") {
    rules.push({
      bucketKey: `otp-send:ip:${ip}`,
      max: limits.otpSendIpMax,
      windowMs: minutesToMs(limits.otpSendIpWindowMin),
      scope: "ip",
      actionLabel: "SMS kod yuborish",
    });
    if (phone) {
      rules.push({
        bucketKey: `otp-send:phone:${phone}`,
        max: runtime?.otpMaxRequestsPerHour ?? limits.otpSendPhoneMax,
        windowMs: minutesToMs(limits.otpSendPhoneWindowMin),
        scope: "phone",
        actionLabel: "SMS kod yuborish",
      });
    }
  }

  if (scope === "otp-verify") {
    rules.push({
      bucketKey: `otp-verify:ip:${ip}`,
      max: limits.otpVerifyIpMax,
      windowMs: minutesToMs(limits.otpVerifyIpWindowMin),
      scope: "ip",
      actionLabel: "kod tekshirish",
    });
    if (phone) {
      rules.push({
        bucketKey: `otp-verify:phone:${phone}`,
        max: limits.otpVerifyPhoneMax,
        windowMs: minutesToMs(limits.otpVerifyPhoneWindowMin),
        scope: "phone",
        actionLabel: "kod tekshirish",
      });
    }
  }

  if (scope === "auth-signin") {
    rules.push({
      bucketKey: `auth-signin:ip:${ip}`,
      max: limits.authSigninIpMax,
      windowMs: minutesToMs(limits.authSigninIpWindowMin),
      scope: "ip",
      actionLabel: "kirish",
    });
    if (phone) {
      rules.push({
        bucketKey: `auth-signin:phone:${phone}`,
        max: limits.authSigninPhoneMax,
        windowMs: minutesToMs(limits.authSigninPhoneWindowMin),
        scope: "phone",
        actionLabel: "kirish",
      });
    }
  }

  return rules;
}

async function peekRule(
  rule: RateLimitRule,
): Promise<RateLimitCheckResult> {
  const windowStart = new Date(Date.now() - rule.windowMs);

  const count = await prisma.authRateLimitEvent.count({
    where: {
      bucketKey: rule.bucketKey,
      createdAt: { gte: windowStart },
    },
  });

  if (count < rule.max) {
    return { allowed: true };
  }

  const oldest = await prisma.authRateLimitEvent.findFirst({
    where: {
      bucketKey: rule.bucketKey,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const retryAfterSec = oldest
    ? Math.max(
        1,
        Math.ceil(
          (oldest.createdAt.getTime() + rule.windowMs - Date.now()) / 1000,
        ),
      )
    : Math.ceil(rule.windowMs / 1000);

  const target =
    rule.scope === "ip"
      ? "IP manzildan"
      : "ushbu telefon raqam uchun";

  return {
    allowed: false,
    retryAfterSec,
    scope: rule.scope,
    message: `${target} ${rule.actionLabel} chegarasi oshdi. ${retryAfterSec} soniyadan keyin qayta urinib ko'ring.`,
  };
}

async function recordRules(rules: RateLimitRule[]): Promise<void> {
  if (rules.length === 0) return;

  await prisma.authRateLimitEvent.createMany({
    data: rules.map((rule) => ({ bucketKey: rule.bucketKey })),
  });

  if (Math.random() < 0.02) {
    void prisma.authRateLimitEvent
      .deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
      })
      .catch(() => undefined);
  }
}

export async function enforceAuthRateLimit(params: {
  scope: RateLimitScope;
  ip: string;
  phone?: string;
}): Promise<RateLimitCheckResult> {
  if (!(await checkDatabaseConnection())) {
    return { allowed: true };
  }

  const rules = await getRulesForScope(params.scope, params.ip, params.phone);

  for (const rule of rules) {
    const result = await peekRule(rule);
    if (!result.allowed) {
      return result;
    }
  }

  await recordRules(rules);
  return { allowed: true };
}

export function getRateLimitPolicy() {
  const limits = serverEnv.rateLimit;
  return {
    otpMaxVerifyAttempts: limits.otpMaxVerifyAttempts,
    otpSendIpMax: limits.otpSendIpMax,
    otpSendPhoneMax: limits.otpSendPhoneMax,
    otpVerifyIpMax: limits.otpVerifyIpMax,
    otpVerifyPhoneMax: limits.otpVerifyPhoneMax,
  };
}
