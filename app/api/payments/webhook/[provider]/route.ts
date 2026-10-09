import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { markPaymentPaid, markPaymentFailedOrCancelled } from "@/lib/commerce/apply-payment";
import { getPaymentProvider, type PaymentProviderName } from "@/lib/providers/payment-provider";
import {
  allowPaymentMocks,
  ProviderMockForbiddenError,
  WebhookAuthError,
} from "@/lib/providers/errors";

export const dynamic = "force-dynamic";

const mockBodySchema = z.object({
  eventId: z.string().min(1),
  transactionId: z.string().min(1),
  status: z.enum(["paid", "failed", "cancelled", "pending", "created", "refunded"]),
  amount: z.number().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await params;
  const providerName = raw as PaymentProviderName;
  if (!["cash", "card", "payme", "click"].includes(providerName)) {
    return NextResponse.json(
      { success: false, code: "UNKNOWN_PROVIDER", message: "Noma'lum provider" },
      { status: 400 },
    );
  }

  if (["payme", "click"].includes(providerName)) {
    return NextResponse.json(
      {
        success: false,
        code: "USE_PROVIDER_ENDPOINT",
        message:
          providerName === "click"
            ? "Click uchun /api/payments/click ishlating"
            : "Payme uchun /api/payments/payme ishlating",
      },
      { status: 400 },
    );
  }

  if (!allowPaymentMocks(serverEnv.appEnv)) {
    return NextResponse.json(
      { success: false, code: "PROVIDER_MOCK_FORBIDDEN", message: "Mock webhook productionda yopiq" },
      { status: 403 },
    );
  }

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json(
      { success: false, code: "DB_UNAVAILABLE", message: "Database ulanmagan" },
      { status: 503 },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = mockBodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, code: "INVALID_WEBHOOK", message: "Webhook tanasi noto‘g‘ri" },
      { status: 400 },
    );
  }

  try {
    const provider = getPaymentProvider(providerName);
    const event = await provider.handleWebhook(parsed.data, request.headers);
    const webhook = { provider: providerName, eventId: parsed.data.eventId };

    if (event.status === "paid") {
      const result = await markPaymentPaid({
        transactionId: event.transactionId || parsed.data.transactionId,
        raw: event.raw,
        webhook,
      });
      if (!result.ok) {
        return NextResponse.json(
          { success: false, code: "PAYMENT_NOT_FOUND", message: "To‘lov topilmadi" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, duplicate: Boolean(result.duplicate) });
    }

    try {
      await prisma.processedWebhook.create({ data: webhook });
    } catch {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (event.status === "failed" || event.status === "cancelled") {
      await markPaymentFailedOrCancelled(
        event.transactionId || parsed.data.transactionId,
        event.status,
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof WebhookAuthError || err instanceof ProviderMockForbiddenError) {
      return NextResponse.json({ success: false, code: err.code, message: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, code: "PAYMENT_NOT_FOUND", message: "To‘lov topilmadi" },
        { status: 404 },
      );
    }
    throw err;
  }
}
