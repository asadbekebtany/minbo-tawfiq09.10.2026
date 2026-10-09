import { NextResponse } from "next/server";
import { deleteBrand, getBrand, updateBrand } from "@/lib/brands-store";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (await checkDatabaseConnection()) {
    const brand = await prisma.brand.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    return brand
      ? NextResponse.json({ brand })
      : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
  }
  const brand = getBrand(id);
  return brand
    ? NextResponse.json({ brand })
    : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await requirePermissionApi("brands.edit");
  if (error) return error;
  const { id } = await params;
  try {
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      country?: string;
      logo?: string;
      isActive?: boolean;
      sortOrder?: number;
    };
    if (await checkDatabaseConnection()) {
      const existing = await prisma.brand.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
      const brand = await prisma.brand.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.country !== undefined ? { country: body.country } : {}),
          ...(body.logo !== undefined ? { logo: body.logo } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      });
      return NextResponse.json({ brand });
    }
    const source = await resolveDataSource();
    if (source !== "fallback") {
      return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
    }
    const brand = updateBrand(id, body);
    return brand
      ? NextResponse.json({ brand })
      : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Noto‘g‘ri ma’lumot" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { error } = await requirePermissionApi("brands.edit");
  if (error) return error;
  const { id } = await params;
  if (await checkDatabaseConnection()) {
    try {
      await prisma.brand.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
    }
  }
  const source = await resolveDataSource();
  if (source !== "fallback") {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  return deleteBrand(id)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
}
