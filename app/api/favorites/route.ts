import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection, databaseUnavailableResponse } from "@/lib/db";
import prisma from "@/lib/prisma";
import { BUYER_VISIBLE_PRODUCT_WHERE } from "@/lib/products";

export const dynamic = "force-dynamic";

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

type DbProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function mapFavoriteProduct(product: DbProduct) {
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
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      value: variant.value,
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku,
    })),
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  }

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  const [allRows, visibleRows] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      select: { productId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.favorite.findMany({
      where: { userId: user.id, product: BUYER_VISIBLE_PRODUCT_WHERE },
      orderBy: { createdAt: "desc" },
      include: { product: { include: productInclude } },
    }),
  ]);

  const products = visibleRows.map((row) => mapFavoriteProduct(row.product));
  return NextResponse.json({
    productIds: allRows.map((row) => row.productId),
    products,
  });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const body = (await request.json()) as { productId?: string };
  if (!body.productId) {
    return NextResponse.json({ error: "productId majburiy" }, { status: 400 });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: user.id, productId: body.productId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, action: "removed" as const, productId: body.productId });
  }

  const product = await prisma.product.findFirst({
    where: { id: body.productId, ...BUYER_VISIBLE_PRODUCT_WHERE },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
  }

  await prisma.favorite.create({
    data: { userId: user.id, productId: body.productId },
  });

  return NextResponse.json({ success: true, action: "added" as const, productId: body.productId });
}
