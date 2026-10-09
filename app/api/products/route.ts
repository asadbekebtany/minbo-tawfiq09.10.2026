import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, requireSellerApi } from "@/lib/api-auth";
import { productSearchOr } from "@/lib/catalog-search";
import { checkDatabaseConnection, databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import { productCreateSchema, productListQuerySchema, validationError } from "@/lib/marketplace-schemas";
import { BUYER_VISIBLE_PRODUCT_WHERE } from "@/lib/products";

export const dynamic = "force-dynamic";

type DbProductRow = Awaited<
  ReturnType<
    typeof prisma.product.findMany<{
      include: {
        images: true;
        brand: { select: { name: true; slug: true } };
        category: { select: { id: true; name: true; slug: true } };
        store: { select: { id: true; name: true; isVerified: true; seller: { select: { userId: true } } } };
      };
    }>
  >
>[number];

function mapProduct(product: DbProductRow) {
  return {
    ...product,
    subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
  };
}

async function sellerStoreId(userId: string): Promise<string | null> {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: { store: { select: { id: true } } },
  });
  return seller?.store?.id ?? null;
}

export async function GET(request: NextRequest) {
  const parsed = productListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const sessionUser = await getSessionUser();

  const source = await resolveDataSource();

  if (source === "database") {
    const where: Prisma.ProductWhereInput = {};

    if (!parsed.admin && !parsed.mine) {
      Object.assign(where, BUYER_VISIBLE_PRODUCT_WHERE);
    }

    if (parsed.mine) {
      if (!sessionUser) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
      if (sessionUser.role === "seller") {
        const storeId = await sellerStoreId(sessionUser.id);
        if (!storeId) return NextResponse.json({ products: [], total: 0, page: parsed.page, limit: parsed.limit, totalPages: 0 });
        where.storeId = storeId;
        where.deletedAt = null;
      } else if (sessionUser.role !== "admin" && sessionUser.role !== "super_admin") {
        return NextResponse.json({ error: "Huquq yetarli emas." }, { status: 403 });
      } else {
        where.deletedAt = null;
      }
    }

    if (parsed.admin) {
      if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "super_admin")) {
        return NextResponse.json({ error: "Admin huquqi talab qilinadi." }, { status: 403 });
      }
    }

    if (parsed.q) {
      where.OR = productSearchOr(parsed.q);
    }

    if (parsed.category) {
      where.category = { slug: parsed.category };
    }

    if (parsed.brand) {
      where.brand = { slug: parsed.brand };
    }

    if (parsed.generationId) {
      where.compatibility = { some: { generationId: parsed.generationId } };
    }

    where.price = { gte: parsed.minPrice, lte: parsed.maxPrice };

    const orderBy =
      parsed.sort === "cheap" ? { price: "asc" as const } :
      parsed.sort === "expensive" ? { price: "desc" as const } :
      parsed.sort === "rating" ? { rating: "desc" as const } :
      parsed.sort === "new" ? { createdAt: "desc" as const } :
      parsed.sort === "discount" ? { discount: "desc" as const } :
      { soldCount: "desc" as const };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          brand: { select: { name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          store: { select: { id: true, name: true, isVerified: true, seller: { select: { userId: true } } } },
        },
      }),
    ]);

    return NextResponse.json({
      products: products.map(mapProduct),
      total,
      page: parsed.page,
      limit: parsed.limit,
      totalPages: Math.ceil(total / parsed.limit),
    });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }
  return NextResponse.json({ products: [], total: 0, page: parsed.page, limit: parsed.limit, totalPages: 0 });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan. Mahsulot saqlanmadi." }, { status: 503 });

  try {
    const data = productCreateSchema.parse(await request.json());
    let storeId: string | null = null;

    if (user.role === "seller") {
      storeId = await sellerStoreId(user.id);
      if (!storeId) return NextResponse.json({ error: "Seller store topilmadi." }, { status: 403 });
    } else {
      const store = await prisma.store.findFirst({ select: { id: true } });
      storeId = store?.id ?? null;
      if (!storeId) return NextResponse.json({ error: "Store topilmadi." }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        categoryId: data.categoryId,
        brandId: data.brandId ?? null,
        name: data.name,
        nameRu: data.nameRu ?? null,
        slug: data.slug,
        description: data.description ?? null,
        descriptionRu: data.descriptionRu ?? null,
        sku: data.sku ?? null,
        oemNumber: data.oemNumber ?? null,
        crossNumbers: data.crossNumbers,
        price: data.price,
        oldPrice: data.oldPrice ?? null,
        stock: data.stock,
        warranty: data.warranty ?? null,
        returnPolicy: data.returnPolicy ?? null,
        weight: data.weight ?? null,
        isActive: data.isActive,
        isApproved: user.role === "admin" || user.role === "super_admin",
        listedOnMarketplace: true,
        moderationStatus:
          user.role === "admin" || user.role === "super_admin" ? "active" : "pending_moderation",
        images: { create: data.images.map((url, sortOrder) => ({ url, sortOrder })) },
      },
      include: { images: true, brand: true, category: true, store: true },
    });

    const { writeAuditLog } = await import("@/lib/audit-log");
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "product_create",
      entityType: "product",
      entityId: product.id,
      newValue: { name: product.name, sku: product.sku, storeId },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}
