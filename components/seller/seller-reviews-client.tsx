"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, Star } from "lucide-react";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  sellerReply: string | null;
  createdAt: string;
  buyer: { name: string | null; phone: string | null };
  product: { id: string; name: string; slug: string; image: string | null };
};

export function SellerReviewsClient() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const PAGE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = unansweredOnly ? "?unanswered=true" : "";
      const res = await fetch(`/api/seller/reviews${q}`, { cache: "no-store" });
      const data = (await res.json()) as { reviews?: ReviewRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setRows(data.reviews ?? []);
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [unansweredOnly]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const reply = async (reviewId: string) => {
    const text = (drafts[reviewId] ?? "").trim();
    if (!text) return;
    setBusyId(reviewId);
    setError(null);
    try {
      const res = await fetch("/api/seller/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, sellerReply: text }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setDrafts((prev) => ({ ...prev, [reviewId]: "" }));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-[#004733]" />
          <h1 className="text-xl font-black text-gray-900">Sharhlarga javob</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={unansweredOnly}
            onChange={(e) => setUnansweredOnly(e.target.checked)}
            className="accent-[#004733]"
          />
          Faqat javobsiz
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="animate-spin text-[#cb11ab]" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
          Sharhlar yo‘q
        </p>
      ) : (
        <div className="space-y-3">
          {rows.slice((page - 1) * PAGE, page * PAGE).map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {r.product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.product.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/product/${r.product.slug}`}
                      className="font-bold text-gray-900 hover:text-[#cb11ab]"
                    >
                      {r.product.name}
                    </Link>
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600">
                      <Star size={12} fill="currentColor" />
                      {r.rating}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {r.buyer.name ?? r.buyer.phone ?? "Xaridor"} ·{" "}
                    {new Date(r.createdAt).toLocaleString("uz-UZ")}
                  </p>
                  <p className="mt-2 text-sm text-gray-800">{r.comment || "—"}</p>

                  {r.sellerReply ? (
                    <div className="mt-3 rounded-xl bg-[#cb11ab]/5 px-3 py-2 text-sm text-gray-800">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#cb11ab]">
                        Sizning javobingiz
                      </p>
                      {r.sellerReply}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={drafts[r.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Xaridorga javob yozing..."
                        className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#cb11ab] focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={busyId === r.id || !(drafts[r.id] ?? "").trim()}
                        onClick={() => void reply(r.id)}
                        className="rounded-lg bg-[#cb11ab] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {busyId === r.id ? "Saqlanmoqda..." : "Javob berish"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {rows.length > PAGE ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Oldingi
              </button>
              <span className="text-xs text-gray-500">
                {page} / {Math.ceil(rows.length / PAGE)}
              </span>
              <button
                type="button"
                disabled={page >= Math.ceil(rows.length / PAGE)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Keyingi
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
