import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FilterSidebar } from "@/components/catalog/filter-sidebar";
import { CatalogProducts, assertValidCatalogPage } from "@/components/catalog/catalog-products";
import { SortDropdown } from "@/components/catalog/sort-dropdown";
import { MobileFilters } from "@/components/catalog/mobile-filters";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { findCatalogCategory } from "@/lib/catalog-categories";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sort?: string;
    q?: string;
    sub?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    generationId?: string;
    carMake?: string;
    carModel?: string;
    year?: string;
    inStock?: string;
    discount?: string;
    rating?: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await findCatalogCategory(slug);
  if (!category) notFound();
  return { title: category.name };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await findCatalogCategory(slug);
  if (!category) notFound();
  const categorySlug = category.slug;
  const catName = category.name;
  await assertValidCatalogPage(`/catalog/${slug}`, { ...sp, category: categorySlug });

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#004733]">
          Bosh sahifa
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <Link href="/catalog" className="hover:text-[#004733]">
          Katalog
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="font-medium text-gray-900">{catName}</span>
      </nav>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#004733]/10 pb-4">
        <h1 className="text-2xl font-bold text-[#002d21]">{catName}</h1>
        <div className="flex items-center gap-2">
          <MobileFilters query={sp} />
          <Suspense>
            <SortDropdown currentSort={sp.sort ?? "popular"} query={sp} />
          </Suspense>
        </div>
      </div>
      <div className="flex gap-6">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-24">
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/60" />}>
              <FilterSidebar query={sp} />
            </Suspense>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<ProductGridSkeleton />}>
            <CatalogProducts
              pathname={`/catalog/${slug}`}
              searchParams={{ ...sp, category: categorySlug }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
