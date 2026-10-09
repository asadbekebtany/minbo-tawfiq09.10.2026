"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Power, TicketPercent, Trash2 } from "lucide-react";

type CouponRow = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

const EMPTY_FORM = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  value: 10,
  minOrder: "",
  maxUses: "",
  expiresAt: "",
};

export function AdminCouponsClient() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = (await response.json()) as { coupons?: CouponRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kuponlarni yuklab bo‘lmadi");
      setCoupons(data.coupons ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kuponlarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: form.value,
          minOrder: form.minOrder ? Number(form.minOrder) : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          isActive: true,
        }),
      });
      const data = (await response.json()) as { coupon?: CouponRow; error?: string; issues?: Array<{ message: string }> };
      if (!response.ok) {
        throw new Error(data.issues?.[0]?.message ?? data.error ?? "Kupon yaratilmadi");
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kupon yaratilmadi");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: CouponRow) => {
    setUpdatingId(coupon.id);
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kupon yangilanmadi");
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !coupon.isActive } : c)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kupon yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const remove = async (coupon: CouponRow) => {
    if (!window.confirm(`${coupon.code} kuponini o‘chirasizmi?`)) return;
    setUpdatingId(coupon.id);
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kupon o‘chirilmadi");
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kupon o‘chirilmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#002d21]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#002d21]">Kuponlar</h1>
          <p className="text-sm text-gray-500">Promo-kod va chegirmalarni boshqarish.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-[#002d21] px-4 py-2.5 font-bold text-[#f5b51b]"
        >
          <Plus size={16} />
          Yangi kupon
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-2xl border border-[#dce5df] bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-[#002d21]">Yangi kupon</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-gray-700">
              Kod
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="TAVFIQ10"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b]"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Turi
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b]"
              >
                <option value="percentage">Foiz (%)</option>
                <option value="fixed">Belgilangan summa (so‘m)</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Qiymat
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b]"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Min buyurtma (ixtiyoriy)
              <input
                type="number"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                placeholder="500000"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b]"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Maks. ishlatish (ixtiyoriy)
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="100"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b]"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Amal qilish muddati (ixtiyoriy)
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b]"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void create()}
            disabled={saving || form.code.trim().length < 3}
            className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#d99a0a] px-5 py-2.5 font-bold text-[#002d21] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "Saqlanmoqda..." : "Yaratish"}
          </button>
        </div>
      ) : null}

      <div className="grid gap-3">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 ${
              coupon.isActive ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <TicketPercent className="text-[#004733]" />
              <div>
                <b className="text-gray-900">{coupon.code}</b>
                <p className="text-xs text-gray-500">
                  {coupon.type === "percentage"
                    ? `${coupon.value}% chegirma`
                    : `${fmt(coupon.value)} so‘m chegirma`}
                  {coupon.minOrder ? ` · min ${fmt(coupon.minOrder)} so‘m` : ""}
                  {coupon.maxUses
                    ? ` · ${coupon.usedCount}/${coupon.maxUses} ishlatildi`
                    : ` · ${coupon.usedCount} marta ishlatildi`}
                  {coupon.expiresAt
                    ? ` · ${new Date(coupon.expiresAt).toLocaleDateString("uz-UZ")} gacha`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  coupon.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {coupon.isActive ? "Faol" : "O‘chirilgan"}
              </span>
              <button
                type="button"
                disabled={updatingId === coupon.id}
                onClick={() => void toggleActive(coupon)}
                title={coupon.isActive ? "O‘chirish" : "Yoqish"}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <Power size={15} />
              </button>
              <button
                type="button"
                disabled={updatingId === coupon.id}
                onClick={() => void remove(coupon)}
                title="O‘chirib tashlash"
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-gray-400">
            Hozircha kupon yo‘q. Yangi kupon yarating.
          </div>
        ) : null}
      </div>
    </div>
  );
}
