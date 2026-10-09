"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

type FilterOption = { slug: string; name: string; count?: number };

function FilterListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1 pb-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-2.5 py-2">
          <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded-[4px] bg-gray-200" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function parseList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export type CatalogFilterQuery = {
  q?: string;
  sort?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  inStock?: string;
  discount?: string;
  rating?: string;
  generationId?: string;
  carMake?: string;
  carModel?: string;
  year?: string;
  engineId?: string;
};

type FilterSidebarProps = {
  /** Mobile drawer: hide duplicate title, denser layout */
  embedded?: boolean;
  onApplied?: () => void;
  query?: CatalogFilterQuery;
};

export function FilterSidebar({ embedded = false, onApplied, query = {} }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [sections, setSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    brand: true,
    rating: false,
  });
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [brandQuery, setBrandQuery] = useState("");
  const [priceMin, setPriceMin] = useState(query.minPrice ?? "");
  const [priceMax, setPriceMax] = useState(query.maxPrice ?? "");

  const selectedCats = parseList(query.category);
  const selectedBrands = parseList(query.brand);
  const hasDiscount = query.discount === "1";
  const inStock = query.inStock === "1";
  const minRating = query.rating ?? null;

  useEffect(() => {
    setPriceMin(query.minPrice ?? "");
    setPriceMax(query.maxPrice ?? "");
  }, [query.minPrice, query.maxPrice]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/categories?active=true", { cache: "no-store", signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/brands?active=true", { cache: "no-store", signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([catData, brandData]) => {
        if (controller.signal.aborted) return;
        if (Array.isArray(catData?.categories) && catData.categories.length > 0) {
          setCategories(
            catData.categories
              .filter((c: { parentId?: string | null }) => !c.parentId)
              .map((c: { slug: string; name: string; count?: number }) => ({
                slug: c.slug,
                name: c.name,
                count: c.count,
              })),
          );
        }
        if (Array.isArray(brandData?.brands) && brandData.brands.length > 0) {
          setBrands(
            brandData.brands.map((b: { slug: string; name: string; count?: number }) => ({
              slug: b.slug,
              name: b.name,
              count: b.count,
            })),
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setTaxonomyLoading(false);
      });
    return () => controller.abort();
  }, []);

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value) params.set(key, value);
      }
      mutate(params);
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, query, router],
  );

  const toggleListParam = (key: string, value: string, current: string[]) => {
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    pushParams((params) => {
      if (next.length === 0) params.delete(key);
      else params.set(key, next.join(","));
    });
  };

  const toggle = (key: string) =>
    setSections((s) => ({ ...s, [key]: !s[key] }));

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedCats.length > 0 ||
    Boolean(query.minPrice) ||
    Boolean(query.maxPrice) ||
    hasDiscount ||
    inStock ||
    Boolean(minRating) ||
    Boolean(query.generationId) ||
    Boolean(query.carMake);

  const applyPrice = () => {
    pushParams((params) => {
      if (priceMin) params.set("minPrice", priceMin);
      else params.delete("minPrice");
      if (priceMax) params.set("maxPrice", priceMax);
      else params.delete("maxPrice");
    });
    onApplied?.();
  };

  const clearFilters = () => {
    pushParams((params) => {
      ["category", "brand", "minPrice", "maxPrice", "discount", "inStock", "rating", "generationId", "carMake", "carModel", "year", "engineId"].forEach((key) =>
        params.delete(key),
      );
    });
    setPriceMin("");
    setPriceMax("");
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandQuery.trim().toLowerCase()),
  );

  const sectionBtn =
    "w-full flex items-center justify-between py-3.5 text-[15px] font-semibold text-[#1a1a1a]";
  const row =
    "flex items-center gap-2.5 py-2 cursor-pointer select-none group";
  const check =
    "h-[18px] w-[18px] shrink-0 rounded-[4px] border border-[#c4c4c4] accent-[#004733] cursor-pointer";

  return (
    <div className={embedded ? "pb-2" : ""}>
      {!embedded && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1a1a1a]">Filtrlar</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-[#004733] hover:underline"
            >
              Tozalash
            </button>
          )}
        </div>
      )}

      {embedded && hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="mb-2 text-sm font-medium text-[#004733] hover:underline"
        >
          Barcha filtrlarni tozalash
        </button>
      )}

      {(query.generationId || query.carMake) && (
        <div className="mb-3 rounded-xl border border-[#004733]/15 bg-[#004733]/5 px-3 py-2.5 text-sm">
          <p className="font-semibold text-[#002d21]">Mashina</p>
          <p className="mt-0.5 text-xs text-gray-600">
            {[query.carMake, query.carModel].filter(Boolean).join(" ")}
            {query.year ? ` · ${query.year}` : ""}
          </p>
          <button
            type="button"
            onClick={() =>
              pushParams((params) => {
                ["generationId", "carMake", "carModel", "year", "engineId"].forEach((key) =>
                  params.delete(key),
                );
              })
            }
            className="mt-1 text-xs font-medium text-[#004733] hover:underline"
          >
            Filtrni olib tashlash
          </button>
        </div>
      )}

      {/* Category */}
      <div className="border-b border-[#e8e8e8]">
        <button type="button" onClick={() => toggle("category")} className={sectionBtn}>
          Kategoriya
          {sections.category ? <ChevronUp size={18} className="text-[#8b8b8b]" /> : <ChevronDown size={18} className="text-[#8b8b8b]" />}
        </button>
        {sections.category && (
          <div className="max-h-[220px] overflow-y-auto overscroll-contain pb-3 scrollbar-hide">
            {taxonomyLoading ? <FilterListSkeleton rows={8} /> : null}
            {!taxonomyLoading &&
              categories.map((cat) => (
              <label key={cat.slug} className={row}>
                <input
                  type="checkbox"
                  checked={selectedCats.includes(cat.slug)}
                  onChange={() => toggleListParam("category", cat.slug, selectedCats)}
                  className={check}
                />
                <span className="flex-1 text-[14px] leading-5 text-[#1a1a1a] group-hover:text-[#004733]">
                  {cat.name}
                </span>
                {typeof cat.count === "number" && cat.count > 0 ? (
                  <span className="text-[13px] text-[#8b8b8b]">{cat.count}</span>
                ) : null}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="border-b border-[#e8e8e8]">
        <button type="button" onClick={() => toggle("price")} className={sectionBtn}>
          Narx, so&apos;m
          {sections.price ? <ChevronUp size={18} className="text-[#8b8b8b]" /> : <ChevronDown size={18} className="text-[#8b8b8b]" />}
        </button>
        {sections.price && (
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="dan"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-[#d5d5d5] bg-white px-3 text-sm text-[#1a1a1a] placeholder:text-[#a0a0a0] focus:border-[#004733] focus:outline-none"
              />
              <span className="shrink-0 text-[#8b8b8b]">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="gacha"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-[#d5d5d5] bg-white px-3 text-sm text-[#1a1a1a] placeholder:text-[#a0a0a0] focus:border-[#004733] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyPrice}
              className="mt-3 h-10 w-full rounded-lg bg-[#004733] text-sm font-semibold text-white transition-colors hover:bg-[#003a29]"
            >
              Qo&apos;llash
            </button>
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="border-b border-[#e8e8e8]">
        <button type="button" onClick={() => toggle("brand")} className={sectionBtn}>
          Brend
          {sections.brand ? <ChevronUp size={18} className="text-[#8b8b8b]" /> : <ChevronDown size={18} className="text-[#8b8b8b]" />}
        </button>
        {sections.brand && (
          <div className="pb-3">
            <input
              type="search"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder="Brendni topish"
              className="mb-2 h-10 w-full rounded-lg border border-[#d5d5d5] bg-[#f6f6f6] px-3 text-sm placeholder:text-[#a0a0a0] focus:border-[#004733] focus:bg-white focus:outline-none"
            />
            <div className="max-h-[200px] overflow-y-auto overscroll-contain scrollbar-hide">
              {taxonomyLoading ? <FilterListSkeleton rows={8} /> : null}
              {!taxonomyLoading &&
                filteredBrands.map((b) => (
                <label key={b.slug} className={row}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b.slug)}
                    onChange={() => toggleListParam("brand", b.slug, selectedBrands)}
                    className={check}
                  />
                  <span className="flex-1 text-[14px] leading-5 text-[#1a1a1a] group-hover:text-[#004733]">
                    {b.name}
                  </span>
                  {typeof b.count === "number" && b.count > 0 ? (
                    <span className="text-[13px] text-[#8b8b8b]">{b.count}</span>
                  ) : null}
                </label>
              ))}
              {!taxonomyLoading && filteredBrands.length === 0 && (
                <p className="py-2 text-sm text-[#8b8b8b]">Brend topilmadi</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="border-b border-[#e8e8e8]">
        <button type="button" onClick={() => toggle("rating")} className={sectionBtn}>
          Reyting
          {sections.rating ? <ChevronUp size={18} className="text-[#8b8b8b]" /> : <ChevronDown size={18} className="text-[#8b8b8b]" />}
        </button>
        {sections.rating && (
          <div className="pb-3 space-y-0.5">
            {[4, 3, 2, 1].map((r) => (
              <label key={r} className={row}>
                <input
                  type="radio"
                  name="rating-filter"
                  className={check}
                  checked={minRating === String(r)}
                  onChange={() =>
                    pushParams((params) => {
                      params.set("rating", String(r));
                    })
                  }
                />
                <span className="text-[14px] text-[#f5a524]">{"★".repeat(r)}</span>
                <span className="text-[14px] text-[#8b8b8b]">{"★".repeat(5 - r)}</span>
                <span className="text-[14px] text-[#1a1a1a]">va yuqori</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Extra */}
      <div className="pt-1">
        <label className={row}>
          <input
            type="checkbox"
            checked={hasDiscount}
            onChange={(e) =>
              pushParams((params) => {
                if (e.target.checked) params.set("discount", "1");
                else params.delete("discount");
              })
            }
            className={check}
          />
          <span className="text-[14px] text-[#1a1a1a]">Chegirmadagilar</span>
        </label>
        <label className={row}>
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) =>
              pushParams((params) => {
                if (e.target.checked) params.set("inStock", "1");
                else params.delete("inStock");
              })
            }
            className={check}
          />
          <span className="text-[14px] text-[#1a1a1a]">Omborda bor</span>
        </label>
      </div>
    </div>
  );
}
