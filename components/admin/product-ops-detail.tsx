"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export function ProductOpsDetail({ productId }: { productId: string }) {
  const [data, setData] = useState<{
    product?: {
      name: string;
      sku: string | null;
      stock: number;
      moderationStatus: string;
      isApproved: boolean;
      store?: { name: string; seller?: { user?: { phone?: string | null } } };
      variants?: Array<{ sku: string | null; value: string; stock: number }>;
    };
    analytics?: {
      views: number;
      addToCart?: number;
      checkoutStarted?: number;
      orderCount?: number;
      unitsSold: number;
      gmv: number;
      deliveredGmv?: number;
      refundAmount?: number;
      returnCount: number;
      returnRate?: number;
      conversion: number;
    };
    audit?: Array<{ action: string; createdAt: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/products/${productId}`, { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Yuklanmadi");
        setData(json);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Yuklanmadi"));
  }, [productId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data?.product) return <p className="text-sm text-gray-500">Yuklanmoqda...</p>;
  const p = data.product;
  const a = data.analytics;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/admin/products" className="text-sm font-semibold text-[#004733]">
        ← Mahsulotlar
      </Link>
      <h1 className="text-xl font-black">{p.name}</h1>
      <p className="text-sm">
        SKU: {p.sku ?? "—"} · stock {p.stock} · seller {p.store?.name ?? "—"} ·{" "}
        {p.store?.seller?.user?.phone ?? ""}
      </p>
      <p className="text-sm">Moderatsiya: {p.moderationStatus} · tasdiq {p.isApproved ? "ha" : "yo‘q"}</p>
      {(p.variants ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">SKU/variant yo‘q</p>
      ) : (
        (p.variants ?? []).map((v) => (
          <p key={v.value} className="text-sm">
            {v.value} · {v.sku ?? "—"} · {v.stock}
          </p>
        ))
      )}
      {a ? (
        <div className="space-y-1 text-sm">
          <p>
            Views {a.views} · addToCart {a.addToCart ?? 0} · checkout {a.checkoutStarted ?? 0}
          </p>
          <p>
            Orders {a.orderCount ?? 0} · sold {a.unitsSold} · GMV {formatPrice(a.gmv)} · delivered{" "}
            {formatPrice(a.deliveredGmv ?? 0)}
          </p>
          <p>
            Refund {formatPrice(a.refundAmount ?? 0)} · return {a.returnCount} · return rate{" "}
            {((a.returnRate ?? 0) * 100).toFixed(1)}% · conv {(a.conversion * 100).toFixed(1)}%
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Analytics hali yo‘q</p>
      )}
      {(data.audit ?? []).length ? (
        <div className="text-sm">
          <h2 className="font-bold">Audit</h2>
          {(data.audit ?? []).map((row, i) => (
            <p key={`${row.action}-${i}`}>
              {row.action} · {row.createdAt}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Audit yozuvlari yo‘q</p>
      )}
    </div>
  );
}
