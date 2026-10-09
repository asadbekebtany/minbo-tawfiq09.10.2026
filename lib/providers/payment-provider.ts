import { allowPaymentMocks } from "@/lib/providers/errors";
import { ClickAdapter } from "@/lib/providers/click-adapter";
import { PaymeAdapter } from "@/lib/providers/payme-adapter";
import type {
  PaymentCommand,
  PaymentProvider,
  PaymentProviderName,
  PaymentResult,
  WebhookPayload,
} from "@/lib/providers/payment-types";

export type {
  PaymentCommand,
  PaymentProvider,
  PaymentProviderName,
  PaymentResult,
  WebhookPayload,
} from "@/lib/providers/payment-types";

function tx(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class InternalCashCardProvider implements PaymentProvider {
  name: PaymentProviderName;

  constructor(name: PaymentProviderName) {
    this.name = name;
  }

  async createPayment(cmd: PaymentCommand): Promise<PaymentResult> {
    return {
      provider: this.name,
      status: "paid",
      transactionId: cmd.idempotencyKey ?? tx(this.name),
      providerTransactionId: tx(`${this.name}-prv`),
      checkoutUrl: null,
      raw: { internal: true, orderId: cmd.orderId, amount: cmd.amount },
    };
  }

  async checkPayment(transactionId: string): Promise<PaymentResult> {
    return { provider: this.name, status: "paid", transactionId };
  }

  async cancelPayment(transactionId: string): Promise<PaymentResult> {
    return { provider: this.name, status: "cancelled", transactionId };
  }

  async refundPayment(transactionId: string, amount: number): Promise<PaymentResult> {
    return { provider: this.name, status: "refunded", transactionId, raw: { amount } };
  }

  async handleWebhook(body: unknown): Promise<WebhookPayload> {
    const data = (body ?? {}) as Record<string, unknown>;
    if (!allowPaymentMocks(process.env.APP_ENV ?? "development")) {
      return {
        eventId: String(data.eventId ?? tx("evt")),
        provider: this.name,
        transactionId: String(data.transactionId ?? ""),
        status: "failed",
      };
    }
    return {
      eventId: String(data.eventId ?? data.id ?? tx("evt")),
      provider: this.name,
      transactionId: String(data.transactionId ?? ""),
      status: (data.status as PaymentResult["status"]) ?? "paid",
      amount: typeof data.amount === "number" ? data.amount : undefined,
    };
  }
}

function clickFromEnv(): ClickAdapter {
  const secret =
    process.env.CLICK_WEBHOOK_SECRET?.trim() ||
    process.env.CLICK_SECRET_KEY?.trim() ||
    process.env.CLICK_SECRET?.trim() ||
    "";
  return new ClickAdapter({
    merchantId: process.env.CLICK_MERCHANT_ID?.trim(),
    serviceId: process.env.CLICK_SERVICE_ID?.trim(),
    secret: process.env.CLICK_SECRET_KEY?.trim() || process.env.CLICK_SECRET?.trim(),
    webhookSecret: secret,
    returnUrl: process.env.CLICK_RETURN_URL?.trim(),
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID?.trim(),
    appEnv: process.env.APP_ENV ?? "development",
  });
}

function paymeFromEnv(): PaymeAdapter {
  const env = process.env.PAYME_ENV === "production" ? "production" : "test";
  const key =
    env === "test"
      ? process.env.PAYME_TEST_SECRET_KEY?.trim() || process.env.PAYME_TEST_KEY?.trim()
      : process.env.PAYME_SECRET_KEY?.trim() || process.env.PAYME_KEY?.trim();
  return new PaymeAdapter({
    merchantId: process.env.PAYME_MERCHANT_ID?.trim(),
    key,
    returnUrl: process.env.PAYME_RETURN_URL?.trim(),
    appEnv: process.env.APP_ENV ?? "development",
  });
}

const registry: Record<PaymentProviderName, PaymentProvider> = {
  cash: new InternalCashCardProvider("cash"),
  card: new InternalCashCardProvider("card"),
  payme: paymeFromEnv(),
  click: clickFromEnv(),
};

export function getPaymentProvider(name: PaymentProviderName): PaymentProvider {
  return registry[name] ?? registry.cash;
}

export function registerPaymentProvider(
  name: PaymentProviderName,
  provider: PaymentProvider,
) {
  registry[name] = provider;
}
