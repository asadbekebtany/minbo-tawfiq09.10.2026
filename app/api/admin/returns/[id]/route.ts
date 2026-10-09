import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { assertReturnTransition } from "@/lib/return-state";
import { completeRefund } from "@/lib/commerce/refund";
import { notifyUser } from "@/lib/commerce/notify";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum([
    "requested",
    "approved",
    "awaiting_item",
    "received",
    "inspection",
    "refund_pending",
    "completed",
    "rejected",
    "cancelled",
  ]),
  disposition: z.enum(["sellable", "damaged"]).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requirePermissionApi("returns.edit");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const data = patchSchema.parse(await request.json());

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!existing) return NextResponse.json({ error: "Qaytarish so‘rovi topilmadi" }, { status: 404 });

    try {
      assertReturnTransition(existing.status, data.status);
    } catch {
      return NextResponse.json(
        { error: `${existing.status} → ${data.status} ruxsat etilmagan` },
        { status: 409 },
      );
    }

    if (data.status === "completed") {
      await completeRefund(id, actor.id, data.disposition ?? "sellable");
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.returnRequest.update({ where: { id }, data: { status: data.status } });
        if (data.status === "approved") {
          await tx.order.update({
            where: { id: existing.orderId },
            data: { status: "return_approved" },
          });
          await notifyUser(tx, {
            userId: existing.userId,
            type: "return",
            title: "Qaytarish tasdiqlandi",
            message: "Arizangiz tasdiqlandi. Mahsulotni PVZ ga topshiring.",
            link: "/profile/returns",
            eventKey: `return-approved:${id}`,
          });
        }
        const auditContext = getAuditContextFromRequest(request);
        await writeAuditLog(
          {
            actorId: actor.id,
            actorRole: actor.role,
            action: "return_status_update",
            entityType: "return_request",
            entityId: id,
            oldValue: { status: existing.status },
            newValue: { status: data.status, disposition: data.disposition ?? null },
            metadata: { orderId: existing.orderId },
            ...auditContext,
          },
          tx,
        );
      });
    }

    const returnRequest = await prisma.returnRequest.findUnique({ where: { id } });
    return NextResponse.json({ success: true, returnRequest });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
