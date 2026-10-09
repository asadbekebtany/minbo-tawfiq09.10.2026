import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getAdminRoleLabel, PERMISSIONS, type AdminRoleType } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import { normalizePhone } from "@/lib/phone";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ["admin", "super_admin"] } },
    orderBy: { createdAt: "desc" },
    include: {
      admin: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { action: true, createdAt: true, entityType: true },
      },
      _count: { select: { auditLogs: true } },
    },
  });

  return NextResponse.json({
    admins: admins.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isBanned: u.isBanned,
      createdAt: u.createdAt.toISOString(),
      adminRole: (u.admin?.role ?? null) as AdminRoleType | null,
      adminRoleLabel: u.admin?.role ? getAdminRoleLabel(u.admin.role as AdminRoleType) : null,
      permissions: u.admin?.permissions ?? [],
      auditCount: u._count.auditLogs,
      lastAction: u.auditLogs[0]
        ? {
            action: u.auditLogs[0].action,
            entityType: u.auditLogs[0].entityType,
            createdAt: u.auditLogs[0].createdAt.toISOString(),
          }
        : null,
    })),
  });
}

const createSchema = z.object({
  phone: z.string().trim().min(7),
  name: z.string().trim().min(2).max(80).optional(),
  adminRole: z
    .enum([
      "product_manager",
      "order_manager",
      "seller_manager",
      "content_manager",
      "support_manager",
      "finance_manager",
    ])
    .default("support_manager"),
});

export async function POST(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const phone = normalizePhone(data.phone);
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing?.role === "super_admin") {
      return NextResponse.json({ error: "Super admin o‘zgartirilmaydi" }, { status: 403 });
    }

    const adminRole = data.adminRole;
    const row = await prisma.$transaction(async (tx) => {
      const target = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              role: "admin",
              isActive: true,
              isBanned: false,
              ...(data.name ? { name: data.name } : {}),
            },
          })
        : await tx.user.create({
            data: {
              phone,
              name: data.name ?? "Admin",
              role: "admin",
              isActive: true,
            },
          });
      await tx.admin.upsert({
        where: { userId: target.id },
        update: { role: adminRole, permissions: [...PERMISSIONS[adminRole]] },
        create: { userId: target.id, role: adminRole, permissions: [...PERMISSIONS[adminRole]] },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "user_role_update",
          entityType: "user",
          entityId: target.id,
          oldValue: { role: existing?.role ?? null },
          newValue: { role: "admin", adminRole },
        },
        tx,
      );
      return target;
    });

    return NextResponse.json({ success: true, user: { id: row.id, phone: row.phone } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yaratilmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    if (data.userId === user.id) {
      return NextResponse.json({ error: "O‘zingizni o‘chira olmaysiz" }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) return NextResponse.json({ error: "Admin topilmadi" }, { status: 404 });
    if (target.role === "super_admin") {
      return NextResponse.json({ error: "Super admin deaktiv qilinmaydi" }, { status: 403 });
    }
    if (target.role !== "admin") {
      return NextResponse.json({ error: "Faqat admin deaktiv qilinadi" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(data.isActive !== undefined
          ? { isActive: data.isActive, isBanned: data.isActive ? false : target.isBanned }
          : {}),
      },
    });
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "user_ban_update",
      entityType: "user",
      entityId: target.id,
      oldValue: { isActive: target.isActive },
      newValue: { isActive: updated.isActive },
    });
    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
