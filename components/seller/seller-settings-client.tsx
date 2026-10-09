"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Upload } from "lucide-react";

type StoreForm = {
  name: string;
  slug: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  logo: string;
  banner: string;
};

const CITIES = ["Toshkent", "Samarqand", "Buxoro", "Namangan", "Andijon", "Farg'ona", "Nukus"];

export function SellerSettingsClient() {
  const [form, setForm] = useState<StoreForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/profile", {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const data = (await res.json()) as {
        store?: Partial<StoreForm> & { id?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setForm({
        name: data.store?.name ?? "",
        slug: data.store?.slug ?? "",
        phone: data.store?.phone ?? "",
        address: data.store?.address ?? "",
        city: data.store?.city ?? "Toshkent",
        description: data.store?.description ?? "",
        logo: data.store?.logo ?? "",
        banner: data.store?.banner ?? "",
      });
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

  const upload = async (kind: "logo" | "banner", file: File) => {
    setUploading(kind);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Yuklanmadi");
      setForm((prev) => (prev ? { ...prev, [kind]: data.url! } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload xato");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError("Do‘kon nomi majburiy");
      return;
    }
    if (!form.phone.trim()) {
      setError("Telefon majburiy");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  if (!form) {
    const dbDown = (error ?? "").toLowerCase().includes("database");
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-black text-gray-900">Do‘kon sozlamalari</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error ?? "Do‘kon topilmadi."}{" "}
          {dbDown ? null : (
            <Link href="/seller/register" className="font-bold underline">
              Ro‘yxatdan o‘tish
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Do‘kon sozlamalari</h1>
        <Link href={`/store/${form.slug}`} className="text-sm font-semibold text-[#cb11ab] hover:underline">
          Do‘konni ko‘rish →
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Do‘kon ko‘rinishi</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Logo</p>
            <div className="mb-2 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0533] to-[#2d0a5c] text-3xl font-black text-white">
              {form.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                form.name.charAt(0).toUpperCase() || "S"
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#cb11ab] hover:underline">
              <Upload size={12} />
              {uploading === "logo" ? "Yuklanmoqda..." : "O‘zgartirish"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload("logo", f);
                }}
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Banner</p>
            <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a0533] to-[#cb11ab]/50 text-xs text-white">
              {form.banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.banner} alt="Banner" className="h-full w-full object-cover" />
              ) : (
                "Do‘kon banneri"
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#cb11ab] hover:underline">
              <Upload size={12} />
              {uploading === "banner" ? "Yuklanmoqda..." : "O‘zgartirish"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload("banner", f);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Asosiy ma‘lumotlar</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Do‘kon nomi</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">URL (slug)</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#cb11ab]">
                <span className="border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">
                  /store/
                </span>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefon</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Shahar</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none"
              >
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Manzil</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Do‘kon haqida</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition ${
              saved ? "bg-green-500" : "bg-[#cb11ab] hover:bg-[#a50d8c]"
            } disabled:opacity-60`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Saqlandi!
              </>
            ) : (
              "Saqlash"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
