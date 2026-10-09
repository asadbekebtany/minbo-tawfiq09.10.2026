import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { cartPatchSchema, cartUpsertSchema, validationError } from "@/lib/marketplace-schemas";
import { BUYER_VISIBLE_PRODUCT_WHERE } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const rows = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          brand: { select: { name: true } },
          store: {
            select: {
              name: true,
              slug: true,
              isVerified: true,
              seller: { select: { isBanned: true, isActive: true } },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items = rows.map((item) => {
    const variantGone = Boolean(item.variantId) && (!item.variant || !item.variant.isActive);
    const sellerGone = item.product.store.seller.isBanned || !item.product.store.seller.isActive;
    const productGone =
      !item.product.isActive ||
      !item.product.isApproved ||
      item.product.moderationStatus !== "active" ||
      Boolean(item.product.deletedAt) ||
      sellerGone;
    const stock = item.variant?.stock ?? item.product.stock;
    const currentPrice = item.variant?.price ?? item.product.price;
    const unavailable = variantGone || productGone || stock <= 0;
    let unavailableReason: string | null = null;
    if (productGone) unavailableReason = "Mahsulot endi sotuvda yo‘q";
    else if (variantGone) unavailableReason = "SKU mavjud emas";
    else if (stock <= 0) unavailableReason = "Omborda yo‘q";

    return {
      ...item,
      currentPrice,
      sku: item.variant?.sku ?? item.product.sku ?? item.product.oemNumber,
      unavailable,
      unavailableReason,
      priceChanged: Boolean(item.product.oldPrice && item.product.oldPrice !== currentPrice),
      previousPrice: item.product.oldPrice,
    };
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  try {
    const data = cartUpsertSchema.parse(await request.json());
    const product = await prisma.product.findFirst({
      where: { id: data.productId, ...BUYER_VISIBLE_PRODUCT_WHERE },
      select: { id: true, stock: true, variants: { where: { isActive: true } } },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
    if (product.variants.length > 0 && !data.variantId) {
      return NextResponse.json({ error: "SKU tanlang." }, { status: 400 });
    }
    if (data.variantId) {
      const variant = product.variants.find((v) => v.id === data.variantId);
      if (!variant) return NextResponse.json({ error: "SKU topilmadi." }, { status: 404 });
      if (variant.stock < data.quantity) {
        return NextResponse.json({ error: "Omborda yetarli SKU yo‘q." }, { status: 400 });
      }
    } else if (product.stock < data.quantity) {
      return NextResponse.json({ error: "Omborda yetarli mahsulot yo‘q." }, { status: 400 });
    }

    const variantId = data.variantId ?? null;
    const existing = await prisma.cartItem.findFirst({
      where: { userId: user.id, productId: data.productId, variantId },
    });
    const nextQty = (existing?.quantity ?? 0) + data.quantity;
    const maxStock = data.variantId
      ? product.variants.find((v) => v.id === data.variantId)?.stock ?? 0
      : product.stock;
    if (nextQty > maxStock) {
      return NextResponse.json({ error: "Omborda yetarli mahsulot yo‘q." }, { status: 400 });
    }
    const item = existing
      ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } })
      : await prisma.cartItem.create({
          data: { userId: user.id, productId: data.productId, variantId, quantity: data.quantity },
        });

    await prisma.analyticsEvent.create({
      data: { type: "add_to_cart", userId: user.id, entityId: data.productId },
    }).catch(() => undefined);

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const productId = searchParams.get("productId");

  if (itemId) {
    await prisma.cartItem.deleteMany({ where: { id: itemId, userId: user.id } });
  } else if (productId) {
    await prisma.cartItem.deleteMany({ where: { productId, userId: user.id } });
  } else {
    await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = cartPatchSchema.parse(await request.json());
    const existing = await prisma.cartItem.findFirst({
      where: { id: data.itemId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Savat elementi topilmadi." }, { status: 404 });
    }

    if (data.quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, removed: true });
    }

    const product = await prisma.product.findFirst({
      where: { id: existing.productId, ...BUYER_VISIBLE_PRODUCT_WHERE },
      select: { stock: true, variants: { where: { isActive: true } } },
    });

    if (!product) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ error: "Mahsulot endi mavjud emas." }, { status: 404 });
    }

    const available = existing.variantId
      ? product.variants.find((v) => v.id === existing.variantId)?.stock ?? 0
      : product.stock;
    if (available < data.quantity) {
      return NextResponse.json({ error: "Omborda yetarli mahsulot yo‘q." }, { status: 400 });
    }

    const item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: data.quantity },
    });

    return NextResponse.json({ success: true, item });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
