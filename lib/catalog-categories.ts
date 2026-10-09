import prisma from "@/lib/prisma";
import { resolveDataSource } from "@/lib/db";

/** Header/menu sluglarini seed kategoriyalariga moslashtirish */
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  aksessuarlar: "salon",
};

export function resolveCategorySlug(slug: string): string {
  return CATEGORY_SLUG_ALIASES[slug] ?? slug;
}

export async function findCatalogCategory(slug: string): Promise<{ slug: string; name: string } | null> {
  const resolved = resolveCategorySlug(slug);
  const source = await resolveDataSource();
  if (source !== "database") return null;

  return prisma.category.findFirst({
    where: { slug: resolved, isActive: true },
    select: { slug: true, name: true },
  });
}
