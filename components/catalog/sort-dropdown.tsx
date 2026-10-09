"use client";

import { useRouter, usePathname } from "next/navigation";
import type { CatalogFilterQuery } from "@/components/catalog/filter-sidebar";

const sortOptions = [
  { value: "popular", label: "Ko‘p buyurtma" },
  { value: "cheap", label: "Arzonroq" },
  { value: "expensive", label: "Qimmatroq" },
  { value: "rating", label: "Reyting" },
  { value: "new", label: "Yangi" },
  { value: "discount", label: "Chegirma" },
];

interface SortDropdownProps {
  currentSort: string;
  query?: CatalogFilterQuery;
}

/** WB-uslub: chip qator + mobile select */
export function SortDropdown({ currentSort, query = {} }: SortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSort = (value: string) => {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(query)) {
      if (val) params.set(key, val);
    }
    params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full sm:w-auto">
      <div className="hidden items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide md:flex">
        {sortOptions.map((opt) => {
          const active = currentSort === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSort(opt.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-[#002d21] text-[#f5b51b]"
                  : "bg-white text-gray-600 ring-1 ring-[#f5b51b]/25 hover:ring-[#f5b51b]/60"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-sm text-gray-500">Saralash:</span>
        <select
          value={currentSort}
          onChange={(e) => handleSort(e.target.value)}
          className="cursor-pointer rounded-lg border-2 border-[#f5b51b]/50 bg-white px-3 py-2 text-sm font-medium text-[#002d21] transition-colors hover:border-[#f5b51b] focus:border-[#f5b51b] focus:outline-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
