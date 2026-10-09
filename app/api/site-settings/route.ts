import { NextResponse } from "next/server";
import {
  getSiteSettings,
  updateSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requireAdminApi } from "@/lib/api-auth";
import { siteSettingsUpdateSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Sayt sozlamalarini yuklab bo‘lmadi" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const { error, user: actor } = await requireAdminApi();
  if (error || !actor) return error;

  try {
    const parsed = siteSettingsUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(validationError(parsed.error), { status: 400 });
    }
    const previous = await getSiteSettings();
    const settings = await updateSiteSettings(parsed.data as Partial<SiteSettings>);

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "site_settings_update",
      entityType: "site_setting",
      entityId: "main",
      metadata: {
        changedFields: Object.keys(parsed.data),
        previousSiteName: previous.siteName,
        newSiteName: settings.siteName,
      },
      ...auditContext,
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Sayt sozlamalarini saqlab bo‘lmadi" },
      { status: 400 },
    );
  }
}
