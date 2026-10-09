/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Plus, Upload, X } from "lucide-react";
import { slugify } from "@/lib/utils";

type Option = { id: string; name: string };

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
};

type LoadedProduct = {
  id: string;
  name: string;
  nameRu: string | null;
  slug: string;
  description: string | null;
  descriptionRu: string | null;
  categoryId: string;
  brandId: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  sku: string | null;
  oemNumber: string | null;
  crossNumbers: string[];
  warranty: string | null;
  returnPolicy: string | null;
  isActive: boolean;
  moderationStatus?: string;
  images: { url: string }[];
  variants?: Array<{
    id: string;
    name: string;
    value: string;
    price: number | null;
    stock: number;
    sku: string | null;
    isActive: boolean;
  }>;
};

export function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter();
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [crossNumbers, setCrossNumbers] = useState<string[]>([]);
  const [crossInput, setCrossInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<string>("draft");
  const [variants, setVariants] = useState<
    Array<{
      id: string;
      name: string;
      value: string;
      price: number | null;
      stock: number;
      sku: string | null;
      isActive: boolean;
    }>
  >([]);
  const [skuDraft, setSkuDraft] = useState({ value: "", price: "", stock: "0", sku: "" });
  const [skuBusy, setSkuBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nameRu: "",
    categoryId: "",
    brandId: "",
    price: "",
    oldPrice: "",
    stock: "",
    oemNumber: "",
    sku: "",
    description: "",
    descriptionRu: "",
    warranty: "12 oy",
    returnPolicy: "14 kun",
    slug: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/categories?active=true", { cache: "no-store" }),
          fetch("/api/brands?active=true", { cache: "no-store" }),
        ]);
        const catData = (await catRes.json()) as { categories?: Option[]; error?: string };
        const brandData = (await brandRes.json()) as { brands?: Option[]; error?: string };
        if (!cancelled) {
          setCategories(catData.categories ?? []);
          setBrands(brandData.brands ?? []);
        }
      } catch {
        if (!cancelled) setError("Kategoriya va brendlarni yuklab bo‘lmadi");
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    let cancelled = false;
    async function loadProduct() {
      setLoadingProduct(true);
      setError(null);
      try {
        const response = await fetch(`/api/products/${productId}`, { cache: "no-store" });
        const data = (await response.json()) as { product?: LoadedProduct; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Mahsulot topilmadi");
        const product = data.product;
        if (!product || cancelled) return;
        setForm({
          name: product.name,
          nameRu: product.nameRu ?? "",
          categoryId: product.categoryId,
          brandId: product.brandId ?? "",
          price: String(product.price),
          oldPrice: product.oldPrice ? String(product.oldPrice) : "",
          stock: String(product.stock),
          oemNumber: product.oemNumber ?? "",
          sku: product.sku ?? "",
          description: product.description ?? "",
          descriptionRu: product.descriptionRu ?? "",
          warranty: product.warranty ?? "12 oy",
          returnPolicy: product.returnPolicy ?? "14 kun",
          slug: product.slug,
        });
        setImages(product.images.map((img) => img.url));
        setCrossNumbers(product.crossNumbers ?? []);
        setVariants(product.variants ?? []);
        setModerationStatus(product.moderationStatus ?? "pending_moderation");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Mahsulot topilmadi");
        }
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    }
    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [mode, productId]);

  const addCross = () => {
    if (crossInput.trim()) {
      setCrossNumbers([...crossNumbers, crossInput.trim()]);
      setCrossInput("");
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Rasm yuklanmadi");
      setImages((prev) => [...prev, data.url!]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rasm yuklanmadi");
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = () => {
    const slug = form.slug.trim() || slugify(form.name);
    return {
      name: form.name.trim(),
      nameRu: form.nameRu.trim() || null,
      slug,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      stock: Number(form.stock || 0),
      oemNumber: form.oemNumber.trim() || null,
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      descriptionRu: form.descriptionRu.trim() || null,
      crossNumbers,
      warranty: form.warranty || null,
      returnPolicy: form.returnPolicy || null,
      images,
      isActive: mode === "edit" ? undefined : false,
    };
  };

  const handleSave = async () => {
    if (!form.name || !form.categoryId || !form.price) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const response = await fetch(
        mode === "edit" && productId ? `/api/products/${productId}` : "/api/seller/products",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string; product?: { id: string } };
      if (!response.ok) throw new Error(data.error ?? "Saqlab bo‘lmadi");
      setSaved(true);
      if (mode === "create" && data.product?.id) {
        router.push(`/seller/products/${data.product.id}/edit`);
        return;
      }
      setTimeout(() => router.push("/seller/products"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlab bo‘lmadi");
    } finally {
      setSaving(false);
    }
  };

  const addSku = async () => {
    if (mode !== "edit" || !productId || !skuDraft.value.trim()) return;
    const code = skuDraft.sku.trim();
    const value = skuDraft.value.trim();
    if (variants.some((v) => v.value.toLowerCase() === value.toLowerCase())) {
      setError("Bu variant qiymati allaqachon mavjud");
      return;
    }
    if (code && variants.some((v) => (v.sku ?? "").toLowerCase() === code.toLowerCase())) {
      setError("Bu SKU kod allaqachon mavjud");
      return;
    }
    setSkuBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/seller/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          name: "SKU",
          value: skuDraft.value.trim(),
          price: skuDraft.price ? Number(skuDraft.price) : null,
          stock: Number(skuDraft.stock || 0),
          sku: skuDraft.sku.trim() || null,
        }),
      });
      const data = (await response.json()) as { variant?: (typeof variants)[number]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "SKU qo‘shilmadi");
      if (data.variant) setVariants((prev) => [...prev, data.variant!]);
      setSkuDraft({ value: "", price: "", stock: "0", sku: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "SKU qo‘shilmadi");
    } finally {
      setSkuBusy(false);
    }
  };

  const patchSku = async (
    variantId: string,
    patch: { price?: number | null; stock?: number; isActive?: boolean; sku?: string | null },
  ) => {
    setSkuBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/seller/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, ...patch }),
      });
      const data = (await response.json()) as { variant?: (typeof variants)[number]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "SKU yangilanmadi");
      if (data.variant) {
        setVariants((prev) => prev.map((v) => (v.id === variantId ? data.variant! : v)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "SKU yangilanmadi");
    } finally {
      setSkuBusy(false);
    }
  };

  const submitModeration = async () => {
    if (!productId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationStatus: "pending_moderation" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Yuborilmadi");
      setModerationStatus("pending_moderation");
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuborilmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta || loadingProduct) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/seller/products"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-black text-gray-900">
          {mode === "edit" ? "Mahsulotni tahrirlash" : "Mahsulot qo'shish"}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "create" && (
        <p className="text-sm text-gray-500 rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
          Yangi mahsulot admin tasdiqlaguncha katalogda ko‘rinmaydi.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Asosiy ma&apos;lumotlar</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mahsulot nomi (UZ) *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                  placeholder="Masalan: Michelin Energy Saver+ 205/55 R16"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mahsulot nomi (RU)</label>
                <input
                  value={form.nameRu}
                  onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
                  placeholder="Название на русском"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="michelin-energy-saver-205-55-r16"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                  >
                    <option value="">Tanlang</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brend</label>
                  <select
                    value={form.brandId}
                    onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                  >
                    <option value="">Tanlang</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OEM raqam</label>
                <input
                  value={form.oemNumber}
                  onChange={(e) => setForm({ ...form, oemNumber: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cross raqamlar</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={crossInput}
                    onChange={(e) => setCrossInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCross())}
                    placeholder="Raqam kiriting va Enter bosing"
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                  />
                  <button
                    type="button"
                    onClick={addCross}
                    className="p-2.5 bg-[#cb11ab] text-white rounded-xl hover:bg-[#a50d8c]"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {crossNumbers.map((n, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-lg"
                    >
                      {n}
                      <button type="button" onClick={() => setCrossNumbers(crossNumbers.filter((_, j) => j !== i))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Narx va ombor</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Narx (so&apos;m) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="1250000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eski narx</label>
                <input
                  type="number"
                  value={form.oldPrice}
                  onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                  placeholder="1650000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ombor soni *</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="10"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                />
              </div>
            </div>
          </div>

          {mode === "edit" && productId ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">SKU / variant</h2>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={skuDraft.value}
                  onChange={(e) => setSkuDraft({ ...skuDraft, value: e.target.value })}
                  placeholder="Qiymat (masalan R16)"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  value={skuDraft.sku}
                  onChange={(e) => setSkuDraft({ ...skuDraft, sku: e.target.value })}
                  placeholder="SKU kod"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  type="number"
                  value={skuDraft.price}
                  onChange={(e) => setSkuDraft({ ...skuDraft, price: e.target.value })}
                  placeholder="Narx"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  type="number"
                  value={skuDraft.stock}
                  onChange={(e) => setSkuDraft({ ...skuDraft, stock: e.target.value })}
                  placeholder="Stock"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <button
                type="button"
                disabled={skuBusy || !skuDraft.value.trim()}
                onClick={() => void addSku()}
                className="mb-4 rounded-xl bg-[#004733] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                SKU qo‘shish
              </button>
              <div className="space-y-2">
                {variants.length === 0 ? (
                  <p className="text-xs text-gray-400">Hali variant yo‘q</p>
                ) : (
                  variants.map((v) => (
                    <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">{v.value}</span>
                      <span className="text-xs text-gray-500">{v.sku ?? "—"}</span>
                      <input
                        type="number"
                        defaultValue={v.price ?? ""}
                        className="w-24 rounded-lg border px-2 py-1 text-xs"
                        onBlur={(e) =>
                          void patchSku(v.id, {
                            price: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                      <input
                        type="number"
                        defaultValue={v.stock}
                        className="w-16 rounded-lg border px-2 py-1 text-xs"
                        onBlur={(e) => void patchSku(v.id, { stock: Number(e.target.value || 0) })}
                      />
                      <button
                        type="button"
                        disabled={skuBusy}
                        onClick={() => void patchSku(v.id, { isActive: !v.isActive })}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                          v.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {v.isActive ? "Faol" : "O‘chiq"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Tavsif</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif (UZ)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mahsulot haqida ma'lumot..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание (RU)</label>
                <textarea
                  value={form.descriptionRu}
                  onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })}
                  placeholder="Описание на русском..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Rasmlar</h2>
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#cb11ab]/50 transition-colors cursor-pointer mb-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <Loader2 className="animate-spin text-gray-400 mx-auto mb-2" size={24} />
              ) : (
                <Upload size={24} className="text-gray-300 mx-auto mb-2" />
              )}
              <p className="text-xs text-gray-500">Rasm yuklash uchun bosing</p>
              <p className="text-xs text-gray-400">PNG, JPG · Maks 5MB</p>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                  <img src={img} alt="" className="w-full h-full object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Kafolat va qaytarish</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kafolat muddati</label>
                <select
                  value={form.warranty}
                  onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                >
                  {["Kafolatsiz", "3 oy", "6 oy", "12 oy", "24 oy", "36 oy"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qaytarish muddati</label>
                <select
                  value={form.returnPolicy}
                  onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
                >
                  {["Qaytarish yo'q", "7 kun", "14 kun", "30 kun"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !form.name || !form.categoryId || !form.price}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors ${
              saved ? "bg-green-500 text-white" : "bg-[#cb11ab] text-white hover:bg-[#a50d8c] disabled:opacity-50"
            }`}
          >
            {saving ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : saved ? (
              <Check size={16} />
            ) : null}
            {saving ? "Saqlanmoqda..." : saved ? "Saqlandi!" : mode === "edit" ? "O'zgarishlarni saqlash" : "Mahsulotni saqlash"}
          </button>
          {mode === "edit" &&
          productId &&
          (moderationStatus === "draft" || moderationStatus === "rejected") ? (
            <button
              type="button"
              onClick={() => void submitModeration()}
              disabled={saving}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Moderatsiyaga yuborish
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
