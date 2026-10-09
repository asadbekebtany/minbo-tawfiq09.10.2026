import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";
import { getRuntimeSettings } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  defaultPercent: z.coerce.number().min(0).max(50).optional(),
  categoryId: z.string().min(1).optional(),
  rate: z.coerce.number().min(0).max(50).optional(),
});

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan" }, { status: 503 });
  }

  const settings = await getSiteSettings();
  const runtime = await getRuntimeSettings();
  const [rows, categories] = await Promise.all([
    prisma.commission.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return NextResponse.json({
    defaultPercent: runtime.defaultCommission ?? settings.commissionPercent,
    commissions: rows,
    categories,
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan" }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    if (typeof data.defaultPercent === "number") {
      await updateSiteSettings({ commissionPercent: data.defaultPercent });
      const { setRuntimeSettings } = await import("@/lib/system-settings");
      const { writeAuditLog } = await import("@/lib/audit-log");
      await setRuntimeSettings({ defaultCommission: data.defaultPercent });
      await writeAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: "site_settings_update",
        entityType: "system_setting",
        entityId: "marketplace",
        newValue: { defaultCommission: data.defaultPercent },
      });
    }
    if (data.categoryId && typeof data.rate === "number") {
      const existing = await prisma.commission.findFirst({
        where: { categoryId: data.categoryId },
      });
      if (existing) {
        await prisma.commission.update({
          where: { id: existing.id },
          data: { rate: data.rate, isDefault: false },
        });
      } else {
        await prisma.commission.create({
          data: { categoryId: data.categoryId, rate: data.rate, isDefault: false },
        });
      }
      const { writeAuditLog } = await import("@/lib/audit-log");
      await writeAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: "commission_update",
        entityType: "commission",
        entityId: data.categoryId,
        oldValue: existing ? { rate: existing.rate } : null,
        newValue: { categoryId: data.categoryId, rate: data.rate },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
