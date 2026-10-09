"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Eye, Loader2, Search, Trash2, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatPrice } from "@/lib/utils";

type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  isApproved: boolean;
  isActive: boolean;
  images: { url: string }[];
  brand: { name: string } | null;
  category: { name: string };
  store: { name: string };
};

export function AdminProductsClient() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterApproval, setFilterApproval] = useState<"all" | "pending" | "approved">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debouncedQ = useDebouncedValue(q, 300);
  const hasRows = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (hasRows.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ admin: "true", limit: "100" });
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      const response = await fetch(`/api/products?${params}`, { cache: "no-store", signal });
      const data = (await response.json()) as { products?: AdminProductRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Mahsulotlarni yuklab bo‘lmadi");
      setProducts(data.products ?? []);
      hasRows.current = true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const patchProduct = async (id: string, body: Record<string, unknown>) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string; product?: AdminProductRow };
      if (!response.ok) throw new Error(data.error ?? "Yangilab bo‘lmadi");
      if (data.product) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.product } : p)));
      } else {
        await load();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yangilab bo‘lmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const approve = (id: string) => void patchProduct(id, { isApproved: true, isActive: true });
  const reject = (id: string) => void patchProduct(id, { isApproved: false, isActive: false });

  const remove = async (id: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "O‘chirib bo‘lmadi");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleting(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "O‘chirib bo‘lmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchApproval =
        filterApproval === "all" ? true :
        filterApproval === "approved" ? p.isApproved :
        !p.isApproved;
      return matchApproval;
    });
  }, [filterApproval, products]);

  const pending = useMemo(() => products.filter((p) => !p.isApproved).length, [products]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Mahsulotlar</h1>
          {pending > 0 && (
            <p className="text-sm text-orange-600 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
              {pending} ta mahsulot tasdiqlash kutmoqda
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder="Mahsulot nomi..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { key: "all", label: "Barchasi" },
            { key: "pending", label: `Kutmoqda (${pending})` },
            { key: "approved", label: "Tasdiqlangan" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterApproval(key as typeof filterApproval)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterApproval === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {refreshing ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-gray-100">
            <div className="h-full w-1/3 animate-pulse bg-[#cb11ab]" />
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Mahsulot", "Do'kon", "Kategoriya", "Narx", "Ombor", "Holat", "Amallar"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 transition-colors ${!p.isApproved ? "bg-orange-50/30" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                        {p.images[0] && (
                          <Image
                            src={p.images[0].url}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-contain p-0.5"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.brand?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.store.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.category.name}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</p>
                    {p.oldPrice && (
                      <p className="text-xs text-gray-400 line-through">{formatPrice(p.oldPrice)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${p.stock <= 3 ? "text-red-500" : "text-gray-900"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.isApproved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {p.isApproved ? "Tasdiqlangan" : "Kutmoqda"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {!p.isApproved && (
                        <button
                          onClick={() => approve(p.id)}
                          disabled={updatingId === p.id}
                          className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Tasdiqlash"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {p.isApproved && (
                        <button
                          onClick={() => reject(p.id)}
                          disabled={updatingId === p.id}
                          className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Bekor qilish"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <a
                        href={`/admin/products/${p.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#004733] hover:bg-[#004733]/10 rounded-lg transition-colors"
                        title="Admin tafsilot"
                      >
                        <Eye size={14} />
                      </a>
                      <a
                        href={`/product/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Katalog"
                      >
                        <Eye size={14} />
                      </a>
                      {deleting === p.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => void remove(p.id)}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg"
                          >
                            Ha
                          </button>
                          <button
                            onClick={() => setDeleting(null)}
                            className="text-xs px-2 py-1 bg-gray-100 rounded-lg"
                          >
                            Yo&apos;q
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleting(p.id)}
                          disabled={updatingId === p.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Mahsulot topilmadi</div>
          )}
        </div>
      </div>
    </div>
  );
}
