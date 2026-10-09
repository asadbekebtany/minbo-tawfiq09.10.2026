import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(4).max(300),
  city: z.string().trim().min(2).max(80).default("Toshkent"),
  district: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  workHours: z.string().trim().max(80).optional().nullable(),
  isFree: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requirePermissionApi("pickup_points.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const points = await prisma.pickupPoint.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ points });
}

export async function POST(request: Request) {
  const { error } = await requirePermissionApi("pickup_points.edit");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const point = await prisma.pickupPoint.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        district: data.district ?? null,
        phone: data.phone ?? null,
        workHours: data.workHours ?? null,
        isFree: data.isFree,
        isActive: data.isActive,
      },
    });
    return NextResponse.json({ success: true, point }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
