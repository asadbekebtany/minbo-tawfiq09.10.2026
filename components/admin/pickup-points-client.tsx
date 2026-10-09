"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Plus } from "lucide-react";

type Point = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  workHours: string | null;
  isFree: boolean;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  address: "",
  city: "Toshkent",
  district: "",
  phone: "",
  workHours: "09:00–21:00",
  isFree: true,
};

export function PickupPointsClient() {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pickup-points", { cache: "no-store" });
      const data = (await res.json()) as { points?: Point[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setPoints(data.points ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pickup-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          district: form.district || null,
          phone: form.phone || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setForm(emptyForm);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/pickup-points/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-black text-gray-900">
        <MapPin size={20} className="text-[#004733]" />
        Olish punktlari
      </h1>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-gray-800">Yangi punkt</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nomi"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Manzil"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Shahar"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder="Tuman"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Telefon"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.workHours}
            onChange={(e) => setForm({ ...form, workHours: e.target.value })}
            placeholder="Ish vaqti"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void create()}
          disabled={saving || !form.name || !form.address}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#002d21] px-4 py-2.5 text-sm font-bold text-[#f5b51b] disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Qo‘shish
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="animate-spin text-[#004733]" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Punkt</th>
                <th className="px-4 py-3">Manzil</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {points.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.workHours}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.city}, {p.address}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.isActive ? "Faol" : "O‘chirilgan"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggle(p.id, !p.isActive)}
                      className="text-xs font-semibold text-[#004733] hover:underline"
                    >
                      {p.isActive ? "O‘chirish" : "Yoqish"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
