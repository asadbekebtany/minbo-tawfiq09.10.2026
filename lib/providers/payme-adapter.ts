import { timingSafeEqual } from "node:crypto";
import {
  allowPaymentMocks,
  ProviderMockForbiddenError,
  ProviderNotConfiguredError,
  WebhookAuthError,
} from "@/lib/providers/errors";
import { redactProviderPayload } from "@/lib/providers/redact";
import type {
  PaymentCommand,
  PaymentProvider,
  PaymentResult,
  WebhookPayload,
} from "@/lib/providers/payment-types";

function tx(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  return body as Record<string, unknown>;
}

export function verifyPaymeBasicAuth(
  authorization: string | null,
  merchantId: string,
  key: string,
): boolean {
  if (!authorization || !merchantId || !key) return false;
  const expected = `Basic ${Buffer.from(`${merchantId}:${key}`, "utf8").toString("base64")}`;
  if (authorization.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function decodePaymeAuth(authorization: string | null): { merchantId: string; key: string } | null {
  if (!authorization?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return { merchantId: decoded.slice(0, idx), key: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

type PaymeConfig = {
  merchantId?: string;
  key?: string;
  returnUrl?: string;
  appEnv: string;
};

export class PaymeAdapter implements PaymentProvider {
  name = "payme" as const;
  private readonly config: PaymeConfig;

  constructor(config: PaymeConfig) {
    this.config = config;
  }

  private configured(): boolean {
    return Boolean(this.config.merchantId && this.config.key);
  }

  private assertCanOperate(): void {
    if (this.configured()) return;
    if (!allowPaymentMocks(this.config.appEnv)) {
      throw new ProviderNotConfiguredError("payme");
    }
  }

  async createPayment(cmd: PaymentCommand): Promise<PaymentResult> {
    this.assertCanOperate();
    const transactionId = cmd.idempotencyKey ?? tx("payme");
    if (!this.configured()) {
      return {
        provider: "payme",
        status: "pending",
        transactionId,
        providerTransactionId: tx("payme-prv"),
        checkoutUrl: null,
        raw: { mock: true, orderId: cmd.orderId },
      };
    }
    const payload = Buffer.from(
      JSON.stringify({
        merchant_id: this.config.merchantId,
        amount: cmd.amount * 100,
        account: { order_id: cmd.orderId },
      }),
      "utf8",
    ).toString("base64");
    const checkoutUrl = `https://checkout.paycom.uz/${payload}`;
    return {
      provider: "payme",
      status: "pending",
      transactionId,
      checkoutUrl,
      raw: redactProviderPayload({ orderId: cmd.orderId, amount: cmd.amount }) ?? undefined,
    };
  }

  async checkPayment(transactionId: string): Promise<PaymentResult> {
    this.assertCanOperate();
    return { provider: "payme", status: "pending", transactionId };
  }

  async cancelPayment(transactionId: string): Promise<PaymentResult> {
    this.assertCanOperate();
    return { provider: "payme", status: "cancelled", transactionId };
  }

  async refundPayment(transactionId: string, amount: number): Promise<PaymentResult> {
    this.assertCanOperate();
    return {
      provider: "payme",
      status: "refunded",
      transactionId,
      raw: { amount },
    };
  }

  async handleWebhook(body: unknown, headers: Headers): Promise<WebhookPayload> {
    const data = asRecord(body);
    const rpcMethod = String(data.method ?? "");
    const params = asRecord(data.params);
    const isRpc = Boolean(rpcMethod);

    if (isRpc || headers.get("authorization")?.startsWith("Basic ")) {
      if (!verifyPaymeBasicAuth(headers.get("authorization"), this.config.merchantId ?? "", this.config.key ?? "")) {
        throw new WebhookAuthError("payme");
      }
      const method = rpcMethod.toLowerCase();
      let status: PaymentResult["status"] = "pending";
      if (method === "performtransaction") status = "paid";
      else if (method === "canceltransaction") status = "cancelled";
      else if (method === "checktransaction" || method === "createtransaction") status = "pending";
      const account = asRecord(params.account);
      return {
        eventId: String(params.id ?? data.id ?? tx("payme-evt")),
        provider: "payme",
        transactionId: String(account.order_id ?? params.order_id ?? data.transactionId ?? ""),
        status,
        amount: params.amount != null ? Number(params.amount) / 100 : undefined,
        raw: redactProviderPayload(data) ?? undefined,
      };
    }

    if (!allowPaymentMocks(this.config.appEnv)) {
      throw new ProviderMockForbiddenError("payme");
    }
    const headerToken = headers.get("x-payme-key") ?? headers.get("x-webhook-secret");
    if (this.config.key && headerToken !== this.config.key) {
      throw new WebhookAuthError("payme");
    }
    return {
      eventId: String(data.eventId ?? data.id ?? tx("payme-evt")),
      provider: "payme",
      transactionId: String(data.transactionId ?? ""),
      status: (data.status as PaymentResult["status"]) ?? "paid",
      amount: typeof data.amount === "number" ? data.amount : undefined,
      raw: redactProviderPayload(data) ?? undefined,
    };
  }
}

export function paymeRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
