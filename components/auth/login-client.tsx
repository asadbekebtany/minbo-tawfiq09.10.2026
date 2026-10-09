"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Phone, KeyRound, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";
import { postLoginPath } from "@/lib/post-login-path";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";

type Step = "phone" | "code";

type AuthConfig = {
  otpDemoMode: boolean;
  otpTtlMinutes?: number;
  otpResendCooldownSec?: number;
  smsConfigured: boolean;
  databaseConfigured?: boolean;
  databaseConnected?: boolean;
  databaseMessage?: string;
};

type SendOtpResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  demoMode?: boolean;
  expiresAt?: string;
  expiresInSec?: number;
  retryAfterSec?: number;
  resendCooldownSec?: number;
  rateLimited?: boolean;
};

type VerifyOtpResponse = {
  verified?: boolean;
  error?: string;
  expired?: boolean;
  attemptsLeft?: number;
  retryAfterSec?: number;
  rateLimited?: boolean;
  userId?: string;
  isNewUser?: boolean;
  role?: string;
  code?: string;
};

function formatCountdown(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/auth/config", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as AuthConfig & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Kirish sozlamalarini yuklab bo‘lmadi");
        }
        setAuthConfig(data);
      })
      .catch((err: unknown) => {
        setConfigError(
          err instanceof Error ? err.message : "Kirish sozlamalarini yuklab bo‘lmadi",
        );
      });
  }, []);

  useEffect(() => {
    if (!otpExpiresAt && !resendAvailableAt) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [otpExpiresAt, resendAvailableAt]);

  const remainingSec =
    otpExpiresAt !== null
      ? Math.max(0, Math.floor((otpExpiresAt - now) / 1000))
      : 0;

  const resendCooldownSec =
    resendAvailableAt !== null
      ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
      : 0;

  const isOtpExpired =
    !authConfig?.otpDemoMode &&
    authConfig?.smsConfigured &&
    otpExpiresAt !== null &&
    remainingSec <= 0;

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 7) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  };

  const applySendOtpSuccess = (data: SendOtpResponse) => {
    if (data.demoMode) {
      setAuthConfig((prev) =>
        prev ? { ...prev, otpDemoMode: true, smsConfigured: false } : prev,
      );
      setOtpExpiresAt(null);
    } else if (data.expiresAt) {
      setOtpExpiresAt(new Date(data.expiresAt).getTime());
    } else if (typeof data.expiresInSec === "number") {
      setOtpExpiresAt(Date.now() + data.expiresInSec * 1000);
    } else {
      const ttlMinutes = authConfig?.otpTtlMinutes ?? 5;
      setOtpExpiresAt(Date.now() + ttlMinutes * 60 * 1000);
    }

    const cooldown =
      data.resendCooldownSec ?? authConfig?.otpResendCooldownSec ?? 60;
    setResendAvailableAt(Date.now() + cooldown * 1000);
    setStep("code");
  };

  const handleSendCode = async () => {
    if (phone.replace(/\D/g, "").length < 9) {
      setError("To'g'ri telefon raqam kiriting");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });

      const data = (await response.json()) as SendOtpResponse;

      if (!response.ok) {
        if (typeof data.retryAfterSec === "number") {
          setResendAvailableAt(Date.now() + data.retryAfterSec * 1000);
        }
        throw new Error(data.error ?? "Kod yuborib bo'lmadi");
      }

      applySendOtpSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kod yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldownSec > 0) return;
    setCode("");
    setError("");
    await handleSendCode();
  };

  const handleVerify = async () => {
    if (code.length < 4) {
      setError("Kodni to'liq kiriting");
      return;
    }

    if (isOtpExpired) {
      setError("Kod muddati tugagan. Yangi kod so'ring.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          code,
        }),
      });

      const verifyData = (await verifyResponse.json()) as VerifyOtpResponse;

      if (!verifyResponse.ok) {
        if (
          verifyData.rateLimited &&
          typeof verifyData.retryAfterSec === "number"
        ) {
          setResendAvailableAt(Date.now() + verifyData.retryAfterSec * 1000);
        }
        setError(verifyData.error ?? "Kod noto'g'ri yoki muddati tugagan.");
        if (verifyData.expired) {
          setOtpExpiresAt(Date.now());
        }
        return;
      }

      const result = await signIn("credentials", {
        phone: phone.replace(/\D/g, ""),
        code,
        redirect: false,
      });

      if (result?.error) {
        if (authConfig?.databaseConfigured && !authConfig?.databaseConnected) {
          setError(
            "Ma'lumotlar bazasiga ulanish yo'q. PostgreSQL ishga tushiring va qayta urinib ko'ring.",
          );
        } else {
          setError(
            "Kirishda xatolik yuz berdi. Hisob bazada saqlanmagan bo'lishi mumkin — qayta urinib ko'ring.",
          );
        }
        return;
      }

      let role = verifyData.role;
      if (!role) {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await sessionRes.json()) as { user?: { role?: string } };
        role = session.user?.role;
      }

      try {
        await useFavoritesStore.getState().syncWithSession();
        await useCartStore.getState().syncWithSession();
      } catch {
        // Savat va sevimlilar sinxroni kirishni to‘xtatmaydi.
      }

      router.push(postLoginPath(role, searchParams.get("from")));
      router.refresh();
    } catch {
      setError("Kodni tekshirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex w-fit items-center justify-center rounded-2xl bg-[#002d21] p-3 shadow-lg ring-1 ring-[#f5b51b]/40">
          <BrandEmblem className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">
          <BrandName variant="light" className="text-2xl" />
        </h1>
        <p className="text-gray-500 text-sm mt-1">Avtomobil ehtiyot qismlari</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {configError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {configError}
          </div>
        ) : !authConfig ? (
          <div className="grid min-h-[220px] place-items-center">
            <Loader2 className="animate-spin text-[#004733]" size={28} />
          </div>
        ) : (
          <>
            {authConfig.databaseConfigured && !authConfig.databaseConnected ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {authConfig.databaseMessage ??
                  "PostgreSQL bazasiga ulanish yo‘q. Ma’lumotlar vaqtincha xotirada saqlanadi."}
              </div>
            ) : null}
            {step === "phone" ? (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Kirish</h2>
            <p className="text-sm text-gray-500 mb-5">Telefon raqamingizni kiriting</p>

            <div className="mb-4">
              <label htmlFor="login-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Telefon raqam</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-phone"
                  aria-label="Telefon raqam"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setError("");
                  }}
                  placeholder="+998 90 123 45 67"
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004733] transition-colors"
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] py-3 rounded-xl font-bold hover:from-[#ffc733] hover:to-[#f5b51b] transition-all disabled:opacity-70"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
              {loading ? "Yuborilmoqda..." : <>Kod yuborish <ArrowRight size={16} /></>}
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Kodni tasdiqlang</h2>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-900">{phone}</span> raqamiga kod yuborildi
            </p>
            {authConfig.otpDemoMode ? (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-5">
                Demo rejim: SMS o‘rniga <strong>OTP_DEMO_CODES</strong> (.env) dagi kodlardan foydalaning.
              </p>
            ) : authConfig.smsConfigured ? (
              <div className="mb-5 space-y-2">
                <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Telefoningizga yuborilgan SMS kodni kiriting.
                </p>
                {otpExpiresAt !== null ? (
                  isOtpExpired ? (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      Kod muddati tugagan. Yangi kod so‘ring.
                    </p>
                  ) : (
                    <p className="text-xs text-[#004733] bg-[#004733]/5 px-3 py-2 rounded-lg">
                      Kod amal qiladi:{" "}
                      <span className="font-semibold tabular-nums">
                        {formatCountdown(remainingSec)}
                      </span>
                    </p>
                  )
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-5">
                OTP sozlanmagan. Administrator bilan bog‘laning.
              </p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">SMS kod</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setError("");
                  }}
                  placeholder="••••"
                  maxLength={4}
                  disabled={isOtpExpired}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004733] text-center text-xl tracking-widest font-bold transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || code.length < 4 || isOtpExpired}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] py-3 rounded-xl font-bold hover:from-[#ffc733] hover:to-[#f5b51b] transition-all disabled:opacity-70"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
              {loading ? "Tekshirilmoqda..." : "Kirish ✓"}
            </button>

            <button
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
                setOtpExpiresAt(null);
                setResendAvailableAt(null);
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 mt-3 py-1"
            >
              ← Raqamni o'zgartirish
            </button>

            {!authConfig.otpDemoMode && authConfig.smsConfigured ? (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || resendCooldownSec > 0}
                className="w-full text-sm text-[#004733] hover:underline mt-1 py-1 disabled:opacity-60 disabled:no-underline"
              >
                {resendCooldownSec > 0
                  ? `Qayta yuborish (${resendCooldownSec}s)`
                  : isOtpExpired
                    ? "Yangi kod yuborish"
                    : "Kodni qayta yuborish"}
              </button>
            ) : null}
          </div>
        )}
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Kirishda siz{" "}
        <a href="/terms" className="underline hover:text-gray-600">foydalanish shartlari</a>
        {" "}va{" "}
        <a href="/privacy" className="underline hover:text-gray-600">maxfiylik siyosati</a>
        ga rozilik bildirasiz
      </p>
    </div>
  );
}
