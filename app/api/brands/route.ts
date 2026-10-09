import { NextResponse } from "next/server";
import { createBrand, getBrands } from "@/lib/brands-store";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection, databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";
  const query = (searchParams.get("q") || "").toLowerCase();
  const source = await resolveDataSource();

  if (source === "database") {
    const rows = await prisma.brand.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    const brands = rows
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        country: brand.country ?? "",
        logo: brand.logo ?? brand.name[0]?.toUpperCase() ?? "B",
        isActive: brand.isActive,
        sortOrder: brand.sortOrder,
        count: brand._count.products,
      }))
      .filter((brand) => !query || brand.name.toLowerCase().includes(query));
    return NextResponse.json({ brands });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  const brands = getBrands(activeOnly).filter(
    (brand) => !query || brand.name.toLowerCase().includes(query),
  );
  return NextResponse.json({ brands });
}

export async function POST(request: Request) {
  const { error } = await requirePermissionApi("brands.create");
  if (error) return error;

  if (await checkDatabaseConnection()) {
    try {
      const body = (await request.json()) as {
        name?: string;
        slug?: string;
        country?: string;
        logo?: string;
        isActive?: boolean;
        sortOrder?: number;
      };
      const name = body.name?.trim() || "Yangi brend";
      const slug =
        body.slug?.trim() ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      const brand = await prisma.brand.create({
        data: {
          name,
          slug,
          country: body.country?.trim() || null,
          logo: body.logo?.trim() || null,
          isActive: body.isActive ?? true,
          sortOrder: body.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ brand }, { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Saqlab bo‘lmadi" },
        { status: 400 },
      );
    }
  }

  if ((await resolveDataSource()) !== "fallback") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  try {
    const brand = createBrand(await request.json());
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Saqlab bo‘lmadi" }, { status: 400 });
  }
}
