import { nextTrackingNumber } from "@/lib/public-ids";
import { redactProviderPayload } from "@/lib/providers/redact";
import { WebhookAuthError } from "@/lib/providers/errors";

export type ShipmentDraft = {
  orderId: string;
  from?: string;
  to?: string;
  pickupPointId?: string | null;
};

export type LogisticsShipment = {
  trackingNumber: string;
  orderId: string;
  status: string;
  pickupPointId?: string | null;
};

export type LogisticsWebhookEvent = {
  eventId: string;
  trackingNumber: string;
  status: string;
  raw?: Record<string, unknown>;
};

export interface LogisticsProvider {
  name: string;
  createShipment(draft: ShipmentDraft): Promise<LogisticsShipment>;
  getTracking(trackingNumber: string): Promise<LogisticsShipment | null>;
  syncStatus(trackingNumber: string): Promise<LogisticsShipment | null>;
  cancelShipment(trackingNumber: string): Promise<LogisticsShipment>;
  createReturnShipment(draft: ShipmentDraft): Promise<LogisticsShipment>;
  mapPvz(pickupPointId: string): Promise<{ pickupPointId: string; externalCode: string }>;
  handleWebhook(body: unknown, headers: Headers): Promise<LogisticsWebhookEvent>;
}

const memory = new Map<string, LogisticsShipment>();

export class InternalLogisticsProvider implements LogisticsProvider {
  name = "internal";

  async createShipment(draft: ShipmentDraft): Promise<LogisticsShipment> {
    const row: LogisticsShipment = {
      trackingNumber: nextTrackingNumber(),
      orderId: draft.orderId,
      status: "created",
      pickupPointId: draft.pickupPointId ?? null,
    };
    memory.set(row.trackingNumber, row);
    return row;
  }

  async getTracking(trackingNumber: string): Promise<LogisticsShipment | null> {
    return memory.get(trackingNumber) ?? null;
  }

  async syncStatus(trackingNumber: string): Promise<LogisticsShipment | null> {
    return this.getTracking(trackingNumber);
  }

  async cancelShipment(trackingNumber: string): Promise<LogisticsShipment> {
    const current = memory.get(trackingNumber) ?? {
      trackingNumber,
      orderId: "",
      status: "cancelled",
    };
    const next = { ...current, status: "cancelled" };
    memory.set(trackingNumber, next);
    return next;
  }

  async createReturnShipment(draft: ShipmentDraft): Promise<LogisticsShipment> {
    const row: LogisticsShipment = {
      trackingNumber: nextTrackingNumber(),
      orderId: draft.orderId,
      status: "return_created",
      pickupPointId: draft.pickupPointId ?? null,
    };
    memory.set(row.trackingNumber, row);
    return row;
  }

  async mapPvz(pickupPointId: string) {
    return { pickupPointId, externalCode: `pvz:${pickupPointId}` };
  }

  async handleWebhook(body: unknown, headers: Headers): Promise<LogisticsWebhookEvent> {
    const secret = process.env.LOGISTICS_WEBHOOK_SECRET?.trim();
    if (secret) {
      const given = headers.get("x-logistics-signature") ?? headers.get("x-webhook-secret") ?? "";
      if (given !== secret) throw new WebhookAuthError("logistics");
    }
    const data = (body ?? {}) as Record<string, unknown>;
    const trackingNumber = String(data.trackingNumber ?? data.tracking_number ?? "");
    const status = String(data.status ?? "in_transit");
    if (trackingNumber) {
      const prev = memory.get(trackingNumber);
      if (prev) memory.set(trackingNumber, { ...prev, status });
    }
    return {
      eventId: String(data.eventId ?? data.id ?? `log-${Date.now()}`),
      trackingNumber,
      status,
      raw: redactProviderPayload(data) ?? undefined,
    };
  }
}

let current: LogisticsProvider = new InternalLogisticsProvider();

export function getLogisticsProvider(): LogisticsProvider {
  return current;
}

export function setLogisticsProvider(provider: LogisticsProvider) {
  current = provider;
}
