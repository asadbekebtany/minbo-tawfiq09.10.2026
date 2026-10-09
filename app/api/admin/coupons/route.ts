import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { couponCreateSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePermissionApi("coupons.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const { error, user: actor } = await requirePermissionApi("coupons.create");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = couponCreateSchema.parse(await request.json());

    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json({ error: "Bu kupon kodi allaqachon mavjud." }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        minOrder: data.minOrder ?? null,
        maxUses: data.maxUses ?? null,
        isActive: data.isActive,
        expiresAt: data.expiresAt ?? null,
      },
    });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "coupon_create",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code, type: coupon.type, value: coupon.value },
      ...auditContext,
    });

    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
