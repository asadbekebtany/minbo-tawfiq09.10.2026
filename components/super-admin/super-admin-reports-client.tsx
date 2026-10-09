"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Report = {
  gmv?: number;
  paidGmv?: number;
  deliveredGmv?: number;
  marketplaceRevenue?: number;
  sellerRevenue?: number;
  totalCommission?: number;
  refundAmount?: number;
  payoutAmount?: number;
  orderCount?: number;
  paidOrders?: number;
  delivered?: number;
  cancelled?: number;
  returned?: number;
  buyers?: number;
  sellers?: number;
  activeSellers?: number;
  products?: number;
  lowStock?: number;
  outOfStock?: number;
  gmvToday?: number;
  gmvMonth?: number;
  ordersToday?: number;
  ordersMonth?: number;
};

type SellerRow = {
  storeId: string;
  storeName: string;
  gmv: number;
  orders: number;
  returnRate: number;
};

type ProductRow = {
  productId: string;
  name: string;
  gmv: number;
  unitsSold: number;
  returnRate: number;
};

const PRESETS = [
  ["today", "Bugun"],
  ["yesterday", "Kecha"],
  ["last7", "7 kun"],
  ["last30", "30 kun"],
  ["month", "Oy"],
  ["prevMonth", "O‘tgan oy"],
  ["quarter", "Chorak"],
  ["year", "Yil"],
];

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function SuperAdminReportsClient() {
  const [data, setData] = useState<Report | null>(null);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("last30");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const [overviewRes, sellersRes, productsRes] = await Promise.all([
          fetch(`/api/super-admin/reports?range=${range}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`/api/super-admin/reports?view=sellers`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`/api/super-admin/reports?view=products`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const overviewJson = (await overviewRes.json()) as Report & { error?: string };
        if (!overviewRes.ok) throw new Error(overviewJson.error ?? "Yuklanmadi");
        setData(overviewJson);

        if (sellersRes.ok) {
          const sj = (await sellersRes.json()) as { sellers?: SellerRow[] };
          setSellers(
            [...(sj.sellers ?? [])].sort((a, b) => b.gmv - a.gmv).slice(0, 5),
          );
        } else {
          setSellers([]);
        }
        if (productsRes.ok) {
          const pj = (await productsRes.json()) as { products?: ProductRow[] };
          setProducts(
            [...(pj.products ?? [])].sort((a, b) => b.gmv - a.gmv).slice(0, 5),
          );
        } else {
          setProducts([]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof Error && err.name === "AbortError") return;
        setData(null);
        setError(err instanceof Error ? err.message : "Yuklanmadi");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [range, reloadKey]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Metric", "Value"],
      ["Range", range],
      ["GMV", String(data.gmv ?? 0)],
      ["Paid GMV", String(data.paidGmv ?? 0)],
      ["Delivered GMV", String(data.deliveredGmv ?? 0)],
      ["Commission", String(data.totalCommission ?? 0)],
      ["Refund", String(data.refundAmount ?? 0)],
      ["Orders", String(data.orderCount ?? 0)],
      ["Return rate", String(data.orderCount ? (data.returned ?? 0) / data.orderCount : 0)],
      [],
      ["Top sellers"],
      ["Store", "GMV", "Orders", "Return rate"],
      ...sellers.map((s) => [s.storeName, String(s.gmv), String(s.orders), String(s.returnRate)]),
      [],
      ["Top products"],
      ["Product", "GMV", "Units", "Return rate"],
      ...products.map((p) => [p.name, String(p.gmv), String(p.unitsSold), String(p.returnRate)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `super-admin-reports-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error && !data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((n) => n + 1)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold"
        >
          Qayta urinish
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <Loader2 className="animate-spin text-[#f5b51b]" />
      </div>
    );
  }

  const returnRate = data.orderCount ? (data.returned ?? 0) / data.orderCount : 0;

  const cards = [
    { label: "GMV", value: formatPrice(data.gmv ?? data.gmvMonth ?? 0), href: "/admin/orders" },
    { label: "To‘langan GMV", value: formatPrice(data.paidGmv ?? 0), href: "/admin/orders" },
    { label: "Yetkazilgan GMV", value: formatPrice(data.deliveredGmv ?? 0), href: "/admin/orders" },
    { label: "Marketplace tushum", value: formatPrice(data.marketplaceRevenue ?? 0), href: "/super-admin/finance" },
    { label: "Seller tushum", value: formatPrice(data.sellerRevenue ?? 0), href: "/super-admin/finance" },
    { label: "Komissiya", value: formatPrice(data.totalCommission ?? 0), href: "/super-admin/commissions" },
    { label: "Refund", value: formatPrice(data.refundAmount ?? 0), href: "/admin/returns" },
    { label: "Payout", value: formatPrice(data.payoutAmount ?? 0), href: "/super-admin/finance#payouts" },
    { label: "Buyurtmalar", value: String(data.orderCount ?? data.ordersMonth ?? 0), href: "/admin/orders" },
    { label: "To‘langan", value: String(data.paidOrders ?? 0), href: "/admin/orders" },
    { label: "Yetkazilgan", value: String(data.delivered ?? 0), href: "/admin/orders" },
    { label: "Bekor", value: String(data.cancelled ?? 0), href: "/admin/orders" },
    { label: "Qaytarish", value: String(data.returned ?? 0), href: "/admin/returns" },
    { label: "Return rate", value: pct(returnRate), href: "/admin/returns" },
    { label: "Xaridorlar", value: String(data.buyers ?? 0), href: "/admin/users" },
    { label: "Sellerlar", value: String(data.sellers ?? 0), href: "/admin/sellers" },
    { label: "Faol seller", value: String(data.activeSellers ?? 0), href: "/admin/sellers" },
    { label: "Mahsulotlar", value: String(data.products ?? 0), href: "/admin/products" },
    { label: "Kam zaxira", value: String(data.lowStock ?? 0), href: "/admin/products" },
    { label: "Tugagan", value: String(data.outOfStock ?? 0), href: "/admin/products" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Platforma hisobotlari</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {PRESETS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl bg-[#1a0533] px-3 py-2 text-sm font-bold text-white"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-[#f5b51b]/40"
          >
            <p className="text-lg font-black text-gray-900">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-gray-600">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-black text-gray-900">Top sellerlar</h2>
          {sellers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Seller hisoboti yo‘q</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sellers.map((s) => (
                <li key={s.storeId}>
                  <Link
                    href={`/admin/sellers`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 hover:bg-gray-100"
                  >
                    <span className="font-semibold text-gray-900">{s.storeName}</span>
                    <span className="text-xs text-gray-500">
                      {formatPrice(s.gmv)} · {s.orders} ta · return {pct(s.returnRate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-black text-gray-900">Top mahsulotlar</h2>
          {products.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Mahsulot hisoboti yo‘q</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {products.map((p) => (
                <li key={p.productId}>
                  <Link
                    href={`/admin/products/${p.productId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 hover:bg-gray-100"
                  >
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatPrice(p.gmv)} · {p.unitsSold} dona · return {pct(p.returnRate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
