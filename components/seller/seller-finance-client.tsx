"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Loader2, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type FinanceData = {
  storeName: string;
  commissionPercent: number;
  payoutHoldDays: number;
  minPayout?: number;
  summary: {
    gmv: number;
    delivered: number;
    inProgress: number;
    commission: number;
    paidOut: number;
    held: number;
    available: number;
    refund?: number;
    payout?: number;
    withdrawn?: number;
    monthDelivered: number;
    monthCommission: number;
    orderCount: number;
  };
  ledger: {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  }[];
  payouts?: Array<{
    id: string;
    publicNumber: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
};

export function SellerFinanceClient() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [ledgerRange, setLedgerRange] = useState<"7" | "30" | "all">("all");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/finance", {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const json = (await res.json()) as FinanceData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yuklanmadi");
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const requestPayout = async () => {
    if (!data) return;
    const n = Number(amount);
    const min = data.minPayout ?? 0;
    const open = (data.payouts ?? []).some((p) =>
      ["requested", "approved", "processing"].includes(p.status),
    );
    if (!Number.isFinite(n) || n <= 0) {
      setError("To‘g‘ri summa kiriting");
      return;
    }
    if (n < min) {
      setError(`Minimal payout ${formatPrice(min)}`);
      return;
    }
    if (n > data.summary.available) {
      setError("Mavjud balans yetarli emas");
      return;
    }
    if (open) {
      setError("Allaqachon ochiq payout so‘rovi bor");
      return;
    }
    setPayoutBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "So‘rov yuborilmadi");
      setAmount("");
      await load(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "So‘rov yuborilmadi");
    } finally {
      setPayoutBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-xl font-black text-gray-900">Moliya</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Ma’lumot yo‘q"}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Mavjud balans", value: formatPrice(data.summary.available), hint: "Ledger available" },
    { label: "Kutilayotgan", value: formatPrice(data.summary.held), hint: "Hold kunlari" },
    { label: "Gross sales", value: formatPrice(data.summary.gmv), hint: `${data.summary.orderCount} yozuv` },
    { label: "Komissiya", value: formatPrice(data.summary.commission), hint: `${data.commissionPercent}%` },
    { label: "Refund", value: formatPrice(data.summary.refund ?? 0), hint: "Qaytarish" },
    { label: "Yechilgan", value: formatPrice(data.summary.withdrawn ?? data.summary.paidOut), hint: "Withdrawn" },
    { label: "Payout", value: formatPrice(data.summary.paidOut), hint: `Hold ${data.payoutHoldDays} kun` },
  ];

  const ledgerRows =
    ledgerRange === "all"
      ? data.ledger
      : data.ledger.filter((row) => {
          const days = ledgerRange === "7" ? 7 : 30;
          return new Date(row.createdAt).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
        });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#cb11ab]">
          <Wallet size={20} />
          <h1 className="text-xl font-black text-gray-900">Moliya</h1>
        </div>
        <p className="text-sm text-gray-500">
          {data.storeName} · jarayondagi aylanma {formatPrice(data.summary.inProgress)}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-lg font-black text-gray-900">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-gray-700">{c.label}</p>
            <p className="text-[11px] text-gray-400">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600">
        <div className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
          <DollarSign size={14} />
          Payout so‘rovi
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Summa"
            className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void requestPayout()}
            disabled={payoutBusy || !amount}
            className="rounded-lg bg-[#cb11ab] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {payoutBusy ? "Yuborilmoqda..." : "So‘rash"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Minimal {formatPrice(data.minPayout ?? 0)} · mavjud {formatPrice(data.summary.available)} dan oshmasin
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-bold text-gray-900">Payout so‘rovlari</div>
        <div className="divide-y divide-gray-50">
          {(data.payouts ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Payout so‘rovi yo‘q</p>
          ) : (
            (data.payouts ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{p.publicNumber}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleString("uz-UZ")} · {p.status}
                  </p>
                </div>
                <p className="font-bold text-gray-900">{formatPrice(p.amount)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600">
        <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
          <DollarSign size={14} />
          Oylik
        </div>
        Yetkazilgan {formatPrice(data.summary.monthDelivered)} · komissiya{" "}
        {formatPrice(data.summary.monthCommission)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
          <p className="font-bold text-gray-900">Ledger</p>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(["7", "30", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setLedgerRange(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  ledgerRange === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {r === "all" ? "Hammasi" : `${r} kun`}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {ledgerRows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Hali to‘lov yozuvlari yo‘q. Super admin payout qilganda shu yerda ko‘rinadi.
            </p>
          ) : (
            ledgerRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{row.type}</p>
                  <p className="text-xs text-gray-500">{row.description ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatPrice(row.amount)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(row.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
