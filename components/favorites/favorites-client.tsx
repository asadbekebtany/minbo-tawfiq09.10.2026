"use client";

import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { useFavoritesStore } from "@/lib/favorites-store";
import { ProductGrid } from "@/components/product/product-grid";

export function FavoritesClient() {
  const products = useFavoritesStore((store) => store.products);
  const hydrated = useFavoritesStore((store) => store.hydrated);
  const isLoading = useFavoritesStore((store) => store.isLoading);

  if (!hydrated || isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <Loader2 className="animate-spin text-[#004733]" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Saralanganlar</h1>
        <span className="text-sm text-gray-500">{products.length} ta mahsulot</span>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
          <Heart size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="mb-4 text-gray-500">Saralanganlar bo&apos;sh</p>
          <p className="mb-4 text-xs text-gray-400">
            Mahsulot kartasidagi yurakcha (♡) ni bosing — shu yerga tushadi
          </p>
          <Link
            href="/catalog"
            className="rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-6 py-2.5 text-sm font-bold text-[#002d21] transition-all hover:from-[#ffc733] hover:to-[#f5b51b]"
          >
            Katalogga o&apos;tish
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
