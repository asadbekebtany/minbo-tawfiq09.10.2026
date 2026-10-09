"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Save,
  Settings2,
  XCircle,
} from "lucide-react";
import { formatUtc } from "@/components/super-admin/format-ts";

type PlatformSettings = {
  maintenanceMode: boolean;
  allowNewSellerRegistration: boolean;
  allowReviews: boolean;
  allowReturns: boolean;
  cashPaymentEnabled: boolean;
  cardPaymentEnabled: boolean;
  paymeEnabled: boolean;
  clickEnabled: boolean;
  smsOtpEnabled: boolean;
  demoOtpAllowed: boolean;
  minOrderAmount: number;
  maxUploadMb: number;
  lowStockThreshold: number;
  payoutHoldDays: number;
  updatedAt: string;
  updatedBy: string | null;
};

type Gateways = {
  paymeConfigured: boolean;
  clickConfigured: boolean;
  smsConfigured: boolean;
  databaseConfigured: boolean;
  adminApiLocked: boolean;
};

type BoolKey = {
  [K in keyof PlatformSettings]: PlatformSettings[K] extends boolean ? K : never;
}[keyof PlatformSettings];

const BOOL_FIELDS: Array<{ key: BoolKey; label: string; hint?: string }> = [
  { key: "maintenanceMode", label: "Maintenance mode", hint: "Saytni vaqtincha yopish" },
  { key: "allowNewSellerRegistration", label: "Yangi seller ro‘yxatdan o‘tishi" },
  { key: "allowReviews", label: "Sharhlar yoqilgan" },
  { key: "allowReturns", label: "Qaytarishlar yoqilgan" },
  { key: "cashPaymentEnabled", label: "Naqd to‘lov" },
  { key: "cardPaymentEnabled", label: "Karta to‘lov" },
  { key: "paymeEnabled", label: "Payme (UI)", hint: "Faqat secret sozlanganda ishlaydi" },
  { key: "clickEnabled", label: "Click (UI)", hint: "Faqat secret sozlanganda ishlaydi" },
  { key: "smsOtpEnabled", label: "SMS OTP" },
  { key: "demoOtpAllowed", label: "Demo OTP ruxsati", hint: "Dev/test uchun" },
];

export function SuperAdminPlatformClient() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [gateways, setGateways] = useState<Gateways | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/platform", { cache: "no-store" });
      const data = (await res.json()) as {
        settings?: PlatformSettings;
        gateways?: Gateways;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setSettings(data.settings ?? null);
      setGateways(data.gateways ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as {
        settings?: PlatformSettings;
        gateways?: Gateways;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setSettings(data.settings ?? settings);
      if (data.gateways) setGateways(data.gateways);
      setMessage("Platforma sozlamalari saqlandi");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#1a0533]" size={32} />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "Sozlamalar topilmadi"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[#3b0764]">
            <Settings2 size={20} />
            <h1 className="text-2xl font-black text-gray-900">Platforma sozlamalari</h1>
          </div>
          <p className="text-sm text-gray-500">
            To‘lov kanallari, OTP, seller ochish, maintenance — Wildberries uslubidagi operatsion
            flaglar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1a0533] to-[#3b0764] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Saqlash
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {gateways ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Database", gateways.databaseConfigured],
              ["SMS API", gateways.smsConfigured],
              ["Payme secrets", gateways.paymeConfigured],
              ["Click secrets", gateways.clickConfigured],
              ["Admin API ochiq", !gateways.adminApiLocked],
            ] as const
          ).map(([label, ok]) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm"
            >
              {ok ? (
                <CheckCircle2 size={15} className="text-emerald-600" />
              ) : (
                <XCircle size={15} className="text-red-500" />
              )}
              <span className="font-medium text-gray-800">{label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#3b0764]/10 bg-white p-5">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-500">Flaglar</h2>
        <div className="space-y-3">
          {BOOL_FIELDS.map(({ key, label, hint }) => (
            <label
              key={key}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) =>
                  setSettings((prev) => (prev ? { ...prev, [key]: e.target.checked } : prev))
                }
                className="mt-1 h-4 w-4 accent-[#3b0764]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#3b0764]/10 bg-white p-5">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-500">Raqamlar</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["minOrderAmount", "Min buyurtma (so‘m)"],
              ["maxUploadMb", "Max upload (MB)"],
              ["lowStockThreshold", "Past zaxira chegarasi"],
              ["payoutHoldDays", "Payout hold (kun)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">{label}</span>
              <input
                type="number"
                min={0}
                value={settings[key]}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, [key]: Number(e.target.value) || 0 } : prev,
                  )
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[#3b0764]"
              />
            </label>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Oxirgi yangilanish: {settings.updatedAt ? formatUtc(settings.updatedAt) : "—"}
      </p>

      <MarketplaceSettingsBlock />
    </div>
  );
}

type MarketplaceSettings = {
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

function MarketplaceSettingsBlock() {
  const [settings, setSettings] = useState<MarketplaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/super-admin/marketplace-settings", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Yuklanmadi");
        setSettings(data.settings);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Yuklanmadi");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/super-admin/marketplace-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setSettings(data.settings);
      setOk("Marketplace sozlamalari (SystemSetting) saqlandi");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Marketplace sozlamalari yuklanmoqda...</p>;
  }
  if (!settings) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "SystemSetting topilmadi"}
      </div>
    );
  }

  const nums: Array<[keyof MarketplaceSettings, string]> = [
    ["defaultCommission", "Komissiya %"],
    ["minPayout", "Minimal payout"],
    ["returnDays", "Qaytarish kuni"],
    ["otpExpiryMinutes", "OTP muddati (min)"],
    ["otpResendSeconds", "OTP qayta yuborish (sek)"],
    ["otpMaxAttempts", "OTP max urinish"],
    ["otpMaxRequestsPerHour", "OTP soatiga max"],
    ["orderAutoCancelMinutes", "Auto-cancel (min)"],
    ["payoutHoldDays", "Payout hold (kun)"],
  ];
  const flags: Array<[keyof MarketplaceSettings, string]> = [
    ["codEnabled", "Naqd (COD)"],
    ["clickEnabled", "Click"],
    ["paymeEnabled", "Payme"],
    ["reviewModeration", "Sharh moderatsiyasi"],
    ["sellerAutoApproval", "Seller auto-approval"],
  ];

  return (
    <div className="rounded-2xl border border-[#3b0764]/10 bg-white p-5">
      <h2 className="mb-1 text-sm font-black uppercase tracking-wider text-gray-500">
        Marketplace (SystemSetting)
      </h2>
      <p className="mb-4 text-xs text-gray-400">Hardcode emas — `marketplace` kaliti bilan saqlanadi.</p>
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {ok ? (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {nums.map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">{label}</span>
            <input
              type="number"
              value={Number(settings[key])}
              onChange={(e) =>
                setSettings((prev) =>
                  prev ? { ...prev, [key]: Number(e.target.value) } : prev,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[#3b0764]"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {flags.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-2">
            <span className="text-sm font-medium text-gray-800">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key])}
              onChange={(e) =>
                setSettings((prev) => (prev ? { ...prev, [key]: e.target.checked } : prev))
              }
              className="h-4 w-4 accent-[#3b0764]"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 rounded-xl bg-[#1a0533] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saqlanmoqda..." : "SystemSetting saqlash"}
      </button>
    </div>
  );
}
