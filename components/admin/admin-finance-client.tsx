"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, DollarSign, Loader2, Percent, RefreshCw, TrendingUp } from "lucide-react";

type FinanceSummary = {
  totalRevenue: number;
  totalOrders: number;
  totalCommission: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  monthlyCommission: number;
  activeOrdersValue: number;
  activeOrders: number;
};

type SellerFinanceRow = {
  storeId: string;
  storeName: string;
  sellerName: string;
  sellerPhone: string;
  orders: number;
  revenue: number;
  deliveredRevenue: number;
  commission: number;
  payout: number;
};

type PaymentRow = {
  id: string;
  method: string;
  amount: number;
  status: string;
  transactionId: string | null;
  createdAt: string;
  orderId: string;
  storeName: string;
  buyer: string;
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  paid: "bg-green-50 text-green-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-gray-100 text-gray-500",
};

export function AdminFinanceClient() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [sellers, setSellers] = useState<SellerFinanceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"sellers" | "payments">("sellers");
  const [payRange, setPayRange] = useState<"7" | "30" | "all">("all");
  const hasData = useRef(false);

  const load = useCallback(async () => {
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/finance", { cache: "no-store" });
      const data = (await response.json()) as {
        summary?: FinanceSummary;
        sellers?: SellerFinanceRow[];
        payments?: PaymentRow[];
        commissionPercent?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Moliya ma'lumotlari yuklanmadi");
      setSummary(data.summary ?? null);
      setSellers(data.sellers ?? []);
      setPayments(data.payments ?? []);
      setCommissionPercent(data.commissionPercent ?? 10);
      hasData.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Moliya ma'lumotlari yuklanmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#002d21]" size={32} />
      </div>
    );
  }

  const cards = summary
    ? [
        {
          label: "Jami aylanma (yetkazilgan)",
          value: `${fmt(summary.totalRevenue)} so'm`,
          sub: `${summary.totalOrders} ta buyurtma`,
          icon: DollarSign,
          color: "bg-green-50 text-green-600",
        },
        {
          label: `Jami komissiya (${commissionPercent}%)`,
          value: `${fmt(summary.totalCommission)} so'm`,
          sub: "Marketplace daromadi",
          icon: Percent,
          color: "bg-teal-50 text-teal-600",
        },
        {
          label: "Joriy oy aylanmasi",
          value: `${fmt(summary.monthlyRevenue)} so'm`,
          sub: `${summary.monthlyOrders} ta buyurtma · komissiya ${fmt(summary.monthlyCommission)} so'm`,
          icon: TrendingUp,
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Faol buyurtmalar",
          value: `${fmt(summary.activeOrdersValue)} so'm`,
          sub: `${summary.activeOrders} ta jarayonda`,
          icon: CreditCard,
          color: "bg-orange-50 text-orange-600",
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#002d21]">Moliya</h1>
          <p className="text-sm text-gray-500">
            Komissiya, seller hisob-kitobi va to‘lovlar. Komissiya stavkasi: {commissionPercent}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing || loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Yangilash
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <span className={`mb-3 inline-grid h-9 w-9 place-items-center rounded-xl ${color}`}>
              <Icon size={17} />
            </span>
            <p className="text-lg font-black text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-600">{label}</p>
            <p className="text-[11px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(
          [
            ["sellers", "Seller hisob-kitobi"],
            ["payments", "To‘lovlar"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border-[#004733] bg-[#004733] text-white"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sellers" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {["Do'kon", "Seller", "Buyurtmalar", "Aylanma", "Yetkazilgan", `Komissiya (${commissionPercent}%)`, "Seller ulushi"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellers.map((seller) => (
                  <tr key={seller.storeId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">{seller.storeName}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{seller.sellerName}</p>
                      <p className="text-xs text-gray-400">{seller.sellerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{seller.orders}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">{fmt(seller.revenue)} so'm</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{fmt(seller.deliveredRevenue)} so'm</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-teal-600">{fmt(seller.commission)} so'm</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-green-600">{fmt(seller.payout)} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sellers.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">Ma'lumot topilmadi</div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="flex flex-wrap items-center justify-end gap-1 border-b border-gray-100 px-4 py-2">
            {(["7", "30", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPayRange(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  payRange === r ? "bg-[#004733] text-white" : "text-gray-500"
                }`}
              >
                {r === "all" ? "Hammasi" : `${r} kun`}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {["Sana", "Buyurtma", "Xaridor", "Do'kon", "Usul", "Summa", "Holat"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments
                  .filter((payment) => {
                    if (payRange === "all") return true;
                    const days = payRange === "7" ? 7 : 30;
                    return new Date(payment.createdAt).getTime() >= Date.now() - days * 86400000;
                  })
                  .map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                      {new Date(payment.createdAt).toLocaleString("uz-UZ", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">#{payment.orderId.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{payment.buyer}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{payment.storeName}</td>
                    <td className="px-4 py-3 text-sm uppercase text-gray-700">{payment.method}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">{fmt(payment.amount)} so'm</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">To‘lovlar topilmadi</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
