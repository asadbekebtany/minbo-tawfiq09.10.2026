import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { markPaymentPaid } from "@/lib/commerce/apply-payment";
import { allowPaymentMocks } from "@/lib/providers/errors";

const schema = z.object({
  transactionId: z.string().min(1),
  eventId: z.string().min(1).optional(),
});

/** Faqat development/staging. Productionda yopiq. */
export async function POST(request: Request) {
  if (!allowPaymentMocks(serverEnv.appEnv)) {
    return NextResponse.json(
      { success: false, code: "PROVIDER_MOCK_FORBIDDEN", message: "Mock to‘lov productionda yopiq" },
      { status: 403 },
    );
  }

  const { error } = await requireSessionUser();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ success: false, code: "DB_UNAVAILABLE", message: "Database ulanmagan" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: "INVALID", message: "transactionId majburiy" }, { status: 400 });
  }

  const result = await markPaymentPaid({ transactionId: parsed.data.transactionId });
  if (!result.ok) {
    return NextResponse.json({ success: false, code: "PAYMENT_NOT_FOUND", message: "To‘lov topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ success: true, duplicate: result.duplicate, orderId: result.orderId });
}
