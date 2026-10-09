import { createHash, timingSafeEqual } from "node:crypto";
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

export function clickSign(
  parts: {
    clickTransId: string;
    serviceId: string;
    secret: string;
    merchantTransId: string;
    amount: string;
    action: string;
    signTime: string;
  },
): string {
  const raw = [
    parts.clickTransId,
    parts.serviceId,
    parts.secret,
    parts.merchantTransId,
    parts.amount,
    parts.action,
    parts.signTime,
  ].join("");
  return createHash("md5").update(raw).digest("hex");
}

export function verifyClickSign(
  body: Record<string, unknown>,
  secret: string,
): boolean {
  if (!secret) return false;
  const expected = clickSign({
    clickTransId: String(body.click_trans_id ?? ""),
    serviceId: String(body.service_id ?? ""),
    secret,
    merchantTransId: String(body.merchant_trans_id ?? ""),
    amount: String(body.amount ?? ""),
    action: String(body.action ?? ""),
    signTime: String(body.sign_time ?? ""),
  });
  const given = String(body.sign_string ?? "");
  if (given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  } catch {
    return false;
  }
}

type ClickConfig = {
  merchantId?: string;
  serviceId?: string;
  secret?: string;
  webhookSecret?: string;
  returnUrl?: string;
  merchantUserId?: string;
  appEnv: string;
};

export class ClickAdapter implements PaymentProvider {
  name = "click" as const;
  private readonly config: ClickConfig;

  constructor(config: ClickConfig) {
    this.config = config;
  }

  private configured(): boolean {
    return Boolean(this.config.merchantId && this.config.serviceId && this.config.secret);
  }

  private assertCanOperate(): void {
    if (this.configured()) return;
    if (!allowPaymentMocks(this.config.appEnv)) {
      throw new ProviderNotConfiguredError("click");
    }
  }

  async createPayment(cmd: PaymentCommand): Promise<PaymentResult> {
    this.assertCanOperate();
    const transactionId = cmd.idempotencyKey ?? tx("click");
    if (!this.configured()) {
      return {
        provider: "click",
        status: "pending",
        transactionId,
        providerTransactionId: tx("click-prv"),
        checkoutUrl: null,
        raw: { mock: true, orderId: cmd.orderId },
      };
    }
    const amount = cmd.amount;
    const returnUrl = cmd.returnUrl ?? this.config.returnUrl ?? "";
    const checkoutUrl = new URL("https://my.click.uz/services/pay");
    checkoutUrl.searchParams.set("service_id", this.config.serviceId!);
    checkoutUrl.searchParams.set("merchant_id", this.config.merchantId!);
    checkoutUrl.searchParams.set("amount", String(amount));
    checkoutUrl.searchParams.set("transaction_param", transactionId);
    if (returnUrl) checkoutUrl.searchParams.set("return_url", returnUrl);
    return {
      provider: "click",
      status: "pending",
      transactionId,
      checkoutUrl: checkoutUrl.toString(),
      raw: redactProviderPayload({ orderId: cmd.orderId, amount }) ?? undefined,
    };
  }

  async checkPayment(transactionId: string): Promise<PaymentResult> {
    this.assertCanOperate();
    return { provider: "click", status: "pending", transactionId };
  }

  async cancelPayment(transactionId: string): Promise<PaymentResult> {
    this.assertCanOperate();
    return { provider: "click", status: "cancelled", transactionId };
  }

  async refundPayment(transactionId: string, amount: number): Promise<PaymentResult> {
    this.assertCanOperate();
    return {
      provider: "click",
      status: "refunded",
      transactionId,
      raw: { amount },
    };
  }

  async handleWebhook(body: unknown, headers: Headers): Promise<WebhookPayload> {
    const data = asRecord(body);
    const secret = this.config.webhookSecret || this.config.secret || "";
    const appEnv = this.config.appEnv;
    const hasClickShape = "sign_string" in data || "click_trans_id" in data;

    if (hasClickShape) {
      if (!verifyClickSign(data, secret)) {
        throw new WebhookAuthError("click");
      }
      const action = String(data.action ?? "");
      const status = action === "1" ? "paid" : action === "0" ? "pending" : "failed";
      return {
        eventId: String(data.click_trans_id ?? data.eventId ?? tx("click-evt")),
        provider: "click",
        transactionId: String(data.merchant_trans_id ?? data.transactionId ?? ""),
        status,
        amount: data.amount != null ? Number(data.amount) : undefined,
        raw: redactProviderPayload(data) ?? undefined,
      };
    }

    if (!allowPaymentMocks(appEnv)) {
      throw new ProviderMockForbiddenError("click");
    }
    const headerToken = headers.get("x-click-webhook-secret") ?? headers.get("x-webhook-secret");
    if (secret && headerToken !== secret) {
      throw new WebhookAuthError("click");
    }
    return {
      eventId: String(data.eventId ?? data.id ?? tx("click-evt")),
      provider: "click",
      transactionId: String(data.transactionId ?? ""),
      status: (data.status as PaymentResult["status"]) ?? "paid",
      amount: typeof data.amount === "number" ? data.amount : undefined,
      raw: redactProviderPayload(data) ?? undefined,
    };
  }
}

export function clickMerchantError(error: number, note: string, extra: Record<string, unknown> = {}) {
  return { error, error_note: note, ...extra };
}
