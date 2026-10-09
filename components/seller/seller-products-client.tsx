"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Edit2, Eye, EyeOff, Loader2, Package, Plus, Search, Trash2, Upload } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type SellerProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  isActive: boolean;
  isApproved: boolean;
  moderationStatus?: string;
  deletedAt?: string | null;
  images: { url: string }[];
  brand: { name: string } | null;
  category: { name: string };
};

export function SellerProductsClient() {
  const [products, setProducts] = useState<SellerProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [sort, setSort] = useState<"name" | "price" | "stock">("name");
  const [toast, setToast] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const debouncedQ = useDebouncedValue(q, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ mine: "true", limit: "100" });
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      const response = await fetch(`/api/seller/products?${params}`, { cache: "no-store" });
      const data = (await response.json()) as { products?: SellerProductRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Mahsulotlarni yuklab bo‘lmadi");
      setProducts(data.products ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggleActive = async (product: SellerProductRow) => {
    setUpdatingId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Holat yangilanmadi");
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Holat yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "O‘chirib bo‘lmadi");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleting(null);
      setToast("Mahsulot arxivlandi");
      window.setTimeout(() => setToast(null), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "O‘chirib bo‘lmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const submitModeration = async (id: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationStatus: "pending_moderation" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Yuborilmadi");
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, moderationStatus: "pending_moderation", isApproved: false } : p,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuborilmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/seller/products/import", { method: "POST", body });
      const data = (await res.json()) as { created?: number; errors?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import xato");
      const extra = data.errors?.length ? ` (${data.errors.length} xato)` : "";
      await load();
      setToast(`${data.created ?? 0} ta mahsulot qo‘shildi${extra}`);
      window.setTimeout(() => setToast(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import xato");
    } finally {
      setImporting(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = products.filter((p) => {
      const matchQ = !needle || p.name.toLowerCase().includes(needle);
      const pending = p.moderationStatus === "pending_moderation" || !p.isApproved;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.isActive) ||
        (statusFilter === "inactive" && !p.isActive) ||
        (statusFilter === "pending" && pending);
      return matchQ && matchStatus;
    });
    return [...rows].sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "stock") return a.stock - b.stock;
      return a.name.localeCompare(b.name, "uz");
    });
  }, [products, q, sort, statusFilter]);

  if (loading && products.length === 0) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#004733]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Mahsulotlar</h1>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
            <Upload size={16} />
            {importing ? "Yuklanmoqda..." : "CSV import"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importCsv(file);
                e.target.value = "";
              }}
            />
          </label>
          <Link
            href="/seller/products/add"
            className="flex items-center gap-2 rounded-xl bg-[#004733] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#003a29]"
          >
            <Plus size={16} /> Mahsulot qo&apos;shish
          </Link>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        CSV ustunlari: <code>name,price,stock,category,description</code>
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {toast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mahsulot nomi bo'yicha qidirish..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-[#004733] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">Barchasi</option>
          <option value="active">Faol</option>
          <option value="inactive">Nofaol</option>
          <option value="pending">Moderatsiya</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="name">Nom</option>
          <option value="price">Narx</option>
          <option value="stock">Ombor</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Jami", val: products.length, color: "text-gray-900" },
          { label: "Faol", val: products.filter((p) => p.isActive).length, color: "text-green-600" },
          { label: "Nofaol", val: products.filter((p) => !p.isActive).length, color: "text-red-500" },
          { label: "Kutmoqda", val: products.filter((p) => p.moderationStatus === "pending_moderation" || !p.isApproved).length, color: "text-orange-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className={`text-2xl font-black ${color}`}>{val}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Mahsulot", "Narx", "Ombor", "Holat", "Amallar"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
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
                        <p className="text-xs text-gray-400">
                          {p.category.name} · {p.brand?.name ?? "—"}
                        </p>
                        {!p.isApproved && (
                          <p className="text-xs text-orange-600 mt-0.5">
                            {p.moderationStatus === "rejected"
                              ? "Rad etilgan"
                              : p.moderationStatus === "draft"
                                ? "Qoralama"
                                : p.moderationStatus === "archived"
                                  ? "Arxiv"
                                  : "Admin tasdiqlashi kutilmoqda"}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</p>
                    {p.oldPrice && (
                      <p className="text-xs text-gray-400 line-through">{formatPrice(p.oldPrice)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-bold ${
                        p.stock <= 3 ? "text-red-500" : p.stock <= 10 ? "text-orange-500" : "text-gray-900"
                      }`}
                    >
                      {p.stock}
                    </span>
                    <span className="text-xs text-gray-400"> ta</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.isActive ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {p.isApproved && (
                        <Link
                          href={`/product/${p.slug}`}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Ko'rish"
                        >
                          <Eye size={15} />
                        </Link>
                      )}
                      <Link
                        href={`/seller/products/${p.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-[#cb11ab] rounded-lg hover:bg-[#cb11ab]/10 transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 size={15} />
                      </Link>
                      {p.moderationStatus === "draft" || p.moderationStatus === "rejected" ? (
                        <button
                          type="button"
                          onClick={() => void submitModeration(p.id)}
                          disabled={updatingId === p.id}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-orange-100 text-orange-700 disabled:opacity-40"
                          title="Moderatsiyaga yuborish"
                        >
                          Yuborish
                        </button>
                      ) : null}
                      <button
                        onClick={() => void toggleActive(p)}
                        disabled={updatingId === p.id || !p.isApproved}
                        className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-40"
                        title={p.isActive ? "Nofaol qilish" : "Faollashtirish"}
                      >
                        {p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      {deleting === p.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => void handleDelete(p.id)}
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
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Package size={40} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Mahsulot topilmadi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
