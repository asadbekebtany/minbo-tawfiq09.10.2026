import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z
    .string()
    .trim()
    .email()
    .max(120)
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+\d\s()-]+$/)
    .optional(),
});

export async function GET() {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  if (!row) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
  return NextResponse.json({ user: row });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    const email =
      data.email === undefined ? undefined : data.email === "" || data.email === null ? null : data.email;

    if (email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Bu email band." }, { status: 409 });
      }
    }

    if (data.phone) {
      const normalized = data.phone.replace(/\s+/g, " ").trim();
      const taken = await prisma.user.findFirst({
        where: { phone: normalized, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Bu telefon band." }, { status: 409 });
      }
    }

    const row = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone.replace(/\s+/g, " ").trim() } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    return NextResponse.json({ success: true, user: row });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
