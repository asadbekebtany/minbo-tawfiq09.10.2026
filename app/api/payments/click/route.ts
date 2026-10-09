import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { markPaymentPaid } from "@/lib/commerce/apply-payment";
import { getPaymentProvider } from "@/lib/providers/payment-provider";
import { clickMerchantError } from "@/lib/providers/click-adapter";
import { WebhookAuthError } from "@/lib/providers/errors";

export const dynamic = "force-dynamic";

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    return (json ?? {}) as Record<string, unknown>;
  }
  const text = await request.text();
  const params = new URLSearchParams(text);
  return Object.fromEntries(params.entries());
}

/** Click Prepare (action=0) / Complete (action=1). */
export async function POST(request: Request) {
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json(clickMerchantError(-1, "Database ulanmagan"));
  }

  const body = await parseBody(request);
  try {
    const event = await getPaymentProvider("click").handleWebhook(body, request.headers);
    const merchantTransId = event.transactionId || String(body.merchant_trans_id ?? "");

    if (event.status === "pending") {
      return NextResponse.json({
        click_trans_id: body.click_trans_id,
        merchant_trans_id: merchantTransId,
        merchant_prepare_id: merchantTransId,
        error: 0,
        error_note: "Success",
      });
    }

    if (event.status === "paid") {
      const result = await markPaymentPaid({
        transactionId: merchantTransId,
        providerTransactionId: String(body.click_trans_id ?? ""),
        raw: event.raw,
        webhook: { provider: "click", eventId: event.eventId },
      });
      if (!result.ok) {
        return NextResponse.json(clickMerchantError(-5, "Payment not found"));
      }
      return NextResponse.json({
        click_trans_id: body.click_trans_id,
        merchant_trans_id: merchantTransId,
        merchant_confirm_id: merchantTransId,
        error: 0,
        error_note: "Success",
      });
    }

    return NextResponse.json(clickMerchantError(0, "Ignored"));
  } catch (err) {
    if (err instanceof WebhookAuthError) {
      return NextResponse.json(clickMerchantError(-1, "Invalid sign"), { status: 401 });
    }
    return NextResponse.json(clickMerchantError(-9, "Internal error"), { status: 500 });
  }
}
