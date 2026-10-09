"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

type WarehouseAccessView = {
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
};

export function SellerOpsDetail({ sellerId }: { sellerId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/sellers/${sellerId}`, { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Yuklanmadi");
        setData(json.seller);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Yuklanmadi"));
  }, [sellerId]);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Yuklanmoqda...</p>;

  const balance = data.balance as {
    available?: number;
    pending?: number;
    commission?: number;
    payout?: number;
    refund?: number;
  } | null;
  const store = data.store as {
    name?: string;
    products?: Array<{ id: string; name: string; stock: number }>;
  } | null;
  const payouts = (data.payouts as Array<{ publicNumber: string; amount: number; status: string }>) ?? [];
  const audit = (data.audit as Array<{ action: string; createdAt: string }>) ?? [];
  const profile = data.profile as { contactName?: string; inn?: string; phone?: string } | null;
  const orders =
    (data.orders as Array<{
      id: string;
      publicNumber: string | null;
      status: string;
      total: number;
      createdAt: string;
    }>) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/admin/sellers" className="text-sm font-semibold text-[#004733]">
        ← Sellerlar
      </Link>
      <h1 className="text-xl font-black">{store?.name ?? "Seller"}</h1>
      <p className="text-sm text-gray-600">Status: {String(data.status)}</p>
      <WarehouseAccessBlock
        sellerId={sellerId}
        access={(data.warehouseAccess as WarehouseAccessView | undefined) ?? null}
        canManage={Boolean(data.canManageWarehouseAccess)}
        onUpdated={(next) =>
          setData((prev) => (prev ? { ...prev, warehouseAccess: next } : prev))
        }
      />
      <p className="text-sm">
        Profil: {profile?.contactName ?? "—"} · INN {profile?.inn ?? "—"} · {profile?.phone ?? ""}
      </p>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>Balans: {formatPrice(balance?.available ?? 0)} · pending {formatPrice(balance?.pending ?? 0)}</p>
        <p>Sotuv (delivered): {formatPrice(Number(data.sales ?? 0))}</p>
        <p>Komissiya: {formatPrice(Number(data.commission ?? balance?.commission ?? 0))}</p>
        <p>Payout: {formatPrice(balance?.payout ?? 0)} · refund {formatPrice(balance?.refund ?? 0)}</p>
        <p>Return rate: {(Number(data.returnRate ?? 0) * 100).toFixed(1)}%</p>
      </div>
      <div>
        <h2 className="font-bold">Mahsulotlar</h2>
        {(store?.products ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Mahsulot yo‘q</p>
        ) : (
          (store?.products ?? []).map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="block text-sm text-[#004733]">
              {p.name} · stock {p.stock}
            </Link>
          ))
        )}
      </div>
      <div>
        <h2 className="font-bold">Buyurtmalar</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400">Buyurtma yo‘q</p>
        ) : (
          orders.map((o) => (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className="block text-sm text-[#004733]">
              {o.publicNumber ?? o.id} · {o.status} · {formatPrice(o.total)}
            </Link>
          ))
        )}
      </div>
      <div>
        <h2 className="font-bold">Payout</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-gray-400">Payout yo‘q</p>
        ) : (
          payouts.map((p) => (
            <p key={p.publicNumber} className="text-sm">
              {p.publicNumber} · {formatPrice(p.amount)} · {p.status}
            </p>
          ))
        )}
      </div>
      <div>
        <h2 className="font-bold">Audit</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-gray-400">Audit yo‘q</p>
        ) : (
          audit.map((a, i) => (
            <p key={`${a.action}-${i}`} className="text-sm text-gray-600">
              {a.action} · {a.createdAt}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function formatAccessDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("uz-UZ");
}

function WarehouseAccessBlock({
  sellerId,
  access,
  canManage,
  onUpdated,
}: {
  sellerId: string;
  access: WarehouseAccessView | null;
  canManage: boolean;
  onUpdated: (next: WarehouseAccessView) => void;
}) {
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "grant" | "disable" | "extend") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/super-admin/sellers/${sellerId}/warehouse-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          startAt: startAt || undefined,
          endAt: endAt || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; warehouseAccess?: WarehouseAccessView };
      if (!res.ok) throw new Error(json.error ?? "Saqlanmadi");
      if (json.warehouseAccess) onUpdated(json.warehouseAccess);
      setMessage(
        action === "grant" ? "Dostup berildi" : action === "disable" ? "Dostup yopildi" : "Muddat uzaytirildi",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-black text-gray-900">MOY SKLAD ACCESS</h2>
      <div className="mt-2 grid gap-1 text-sm text-gray-700">
        <p>Dostup: {access?.enabled ? "ON" : "OFF"}</p>
        <p>Start date: {formatAccessDate(access?.startAt ?? null)}</p>
        <p>End date: {formatAccessDate(access?.endAt ?? null)}</p>
        <p>
          Current status:{" "}
          <span className="font-semibold">{access?.status ?? "DISABLED"}</span>
        </p>
      </div>
      {canManage ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-500">
            Start date
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-gray-500">
            End date
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("grant")}
              className="rounded-xl bg-[#004733] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Dostup berish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("disable")}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50"
            >
              Dostupni yopish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("extend")}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50"
            >
              Muddatni uzaytirish
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">O‘zgartirish faqat Super Admin uchun.</p>
      )}
    </div>
  );
}
