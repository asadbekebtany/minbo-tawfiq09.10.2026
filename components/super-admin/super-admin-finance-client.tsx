"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, Wallet } from "lucide-react";
import { formatUtc } from "@/components/super-admin/format-ts";

type Settlement = {
  storeId: string;
  storeName: string;
  sellerName: string;
  sellerPhone: string;
  orders: number;
  gmv: number;
  delivered: number;
  commission: number;
  paidOut: number;
  held: number;
  payable: number;
  refund?: number;
};

type LedgerRow = {
  id: string;
  storeName: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
};

type PayoutRow = {
  id: string;
  publicNumber: string;
  amount: number;
  status: string;
  createdAt: string;
  storeName: string;
  sellerPhone: string | null;
  sellerName: string | null;
};

type FinancePayload = {
  commissionPercent: number;
  payoutHoldDays: number;
  minPayout?: number;
  summary: {
    monthGmv: number;
    monthOrders: number;
    deliveredGmv: number;
    deliveredOrders: number;
    totalCommission: number;
    totalPayable: number;
  };
  settlements: Settlement[];
  ledger: LedgerRow[];
  payouts?: PayoutRow[];
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export function SuperAdminFinanceClient() {
  const [data, setData] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [payoutBusy, setPayoutBusy] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState<"all" | string>("all");
  const [ledgerRange, setLedgerRange] = useState<"7" | "30" | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/finance", { cache: "no-store" });
      const json = (await res.json()) as FinancePayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yuklanmadi");
      setData(json);
      const next: Record<string, string> = {};
      for (const row of json.settlements) {
        if (row.payable > 0) next[row.storeId] = String(row.payable);
      }
      setAmounts(next);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#payouts") {
      window.setTimeout(() => {
        document.getElementById("payouts")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [loading]);

  const payout = async (storeId: string) => {
    const amount = Number(amounts[storeId] ?? 0);
    if (!amount || amount <= 0) {
      setError("To‘lov summasi noto‘g‘ri");
      return;
    }
    setPayingId(storeId);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, amount, description: "Super admin payout" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "To‘lov yozilmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "To‘lov yozilmadi");
    } finally {
      setPayingId(null);
    }
  };

  const setPayoutStatus = async (payoutId: string, status: "approved" | "processing" | "paid" | "rejected" | "cancelled") => {
    setPayoutBusy(payoutId);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, status }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yangilanmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yangilanmadi");
    } finally {
      setPayoutBusy(null);
    }
  };

  const payoutsAll = data?.payouts ?? [];
  const visiblePayouts = useMemo(() => {
    const rows = payoutFilter === "all" ? payoutsAll : payoutsAll.filter((p) => p.status === payoutFilter);
    return rows;
  }, [payoutsAll, payoutFilter]);

  const visibleLedger = useMemo(() => {
    const rows = data?.ledger ?? [];
    if (ledgerRange === "all") return rows;
    const days = ledgerRange === "7" ? 7 : 30;
    const from = Date.now() - days * 86400000;
    return rows.filter((r) => new Date(r.createdAt).getTime() >= from);
  }, [data?.ledger, ledgerRange]);

  const totalRefund = useMemo(
    () => (data?.settlements ?? []).reduce((s, row) => s + (row.refund ?? 0), 0),
    [data?.settlements],
  );

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#1a0533]" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "Ma’lumot yo‘q"}
      </div>
    );
  }

  const cards = [
    { label: "Oylik GMV", value: `${fmt(data.summary.monthGmv)} so‘m` },
    { label: "Yetkazilgan GMV", value: `${fmt(data.summary.deliveredGmv)} so‘m` },
    { label: "Komissiya", value: `${fmt(data.summary.totalCommission)} so‘m` },
    { label: "Refund", value: `${fmt(totalRefund)} so‘m` },
    { label: "To‘lanishi kerak", value: `${fmt(data.summary.totalPayable)} so‘m` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#3b0764]">
          <Wallet size={20} />
          <h1 className="text-2xl font-black text-gray-900">Global moliya / settlements</h1>
        </div>
        <p className="text-sm text-gray-500">
          Komissiya {data.commissionPercent}% · Hold {data.payoutHoldDays} kun
          {data.minPayout ? ` · min payout ${fmt(data.minPayout)}` : ""} · Ledger available
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[#3b0764]/10 bg-white p-4"
          >
            <p className="text-lg font-black text-gray-900">{c.value}</p>
            <p className="mt-1 text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3b0764]/10 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-black text-gray-900">
          Sotuvchi settlements
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Do‘kon</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Komissiya</th>
                <th className="px-4 py-3">To‘langan</th>
                <th className="px-4 py-3">Payable</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.settlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Do‘kon topilmadi
                  </td>
                </tr>
              ) : (
                data.settlements.map((row) => (
                  <tr key={row.storeId}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{row.storeName}</p>
                      <p className="text-xs text-gray-500">
                        {row.sellerName} · {row.sellerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3">{fmt(row.delivered)}</td>
                    <td className="px-4 py-3">{fmt(row.commission)}</td>
                    <td className="px-4 py-3">{fmt(row.paidOut)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{fmt(row.payable)}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[180px] items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={amounts[row.storeId] ?? ""}
                          onChange={(e) =>
                            setAmounts((prev) => ({ ...prev, [row.storeId]: e.target.value }))
                          }
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#3b0764]"
                          disabled={row.payable <= 0}
                        />
                        <button
                          type="button"
                          disabled={row.payable <= 0 || payingId === row.storeId}
                          onClick={() => void payout(row.storeId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1a0533] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {payingId === row.storeId ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <DollarSign size={12} />
                          )}
                          To‘lash
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div id="payouts" className="overflow-hidden rounded-2xl border border-[#3b0764]/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
          <p className="font-black text-gray-900">Payout so‘rovlari</p>
          <select
            value={payoutFilter}
            onChange={(e) => setPayoutFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
          >
            <option value="all">Barchasi</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="divide-y divide-gray-50">
          {(visiblePayouts ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Payout so‘rovi yo‘q</p>
          ) : (
            (visiblePayouts ?? []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {p.publicNumber} · {p.storeName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.sellerName ?? p.sellerPhone} · {p.status} · {formatUtc(p.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{fmt(p.amount)} so‘m</span>
                  {p.status === "requested" ? (
                    <>
                      <button
                        type="button"
                        disabled={payoutBusy === p.id}
                        onClick={() => void setPayoutStatus(p.id, "approved")}
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Tasdiqlash
                      </button>
                      <button
                        type="button"
                        disabled={payoutBusy === p.id}
                        onClick={() => void setPayoutStatus(p.id, "rejected")}
                        className="rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Rad
                      </button>
                    </>
                  ) : null}
                  {p.status === "approved" ? (
                    <button
                      type="button"
                      disabled={payoutBusy === p.id}
                      onClick={() => void setPayoutStatus(p.id, "processing")}
                      className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Processing
                    </button>
                  ) : null}
                  {p.status === "processing" ? (
                    <button
                      type="button"
                      disabled={payoutBusy === p.id}
                      onClick={() => void setPayoutStatus(p.id, "paid")}
                      className="rounded-lg bg-[#1a0533] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                      To‘landi
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3b0764]/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
          <p className="font-black text-gray-900">Oxirgi ledger</p>
          <select
            value={ledgerRange}
            onChange={(e) => setLedgerRange(e.target.value as "7" | "30" | "all")}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
          >
            <option value="7">7 kun</option>
            <option value="30">30 kun</option>
            <option value="all">Barchasi</option>
          </select>
        </div>
        <div className="divide-y divide-gray-50">
          {visibleLedger.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Ledger bo‘sh</p>
          ) : (
            visibleLedger.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {row.storeName} · {row.type}
                  </p>
                  <p className="text-xs text-gray-500">{row.description ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{fmt(row.amount)} so‘m</p>
                  <p className="text-xs text-gray-400">
                    {formatUtc(row.createdAt)}
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
