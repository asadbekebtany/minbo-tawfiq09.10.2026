import { NextResponse } from "next/server";
import { getRuntimeSettings } from "@/lib/system-settings";
import { getPlatformSettingsRaw } from "@/lib/platform-settings";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = await getRuntimeSettings();
  const settings = getPlatformSettingsRaw();
  return NextResponse.json({
    cashEnabled: runtime.codEnabled,
    cardEnabled: settings.cardPaymentEnabled,
    paymeEnabled: runtime.paymeEnabled,
    clickEnabled: runtime.clickEnabled,
    smsRealEnabled: false,
    paymeConfigured: serverEnv.payme.isConfigured,
    clickConfigured: Boolean(serverEnv.click?.isConfigured),
    minOrderAmount: settings.minOrderAmount,
    returnDays: runtime.returnDays,
    minPayout: runtime.minPayout,
  });
}
