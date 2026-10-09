import type { Prisma } from "@prisma/client";

/** Katalog/qidiruv: nom, brend, SKU, OEM, kategoriya (FTS yo‘q — contains). */
export function productSearchOr(q: string): Prisma.ProductWhereInput[] {
  const term = q.trim();
  if (!term) return [];
  const exact = term;
  return [
    { name: { contains: term, mode: "insensitive" } },
    { nameRu: { contains: term, mode: "insensitive" } },
    { oemNumber: { contains: term, mode: "insensitive" } },
    { sku: { contains: term, mode: "insensitive" } },
    { brand: { name: { contains: term, mode: "insensitive" } } },
    { brand: { slug: { contains: term, mode: "insensitive" } } },
    { category: { name: { contains: term, mode: "insensitive" } } },
    { category: { nameRu: { contains: term, mode: "insensitive" } } },
    { category: { slug: { contains: term, mode: "insensitive" } } },
    { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
    { crossNumbers: { has: exact } },
    { crossNumbers: { has: exact.toUpperCase() } },
    { crossNumbers: { has: exact.toLowerCase() } },
  ];
}
