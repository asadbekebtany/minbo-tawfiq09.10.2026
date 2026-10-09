"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { ArrowRight, KeyRound, Loader2, Phone, RefreshCw } from "lucide-react";
import { isSuperAdminSession } from "@/lib/demo-staff";
import { normalizePhone } from "@/lib/phone";

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
  retryAfterSec?: number;
  rateLimited?: boolean;
  role?: string;
};

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  }
  if (digits.length <= 9) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
}

export function SuperAdminLoginClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

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

  const handleSendCode = async () => {
    if (phone.replace(/\D/g, "").length < 9) {
      setError("To'g'ri telefon raqam kiriting");
      return;
    }

    setLoading(true);
    setError("");
    setForbidden(false);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      const data = (await response.json()) as SendOtpResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Kod yuborib bo'lmadi");
      }
      setStep("code");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kod yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 4) {
      setError("Kodni to'liq kiriting");
      return;
    }

    setLoading(true);
    setError("");
    setForbidden(false);

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
        setError(verifyData.error ?? "Kod noto'g'ri yoki muddati tugagan.");
        return;
      }

      const normalized = normalizePhone(phone.replace(/\D/g, ""));
      if (
        !isSuperAdminSession({
          role: verifyData.role,
          phone: normalized,
        })
      ) {
        setForbidden(true);
        setError("403 — Bu kirish faqat Super Admin uchun.");
        return;
      }

      const result = await signIn("credentials", {
        phone: phone.replace(/\D/g, ""),
        code,
        redirect: false,
      });

      if (result?.error) {
        setError("Kirishda xatolik yuz berdi. Qayta urinib ko'ring.");
        return;
      }

      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await sessionRes.json()) as {
        user?: { role?: string; phone?: string };
      };
      if (!isSuperAdminSession(session.user ?? {})) {
        await signOut({ redirect: false });
        setForbidden(true);
        setError("403 — Bu kirish faqat Super Admin uchun.");
        return;
      }

      router.push("/super-admin/dashboard");
      router.refresh();
    } catch {
      setError("Kodni tekshirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a0533] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f5b51b] to-[#d99a0a] text-sm font-black text-[#1a0533]">
            SA
          </div>
          <h1 className="text-2xl font-black text-white">Super Admin</h1>
          <p className="mt-1 text-sm text-white/60">Faqat Super Admin kirishi</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-sm">
          {configError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {configError}
            </div>
          ) : !authConfig ? (
            <div className="grid min-h-[220px] place-items-center">
              <Loader2 className="animate-spin text-[#3b0764]" size={28} />
            </div>
          ) : forbidden ? (
            <div>
              <h2 className="text-lg font-bold text-gray-900">403</h2>
              <p className="mt-2 text-sm text-gray-600">
                Bu hisob Super Admin emas. Kirish rad etildi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForbidden(false);
                  setError("");
                  setCode("");
                  setStep("phone");
                }}
                className="mt-5 w-full rounded-xl bg-[#1a0533] py-3 text-sm font-bold text-white"
              >
                Boshqa raqam bilan urinib ko‘rish
              </button>
            </div>
          ) : step === "phone" ? (
            <div>
              <h2 className="mb-1 text-lg font-bold text-gray-900">Kirish</h2>
              <p className="mb-5 text-sm text-gray-500">
                Super Admin telefon raqamini kiriting
              </p>
              <label htmlFor="sa-login-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                Telefon raqam
              </label>
              <div className="relative mb-4">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="sa-login-phone"
                  aria-label="Telefon raqam"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setError("");
                  }}
                  placeholder="+998 71 200 00 00"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm focus:border-[#3b0764] focus:outline-none"
                />
              </div>
              {error ? <p className="mb-3 text-xs text-red-500">{error}</p> : null}
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] py-3 font-bold text-[#1a0533] disabled:opacity-70"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
                {loading ? "Yuborilmoqda..." : <>Kod yuborish <ArrowRight size={16} /></>}
              </button>
            </div>
          ) : (
            <div>
              <h2 className="mb-1 text-lg font-bold text-gray-900">Kodni tasdiqlang</h2>
              <p className="mb-1 text-sm text-gray-500">
                <span className="font-medium text-gray-900">{phone}</span> raqamiga kod yuborildi
              </p>
              {authConfig.otpDemoMode ? (
                <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Demo rejim: OTP_DEMO_CODES dagi kodlardan foydalaning.
                </p>
              ) : null}
              <label className="mb-1.5 block text-sm font-medium text-gray-700">SMS kod</label>
              <div className="relative mb-4">
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
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-center text-xl font-bold tracking-widest focus:border-[#3b0764] focus:outline-none"
                />
              </div>
              {error ? <p className="mb-3 text-xs text-red-500">{error}</p> : null}
              <button
                type="button"
                onClick={() => void handleVerify()}
                disabled={loading || code.length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] py-3 font-bold text-[#1a0533] disabled:opacity-70"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
                {loading ? "Tekshirilmoqda..." : "Kirish ✓"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
                className="mt-3 w-full py-1 text-sm text-gray-500"
              >
                ← Raqamni o'zgartirish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
