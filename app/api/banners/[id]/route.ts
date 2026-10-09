import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  titleRu: z.string().trim().max(120).optional().nullable(),
  subtitle: z.string().trim().max(250).optional().nullable(),
  image: z.string().trim().min(1).optional(),
  link: z.string().trim().max(300).optional().nullable(),
  type: z.enum(["main", "secondary", "category", "brand"]).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requirePermissionApi("banners.edit");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const data = patchSchema.parse(await request.json());
    const banner = await prisma.banner.update({ where: { id }, data });
    return NextResponse.json({ success: true, banner });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requirePermissionApi("banners.delete");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await context.params;
  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
