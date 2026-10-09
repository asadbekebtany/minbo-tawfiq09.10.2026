"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  avgRating: number;
  reviewCount: number;
  cancelRate?: number;
  returnRate?: number;
  rangeRevenue?: number;
  rangeGmv?: number;
  rangeCommission?: number;
  rangeOrders?: number;
  rangeSales?: number;
  rangeRefund?: number;
  rangeReturnRate?: number;
  monthly: { month: number; revenue: number; orders: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
  lowStock?: { id: string; name: string; stock: number }[];
};

export default function SellerAnalyticsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("year");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/seller/stats?range=${period}`, { cache: "no-store", signal: ac.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Statistika yuklanmadi");
        setStats(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Xato");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [period]);

  const monthly = stats?.monthly ?? [];
  const chart = period === "year" ? monthly : monthly.filter((m) => m.month === new Date().getMonth());

  const maxRev = Math.max(1, ...chart.map((m) => m.revenue));
  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Statistika</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["week", "month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "week" ? "Hafta" : p === "month" ? "Oy" : "Yil"}
            </button>
          ))}
        </div>
      </div>

      {loading && !stats ? (
        <p className="text-sm text-gray-500">Yuklanmoqda...</p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: DollarSign,
            label: "Seller tushum (davr)",
            value: formatPrice(stats?.rangeRevenue ?? stats?.totalRevenue ?? 0),
            sub: `GMV ${formatPrice(stats?.rangeGmv ?? 0)}`,
            color: "bg-green-50 text-green-600",
          },
          {
            icon: ShoppingBag,
            label: "Buyurtmalar / savdo (davr)",
            value: String(stats?.rangeOrders ?? stats?.totalOrders ?? 0),
            sub: `${stats?.rangeSales ?? 0} ta sotilgan`,
            color: "bg-blue-50 text-blue-600",
          },
          {
            icon: Star,
            label: "Komissiya / refund",
            value: `${formatPrice(stats?.rangeCommission ?? 0)}`,
            sub: `refund ${formatPrice(stats?.rangeRefund ?? 0)}`,
            color: "bg-yellow-50 text-yellow-600",
          },
          {
            icon: TrendingUp,
            label: "Qaytarish darajasi",
            value: `${stats?.rangeReturnRate ?? stats?.returnRate ?? 0}%`,
            sub: `bekor ${stats?.cancelRate ?? 0}% · reyting ${stats?.avgRating ?? 0}`,
            color: "bg-purple-50 text-purple-600",
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-6">
          {period === "year" ? "Oylik daromad (so'm)" : period === "month" ? "Joriy oy daromadi (so'm)" : "So‘nggi 7 kun"}
        </h2>
        {period === "week" ? (
          (stats?.rangeOrders ?? 0) === 0 && (stats?.rangeRevenue ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">Bu hafta ma’lumot yo‘q</p>
          ) : (
            <p className="text-sm text-gray-600">
              {stats?.rangeOrders ?? 0} buyurtma · savdo {stats?.rangeSales ?? 0} ta · tushum{" "}
              {formatPrice(stats?.rangeRevenue ?? 0)} · komissiya {formatPrice(stats?.rangeCommission ?? 0)}
            </p>
          )
        ) : chart.length === 0 ? (
          <p className="text-sm text-gray-400">Grafik uchun ma’lumot yo‘q</p>
        ) : (
        <div className="flex items-end gap-2 h-48">
          {chart.map((row) => {
            const h = Math.round((row.revenue / maxRev) * 100);
            return (
              <div key={row.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center h-40">
                  <div
                    className="w-full max-w-[36px] bg-[#004733]/20 group-hover:bg-[#004733]/35 rounded-t-lg transition-colors mx-auto"
                    style={{ height: `${Math.max(4, h * 1.4)}px` }}
                    title={fmt(row.revenue)}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{MONTHS[row.month]}</span>
              </div>
            );
          })}
        </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Top mahsulotlar</h2>
        <div className="space-y-3">
          {(stats?.topProducts ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">Hali ma’lumot yo‘q</p>
          ) : (
            (stats?.topProducts ?? []).map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-1">
                    {i + 1}. {p.name}
                  </p>
                  <p className="text-xs text-gray-500">{p.sold} ta sotilgan</p>
                </div>
                <p className="font-bold text-gray-900 shrink-0">{formatPrice(p.revenue)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Past zaxira</h2>
        {(stats?.lowStock ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Past zaxira yo‘q</p>
        ) : (
          <div className="space-y-2">
            {(stats?.lowStock ?? []).map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-gray-800">{p.name}</span>
                <span className="font-bold text-amber-700">{p.stock}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
