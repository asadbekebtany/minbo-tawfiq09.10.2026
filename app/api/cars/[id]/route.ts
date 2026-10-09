import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

const DEFAULT_COOKIE = "tavfiq-car";

const patchSchema = z.object({
  select: z.boolean().optional(),
  name: z.string().trim().max(80).optional().nullable(),
  year: z.coerce.number().int().min(1980).max(2100).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const car = await prisma.savedCar.findFirst({ where: { id, userId: user.id } });
  if (!car) return NextResponse.json({ error: "Avtomobil topilmadi." }, { status: 404 });

  try {
    const data = patchSchema.parse(await request.json().catch(() => ({})));
    if (data.name !== undefined || data.year !== undefined) {
      await prisma.savedCar.update({
        where: { id: car.id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.year !== undefined ? { year: data.year } : {}),
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      car: { id: car.id, generationId: car.generationId },
    });
    if (data.select) {
      response.cookies.set(DEFAULT_COOKIE, car.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const deleted = await prisma.savedCar.deleteMany({ where: { id, userId: user.id } });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Avtomobil topilmadi." }, { status: 404 });
  }

  const next = await prisma.savedCar.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const response = NextResponse.json({ success: true });
  if (next) {
    response.cookies.set(DEFAULT_COOKIE, next.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else {
    response.cookies.set(DEFAULT_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return response;
}
