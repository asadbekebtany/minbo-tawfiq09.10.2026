"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogFilterQuery } from "@/components/catalog/filter-sidebar";

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pathname: string;
  query?: CatalogFilterQuery;
}

export function CatalogPagination({
  page,
  totalPages,
  total,
  pathname,
  query = {},
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(query)) {
      if (val && key !== "page") params.set(key, val);
    }
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages: number[] = [];
  for (let i = windowStart; i <= windowEnd; i += 1) pages.push(i);

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <p className="text-xs text-gray-500">
        Sahifa {page} / {totalPages} · jami {total} ta
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Sahifalar">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm ${
            page <= 1
              ? "pointer-events-none border-gray-100 text-gray-300"
              : "border-[#f5b51b]/40 text-[#002d21] hover:bg-[#f5b51b]/15"
          }`}
        >
          <ChevronLeft size={16} />
        </Link>
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(p)}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold ${
              p === page
                ? "bg-[#002d21] text-[#f5b51b]"
                : "border border-[#f5b51b]/30 text-[#002d21] hover:bg-[#f5b51b]/15"
            }`}
          >
            {p}
          </Link>
        ))}
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm ${
            page >= totalPages
              ? "pointer-events-none border-gray-100 text-gray-300"
              : "border-[#f5b51b]/40 text-[#002d21] hover:bg-[#f5b51b]/15"
          }`}
        >
          <ChevronRight size={16} />
        </Link>
      </nav>
    </div>
  );
}
