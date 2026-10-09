import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { warehouseAccessForUser } from "@/lib/warehouse-access";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug faqat kichik harf, raqam va tire")
    .optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  logo: z.string().trim().max(500).optional().nullable(),
  banner: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) {
    return NextResponse.json({ error: "Do‘kon topilmadi. Avval ro‘yxatdan o‘ting." }, { status: 404 });
  }

  const { access: warehouseAccess } = await warehouseAccessForUser(user);

  return NextResponse.json({
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      banner: store.banner,
      description: store.description,
      phone: store.phone,
      address: store.address,
      city: store.city,
      rating: store.rating,
      reviewCount: store.reviewCount,
      isVerified: store.isVerified,
    },
    seller: "seller" in store && store.seller
      ? {
          isActive: store.seller.isActive,
          isBanned: store.seller.isBanned,
          warehouseAccess,
        }
      : null,
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const store = await getSellerStoreForUser(user.id, user.role);
    if (!store) {
      return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });
    }

    const data = patchSchema.parse(await request.json());

    if (data.slug && data.slug !== store.slug) {
      const taken = await prisma.store.findFirst({
        where: { slug: data.slug, NOT: { id: store.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Bu URL band" }, { status: 409 });
      }
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.address !== undefined ? { address: data.address || null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.logo !== undefined ? { logo: data.logo || null } : {}),
        ...(data.banner !== undefined ? { banner: data.banner || null } : {}),
      },
    });

    const { writeAuditLog } = await import("@/lib/audit-log");
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "product_update",
      entityType: "store",
      entityId: store.id,
      oldValue: { name: store.name, slug: store.slug },
      newValue: { name: updated.name, slug: updated.slug },
    });

    return NextResponse.json({ success: true, store: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
