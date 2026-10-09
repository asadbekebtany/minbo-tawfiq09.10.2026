import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSellerApi } from "@/lib/api-auth";
import { denyUnlessWarehouseActive } from "@/lib/warehouse-access";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { getPlatformSettingsRaw } from "@/lib/platform-settings";
import { writeAuditLog } from "@/lib/audit-log";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { markDamagedStock, syncProductStockFromVariants } from "@/lib/commerce/stock";
import { generateWarehouseEan13 } from "@/lib/warehouse-barcode";
import { mapWarehouseMarketplaceStatus } from "@/lib/warehouse-marketplace";

export const dynamic = "force-dynamic";

const ATTR_SUPPLIER = "supplier";
const ATTR_COST = "costPrice";

const adjustSchema = z
  .object({
    productId: z.string().min(1),
    variantId: z.string().min(1).optional().nullable(),
    type: z.enum(["in", "out", "damaged"]),
    quantity: z.coerce.number().int().positive(),
    reason: z.string().trim().max(300).optional().nullable(),
    note: z.string().trim().max(300).optional().nullable(),
    requestId: z.string().uuid().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "out" && !val.reason?.trim()) {
      ctx.addIssue({ code: "custom", message: "Chiqim sababi majburiy", path: ["reason"] });
    }
  });

const createSchema = z.object({
  name: z.string().trim().min(1, "Nom majburiy"),
  oemNumber: z.string().trim().min(1, "Artikul majburiy"),
  sku: z.string().trim().min(1, "SKU majburiy"),
  categoryId: z.string().min(1, "Kategoriya majburiy"),
  brandId: z.string().trim().min(1).optional().nullable(),
  supplier: z.string().trim().max(200).optional().nullable(),
  costPrice: z.coerce.number().int().min(0, "Zakup narxi manfiy bo‘lmasin"),
  price: z.coerce.number().int().min(0, "Sotuv narxi manfiy bo‘lmasin"),
  stock: z.coerce.number().int().min(0, "Stock manfiy bo‘lmasin").default(0),
  image: z.string().trim().min(1).optional().nullable(),
});

const updateSchema = z.object({
  productId: z.string().min(1),
  archive: z.boolean().optional(),
  generateBarcode: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  brandId: z.string().trim().min(1).optional().nullable(),
  supplier: z.string().trim().max(200).optional().nullable(),
  costPrice: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().int().min(0).optional(),
  image: z.string().trim().min(1).optional().nullable(),
});

function attrValue(
  attributes: Array<{ key: string; value: string }>,
  key: string,
): string | null {
  return attributes.find((row) => row.key === key)?.value ?? null;
}

function productStatus(available: number, threshold: number) {
  if (available <= 0) return "tugagan";
  if (available <= threshold) return "kam";
  return "mavjud";
}

function clamp0(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function splitReasonNote(raw: string | null) {
  if (!raw) return { reason: null as string | null, note: null as string | null };
  const idx = raw.indexOf(" | ");
  if (idx === -1) return { reason: raw, note: null as string | null };
  return { reason: raw.slice(0, idx), note: raw.slice(idx + 3) || null };
}

function historyKind(type: string, reason: string | null, auditType?: unknown) {
  if (auditType === "damaged") return "DAMAGED";
  if (type === "in") return "IN";
  if (type === "return") return "RETURNED";
  if (type === "reserve") return "RESERVED";
  if (type === "release") return "RESERVED";
  if (type === "out") {
    const r = reason ?? "";
    if (r.startsWith("paid:") || r.startsWith("cod:")) return "SOLD";
    if (/damaged|shikast/i.test(r)) return "DAMAGED";
    return "OUT";
  }
  return type.toUpperCase();
}

function mapWarehouseProduct(
  p: {
    id: string;
    name: string;
    sku: string | null;
    oemNumber: string | null;
    categoryId: string;
    brandId: string | null;
    price: number;
    stock: number;
    reservedStock: number;
    damagedStock: number;
    soldCount: number;
    updatedAt: Date;
    deletedAt: Date | null;
    barcode: string | null;
    listedOnMarketplace: boolean;
    moderationStatus: string;
    images: Array<{ url: string }>;
    category: { name: string };
    brand: { name: string } | null;
    attributes: Array<{ key: string; value: string }>;
    stockMovements: Array<{ quantity: number }>;
  },
  threshold: number,
) {
  const returned = p.stockMovements.reduce((sum, m) => sum + m.quantity, 0);
  const costRaw = attrValue(p.attributes, ATTR_COST);
  const available = clamp0(p.stock);
  const reserved = clamp0(p.reservedStock);
  const damaged = clamp0(p.damagedStock);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    oemNumber: p.oemNumber,
    category: p.category.name,
    categoryId: p.categoryId,
    brand: p.brand?.name ?? null,
    brandId: p.brandId,
    supplier: attrValue(p.attributes, ATTR_SUPPLIER),
    costPrice: costRaw ? Number(costRaw) || 0 : 0,
    price: p.price,
    available,
    reserved,
    sold: clamp0(p.soldCount),
    returned: clamp0(returned),
    damaged,
    total: available + reserved + damaged,
    status: productStatus(available, threshold),
    updatedAt: p.updatedAt.toISOString(),
    image: p.images[0]?.url ?? null,
    low: available > 0 && available <= threshold,
    archived: Boolean(p.deletedAt),
    barcode: p.barcode,
    listedOnMarketplace: p.listedOnMarketplace,
    moderationStatus: p.moderationStatus,
    marketplaceStatus: mapWarehouseMarketplaceStatus(p),
    marketplaceProductId: mapWarehouseMarketplaceStatus(p) === "NOT_PUBLISHED" ? null : p.id,
  };
}

