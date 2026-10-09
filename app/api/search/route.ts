import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { productSearchOr } from "@/lib/catalog-search";
import { databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import { BUYER_VISIBLE_PRODUCT_WHERE } from "@/lib/products";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const popularSearches = [
  "Michelin 205/55 R16",
  "Shell 5W-40",
  "Bosch akkumulyator",
  "Mann filter",
  "TyreWorld",
  "AutoParts Pro",
  "Continental R17",
  "Castrol 5W-30",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], stores: [], popular: popularSearches, suggestions: [] });
  }

  const source = await resolveDataSource();

  if (source === "database") {
    const [products, stores] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...BUYER_VISIBLE_PRODUCT_WHERE,
          OR: [
            ...productSearchOr(q),
            { store: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 8,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          brand: { select: { name: true } },
          category: { select: { name: true } },
          store: { select: { name: true, slug: true } },
        },
      }),
      prisma.store.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
          seller: { isActive: true, isBanned: false },
        },
        take: 5,
        include: {
          _count: { select: { products: { where: BUYER_VISIBLE_PRODUCT_WHERE } } },
        },
      }),
    ]);

    const results = products.map((product) => ({
      id: product.id,
      type: "product" as const,
      name: product.name,
      slug: product.slug,
      href: `/product/${product.slug}`,
      price: product.price,
      image: product.images[0]?.url,
      category: product.category.name,
      brand: product.brand?.name,
      store: product.store.name,
    }));

    const storeResults = stores.map((store) => ({
      id: store.id,
      type: "store" as const,
      name: store.name,
      slug: store.slug,
      href: `/store/${store.slug}`,
      image: store.logo,
      productCount: store._count.products,
      city: store.city,
      isVerified: store.isVerified,
    }));

    const suggestions = [
      ...storeResults.map((s) => s.name),
      ...results.map((p) => p.name),
    ].slice(0, 8);

    return NextResponse.json({
      results,
      stores: storeResults,
      suggestions,
      popular: popularSearches,
    });
  }

  if (source === "unavailable") {
    return NextResponse.json(
      { results: [], stores: [], suggestions: [], popular: popularSearches, ...databaseUnavailableResponse() },
      { status: 503 },
    );
  }

  return NextResponse.json({
    results: [],
    stores: [],
    suggestions: [],
    popular: popularSearches,
  });
}

