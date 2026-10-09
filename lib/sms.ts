import { serverEnv } from "@/lib/env.server";
import { getSmsProvider } from "@/lib/providers/sms-provider";
import { ProviderMockForbiddenError } from "@/lib/providers/errors";

type SendSmsResult = { ok: true } | { ok: false; error: string };

export async function sendSmsOtp(
  phone: string,
  code: string,
): Promise<SendSmsResult> {
  try {
    if (serverEnv.isProduction && !serverEnv.sms.isConfigured) {
      return { ok: false, error: "SMS sozlamalari to'liq emas" };
    }
    const sent = await getSmsProvider().sendOtp(phone, code);
    if (!sent.ok) {
      return { ok: false, error: sent.error ?? "SMS yuborilmadi" };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof ProviderMockForbiddenError) {
      return { ok: false, error: "SMS xizmati sozlanmagan" };
    }
    return { ok: false, error: "SMS yuborish vaqtida tarmoq xatosi" };
  }
}
