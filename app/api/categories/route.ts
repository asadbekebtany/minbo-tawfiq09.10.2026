import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection, databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import { categorySchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

const fallbackCategories = [
  { id: "1", name: "Shinalar", nameRu: "Шины", slug: "shinalar", icon: "🔵", parentId: null, isActive: true, sortOrder: 1, count: 0 },
  { id: "2", name: "Disklar", nameRu: "Диски", slug: "disklar", icon: "⚙️", parentId: null, isActive: true, sortOrder: 2, count: 0 },
  { id: "3", name: "Motor moylari", nameRu: "Моторные масла", slug: "moylar", icon: "🛢️", parentId: null, isActive: true, sortOrder: 3, count: 0 },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";
  const withChildren = searchParams.get("tree") === "true";

  const source = await resolveDataSource();

  if (source === "database") {
    const categories = await prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });

    type CategoryRow = { id: string; name: string; nameRu: string | null; slug: string; description: string | null; image: string | null; icon: string | null; parentId: string | null; sortOrder: number; isActive: boolean; createdAt: Date; _count: { products: number } };
    const result = (categories as CategoryRow[]).map((category: CategoryRow) => ({
      ...category,
      count: category._count.products,
      _count: undefined,
    }));

    if (withChildren) {
      const roots = result.filter((category: { parentId: string | null }) => !category.parentId);
      return NextResponse.json({
        categories: roots.map((root) => ({
          ...root,
          children: result.filter((category: { parentId: string | null }) => category.parentId === root.id),
        })),
      });
    }

    return NextResponse.json({ categories: result });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  const result = activeOnly ? fallbackCategories.filter((category) => category.isActive) : fallbackCategories;
  return NextResponse.json({ categories: result });
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermissionApi("categories.create");
  if (error) return error;

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan. Kategoriya saqlanmadi." }, { status: 503 });
  }

  try {
    const data = categorySchema.parse(await request.json());
    const category = await prisma.category.create({ data });
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}
