"use client";

import { memo, useCallback, useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { ProductForm } from "@/components/seller/product-form";

type AddMode = "manual" | "ai";

type Option = { id: string; name: string };

const PREVIEW_SLOTS = [
  ["nameUz", "Nomi UZ"],
  ["nameRu", "Nomi RU"],
  ["category", "Kategoriya"],
  ["brand", "Brand"],
  ["descriptionUz", "Description UZ"],
  ["descriptionRu", "Description RU"],
  ["seo", "SEO / qisqa tavsif"],
  ["attributes", "Attributes"],
  ["crossNumbers", "Cross numbers"],
] as const;

const AiPreviewShell = memo(function AiPreviewShell() {
  return (
    <section className="min-w-0 rounded-2xl border border-dashed border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">AI natija (hozir bo‘sh)</h2>
      <p className="mt-1 text-xs text-gray-500">Keyingi etapda shu yerga tahlil natijasi tushadi. Fake ma’lumot yo‘q.</p>
      <dl className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {PREVIEW_SLOTS.map(([id, label]) => (
          <div key={id} className="min-w-0 rounded-xl bg-gray-50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="mt-0.5 break-words text-sm text-gray-300">—</dd>
          </div>
        ))}
      </dl>
    </section>
  );
});

export function SellerProductAddShell() {
  const [mode, setMode] = useState<AddMode>("manual");
  const [sku, setSku] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (mode !== "ai") return;
    let cancelled = false;
    setMetaLoading(true);
    void Promise.all([
      fetch("/api/categories?active=true", { cache: "no-store" }),
      fetch("/api/brands?active=true", { cache: "no-store" }),
    ])
      .then(async ([catRes, brandRes]) => {
        const catData = (await catRes.json()) as { categories?: Option[] };
        const brandData = (await brandRes.json()) as { brands?: Option[] };
        if (cancelled) return;
        setCategories(catData.categories ?? []);
        setBrands(brandData.brands ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setBrands([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const applyFile = useCallback((next: File | null) => {
    setNotice(null);
    setFile(next);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
  }, []);

  const onPick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const picked = event.target.files?.[0] ?? null;
      applyFile(picked);
      event.target.value = "";
    },
    [applyFile],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragOver(false);
      const dropped = event.dataTransfer.files?.[0] ?? null;
      const type = dropped?.type ?? "";
      if (dropped && (type === "image/jpeg" || type === "image/png" || type === "image/webp")) {
        applyFile(dropped);
      }
    },
    [applyFile],
  );

  const onAnalyze = useCallback(() => {
    setNotice("AI integratsiyasi keyingi etapda ulanadi.");
  }, []);

  return (
    <div className="mx-auto max-w-4xl min-w-0 space-y-4 overflow-x-clip">
      <div className="min-w-0 rounded-2xl border border-gray-100 bg-white p-2">
        <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setNotice(null);
            }}
            className={`min-w-0 rounded-xl px-3 py-2.5 text-sm font-bold ${
              mode === "manual" ? "bg-[#004733] text-white" : "bg-gray-50 text-gray-700"
            }`}
          >
            Ruchnoy qo‘shish
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`min-w-0 rounded-xl px-3 py-2.5 text-sm font-bold ${
              mode === "ai" ? "bg-[#cb11ab] text-white" : "bg-gray-50 text-gray-700"
            }`}
          >
            AI bilan to‘ldirish
          </button>
        </div>
      </div>

      <div className={mode === "manual" ? undefined : "hidden"}>
        <ProductForm mode="create" />
      </div>

      {mode === "ai" ? (
        <div className="min-w-0 space-y-4">
          <p className="text-sm text-gray-500">
            AI hozir ulanmagan. Rasm local preview’da qoladi — mahsulot yaratilmaydi.
          </p>

          <section className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Mahsulot rasmi</h2>
            <input
              id="ai-product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onPick}
            />
            {previewUrl ? (
              <div className="relative min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="mx-auto max-h-56 w-full object-contain p-3" />
                <button
                  type="button"
                  onClick={() => applyFile(null)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white"
                  aria-label="Rasmni olib tashlash"
                >
                  <X size={14} />
                </button>
                {file ? (
                  <p className="truncate px-3 pb-2 text-[11px] text-gray-500">{file.name}</p>
                ) : null}
              </div>
            ) : (
              <label
                htmlFor="ai-product-image"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`flex min-h-[140px] min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  dragOver ? "border-[#cb11ab] bg-[#cb11ab]/5" : "border-gray-200 hover:border-[#cb11ab]/50"
                }`}
              >
                <Upload size={24} className="mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">Rasmni shu yerga tashlang yoki bosing</p>
                <p className="mt-1 text-xs text-gray-400">PNG, JPG, WebP · local preview, DB ga yozilmaydi</p>
              </label>
            )}
          </section>

          <section className="min-w-0 space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Artikul / SKU / OEM</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Artikul, SKU yoki OEM"
                className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none"
              />
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-gray-700">Brand (ixtiyoriy)</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  disabled={metaLoading}
                  className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none disabled:opacity-50"
                >
                  <option value="">Tanlanmagan</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-gray-700">Kategoriya (ixtiyoriy)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={metaLoading}
                  className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#cb11ab] focus:outline-none disabled:opacity-50"
                >
                  <option value="">Tanlanmagan</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {metaLoading ? (
              <p className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" />
                Brand/kategoriya yuklanmoqda
              </p>
            ) : null}
          </section>

          <button
            type="button"
            onClick={onAnalyze}
            className="w-full min-w-0 rounded-xl bg-[#cb11ab] py-3.5 text-sm font-bold text-white"
          >
            AI bilan tahlil qilish
          </button>
          {notice ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
          ) : null}

          <AiPreviewShell />
        </div>
      ) : null}
    </div>
  );
}
