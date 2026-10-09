import { NextResponse } from "next/server";
import { getDatabaseStatus } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { getOtpPolicy } from "@/lib/otp";

export async function GET() {
  const database = await getDatabaseStatus();
  const otpPolicy = await getOtpPolicy();

  return NextResponse.json({
    appEnv: serverEnv.appEnv,
    showEnvBanner: serverEnv.runtime.showEnvBanner,
    otpDemoMode: serverEnv.auth.otpDemoEnabled,
    otpTtlMinutes: otpPolicy.ttlMinutes,
    otpResendCooldownSec: otpPolicy.resendCooldownSec,
    smsConfigured: serverEnv.sms.isConfigured,
    cloudinaryConfigured: serverEnv.cloudinary.isConfigured,
    paymeConfigured: serverEnv.payme.isConfigured,
    clickConfigured: serverEnv.click.isConfigured,
    databaseConfigured: database.configured,
    databaseConnected: database.connected,
    databaseMessage: database.message,
  });
}
