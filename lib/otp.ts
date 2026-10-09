import crypto from "node:crypto";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { getRuntimeSettings } from "@/lib/system-settings";

async function otpPolicy() {
  const settings = await getRuntimeSettings();
  return {
    ttlMinutes: settings.otpExpiryMinutes,
    ttlMs: settings.otpExpiryMinutes * 60 * 1000,
    resendCooldownSec: settings.otpResendSeconds,
    resendCooldownMs: settings.otpResendSeconds * 1000,
    maxAttempts: settings.otpMaxAttempts,
  };
}

function hashOtp(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:${serverEnv.auth.secret}`)
    .digest("hex");
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(1000, 10000));
}

export async function issuePhoneOtp(
  phoneRaw: string,
): Promise<{ phone: string; code: string; expiresAt: Date }> {
  const phone = normalizePhone(phoneRaw);
  const policy = await otpPolicy();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + policy.ttlMs);

  await prisma.phoneOtp.deleteMany({ where: { phone } });
  await prisma.phoneOtp.create({
    data: {
      phone,
      codeHash: hashOtp(phone, code),
      expiresAt,
    },
  });

  return { phone, code, expiresAt };
}

export type OtpVerifyResult =
  | { valid: true }
  | {
      valid: false;
      message: string;
      expired?: boolean;
      attemptsLeft?: number;
    };

type VerifyPhoneOtpOptions = {
  /** false bo'lsa kod tekshiriladi, lekin bazadan o'chirilmaydi (signIn oldidan UI tekshiruvi) */
  consume?: boolean;
};

export async function verifyPhoneOtp(
  phoneRaw: string,
  code: string,
  options: VerifyPhoneOtpOptions = {},
): Promise<OtpVerifyResult> {
  const { consume = true } = options;
  const phone = normalizePhone(phoneRaw);
  const trimmedCode = code.trim();

  if (!(await checkDatabaseConnection())) {
    return {
      valid: false,
      message: "Ma'lumotlar bazasiga ulanish yo'q. OTP tekshirib bo'lmadi.",
    };
  }

  const record = await prisma.phoneOtp.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return {
      valid: false,
      message: "Tasdiqlash kodi topilmadi. Yangi kod so'rang.",
    };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.phoneOtp.delete({ where: { id: record.id } });
    return {
      valid: false,
      message: "Kod muddati tugagan. Yangi kod so'rang.",
      expired: true,
    };
  }

  const policy = await otpPolicy();
  if (record.attempts >= policy.maxAttempts) {
    await prisma.phoneOtp.delete({ where: { id: record.id } });
    return {
      valid: false,
      message: "Juda ko'p noto'g'ri urinish. Yangi kod so'rang.",
      attemptsLeft: 0,
    };
  }

  if (record.codeHash !== hashOtp(phone, trimmedCode)) {
    const nextAttempts = record.attempts + 1;
    await prisma.phoneOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const attemptsLeft = Math.max(0, policy.maxAttempts - nextAttempts);
    return {
      valid: false,
      message:
        attemptsLeft > 0
          ? `Kod noto'g'ri. ${attemptsLeft} ta urinish qoldi.`
          : "Juda ko'p noto'g'ri urinish. Yangi kod so'rang.",
      attemptsLeft,
    };
  }

  if (consume) {
    await prisma.phoneOtp.delete({ where: { id: record.id } });
  }

  return { valid: true };
}

export async function getPhoneOtpStatus(
  phoneRaw: string,
): Promise<
  | { active: false }
  | { active: true; expiresAt: Date; remainingSec: number; attemptsLeft: number }
> {
  const phone = normalizePhone(phoneRaw);

  if (!(await checkDatabaseConnection())) {
    return { active: false };
  }

  const record = await prisma.phoneOtp.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { active: false };
  }

  const remainingMs = record.expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) {
    await prisma.phoneOtp.delete({ where: { id: record.id } });
    return { active: false };
  }

  return {
    active: true,
    expiresAt: record.expiresAt,
    remainingSec: Math.ceil(remainingMs / 1000),
    attemptsLeft: Math.max(0, (await otpPolicy()).maxAttempts - record.attempts),
  };
}

export async function canResendOtp(
  phoneRaw: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const phone = normalizePhone(phoneRaw);
  const policy = await otpPolicy();
  const resendCooldownMs = policy.resendCooldownMs;

  const last = await prisma.phoneOtp.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (!last) {
    return { allowed: true };
  }

  const elapsed = Date.now() - last.createdAt.getTime();
  if (elapsed < resendCooldownMs) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((resendCooldownMs - elapsed) / 1000),
    };
  }

  return { allowed: true };
}

export async function getOtpPolicy() {
  const policy = await otpPolicy();
  return {
    ttlMinutes: policy.ttlMinutes,
    ttlMs: policy.ttlMs,
    resendCooldownSec: policy.resendCooldownSec,
    maxAttempts: policy.maxAttempts,
  };
}
