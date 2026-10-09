import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { couponUpdateSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requirePermissionApi("coupons.edit");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const data = couponUpdateSchema.parse(await request.json());

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Kupon topilmadi" }, { status: 404 });

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.minOrder !== undefined ? { minOrder: data.minOrder } : {}),
        ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
      },
    });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "coupon_update",
      entityType: "coupon",
      entityId: id,
      metadata: { code: existing.code, changes: data as Record<string, unknown> },
      ...auditContext,
    });

    return NextResponse.json({ success: true, coupon });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { error, user: actor } = await requirePermissionApi("coupons.edit");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Kupon topilmadi" }, { status: 404 });

    await prisma.coupon.delete({ where: { id } });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "coupon_delete",
      entityType: "coupon",
      entityId: id,
      metadata: { code: existing.code },
      ...auditContext,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
