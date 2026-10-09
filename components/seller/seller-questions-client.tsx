"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HelpCircle, Loader2 } from "lucide-react";

type QRow = {
  id: string;
  question: string;
  createdAt: string;
  buyer: { name: string | null; phone: string | null };
  product: { id: string; name: string; slug: string };
  answers: { id: string; answer: string; isSeller: boolean; isAdmin: boolean }[];
};

export function SellerQuestionsClient() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [unansweredOnly, setUnansweredOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = unansweredOnly ? "?unanswered=true" : "";
      const res = await fetch(`/api/seller/questions${q}`, { cache: "no-store" });
      const data = (await res.json()) as { questions?: QRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setRows(data.questions ?? []);
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

  const reply = async (questionId: string) => {
    const text = (drafts[questionId] ?? "").trim();
    if (!text) return;
    setBusyId(questionId);
    setError(null);
    try {
      const res = await fetch("/api/seller/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer: text }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setDrafts((p) => ({ ...p, [questionId]: "" }));
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
          <HelpCircle size={20} className="text-[#004733]" />
          <h1 className="text-xl font-black text-gray-900">Savollarga javob</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={unansweredOnly}
            onChange={(e) => setUnansweredOnly(e.target.checked)}
            className="accent-[#004733]"
          />
          Javobsiz
        </label>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading && rows.length === 0 ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-[#004733]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
          Savollar yo‘q
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((q) => (
            <div key={q.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <Link href={`/product/${q.product.slug}`} className="text-xs text-[#004733] hover:underline">
                {q.product.name}
              </Link>
              <p className="mt-1 font-medium text-gray-900">{q.question}</p>
              <p className="text-xs text-gray-400">{q.buyer.name ?? q.buyer.phone}</p>
              {q.answers.map((a) => (
                <p key={a.id} className="mt-2 rounded-lg bg-[#004733]/5 px-3 py-2 text-sm text-gray-700">
                  {a.isSeller ? "Siz: " : a.isAdmin ? "Admin: " : ""}
                  {a.answer}
                </p>
              ))}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <textarea
                  value={drafts[q.id] ?? ""}
                  onChange={(e) => setDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Javob yozing..."
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void reply(q.id)}
                  disabled={busyId === q.id}
                  className="self-end rounded-xl bg-[#002d21] px-4 py-2 text-sm font-bold text-[#f5b51b] disabled:opacity-50"
                >
                  {busyId === q.id ? <Loader2 size={16} className="animate-spin" /> : "Yuborish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
