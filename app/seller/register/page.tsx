"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, FileUp, Store } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings-constants";

export default function SellerRegisterPage() {
  const [sent, setSent] = useState(false);
  const [siteName, setSiteName] = useState(DEFAULT_SITE_SETTINGS.siteName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    inn: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.settings?.siteName) setSiteName(data.settings.siteName);
      })
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/seller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          inn: form.inn || null,
          phone: form.phone,
          email: form.email || null,
          address: form.address,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Arizani yuborib bo‘lmadi");
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Arizani yuborib bo‘lmadi");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <InfoPage
        title="Ariza qabul qilindi"
        description="Admin jamoasi hujjatlaringizni tekshiradi."
        icon={CheckCircle2}
      >
        <div className="rounded-2xl bg-green-50 p-6 text-green-800">
          Ariza muvaffaqiyatli yuborildi. Holati SMS orqali xabar qilinadi.
        </div>
      </InfoPage>
    );
  }

  return (
    <InfoPage
      title="Sotuvchi bo‘lish"
      description={`${siteName}’da do‘kon oching va O‘zbekiston bo‘ylab soting.`}
      icon={Store}
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Kompaniya nomi
          <input
            required
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="mt-1.5 w-full rounded-xl border px-3 py-3"
          />
        </label>
        <label className="text-sm font-semibold">
          STIR
          <input
            required
            value={form.inn}
            onChange={(e) => setForm({ ...form, inn: e.target.value })}
            className="mt-1.5 w-full rounded-xl border px-3 py-3"
          />
        </label>
        <label className="text-sm font-semibold">
          Telefon
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1.5 w-full rounded-xl border px-3 py-3"
            placeholder="+998"
          />
        </label>
        <label className="text-sm font-semibold">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1.5 w-full rounded-xl border px-3 py-3"
          />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Manzil
          <input
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1.5 w-full rounded-xl border px-3 py-3"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#b9c8bf] p-4 text-sm text-gray-600 md:col-span-2">
          <FileUp className="text-[#004733]" />
          Guvohnoma va rekvizit hujjatlarini tanlash
          <input type="file" className="hidden" multiple />
        </label>
        {error ? (
          <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#d99a0a] px-5 py-3 font-black text-[#002d21] md:col-span-2 disabled:opacity-60"
        >
          <Building2 size={18} />
          {loading ? "Yuborilmoqda..." : "Arizani yuborish"}
        </button>
      </form>
    </InfoPage>
  );
}
