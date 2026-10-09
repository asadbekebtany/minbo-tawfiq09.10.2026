"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type ReturnRow = {
  id: string;
  reason: string;
  comment: string | null;
  status: string;
  createdAt: string;
  orderId: string;
  orderTotal: number;
  storeName: string;
  items: { productName: string; quantity: number }[];
};

type DeliveredOrder = {
  id: string;
  total: number;
  store?: { name?: string };
  items: { productId: string; name: string; quantity: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  completed: "Yakunlangan",
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [returnsRes, ordersRes] = await Promise.all([
        fetch("/api/returns", { cache: "no-store" }),
        fetch("/api/orders?status=delivered", { cache: "no-store" }),
      ]);
      const returnsData = (await returnsRes.json()) as { returns?: ReturnRow[]; error?: string };
      const ordersData = (await ordersRes.json()) as { orders?: DeliveredOrder[]; error?: string };
      if (!returnsRes.ok) throw new Error(returnsData.error ?? "Qaytarishlar yuklanmadi");
      if (!ordersRes.ok) throw new Error(ordersData.error ?? "Buyurtmalar yuklanmadi");
      setReturns(returnsData.returns ?? []);
      setOrders(ordersData.orders ?? []);
      if (!orderId && ordersData.orders?.[0]?.id) setOrderId(ordersData.orders[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const selectedOrder = orders.find((o) => o.id === orderId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          reason,
          comment: comment || null,
          items: selectedOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Ariza yuborilmadi");
      setReason("");
      setComment("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ariza yuborilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-[#002d21]">Qaytarishlar</h1>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={submit} className="rounded-2xl border bg-white p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Yangi qaytarish arizasi</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">
            Qaytarish uchun yetkazilgan buyurtma yo‘q.{" "}
            <Link href="/profile/orders" className="text-[#004733] underline">
              Buyurtmalar
            </Link>
          </p>
        ) : (
          <>
            <label className="block text-sm font-medium">
              Buyurtma
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id.slice(0, 8)}… — {order.store?.name ?? "Do‘kon"} — {formatPrice(order.total)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Sabab *
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masalan: Nuqsonli mahsulot"
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Izoh
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm resize-none"
              />
            </label>
            <button
              disabled={submitting || !selectedOrder}
              className="rounded-xl bg-[#004733] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Yuborilmoqda..." : "Ariza yuborish"}
            </button>
          </>
        )}
      </form>

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">Yuklanmoqda...</div>
      ) : returns.length === 0 ? (
        <div className="mt-5 rounded-2xl border bg-white p-10 text-center text-gray-500">
          <RotateCcw className="mx-auto mb-3 text-[#004733]" />
          Hali qaytarish arizasi yo‘q.
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((row) => (
            <div key={row.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{row.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {row.storeName} · buyurtma {row.orderId.slice(0, 8)}… · {formatPrice(row.orderTotal)}
                  </p>
                </div>
                <span className="text-xs font-medium rounded-full bg-gray-100 px-2 py-1">
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
              <ul className="mt-3 text-sm text-gray-600 space-y-1">
                {row.items.map((item, idx) => (
                  <li key={`${row.id}-${idx}`}>
                    {item.productName} × {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
