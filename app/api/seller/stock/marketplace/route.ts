import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSellerApi } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { denyUnlessWarehouseActive } from "@/lib/warehouse-access";
import { mapWarehouseMarketplaceStatus } from "@/lib/warehouse-marketplace";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string().trim().min(1, "Mahsulot ID majburiy"),
});

export async function POST(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const blocked = await denyUnlessWarehouseActive(user);
  if (blocked) return blocked;

  try {
    const store = await getSellerStoreForUser(user.id, user.role);
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "So‘rov noto‘g‘ri" }, { status: 400 });
    }
    const { productId } = bodySchema.parse(json);

    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Product" WHERE id = ${productId} AND "storeId" = ${store.id} FOR UPDATE
      `;
      if (!locked[0]) {
        return { ok: false as const, status: 404 as const, error: "Mahsulot topilmadi" };
      }

      const product = await tx.product.findFirst({
        where: { id: productId, storeId: store.id },
        select: {
          id: true,
          name: true,
          sku: true,
          oemNumber: true,
          barcode: true,
          categoryId: true,
          brandId: true,
          price: true,
          stock: true,
          deletedAt: true,
          listedOnMarketplace: true,
          moderationStatus: true,
        },
      });
      if (!product) {
        return { ok: false as const, status: 404 as const, error: "Mahsulot topilmadi" };
      }
      if (product.deletedAt) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "Arxivlangan mahsulot marketplacega chiqarilmaydi",
        };
      }
      if (!product.name.trim() || !product.categoryId) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "Mahsulot nomi va kategoriyasi majburiy",
        };
      }

      const marketplaceStatus = mapWarehouseMarketplaceStatus(product);
      if (marketplaceStatus !== "NOT_PUBLISHED") {
        return {
          ok: false as const,
          status: 409 as const,
          error: "Marketplace product allaqachon mavjud",
          productId: product.id,
          alreadyListed: true,
          editPath: `/seller/products/${product.id}/edit`,
          marketplaceStatus,
        };
      }

      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          listedOnMarketplace: true,
          moderationStatus: "draft",
        },
        select: {
          id: true,
          listedOnMarketplace: true,
          moderationStatus: true,
        },
      });

      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "product_update",
          entityType: "product",
          entityId: product.id,
          oldValue: { listedOnMarketplace: false, moderationStatus: product.moderationStatus },
          newValue: {
            listedOnMarketplace: true,
            moderationStatus: updated.moderationStatus,
            mapped: {
              name: product.name,
              sku: product.sku,
              oemNumber: product.oemNumber,
              barcode: product.barcode,
              categoryId: product.categoryId,
              brandId: product.brandId,
              price: product.price,
              stock: product.stock,
            },
          },
        },
        tx,
      );

      return { ok: true as const, product: updated };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.status === 409
            ? {
                productId: result.productId,
                alreadyListed: result.alreadyListed,
                editPath: result.editPath,
                marketplaceStatus: result.marketplaceStatus,
              }
            : {}),
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      productId: result.product.id,
      editPath: `/seller/products/${result.product.id}/edit`,
      marketplaceStatus: mapWarehouseMarketplaceStatus(result.product),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Validatsiya xato" }, { status: 400 });
    }
    const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 0;
    if (status === 400 || status === 404 || status === 409) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Amal bajarilmadi" }, { status });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
