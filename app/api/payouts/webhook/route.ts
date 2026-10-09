import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { getPayoutProvider } from "@/lib/providers/payout-provider";
import { processPayout } from "@/lib/commerce/payout";
import { WebhookAuthError } from "@/lib/providers/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (serverEnv.isProduction && !serverEnv.payout.webhookSecret) {
    return NextResponse.json(
      { success: false, code: "WEBHOOK_AUTH_FAILED", message: "PAYOUT_WEBHOOK_SECRET majburiy" },
      { status: 401 },
    );
  }
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ success: false, code: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const event = await getPayoutProvider().handleWebhook(body, request.headers);
    if (!event.payoutId) {
      return NextResponse.json({ success: false, code: "INVALID_WEBHOOK" }, { status: 400 });
    }
    if (event.status === "paid") {
      try {
        await processPayout(event.payoutId, "processing", "payout-webhook");
      } catch {
        /* allaqachon processing bo‘lishi mumkin */
      }
      await processPayout(event.payoutId, "paid", "payout-webhook");
    }
    if (event.status === "failed" || event.status === "cancelled") {
      await processPayout(event.payoutId, "rejected", "payout-webhook", event.status);
    }
    return NextResponse.json({ success: true, eventId: event.eventId });
  } catch (err) {
    if (err instanceof WebhookAuthError) {
      return NextResponse.json({ success: false, code: err.code, message: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Webhook xato";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
