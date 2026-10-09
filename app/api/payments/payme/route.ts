import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { markPaymentPaid, markPaymentFailedOrCancelled } from "@/lib/commerce/apply-payment";
import { getPaymentProvider } from "@/lib/providers/payment-provider";
import { paymeRpcError } from "@/lib/providers/payme-adapter";
import { WebhookAuthError } from "@/lib/providers/errors";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RpcBody = {
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RpcBody;
  const rpcId = body.id ?? null;
  const method = String(body.method ?? "");

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json(paymeRpcError(rpcId, -32400, "Database unavailable"));
  }

  try {
    const event = await getPaymentProvider("payme").handleWebhook(body, request.headers);
    const params = (body.params ?? {}) as Record<string, unknown>;
    const account = (params.account ?? {}) as Record<string, unknown>;
    const orderId = String(account.order_id ?? event.transactionId ?? "");

    const payment = orderId
      ? await prisma.payment.findFirst({
          where: {
            OR: [{ transactionId: orderId }, { orderId }],
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

    if (method === "CheckPerformTransaction") {
      if (!payment) return NextResponse.json(paymeRpcError(rpcId, -31050, "Order not found"));
      return NextResponse.json({ result: { allow: true }, id: rpcId });
    }

    if (method === "CreateTransaction") {
      if (!payment) return NextResponse.json(paymeRpcError(rpcId, -31050, "Order not found"));
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: String(params.id ?? payment.providerTransactionId ?? "") },
      });
      return NextResponse.json({
        result: {
          create_time: Date.now(),
          transaction: payment.transactionId,
          state: 1,
        },
        id: rpcId,
      });
    }

    if (method === "PerformTransaction") {
      const txId = payment?.transactionId ?? event.transactionId;
      const result = await markPaymentPaid({
        transactionId: txId,
        providerTransactionId: String(params.id ?? ""),
        raw: event.raw,
        webhook: { provider: "payme", eventId: event.eventId },
      });
      if (!result.ok) return NextResponse.json(paymeRpcError(rpcId, -31050, "Payment not found"));
      return NextResponse.json({
        result: { transaction: txId, perform_time: Date.now(), state: 2 },
        id: rpcId,
      });
    }

    if (method === "CancelTransaction") {
      const txId = payment?.transactionId ?? event.transactionId;
      await markPaymentFailedOrCancelled(txId, "cancelled");
      return NextResponse.json({
        result: { transaction: txId, cancel_time: Date.now(), state: -1 },
        id: rpcId,
      });
    }

    if (method === "CheckTransaction") {
      if (!payment) return NextResponse.json(paymeRpcError(rpcId, -31050, "Order not found"));
      const state = payment.lifecycle === "paid" ? 2 : payment.lifecycle === "cancelled" ? -1 : 1;
      return NextResponse.json({
        result: { transaction: payment.transactionId, state, reason: null },
        id: rpcId,
      });
    }

    return NextResponse.json(paymeRpcError(rpcId, -32601, "Method not found"));
  } catch (err) {
    if (err instanceof WebhookAuthError) {
      return NextResponse.json(paymeRpcError(rpcId, -32504, "Unauthorized"), { status: 401 });
    }
    return NextResponse.json(paymeRpcError(rpcId, -32400, "Internal error"), { status: 500 });
  }
}