const productSelect = {
  id: true,
  name: true,
  sku: true,
  oemNumber: true,
  categoryId: true,
  brandId: true,
  price: true,
  stock: true,
  reservedStock: true,
  damagedStock: true,
  soldCount: true,
  updatedAt: true,
  deletedAt: true,
  barcode: true,
  listedOnMarketplace: true,
  moderationStatus: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
  category: { select: { name: true } },
  brand: { select: { name: true } },
  attributes: { where: { key: { in: [ATTR_SUPPLIER, ATTR_COST] } }, select: { key: true, value: true } },
  stockMovements: { where: { type: "return" as const }, select: { quantity: true } },
};

async function uniqueWarehouseSlug(name: string) {
  const base = slugify(name) || "sklad";
  for (let i = 0; i < 8; i += 1) {
    const slug = `${base}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
    const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
  }
  return `sklad-${crypto.randomUUID()}`;
}

async function skuTaken(storeId: string, sku: string, excludeProductId?: string) {
  const productHit = await prisma.product.findFirst({
    where: {
      storeId,
      deletedAt: null,
      sku: { equals: sku, mode: "insensitive" },
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { id: true },
  });
  if (productHit) return true;
  const variantHit = await prisma.productVariant.findFirst({
    where: {
      sku: { equals: sku, mode: "insensitive" },
      product: {
        storeId,
        deletedAt: null,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
      },
    },
    select: { id: true },
  });
  return Boolean(variantHit);
}

async function upsertWarehouseAttrs(
  tx: Prisma.TransactionClient,
  productId: string,
  supplier: string | null | undefined,
  costPrice: number | undefined,
) {
  if (supplier !== undefined) {
    await tx.productAttribute.deleteMany({ where: { productId, key: ATTR_SUPPLIER } });
    if (supplier) {
      await tx.productAttribute.create({
        data: { productId, key: ATTR_SUPPLIER, value: supplier },
      });
    }
  }
  if (costPrice !== undefined) {
    await tx.productAttribute.deleteMany({ where: { productId, key: ATTR_COST } });
    await tx.productAttribute.create({
      data: { productId, key: ATTR_COST, value: String(costPrice) },
    });
  }
}

export async function GET(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const blocked = await denyUnlessWarehouseActive(user);
  if (blocked) return blocked;

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) {
    return NextResponse.json({
      products: [],
      stats: { products: 0, available: 0, reserved: 0, sold: 0, returned: 0, damaged: 0, lowStock: 0 },
      lowStockThreshold: 5,
      history: [],
    });
  }

  const url = new URL(request.url);
  const historyOf = url.searchParams.get("history")?.trim() || "";
  const scan = url.searchParams.get("scan")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const filter = url.searchParams.get("filter") || "all";
  const sort = url.searchParams.get("sort") || "updated";
  const threshold = getPlatformSettingsRaw().lowStockThreshold;

  if (scan) {
    if (!/^\d{8,14}$/.test(scan)) {
      return NextResponse.json({ error: "Barcode noto‘g‘ri" }, { status: 400 });
    }
    const found = await prisma.product.findFirst({
      where: { storeId: store.id, barcode: scan },
      select: productSelect,
    });
    if (!found) return NextResponse.json({ error: "Barcode topilmadi" }, { status: 404 });
    return NextResponse.json({ product: mapWarehouseProduct(found, threshold) });
  }

  if (historyOf) {
    const owned = await prisma.product.findFirst({
      where: { id: historyOf, storeId: store.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    const kindFilter = (url.searchParams.get("kind") || "all").toLowerCase();
    const [movements, audits] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: historyOf },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.auditLog.findMany({
        where: { entityType: "product", entityId: historyOf, action: "stock_adjust" },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { name: true, phone: true } } },
      }),
    ]);

    const history = movements.map((m) => {
      const audit = audits.find(
        (a) => Math.abs(a.createdAt.getTime() - m.createdAt.getTime()) < 4000,
      );
      const newVal = (audit?.newValue ?? {}) as Record<string, unknown>;
      const oldVal = (audit?.oldValue ?? {}) as Record<string, unknown>;
      const split = splitReasonNote(m.reason);
      return {
        id: m.id,
        kind: historyKind(m.type, m.reason, newVal.type),
        type: m.type,
        quantity: m.quantity,
        oldQuantity: typeof oldVal.stock === "number" ? oldVal.stock : null,
        newQuantity: typeof newVal.stock === "number" ? newVal.stock : null,
        actor: audit?.actor.name || audit?.actor.phone || "—",
        date: m.createdAt.toISOString(),
        reason: split.reason,
        note: split.note,
      };
    }).filter((row) => {
      if (kindFilter === "all") return true;
      return row.kind === kindFilter.toUpperCase();
    });

    return NextResponse.json({ history });
  }

  const detailOf = url.searchParams.get("detail")?.trim() || "";
  if (detailOf) {
    const owned = await prisma.product.findFirst({
      where: { id: detailOf, storeId: store.id },
      select: productSelect,
    });
    if (!owned) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    const [movements, audits] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: detailOf },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.auditLog.findMany({
        where: { entityType: "product", entityId: detailOf, action: "stock_adjust" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { name: true, phone: true } } },
      }),
    ]);
    const lastMovements = movements.map((m) => {
      const audit = audits.find(
        (a) => Math.abs(a.createdAt.getTime() - m.createdAt.getTime()) < 4000,
      );
      const newVal = (audit?.newValue ?? {}) as Record<string, unknown>;
      const oldVal = (audit?.oldValue ?? {}) as Record<string, unknown>;
      const split = splitReasonNote(m.reason);
      return {
        id: m.id,
        kind: historyKind(m.type, m.reason, newVal.type),
        quantity: m.quantity,
        oldQuantity: typeof oldVal.stock === "number" ? oldVal.stock : null,
        newQuantity: typeof newVal.stock === "number" ? newVal.stock : null,
        actor: audit?.actor.name || audit?.actor.phone || "—",
        date: m.createdAt.toISOString(),
        reason: split.reason,
        note: split.note,
      };
    });
    return NextResponse.json({
      product: mapWarehouseProduct(owned, threshold),
      lastMovements,
    });
  }

  const where: Prisma.ProductWhereInput =
    filter === "archived"
      ? { storeId: store.id, deletedAt: { not: null } }
      : { storeId: store.id, deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { oemNumber: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { barcode: { contains: q } },
    ];
  }
  if (filter === "available") where.stock = { gt: threshold };
  else if (filter === "low") where.AND = [{ stock: { gt: 0 } }, { stock: { lte: threshold } }];
  else if (filter === "out") where.stock = 0;
  else if (filter === "reserved") where.reservedStock = { gt: 0 };
  else if (filter === "returned") where.stockMovements = { some: { type: "return" } };
  else if (filter === "damaged") where.damagedStock = { gt: 0 };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "name"
      ? { name: "asc" }
      : sort === "stock_desc"
        ? { stock: "desc" }
        : sort === "stock_asc"
          ? { stock: "asc" }
          : sort === "price_desc"
            ? { price: "desc" }
            : sort === "price_asc"
              ? { price: "asc" }
              : { updatedAt: "desc" };

  const [products, allForStats] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      select: productSelect,
    }),
    prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      select: {
        stock: true,
        reservedStock: true,
        damagedStock: true,
        soldCount: true,
        stockMovements: { where: { type: "return" }, select: { quantity: true } },
      },
    }),
  ]);

  const stats = {
    products: allForStats.length,
    available: clamp0(allForStats.reduce((s, p) => s + clamp0(p.stock), 0)),
    reserved: clamp0(allForStats.reduce((s, p) => s + clamp0(p.reservedStock), 0)),
    sold: clamp0(allForStats.reduce((s, p) => s + clamp0(p.soldCount), 0)),
    returned: clamp0(
      allForStats.reduce((s, p) => s + p.stockMovements.reduce((n, m) => n + m.quantity, 0), 0),
    ),
    damaged: clamp0(allForStats.reduce((s, p) => s + clamp0(p.damagedStock), 0)),
    lowStock: allForStats.filter((p) => p.stock > 0 && p.stock <= threshold).length,
  };

  return NextResponse.json({
    lowStockThreshold: threshold,
    stats,
    products: products.map((p) => mapWarehouseProduct(p, threshold)),
  });
}

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

    const data = adjustSchema.parse(await request.json());
    const product = await prisma.product.findFirst({
      where: { id: data.productId, storeId: store.id, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    if (data.requestId) {
      const recent = await prisma.auditLog.findMany({
        where: {
          actorId: user.id,
          entityType: "product",
          entityId: product.id,
          action: "stock_adjust",
          createdAt: { gte: new Date(Date.now() - 120_000) },
        },
        take: 20,
      });
      const dup = recent.some((row) => {
        const nv = (row.newValue ?? {}) as Record<string, unknown>;
        return nv.requestId === data.requestId;
      });
      if (dup) {
        return NextResponse.json({ success: true, duplicate: true, product: { id: product.id, stock: product.stock } });
      }
    }

    const reasonLabel =
      data.reason?.trim() ||
      (data.type === "in" ? "Kirim" : data.type === "out" ? "Chiqim" : "Shikastlangan");
    const reason = data.note?.trim() ? `${reasonLabel} | ${data.note.trim()}` : reasonLabel;

    const [updated, movement] = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${product.id} FOR UPDATE`;

      if (data.variantId) {
        const variant = await tx.productVariant.findFirst({
          where: { id: data.variantId, productId: product.id },
        });
        if (!variant) throw new ApiError("NOT_FOUND", "SKU topilmadi", 404);
      }

      if (data.type === "damaged") {
        await markDamagedStock(tx, product.id, data.quantity, reason, data.variantId);
      } else if (data.variantId) {
        const variant = await tx.productVariant.findFirst({
          where: { id: data.variantId, productId: product.id },
        });
        if (!variant) throw new ApiError("NOT_FOUND", "SKU topilmadi", 404);
        if (data.type === "in") {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { increment: data.quantity } },
          });
        } else {
          const dec = await tx.productVariant.updateMany({
            where: { id: variant.id, productId: product.id, stock: { gte: data.quantity } },
            data: { stock: { decrement: data.quantity } },
          });
          if (dec.count === 0) throw new ApiError("OUT_OF_STOCK", "Omborda yetarli emas", 409);
        }
        await syncProductStockFromVariants(tx, product.id);
        await tx.stockMovement.create({
          data: { productId: product.id, type: data.type, quantity: data.quantity, reason },
        });
      } else if (data.type === "in") {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: data.quantity } },
        });
        await tx.stockMovement.create({
          data: { productId: product.id, type: "in", quantity: data.quantity, reason },
        });
      } else {
        const dec = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: data.quantity } },
          data: { stock: { decrement: data.quantity } },
        });
        if (dec.count === 0) throw new ApiError("OUT_OF_STOCK", "Omborda yetarli emas", 409);
        await tx.stockMovement.create({
          data: { productId: product.id, type: "out", quantity: data.quantity, reason },
        });
      }

      const updatedProduct = await tx.product.findUnique({ where: { id: product.id } });
      const lastMove = await tx.stockMovement.findFirst({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "stock_adjust",
          entityType: "product",
          entityId: product.id,
          oldValue: {
            stock: product.stock,
            reserved: product.reservedStock,
            damaged: product.damagedStock,
            variantId: data.variantId ?? null,
          },
          newValue: {
            stock: updatedProduct?.stock,
            reserved: updatedProduct?.reservedStock,
            damaged: updatedProduct?.damagedStock,
            type: data.type,
            quantity: data.quantity,
            requestId: data.requestId ?? null,
          },
        },
        tx,
      );
      return [updatedProduct, lastMove] as const;
    });

    return NextResponse.json({
      success: true,
      product: { id: updated?.id ?? product.id, stock: updated?.stock ?? product.stock },
      movement,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const typeIssue = err.issues.some((issue) => issue.path[0] === "type");
      return NextResponse.json(
        {
          error: typeIssue
            ? "Reserved/sold qo‘lda o‘zgartirilmaydi"
            : (err.issues[0]?.message ?? "Validatsiya xato"),
        },
        { status: 400 },
      );
    }
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
    const message = err instanceof Error ? err.message : "Zaxira yangilanmadi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
    const data = createSchema.parse(await request.json());

    if (await skuTaken(store.id, data.sku)) {
      return NextResponse.json({ error: "Bu SKU allaqachon mavjud" }, { status: 409 });
    }

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Kategoriya topilmadi" }, { status: 400 });

    let brandId: string | null = data.brandId || null;
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, isActive: true },
        select: { id: true },
      });
      if (!brand) return NextResponse.json({ error: "Brend topilmadi" }, { status: 400 });
    }

    const slug = await uniqueWarehouseSlug(data.name);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          storeId: store.id,
          categoryId: data.categoryId,
          brandId,
          name: data.name,
          slug,
          sku: data.sku,
          oemNumber: data.oemNumber,
          price: data.price,
          stock: data.stock,
          isActive: false,
          isApproved: false,
          listedOnMarketplace: false,
          moderationStatus: "draft",
          images: data.image ? { create: [{ url: data.image, sortOrder: 0 }] } : undefined,
        },
      });
      await upsertWarehouseAttrs(tx, created.id, data.supplier ?? null, data.costPrice);
      if (data.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "in",
            quantity: data.stock,
            reason: "Boshlang‘ich stock",
          },
        });
        await writeAuditLog(
          {
            actorId: user.id,
            actorRole: user.role,
            action: "stock_adjust",
            entityType: "product",
            entityId: created.id,
            oldValue: { stock: 0 },
            newValue: { stock: data.stock, type: "in", quantity: data.stock },
          },
          tx,
        );
      }
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "product_create",
          entityType: "product",
          entityId: created.id,
          newValue: { name: created.name, sku: created.sku, warehouse: true },
        },
        tx,
      );
      return created;
    });

    return NextResponse.json({ success: true, product: { id: product.id } }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Validatsiya xato" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
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
    const data = updateSchema.parse(await request.json());

    const product = await prisma.product.findFirst({
      where: { id: data.productId, storeId: store.id },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    if (data.generateBarcode) {
      const result = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ barcode: string | null }>>`
          SELECT barcode FROM "Product" WHERE id = ${product.id} AND "storeId" = ${store.id} FOR UPDATE
        `;
        if (!locked[0]) {
          throw new Error("NOT_FOUND");
        }
        if (locked[0].barcode) {
          return { barcode: locked[0].barcode, existed: true as const };
        }
        for (let i = 0; i < 8; i += 1) {
          const candidate = generateWarehouseEan13();
          try {
            await tx.product.update({
              where: { id: product.id },
              data: { barcode: candidate },
            });
            return { barcode: candidate, existed: false as const };
          } catch (err) {
            const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
            if (code === "P2002") continue;
            throw err;
          }
        }
        throw new Error("BARCODE_COLLISION");
      });
      if (!result.existed) {
        await writeAuditLog({
          actorId: user.id,
          actorRole: user.role,
          action: "product_update",
          entityType: "product",
          entityId: product.id,
          newValue: { barcode: result.barcode },
        });
      }
      return NextResponse.json({ success: true, barcode: result.barcode, existed: result.existed });
    }

    if (data.archive) {
      if (product.deletedAt) {
        return NextResponse.json({ success: true, archived: true, duplicate: true });
      }
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            ...(product.listedOnMarketplace ? {} : { moderationStatus: "archived" as const }),
          },
        });
        await writeAuditLog(
          {
            actorId: user.id,
            actorRole: user.role,
            action: "product_delete",
            entityType: "product",
            entityId: product.id,
            oldValue: { deletedAt: product.deletedAt },
            newValue: { archived: true },
          },
          tx,
        );
      });
      return NextResponse.json({ success: true, archived: true });
    }

    if (product.deletedAt) {
      return NextResponse.json({ error: "Arxivlangan mahsulot tahrirlanmaydi" }, { status: 400 });
    }

    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category) return NextResponse.json({ error: "Kategoriya topilmadi" }, { status: 400 });
    }
    if (data.brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: data.brandId, isActive: true },
        select: { id: true },
      });
      if (!brand) return NextResponse.json({ error: "Brend topilmadi" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
        },
      });
      if (data.image) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.create({
          data: { productId: product.id, url: data.image, sortOrder: 0 },
        });
      }
      await upsertWarehouseAttrs(tx, product.id, data.supplier, data.costPrice);
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "product_update",
          entityType: "product",
          entityId: product.id,
          oldValue: { name: product.name, price: product.price },
          newValue: { name: data.name ?? product.name, price: data.price ?? product.price },
        },
        tx,
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Validatsiya xato" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "BARCODE_COLLISION") {
      return NextResponse.json({ error: "Barcode unique yaratilmadi" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
