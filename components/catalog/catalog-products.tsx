import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { CatalogPagination } from "@/components/catalog/pagination";
import { listCatalogProducts } from "@/lib/products";

interface CatalogProductsProps {
  pathname?: string;
  searchParams: {
    q?: string;
    sort?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    carMake?: string;
    carModel?: string;
    year?: string;
    generationId?: string;
    engineId?: string;
    page?: string;
    inStock?: string;
    discount?: string;
    rating?: string;
  };
}

type CatalogQuery = CatalogProductsProps["searchParams"];

function catalogHref(pathname: string, searchParams: CatalogQuery) {
  const params = new URLSearchParams();
  const skip = new Set(["page"]);
  if (pathname !== "/catalog") skip.add("category");
  for (const [key, value] of Object.entries(searchParams)) {
    if (skip.has(key) || value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function listArgs(searchParams: CatalogQuery, page: number) {
  const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const minRating = searchParams.rating ? Number(searchParams.rating) : undefined;
  return {
    q: searchParams.q,
    sort: searchParams.sort ?? "popular",
    category: searchParams.category,
    brand: searchParams.brand,
    minPrice,
    maxPrice,
    page,
    limit: 24,
    inStock: searchParams.inStock === "1" || searchParams.inStock === "true",
    hasDiscount: searchParams.discount === "1" || searchParams.discount === "true",
    minRating: Number.isFinite(minRating) ? minRating : undefined,
    carMake: searchParams.carMake,
    carModel: searchParams.carModel,
    year: searchParams.year ? Number(searchParams.year) : undefined,
    generationId: searchParams.generationId,
  };
}

export async function assertValidCatalogPage(
  pathname: string,
  searchParams: CatalogQuery,
) {
  const page = Number(searchParams.page ?? "1") || 1;
  if (page <= 1) return;
  const { totalPages } = await listCatalogProducts(listArgs(searchParams, page));
  if (page > totalPages) {
    redirect(catalogHref(pathname, searchParams));
  }
}

export async function CatalogProducts({
  pathname = "/catalog",
  searchParams,
}: CatalogProductsProps) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { products, total, totalPages } = await listCatalogProducts(
    listArgs(searchParams, page),
  );

  if (page > totalPages) {
    redirect(catalogHref(pathname, searchParams));
  }

  return (
    <div>
      {(searchParams.generationId || searchParams.carMake) && (
        <div className="mb-4 rounded-xl border border-[#004733]/15 bg-[#004733]/5 px-4 py-3 text-sm text-[#002d21]">
          Moslashuv filtri:{" "}
          <strong>
            {[searchParams.carMake, searchParams.carModel].filter(Boolean).join(" ")}
          </strong>
          {searchParams.year ? ` · ${searchParams.year}` : ""}
          {searchParams.engineId ? " · dvigatel tanlandi" : ""}
        </div>
      )}
      <p className="mb-4 text-sm text-gray-600">
        <span className="font-bold text-[#004733]">{total}</span> ta mahsulot topildi
      </p>
      <ProductGrid products={products} />
      <Suspense fallback={null}>
        <CatalogPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pathname={pathname}
          query={searchParams}
        />
      </Suspense>
    </div>
  );
}
