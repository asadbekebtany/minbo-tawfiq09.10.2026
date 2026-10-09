import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { productUpdateSchema, validationError } from "@/lib/marketplace-schemas";
import { writeAuditLog } from "@/lib/audit-log";
import { notifyUser } from "@/lib/commerce/notify";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: { orderBy: { sku: "asc" as const } },
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, isVerified: true, seller: { select: { userId: true } } } },
} as const;

async function canManageProduct(userId: string, role: string, productId: string): Promise<boolean> {
  if (role === "admin" || role === "super_admin") return true;
  if (role !== "seller") return false;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { store: { select: { seller: { select: { userId: true } } } } },
  });
  return product?.store.seller.userId === userId;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!(await canManageProduct(user.id, user.role, id))) {
    return NextResponse.json({ error: "Bu mahsulotni ko‘rish huquqingiz yo‘q." }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

  return NextResponse.json({
    product: {
      ...product,
      subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { id } = await context.params;
  if (!(await canManageProduct(user.id, user.role, id))) {
    return NextResponse.json({ error: "Bu mahsulotni o‘zgartirish huquqingiz yo‘q." }, { status: 403 });
  }

  try {
    const data = productUpdateSchema.parse(await request.json());
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) throw new Error("NOT_FOUND");

      let moderationStatus = existing.moderationStatus;
      if (user.role === "admin" || user.role === "super_admin") {
        if (data.isApproved === true) {
          moderationStatus = "active";
        } else if (data.isApproved === false) {
          moderationStatus = "rejected";
        }
      }
      if (data.moderationStatus === "pending_moderation") {
        if (user.role === "seller" && existing.moderationStatus !== "active") {
          moderationStatus = "pending_moderation";
        }
      } else if (data.moderationStatus === "draft" && user.role === "seller") {
        if (existing.moderationStatus === "rejected" || existing.moderationStatus === "draft") {
          moderationStatus = "draft";
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.nameRu !== undefined ? { nameRu: data.nameRu } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.descriptionRu !== undefined ? { descriptionRu: data.descriptionRu } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.oldPrice !== undefined ? { oldPrice: data.oldPrice } : {}),
          ...(data.stock !== undefined ? { stock: data.stock } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.oemNumber !== undefined ? { oemNumber: data.oemNumber } : {}),
          ...(data.crossNumbers !== undefined ? { crossNumbers: data.crossNumbers } : {}),
          ...(data.warranty !== undefined ? { warranty: data.warranty } : {}),
          ...(data.returnPolicy !== undefined ? { returnPolicy: data.returnPolicy } : {}),
          ...(data.weight !== undefined ? { weight: data.weight } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(moderationStatus !== existing.moderationStatus
            ? {
                moderationStatus,
                ...(moderationStatus === "pending_moderation"
                  ? { isApproved: false, rejectReason: null }
                  : {}),
                ...(moderationStatus === "active" ? { isApproved: true } : {}),
                ...(moderationStatus === "rejected" ? { isApproved: false } : {}),
              }
            : {}),
          ...((user.role === "admin" || user.role === "super_admin") && data.isApproved !== undefined ? { isApproved: data.isApproved } : {}),
          ...((user.role === "admin" || user.role === "super_admin") && data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
          ...(data.images !== undefined ? { images: { deleteMany: {}, create: data.images.map((url, sortOrder) => ({ url, sortOrder })) } } : {}),
        },
        include: productInclude,
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: moderationStatus !== existing.moderationStatus ? "product_moderate" : "product_update",
          entityType: "product",
          entityId: id,
          oldValue: { moderationStatus: existing.moderationStatus, stock: existing.stock },
          newValue: { price: updated.price, stock: updated.stock, sku: updated.sku, moderationStatus: updated.moderationStatus },
        },
        tx,
      );
      if (
        moderationStatus !== existing.moderationStatus &&
        (moderationStatus === "active" || moderationStatus === "rejected") &&
        updated.store.seller.userId
      ) {
        await notifyUser(tx, {
          userId: updated.store.seller.userId,
          type: "system",
          title: moderationStatus === "active" ? "Mahsulot tasdiqlandi" : "Mahsulot rad etildi",
          message:
            moderationStatus === "active"
              ? `${updated.name} katalogga chiqarildi.`
              : `${updated.name} moderatsiyadan o‘tmadi.`,
          link: "/seller/products",
          eventKey: `product-moderate:${id}:${moderationStatus}`,
        });
      }
      return updated;
    });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    }
    return NextResponse.json(validationError(error), { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { id } = await context.params;
  if (!(await canManageProduct(user.id, user.role, id))) {
    return NextResponse.json({ error: "Bu mahsulotni o‘chirish huquqingiz yo‘q." }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        moderationStatus: "archived",
      },
    });
    await writeAuditLog(
      {
        actorId: user.id,
        actorRole: user.role,
        action: "product_delete",
        entityType: "product",
        entityId: id,
        newValue: { archived: true },
      },
      tx,
    );
  });
  return NextResponse.json({ success: true });
}
