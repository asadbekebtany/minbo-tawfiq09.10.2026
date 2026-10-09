import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUDIT_ACTION_LABELS, listAuditLogs } from "@/lib/audit-log";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection, databaseUnavailableResponse } from "@/lib/db";
import { auditLogListQuerySchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = auditLogListQuerySchema.safeParse({
      action: searchParams.get("action") ?? undefined,
      entityType: searchParams.get("entityType") ?? undefined,
      actorId: searchParams.get("actorId") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(validationError(parsed.error), { status: 400 });
    }

    const { logs, total, limit, offset } = await listAuditLogs(parsed.data);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actionLabel: AUDIT_ACTION_LABELS[log.action],
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
        actor: log.actor,
      })),
      total,
      limit,
      offset,
      actionLabels: AUDIT_ACTION_LABELS,
    });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 500 });
  }
}
