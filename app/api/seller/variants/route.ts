import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1).default("SKU"),
  value: z.string().trim().min(1),
  price: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  sku: z.string().trim().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.object({
  variantId: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  value: z.string().trim().min(1).optional(),
  price: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).optional(),
  sku: z.string().trim().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

  const data = schema.parse(await request.json());
  const product = await prisma.product.findFirst({
    where: { id: data.productId, storeId: store.id },
  });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: data.name,
      value: data.value,
      price: data.price ?? null,
      stock: data.stock,
      sku: data.sku ?? null,
      isActive: data.isActive ?? true,
    },
  });
  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "product_update",
    entityType: "product_variant",
    entityId: variant.id,
    newValue: { sku: variant.sku, stock: variant.stock },
  });
  return NextResponse.json({ success: true, variant }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

  const data = patchSchema.parse(await request.json());
  const variant = await prisma.productVariant.findFirst({
    where: {
      id: data.variantId,
      product: { storeId: store.id },
    },
  });
  if (!variant) return NextResponse.json({ error: "SKU topilmadi" }, { status: 404 });

  const updated = await prisma.productVariant.update({
    where: { id: variant.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "product_update",
    entityType: "product_variant",
    entityId: updated.id,
    oldValue: { sku: variant.sku, stock: variant.stock, isActive: variant.isActive, price: variant.price },
    newValue: { sku: updated.sku, stock: updated.stock, isActive: updated.isActive, price: updated.price },
  });
  return NextResponse.json({ success: true, variant: updated });
}
