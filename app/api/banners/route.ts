import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bannerSchema = z.object({
  title: z.string().trim().min(2).max(120),
  titleRu: z.string().trim().max(120).optional().nullable(),
  subtitle: z.string().trim().max(250).optional().nullable(),
  image: z.string().trim().min(1).default("/banners/placeholder.jpg"),
  link: z.string().trim().max(300).optional().nullable(),
  type: z.enum(["main", "secondary", "category", "brand"]).default("main"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const source = await resolveDataSource();
  if (source !== "database") {
    return NextResponse.json({ banners: [] });
  }

  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ banners });
}

export async function POST(request: Request) {
  const { error } = await requirePermissionApi("banners.create");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = bannerSchema.parse(await request.json());
    const banner = await prisma.banner.create({
      data: {
        title: data.title,
        titleRu: data.titleRu ?? null,
        subtitle: data.subtitle ?? null,
        image: data.image || "/banners/placeholder.jpg",
        link: data.link ?? null,
        type: data.type,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
    return NextResponse.json({ success: true, banner }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
