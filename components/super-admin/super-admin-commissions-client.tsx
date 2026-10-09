"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type CommissionRow = { id: string; categoryId: string | null; rate: number; isDefault: boolean };
type Category = { id: string; name: string; slug: string };

export function SuperAdminCommissionsClient() {
  const [defaultPercent, setDefaultPercent] = useState(10);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [rate, setRate] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/commissions", { cache: "no-store" });
      const data = (await res.json()) as {
        defaultPercent?: number;
        commissions?: CommissionRow[];
        categories?: Category[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setDefaultPercent(data.defaultPercent ?? 10);
      setRows(data.commissions ?? []);
      setCategories(data.categories ?? []);
      if (!categoryId && data.categories?.[0]) setCategoryId(data.categories[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDefault = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const pct = Math.min(50, Math.max(0, Number(defaultPercent) || 0));
      const res = await fetch("/api/super-admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPercent: pct }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setOk("Standart komissiya saqlandi");
      setDefaultPercent(pct);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!categoryId) return;
    const pct = Math.min(50, Math.max(0, Number(rate) || 0));
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/super-admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, rate: pct }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setOk("Kategoriya komissiyasi saqlandi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <Loader2 className="animate-spin text-[#f5b51b]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-black text-gray-900">Komissiya stavkalari</h1>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{ok}</div>
      ) : null}

      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">Standart komissiya</p>
        <p className="mt-1 text-xs text-gray-500">Barcha sellerlar uchun asosiy foiz</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Foiz
            <input
              type="number"
              min={0}
              max={50}
              value={defaultPercent}
              onChange={(e) => setDefaultPercent(Number(e.target.value))}
              className="mt-1 block w-28 rounded-xl border border-gray-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveDefault()}
            className="rounded-xl bg-[#002d21] px-4 py-2 text-sm font-bold text-[#f5b51b] disabled:opacity-60"
          >
            Saqlash
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">Kategoriya bo‘yicha</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Kategoriya
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block min-w-[180px] rounded-xl border border-gray-200 px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Foiz
            <input
              type="number"
              min={0}
              max={50}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 block w-28 rounded-xl border border-gray-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={saving || !categoryId}
            onClick={() => void saveCategory()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            Qo‘shish / yangilash
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {rows.filter((r) => r.categoryId).length === 0 ? (
            <li className="text-gray-500">Maxsus kategoriya stavkasi yo‘q</li>
          ) : (
            rows
              .filter((r) => r.categoryId)
              .map((r) => {
                const cat = categories.find((c) => c.id === r.categoryId);
                return (
                  <li key={r.id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span>{cat?.name ?? r.categoryId}</span>
                    <span className="font-bold">{r.rate}%</span>
                  </li>
                );
              })
          )}
        </ul>
      </section>
    </div>
  );
}
