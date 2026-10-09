import "server-only";
import type { Prisma } from "@prisma/client";
import type { CatalogProduct } from "@/lib/catalog-product";
import { productSearchOr } from "@/lib/catalog-search";
import { resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export type ProductListParams = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  hasDiscount?: boolean;
  minRating?: number;
  carMake?: string;
  carModel?: string;
  year?: number;
  generationId?: string;
  oem?: string;
};

function splitCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export type ProductListResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  brand: { select: { name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, slug: true, isVerified: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      value: true,
      price: true,
      stock: true,
      sku: true,
    },
  },
} satisfies Prisma.ProductInclude;

type DbProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function mapDbProduct(product: DbProductRow): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
    slug: product.slug,
    price: product.price,
    oldPrice: product.oldPrice ?? undefined,
    discount: product.discount,
    rating: product.rating,
    reviewCount: product.reviewCount,
    stock: product.stock,
    soldCount: product.soldCount,
    isActive: product.isActive,
    isApproved: product.isApproved,
    isFeatured: product.isFeatured,
    images: product.images.map((image) => ({ url: image.url })),
    brand: product.brand ? { name: product.brand.name } : null,
    store: {
      name: product.store.name,
      slug: product.store.slug,
      isVerified: product.store.isVerified,
    },
    category: product.category,
    oemNumber: product.oemNumber,
    sku: product.sku,
    description: product.description,
    warranty: product.warranty,
    returnPolicy: product.returnPolicy,
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
    })),
  };
}

function buildOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "cheap":
      return { price: "asc" };
    case "expensive":
      return { price: "desc" };
    case "rating":
      return { rating: "desc" };
    case "new":
      return { createdAt: "desc" };
    case "discount":
      return { discount: "desc" };
    default:
      return { soldCount: "desc" };
  }
}

export const BUYER_VISIBLE_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  isActive: true,
  isApproved: true,
  moderationStatus: "active",
  deletedAt: null,
  store: { seller: { isBanned: false, isActive: true } },
};

function buildWhere(params: ProductListParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...BUYER_VISIBLE_PRODUCT_WHERE };

  if (params.featured) {
    where.isFeatured = true;
  }

  if (params.q) {
    where.OR = [
      ...productSearchOr(params.q),
      { store: { name: { contains: params.q, mode: "insensitive" } } },
    ];
  }

  if (params.oem && params.oem !== params.q) {
    where.OR = [
      ...(where.OR ?? []),
      { oemNumber: { contains: params.oem, mode: "insensitive" } },
    ];
  }

  const categories = splitCsv(params.category);
  if (categories.length === 1) {
    where.category = { slug: categories[0] };
  } else if (categories.length > 1) {
    where.category = { slug: { in: categories } };
  }

  const brands = splitCsv(params.brand);
  if (brands.length > 0) {
    where.brand = {
      OR: [{ slug: { in: brands } }, { name: { in: brands, mode: "insensitive" } }],
    };
  }

  where.price = {
    gte: params.minPrice ?? 0,
    lte: params.maxPrice ?? 999_999_999,
  };

  if (params.inStock) {
    where.AND = [
      ...((where.AND as Prisma.ProductWhereInput[] | undefined) ?? []),
      {
        OR: [
          { stock: { gt: 0 } },
          { variants: { some: { stock: { gt: 0 }, isActive: true } } },
        ],
      },
    ];
  }
  if (params.hasDiscount) {
    where.AND = [
      ...((where.AND as Prisma.ProductWhereInput[] | undefined) ?? []),
      { OR: [{ discount: { gt: 0 } }, { oldPrice: { not: null } }] },
    ];
  }
  if (params.minRating) {
    where.rating = { gte: params.minRating };
  }

  if (params.generationId) {
    where.compatibility = { some: { generationId: params.generationId } };
  } else if (params.carMake || params.carModel || params.year) {
    where.compatibility = {
      some: {
        generation: {
          ...(params.year
            ? {
                yearFrom: { lte: params.year },
                OR: [{ yearTo: null }, { yearTo: { gte: params.year } }],
              }
            : {}),
          model: {
            ...(params.carModel ? { name: { equals: params.carModel, mode: "insensitive" } } : {}),
            make: params.carMake
              ? { name: { equals: params.carMake, mode: "insensitive" } }
              : undefined,
          },
        },
      },
    };
  }

  return where;
}

export async function listCatalogProducts(
  params: ProductListParams = {},
): Promise<ProductListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const sort = params.sort ?? "popular";
  const source = await resolveDataSource();

  if (source !== "database") {
    return { products: [], total: 0, page, limit, totalPages: 1 };
  }

  const where = buildWhere(params);
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * limit,
      take: limit,
      include: productInclude,
    }),
  ]);

  return {
    products: rows.map(mapDbProduct),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const source = await resolveDataSource();
  if (source !== "database") return null;

  const product = await prisma.product.findFirst({
    where: { slug, ...BUYER_VISIBLE_PRODUCT_WHERE },
    include: {
      ...productInclude,
      compatibility: {
        include: {
          generation: {
            include: { model: { include: { make: true } } },
          },
        },
      },
    },
  });
  if (product) {
    await prisma.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => undefined);
    await prisma.analyticsEvent.create({
      data: { type: "product_view", entityId: product.id },
    }).catch(() => undefined);
  }
  if (!product) return null;
  const mapped = mapDbProduct(product);
  mapped.compatibility = product.compatibility.map((row) => ({
    generationId: row.generationId,
    label: `${row.generation.model.make.name} ${row.generation.model.name} ${row.generation.name}`,
    note: row.note,
  }));
  return mapped;
}

export async function getRelatedCatalogProducts(
  categorySlug: string,
  excludeId: string,
  limit = 5,
): Promise<CatalogProduct[]> {
  const result = await listCatalogProducts({
    category: categorySlug,
    limit: limit + 1,
    sort: "popular",
  });

  return result.products.filter((product) => product.id !== excludeId).slice(0, limit);
}
