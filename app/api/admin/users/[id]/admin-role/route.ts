import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { adminRoleUpdateSchema, validationError } from "@/lib/marketplace-schemas";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requireSuperAdminApi();
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { adminRole } = adminRoleUpdateSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, phone: true, name: true, admin: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }
    if (existing.role !== "admin" && existing.role !== "super_admin") {
      return NextResponse.json(
        { error: "Admin roli faqat admin foydalanuvchilarga tayinlanadi." },
        { status: 400 },
      );
    }
    if (existing.role === "super_admin" && adminRole !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin foydalanuvchining admin roli pasaytirilmaydi." },
        { status: 403 },
      );
    }

    const admin = await prisma.admin.upsert({
      where: { userId: id },
      update: { role: adminRole, permissions: [...PERMISSIONS[adminRole]] },
      create: { userId: id, role: adminRole, permissions: [...PERMISSIONS[adminRole]] },
    });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "admin_role_update",
      entityType: "admin",
      entityId: id,
      metadata: {
        targetUserId: id,
        targetPhone: existing.phone,
        targetName: existing.name,
        previousAdminRole: existing.admin?.role ?? null,
        newAdminRole: adminRole,
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, admin });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
