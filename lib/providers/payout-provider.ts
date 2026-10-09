import { WebhookAuthError } from "@/lib/providers/errors";
import { redactProviderPayload } from "@/lib/providers/redact";

export type PayoutCommand = {
  payoutId: string;
  storeId: string;
  amount: number;
  currency?: string;
};

export type PayoutProviderResult = {
  provider: string;
  status: "created" | "processing" | "paid" | "failed" | "cancelled";
  providerRef: string;
  raw?: Record<string, unknown>;
};

export type PayoutWebhookEvent = {
  eventId: string;
  payoutId: string;
  status: PayoutProviderResult["status"];
  raw?: Record<string, unknown>;
};

export interface PayoutProvider {
  name: string;
  createPayout(cmd: PayoutCommand): Promise<PayoutProviderResult>;
  checkPayout(providerRef: string): Promise<PayoutProviderResult>;
  cancelPayout(providerRef: string): Promise<PayoutProviderResult>;
  handleWebhook(body: unknown, headers: Headers): Promise<PayoutWebhookEvent>;
}

export class InternalPayoutProvider implements PayoutProvider {
  name = "internal";

  async createPayout(cmd: PayoutCommand): Promise<PayoutProviderResult> {
    return {
      provider: this.name,
      status: "processing",
      providerRef: `internal:${cmd.payoutId}`,
      raw: { payoutId: cmd.payoutId, amount: cmd.amount, storeId: cmd.storeId },
    };
  }

  async checkPayout(providerRef: string): Promise<PayoutProviderResult> {
    return { provider: this.name, status: "processing", providerRef };
  }

  async cancelPayout(providerRef: string): Promise<PayoutProviderResult> {
    return { provider: this.name, status: "cancelled", providerRef };
  }

  async handleWebhook(body: unknown, headers: Headers): Promise<PayoutWebhookEvent> {
    const secret = process.env.PAYOUT_WEBHOOK_SECRET?.trim();
    if (secret) {
      const given = headers.get("x-payout-signature") ?? headers.get("x-webhook-secret") ?? "";
      if (given !== secret) throw new WebhookAuthError("payout");
    }
    const data = (body ?? {}) as Record<string, unknown>;
    return {
      eventId: String(data.eventId ?? data.id ?? `payout-${Date.now()}`),
      payoutId: String(data.payoutId ?? ""),
      status: (data.status as PayoutProviderResult["status"]) ?? "paid",
      raw: redactProviderPayload(data) ?? undefined,
    };
  }
}

let current: PayoutProvider = new InternalPayoutProvider();

export function getPayoutProvider(): PayoutProvider {
  return current;
}

export function setPayoutProvider(provider: PayoutProvider) {
  current = provider;
}
