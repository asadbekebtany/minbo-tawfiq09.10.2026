import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { roleUpdateSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requireSuperAdminApi();
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  try {
    const { id } = await context.params;
    const { role } = roleUpdateSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, phone: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    if (existing.role === "super_admin") {
      return NextResponse.json({ error: "Super admin roli o‘zgartirilmaydi." }, { status: 403 });
    }

    const user = await prisma.user.update({ where: { id }, data: { role } });

    if (role === "seller") {
      await prisma.seller.upsert({ where: { userId: id }, update: {}, create: { userId: id } });
    }

    if (role === "admin" || role === "super_admin") {
      await prisma.admin.upsert({
        where: { userId: id },
        update: { role: role === "super_admin" ? "super_admin" : "product_manager" },
        create: { userId: id, role: role === "super_admin" ? "super_admin" : "product_manager" },
      });
    }

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "user_role_update",
      entityType: "user",
      entityId: id,
      metadata: {
        targetUserId: id,
        targetPhone: existing.phone,
        targetName: existing.name,
        previousRole: existing.role,
        newRole: role,
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}
