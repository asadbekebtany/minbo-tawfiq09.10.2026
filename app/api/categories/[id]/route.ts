import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { categorySchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requirePermissionApi("categories.edit");
  if (error) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  try {
    const { id } = await context.params;
    const data = categorySchema.partial().parse(await request.json());
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requirePermissionApi("categories.edit");
  if (error) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { id } = await context.params;
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
