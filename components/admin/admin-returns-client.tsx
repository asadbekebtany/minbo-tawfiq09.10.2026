"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, PackageX } from "lucide-react";

type ReturnStatus = "pending" | "approved" | "rejected" | "completed";

type ReturnRow = {
  id: string;
  reason: string;
  comment: string | null;
  status: ReturnStatus;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null };
  orderId: string;
  orderTotal: number;
  storeName: string;
  items: Array<{ productName: string; quantity: number }>;
};

const STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlandi",
  rejected: "Rad etildi",
  completed: "Yakunlandi",
};

const STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-600",
  completed: "bg-green-50 text-green-700",
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export function AdminReturnsClient() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ReturnStatus>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasRows = useRef(false);

  const load = useCallback(async () => {
    if (hasRows.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const response = await fetch(`/api/admin/returns?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { returns?: ReturnRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Qaytarishlarni yuklab bo‘lmadi");
      setReturns(data.returns ?? []);
      hasRows.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Qaytarishlarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setStatus = async (id: string, status: ReturnStatus) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Status yangilanmadi");
      setReturns((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#004733]">
          <PackageX size={20} />
          <h1 className="text-2xl font-black text-gray-900">Qaytarishlar</h1>
        </div>
        <p className="text-sm text-gray-500">Mahsulot qaytarish so‘rovlarini ko‘rib chiqish.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {(["all", "pending", "approved", "rejected", "completed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              filter === status
                ? "border-[#004733] bg-[#004733] text-white"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {status === "all" ? "Barchasi" : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loading && returns.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="animate-spin text-[#002d21]" size={28} />
        </div>
      ) : (
        <div className="relative grid gap-3">
          {refreshing ? (
            <div className="pointer-events-none absolute inset-x-0 -top-1 z-10 h-0.5 overflow-hidden bg-gray-100">
              <div className="h-full w-1/3 animate-pulse bg-[#004733]" />
            </div>
          ) : null}
          {returns.map((row) => (
            <div key={row.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${row.orderId}`}
                      className="font-bold text-[#004733] hover:underline"
                    >
                      #{row.orderId.slice(-8)}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                    <span className="text-[11px] text-gray-400">To‘lov/refund: buyurtma sahifasi</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">
                    <b>Sabab:</b> {row.reason}
                    {row.comment ? ` — ${row.comment}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {row.user.name ?? "—"} ({row.user.phone ?? "—"}) · {row.storeName} ·{" "}
                    {fmt(row.orderTotal)} so'm ·{" "}
                    {new Date(row.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                  {row.items.length > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {row.items.map((item) => `${item.productName} ×${item.quantity}`).join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {row.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === row.id}
                        onClick={() => void setStatus(row.id, "approved")}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        Tasdiqlash
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === row.id}
                        onClick={() => void setStatus(row.id, "rejected")}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Rad etish
                      </button>
                    </>
                  ) : null}
                  {row.status === "approved" ? (
                    <button
                      type="button"
                      disabled={updatingId === row.id}
                      onClick={() => void setStatus(row.id, "completed")}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Yakunlash
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {returns.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-gray-400">
              Qaytarish so‘rovi topilmadi
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
