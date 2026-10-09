import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  generationId: z.string().trim().min(1),
  name: z.string().trim().max(80).optional().nullable(),
  year: z.coerce.number().int().min(1980).max(2100).optional().nullable(),
});

const DEFAULT_COOKIE = "tavfiq-car";

function selectedIdFromCookie(request: NextRequest): string | null {
  return request.cookies.get(DEFAULT_COOKIE)?.value || null;
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const selectedId = selectedIdFromCookie(request);
  const rows = await prisma.savedCar.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      generation: {
        include: {
          model: { include: { make: true } },
        },
      },
    },
  });

  const fallbackId = rows[0]?.id ?? null;
  const defaultId = rows.some((r) => r.id === selectedId) ? selectedId : fallbackId;

  return NextResponse.json({
    cars: rows.map((row) => ({
      id: row.id,
      generationId: row.generationId,
      name: row.name,
      year: row.year ?? row.generation.yearFrom,
      make: row.generation.model.make.name,
      model: row.generation.model.name,
      generation: row.generation.name,
      yearFrom: row.generation.yearFrom,
      yearTo: row.generation.yearTo,
      isDefault: row.id === defaultId,
    })),
    defaultId,
  });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const generation = await prisma.carGeneration.findUnique({
      where: { id: data.generationId },
      include: { model: { include: { make: true } } },
    });
    if (!generation) {
      return NextResponse.json({ error: "Avlod topilmadi." }, { status: 404 });
    }

    const existing = await prisma.savedCar.findFirst({
      where: { userId: user.id, generationId: data.generationId },
    });
    const car =
      existing ??
      (await prisma.savedCar.create({
        data: {
          userId: user.id,
          generationId: data.generationId,
          name: data.name || `${generation.model.make.name} ${generation.model.name}`,
          year: data.year ?? generation.yearFrom,
        },
      }));

    const response = NextResponse.json({ success: true, car: { id: car.id, generationId: car.generationId } });
    response.cookies.set(DEFAULT_COOKIE, car.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
