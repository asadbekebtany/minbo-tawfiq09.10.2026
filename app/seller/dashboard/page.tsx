"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, ShoppingBag, Package, DollarSign, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Stats = {
  storeName: string;
  todayRevenue: number;
  todayOrders: number;
  activeProducts: number;
  monthRevenue: number;
  pendingReturns?: number;
  unansweredReviews?: number;
  unansweredQuestions?: number;
  lowStock: { id: string; name: string; stock: number }[];
  recentOrders: {
    id: string;
    product: string;
    buyer: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
};

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Yangi", color: "bg-yellow-100 text-yellow-700" },
  paid: { label: "To'langan", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Qabul qilindi", color: "bg-blue-100 text-blue-700" },
  packing: { label: "Yig'ilmoqda", color: "bg-indigo-100 text-indigo-700" },
  shipped: { label: "Yo'lda", color: "bg-purple-100 text-purple-700" },
  ready_for_pickup: { label: "Punktda", color: "bg-cyan-100 text-cyan-700" },
  delivered: { label: "Yetkazildi", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Bekor", color: "bg-red-100 text-red-700" },
  returned: { label: "Qaytarilgan", color: "bg-gray-100 text-gray-600" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
    );
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/seller/stats", { cache: "no-store", signal: ac.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Statistika yuklanmadi");
        setStats(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Xato");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const cards = [
    {
      label: "Bugungi sotuv",
      value: formatPrice(stats?.todayRevenue ?? 0),
      icon: DollarSign,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Yangi buyurtmalar",
      value: String(stats?.todayOrders ?? 0),
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Faol mahsulotlar",
      value: String(stats?.activeProducts ?? 0),
      icon: Package,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Oylik daromad",
      value: formatPrice(stats?.monthRevenue ?? 0),
      icon: TrendingUp,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{stats?.storeName ?? "Do‘kon"}</p>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <Clock size={14} />
          {today}
        </div>
      </div>

      {loading && !stats ? (
        <p className="text-sm text-gray-500">Yuklanmoqda...</p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/seller/products/add"
          className="rounded-xl bg-[#004733] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003a29]"
        >
          Mahsulot qo‘shish
        </Link>
        <Link
          href="/seller/orders"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Buyurtmalar
        </Link>
        <Link
          href="/seller/warehouse"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Ombor
        </Link>
        <Link
          href="/seller/finance"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Moliya
        </Link>
      </div>

      {(stats?.pendingReturns ?? 0) > 0 ||
      (stats?.unansweredReviews ?? 0) > 0 ||
      (stats?.unansweredQuestions ?? 0) > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(stats?.pendingReturns ?? 0) > 0 ? (
            <Link
              href="/seller/returns"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:border-amber-300"
            >
              {stats?.pendingReturns} ta qaytarish kutilmoqda →
            </Link>
          ) : null}
          {(stats?.unansweredReviews ?? 0) > 0 ? (
            <Link
              href="/seller/reviews"
              className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-900 hover:border-purple-300"
            >
              {stats?.unansweredReviews} ta sharhga javob berilmagan →
            </Link>
          ) : null}
          {(stats?.unansweredQuestions ?? 0) > 0 ? (
            <Link
              href="/seller/questions"
              className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900 hover:border-teal-300"
            >
              {stats?.unansweredQuestions} ta savolga javob berilmagan →
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">So&apos;nggi buyurtmalar</h2>
            <Link href="/seller/orders" className="text-sm text-[#004733] hover:underline">
              Barchasi →
            </Link>
          </div>
          <div className="space-y-2">
            {(stats?.recentOrders ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Buyurtmalar yo‘q</p>
            ) : (
              (stats?.recentOrders ?? []).map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <Link
                    key={o.id}
                    href={`/seller/orders/${o.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{o.id.slice(0, 10)}…</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{o.product}</p>
                      <p className="text-xs text-gray-400">{timeAgo(o.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-gray-900">{formatPrice(o.total)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Kam qolganlar</h2>
          <div className="space-y-3">
            {(stats?.lowStock ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">Hammasi yetarli</p>
            ) : (
              (stats?.lowStock ?? []).map((p) => (
                <div key={p.id} className="flex justify-between gap-2 text-sm">
                  <span className="text-gray-700 line-clamp-2">{p.name}</span>
                  <span className="font-bold text-red-500 shrink-0">{p.stock}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
