"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Star } from "lucide-react";

type Row = {
  id: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  buyer: { name: string | null; phone: string | null };
  product: string;
  store: string;
};

export function AdminReviewsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRows = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!hasRows.current) setLoading(true);
    setError(null);
    try {
      const q = pendingOnly ? "?pending=true" : "";
      const res = await fetch(`/api/admin/reviews${q}`, { cache: "no-store", signal });
      const data = (await res.json()) as { reviews?: Row[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setRows(data.reviews ?? []);
      hasRows.current = true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [pendingOnly]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

    const setApproved = async (reviewId: string, isApproved: boolean) => {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, isApproved }),
    });
    if (res.ok) await load();
  };

  const remove = async (reviewId: string) => {
    const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  };

  const needle = q.trim().toLowerCase();
  const visible = needle
    ? rows.filter((r) =>
        [r.product, r.store, r.buyer.name, r.buyer.phone, r.comment]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      )
    : rows;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Sharhlarni tasdiqlash</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="accent-[#004733]"
          />
          Faqat kutilayotganlar
        </label>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Mahsulot, do‘kon, izoh..."
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#f5b51b]"
      />
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading && rows.length === 0 ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-[#004733]" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">Hozircha yo‘q</p>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{r.product}</p>
                  <p className="text-xs text-gray-500">
                    {r.store} · {r.buyer.name ?? r.buyer.phone}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-amber-600">
                    <Star size={14} fill="currentColor" /> {r.rating}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void setApproved(r.id, true)}
                    className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800"
                  >
                    Tasdiqlash
                  </button>
                  <button
                    type="button"
                    onClick={() => void setApproved(r.id, false)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Yashirish
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                  >
                    O‘chirish
                  </button>
                </div>
              </div>
              {r.comment ? <p className="mt-2 text-sm text-gray-700">{r.comment}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
