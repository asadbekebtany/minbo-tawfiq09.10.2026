"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type QRow = {
  id: string;
  question: string;
  isApproved: boolean;
  createdAt: string;
  buyer: { name: string | null; phone: string | null };
  product: string;
  store: string;
  answers: { id: string; answer: string; isSeller: boolean; isAdmin: boolean }[];
};

export function AdminQuestionsClient() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const hasRows = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!hasRows.current) setLoading(true);
    setError(null);
    try {
      const q = pendingOnly ? "?pending=true" : "";
      const res = await fetch(`/api/admin/questions${q}`, { cache: "no-store", signal });
      const data = (await res.json()) as { questions?: QRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setRows(data.questions ?? []);
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

  const act = async (questionId: string, extra: Record<string, unknown>) => {
    const res = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, ...extra }),
    });
    if (res.ok) await load();
  };

  const needle = q.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) =>
        [row.product, row.store, row.question, row.buyer.name, row.buyer.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      )
    : rows;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Savol-javob moderatsiyasi</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="accent-[#004733]"
          />
          Tasdiqlanmagan
        </label>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Savol, mahsulot, do‘kon..."
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
          {visible.map((row) => (
            <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-500">
                {row.product} · {row.store}
              </p>
              <p className="mt-1 font-medium text-gray-900">{row.question}</p>
              {row.answers.map((a) => (
                <p key={a.id} className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {a.isSeller ? "Seller: " : a.isAdmin ? "Admin: " : ""}
                  {a.answer}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void act(row.id, { isApproved: true })}
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800"
                >
                  Tasdiqlash
                </button>
                <button
                  type="button"
                  onClick={() => void act(row.id, { isApproved: false })}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  Yashirish
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={drafts[row.id] ?? ""}
                  onChange={(e) => setDrafts((p) => ({ ...p, [row.id]: e.target.value }))}
                  placeholder="Admin javobi..."
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void act(row.id, { answer: drafts[row.id], isApproved: true })}
                  className="rounded-xl bg-[#002d21] px-3 py-2 text-xs font-bold text-[#f5b51b]"
                >
                  Javob
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
