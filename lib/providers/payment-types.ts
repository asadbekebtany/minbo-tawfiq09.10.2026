export type PaymentProviderName = "cash" | "card" | "payme" | "click";

export type PaymentCommand = {
  orderId: string;
  amount: number;
  currency?: string;
  returnUrl?: string;
  idempotencyKey?: string;
};

export type PaymentResult = {
  provider: PaymentProviderName;
  status: "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
  transactionId: string;
  providerTransactionId?: string;
  checkoutUrl?: string | null;
  raw?: Record<string, unknown>;
};

export type WebhookPayload = {
  eventId: string;
  provider: PaymentProviderName;
  transactionId: string;
  status: PaymentResult["status"];
  amount?: number;
  raw?: Record<string, unknown>;
};

export interface PaymentProvider {
  name: PaymentProviderName;
  createPayment(cmd: PaymentCommand): Promise<PaymentResult>;
  checkPayment(transactionId: string): Promise<PaymentResult>;
  cancelPayment(transactionId: string): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<PaymentResult>;
  handleWebhook(body: unknown, headers: Headers): Promise<WebhookPayload>;
}
