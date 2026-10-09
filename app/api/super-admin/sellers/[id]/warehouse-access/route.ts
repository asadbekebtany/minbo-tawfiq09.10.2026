import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { writeAuditLog, getAuditContextFromRequest } from "@/lib/audit-log";
import { serializeWarehouseAccess } from "@/lib/warehouse-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  action: z.enum(["grant", "disable", "extend"]),
  startAt: z.string().trim().min(1).optional().nullable(),
  endAt: z.string().trim().min(1).optional().nullable(),
});

function parseWhen(value: string | null | undefined, fallback: Date | null) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function POST(request: Request, context: Ctx) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const data = bodySchema.parse(await request.json());
    const seller = await prisma.seller.findUnique({
      where: { id },
      select: {
        id: true,
        warehouseAccessEnabled: true,
        warehouseAccessStartAt: true,
        warehouseAccessEndAt: true,
      },
    });
    if (!seller) return NextResponse.json({ error: "Seller topilmadi" }, { status: 404 });

    const now = new Date();
    let enabled = seller.warehouseAccessEnabled;
    let startAt = seller.warehouseAccessStartAt;
    let endAt = seller.warehouseAccessEndAt;
    let auditAction: "warehouse_access_enabled" | "warehouse_access_disabled" | "warehouse_access_extended";

    if (data.action === "grant") {
      const nextStart = parseWhen(data.startAt, now);
      const nextEnd = parseWhen(data.endAt, null);
      if (!nextStart || !nextEnd) {
        return NextResponse.json({ error: "Start va end date majburiy" }, { status: 400 });
      }
      if (nextEnd.getTime() <= nextStart.getTime()) {
        return NextResponse.json({ error: "End date start dan keyin bo‘lsin" }, { status: 400 });
      }
      enabled = true;
      startAt = nextStart;
      endAt = nextEnd;
      auditAction = "warehouse_access_enabled";
    } else if (data.action === "disable") {
      enabled = false;
      auditAction = "warehouse_access_disabled";
    } else {
      if (!seller.warehouseAccessEnabled) {
        return NextResponse.json({ error: "Avval dostup bering" }, { status: 400 });
      }
      const nextEnd = parseWhen(data.endAt, null);
      if (!nextEnd) {
        return NextResponse.json({ error: "Yangi end date majburiy" }, { status: 400 });
      }
      if (nextEnd.getTime() <= now.getTime()) {
        return NextResponse.json({ error: "End date kelajakda bo‘lsin" }, { status: 400 });
      }
      const prevEnd = seller.warehouseAccessEndAt?.getTime() ?? 0;
      if (nextEnd.getTime() <= prevEnd) {
        return NextResponse.json({ error: "Yangi muddat avvalgisidan keyin bo‘lsin" }, { status: 400 });
      }
      endAt = nextEnd;
      auditAction = "warehouse_access_extended";
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.seller.update({
        where: { id: seller.id },
        data: {
          warehouseAccessEnabled: enabled,
          warehouseAccessStartAt: startAt,
          warehouseAccessEndAt: endAt,
        },
        select: {
          warehouseAccessEnabled: true,
          warehouseAccessStartAt: true,
          warehouseAccessEndAt: true,
        },
      });
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: auditAction,
          entityType: "seller",
          entityId: seller.id,
          oldValue: {
            enabled: seller.warehouseAccessEnabled,
            startAt: seller.warehouseAccessStartAt?.toISOString() ?? null,
            endAt: seller.warehouseAccessEndAt?.toISOString() ?? null,
          },
          newValue: {
            enabled: row.warehouseAccessEnabled,
            startAt: row.warehouseAccessStartAt?.toISOString() ?? null,
            endAt: row.warehouseAccessEndAt?.toISOString() ?? null,
          },
          ...getAuditContextFromRequest(request),
        },
        tx,
      );
      return row;
    });

    return NextResponse.json({
      success: true,
      warehouseAccess: serializeWarehouseAccess(updated),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Validatsiya xato" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
