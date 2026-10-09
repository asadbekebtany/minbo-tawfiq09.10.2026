"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterSidebar, type CatalogFilterQuery } from "@/components/catalog/filter-sidebar";

export function MobileFilters({ query }: { query?: CatalogFilterQuery }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#d5d5d5] bg-white px-3.5 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:border-[#004733]/40"
      >
        <SlidersHorizontal size={16} />
        Filtrlar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Yopish"
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-[min(100%,360px)] flex-col bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#e8e8e8] px-4 py-3.5">
              <h2 className="text-lg font-bold text-[#1a1a1a]">Filtrlar</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-[#6b6b6b] hover:bg-[#f3f3f3]"
                aria-label="Yopish"
              >
                <X size={22} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 scrollbar-hide">
              <FilterSidebar embedded query={query} onApplied={() => setOpen(false)} />
            </div>

            <div className="shrink-0 border-t border-[#e8e8e8] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-12 w-full rounded-xl bg-[#004733] text-[15px] font-semibold text-white transition-colors hover:bg-[#003a29]"
              >
                Mahsulotlarni ko&apos;rsatish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
