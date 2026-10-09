import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import {
  getPaymentGatewayStatus,
  getPlatformSettingsRaw,
  updatePlatformSettings,
} from "@/lib/platform-settings";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  allowNewSellerRegistration: z.boolean().optional(),
  allowReviews: z.boolean().optional(),
  allowReturns: z.boolean().optional(),
  cashPaymentEnabled: z.boolean().optional(),
  cardPaymentEnabled: z.boolean().optional(),
  paymeEnabled: z.boolean().optional(),
  clickEnabled: z.boolean().optional(),
  smsOtpEnabled: z.boolean().optional(),
  demoOtpAllowed: z.boolean().optional(),
  minOrderAmount: z.coerce.number().int().min(0).optional(),
  maxUploadMb: z.coerce.number().int().min(1).max(20).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  payoutHoldDays: z.coerce.number().int().min(0).max(60).optional(),
});

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;

  return NextResponse.json({
    settings: getPlatformSettingsRaw(),
    gateways: getPaymentGatewayStatus(),
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;

  try {
    const data = patchSchema.parse(await request.json());
    const settings = updatePlatformSettings(data, user.id);
    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "site_settings_update",
      entityType: "platform_settings",
      entityId: "main",
      metadata: data,
      ...auditContext,
    });
    return NextResponse.json({
      success: true,
      settings,
      gateways: getPaymentGatewayStatus(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
