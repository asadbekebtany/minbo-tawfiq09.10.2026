"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PackageX } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type ReturnRow = {
  id: string;
  status: string;
  reason: string;
  comment: string | null;
  createdAt: string;
  buyer: { name: string | null; phone: string | null };
  order: { id: string; orderNumber: string; total: number; status: string };
  items: { productId: string; quantity: number; name: string; image: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Kutilmoqda",
  requested: "So‘ralgan",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  received: "Omborga qaytdi",
  completed: "Yakunlangan",
};

export function SellerReturnsClient() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller/returns?status=${filter}`, { cache: "no-store" });
      const data = (await res.json()) as { returns?: ReturnRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setRows(data.returns ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/seller/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yangilanmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yangilanmadi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PackageX size={20} className="text-[#cb11ab]" />
          <h1 className="text-xl font-black text-gray-900">Qaytarishlar</h1>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
          {["all", "requested", "approved", "received", "rejected", "completed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {s === "all" ? "Hammasi" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
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
          Qaytarish so‘rovlari yo‘q
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">
                    #{r.order.orderNumber} · {STATUS_LABEL[r.status] ?? r.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.buyer.name ?? r.buyer.phone ?? "Xaridor"} ·{" "}
                    {new Date(r.createdAt).toLocaleString("uz-UZ")}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Sabab:</span> {r.reason}
                    {r.comment ? ` — ${r.comment}` : ""}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {r.items.map((it) => (
                      <li key={it.productId + it.quantity}>
                        {it.name} × {it.quantity}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatPrice(r.order.total)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/seller/orders/${r.order.id}`}
                    className="text-xs font-bold text-[#cb11ab] hover:underline"
                  >
                    Buyurtma →
                  </Link>
                  {r.status === "pending" || r.status === "requested" ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void setStatus(r.id, "approved")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Tasdiqlash
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void setStatus(r.id, "rejected")}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Rad etish
                      </button>
                    </>
                  ) : null}
                  {r.status === "approved" ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void setStatus(r.id, "received")}
                      className="rounded-lg bg-[#cb11ab] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Yakunlash (omborga qaytarish)
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
