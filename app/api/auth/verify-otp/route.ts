import { NextResponse } from "next/server";
import { z } from "zod";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { getPhoneOtpStatus, verifyPhoneOtp } from "@/lib/otp";
import { isValidUzPhone, normalizePhone } from "@/lib/phone";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { rateLimitExceededResponse } from "@/lib/rate-limit-response";
import { getClientIp } from "@/lib/request-ip";
import { allowSmsMock } from "@/lib/providers/errors";
import {
  persistUserAfterOtpVerification,
  UserPersistenceError,
} from "@/lib/users";

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(9, "Telefon raqam kiriting")
    .max(20, "Telefon raqam juda uzun"),
  code: z
    .string()
    .trim()
    .min(4, "Kod kamida 4 raqamdan iborat bo'lishi kerak")
    .max(6, "Kod juda uzun"),
});

async function persistAndRespond(
  phone: string,
  extra: Record<string, unknown> = {},
) {
  const user = await persistUserAfterOtpVerification(phone);

  return NextResponse.json({
    verified: true,
    userId: user.id,
    isNewUser: user.isNewUser,
    role: user.role,
    ...extra,
  });
}

function userPersistenceErrorResponse(error: UserPersistenceError) {
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
    },
    { status: error.code === "db_unavailable" ? 503 : 500 },
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "So'rov ma'lumotlari noto'g'ri";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    const code = parsed.data.code;

    if (!isValidUzPhone(phone)) {
      return NextResponse.json(
        { error: "O'zbekiston telefon raqamini to'g'ri kiriting (+998...)" },
        { status: 400 },
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = await enforceAuthRateLimit({
      scope: "otp-verify",
      ip: clientIp,
      phone,
    });
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    if (serverEnv.auth.otpDemoEnabled) {
      if (serverEnv.auth.otpDemoCodes.includes(code)) {
        try {
          return await persistAndRespond(phone, { demoMode: true });
        } catch (error) {
          if (error instanceof UserPersistenceError) {
            return userPersistenceErrorResponse(error);
          }
          throw error;
        }
      }

      return NextResponse.json(
        {
          error:
            "Kod noto'g'ri. .env faylidagi OTP_DEMO_CODES qiymatlaridan foydalaning.",
        },
        { status: 401 },
      );
    }

    if (!serverEnv.sms.isConfigured && !allowSmsMock(serverEnv.appEnv)) {
      return NextResponse.json(
        { error: "SMS xizmati sozlanmagan. Administrator bilan bog'laning." },
        { status: 503 },
      );
    }

    if (!(await checkDatabaseConnection())) {
      return NextResponse.json(
        {
          error:
            "Ma'lumotlar bazasiga ulanish yo'q. OTP tekshirib bo'lmadi.",
        },
        { status: 503 },
      );
    }

    const result = await verifyPhoneOtp(phone, code, { consume: false });

    if (!result.valid) {
      const status = await getPhoneOtpStatus(phone);
      return NextResponse.json(
        {
          error: result.message,
          expired: result.expired ?? false,
          attemptsLeft: result.attemptsLeft,
          remainingSec: status.active ? status.remainingSec : 0,
        },
        { status: 401 },
      );
    }

    try {
      const user = await persistUserAfterOtpVerification(phone);
      const status = await getPhoneOtpStatus(phone);

      return NextResponse.json({
        verified: true,
        userId: user.id,
        isNewUser: user.isNewUser,
        role: user.role,
        remainingSec: status.active ? status.remainingSec : 0,
      });
    } catch (error) {
      if (error instanceof UserPersistenceError) {
        return userPersistenceErrorResponse(error);
      }
      throw error;
    }
  } catch {
    return NextResponse.json(
      { error: "Kodni tekshirishda kutilmagan xatolik yuz berdi" },
      { status: 500 },
    );
  }
}
