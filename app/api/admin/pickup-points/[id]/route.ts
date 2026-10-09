import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(4).max(300).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  district: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  workHours: z.string().trim().max(80).optional().nullable(),
  isFree: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error } = await requirePermissionApi("pickup_points.edit");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    const point = await prisma.pickupPoint.update({ where: { id }, data });
    return NextResponse.json({ success: true, point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error } = await requirePermissionApi("pickup_points.edit");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  await prisma.pickupPoint.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
