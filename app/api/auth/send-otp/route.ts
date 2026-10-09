import { NextResponse } from "next/server";
import { z } from "zod";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { canResendOtp, getOtpPolicy, issuePhoneOtp } from "@/lib/otp";
import { isValidUzPhone, normalizePhone } from "@/lib/phone";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { rateLimitExceededResponse } from "@/lib/rate-limit-response";
import { getClientIp } from "@/lib/request-ip";
import { sendSmsOtp } from "@/lib/sms";

const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(9, "Telefon raqam kiriting")
    .max(20, "Telefon raqam juda uzun"),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Telefon raqam noto'g'ri";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);

    if (!isValidUzPhone(phone)) {
      return NextResponse.json(
        { error: "O'zbekiston telefon raqamini to'g'ri kiriting (+998...)" },
        { status: 400 },
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = await enforceAuthRateLimit({
      scope: "otp-send",
      ip: clientIp,
      phone,
    });
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    const otpPolicy = await getOtpPolicy();

    if (serverEnv.auth.otpDemoEnabled) {
      return NextResponse.json({
        success: true,
        demoMode: true,
        message: "Demo rejim: OTP_DEMO_CODES qiymatidan foydalaning.",
        otpTtlMinutes: otpPolicy.ttlMinutes,
        resendCooldownSec: otpPolicy.resendCooldownSec,
      });
    }

    const { allowSmsMock } = await import("@/lib/providers/errors");
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
            "Ma'lumotlar bazasiga ulanish yo'q. OTP saqlab bo'lmadi.",
        },
        { status: 503 },
      );
    }

    const resendCheck = await canResendOtp(phone);
    if (!resendCheck.allowed) {
      return NextResponse.json(
        {
          error: `Yangi kod so'rash uchun ${resendCheck.retryAfterSec} soniya kuting.`,
          retryAfterSec: resendCheck.retryAfterSec,
        },
        { status: 429 },
      );
    }

    const { code, expiresAt } = await issuePhoneOtp(phone);
    const smsResult = await sendSmsOtp(phone, code);

    if (!smsResult.ok) {
      return NextResponse.json({ error: smsResult.error }, { status: 502 });
    }

    const expiresInSec = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    );

    return NextResponse.json({
      success: true,
      demoMode: false,
      message: "Tasdiqlash kodi SMS orqali yuborildi.",
      expiresAt: expiresAt.toISOString(),
      expiresInSec,
      otpTtlMinutes: otpPolicy.ttlMinutes,
      resendCooldownSec: otpPolicy.resendCooldownSec,
    });
  } catch {
    return NextResponse.json(
      { error: "Kod yuborishda kutilmagan xatolik yuz berdi" },
      { status: 500 },
    );
  }
}
