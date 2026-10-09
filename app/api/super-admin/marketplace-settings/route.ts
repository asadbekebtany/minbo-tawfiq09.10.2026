import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getRuntimeSettings, setRuntimeSettings } from "@/lib/system-settings";
import { writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  return NextResponse.json({ settings: await getRuntimeSettings() });
}

const patchSchema = z.object({
  defaultCommission: z.coerce.number().min(0).max(50).optional(),
  minPayout: z.coerce.number().int().min(0).optional(),
  returnDays: z.coerce.number().int().min(1).max(90).optional(),
  otpExpiryMinutes: z.coerce.number().int().min(1).max(30).optional(),
  otpResendSeconds: z.coerce.number().int().min(15).max(600).optional(),
  otpMaxAttempts: z.coerce.number().int().min(3).max(10).optional(),
  otpMaxRequestsPerHour: z.coerce.number().int().min(1).max(100).optional(),
  codEnabled: z.boolean().optional(),
  clickEnabled: z.boolean().optional(),
  paymeEnabled: z.boolean().optional(),
  reviewModeration: z.boolean().optional(),
  sellerAutoApproval: z.boolean().optional(),
  orderAutoCancelMinutes: z.coerce.number().int().min(5).max(24 * 60).optional(),
  payoutHoldDays: z.coerce.number().int().min(0).max(60).optional(),
});

export async function PATCH(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  try {
    const data = patchSchema.parse(await request.json());
    const prev = await getRuntimeSettings();
    const settings = await prisma.$transaction(async (tx) => {
      const next = await setRuntimeSettings(data, user.id, tx);
      await writeAuditLog(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "site_settings_update",
          entityType: "system_setting",
          entityId: "marketplace",
          oldValue: prev as unknown as Record<string, unknown>,
          newValue: next as unknown as Record<string, unknown>,
        },
        tx,
      );
      return next;
    });
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
