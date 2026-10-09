export const PVZ_PARCEL_STATUSES = [
  "incoming",
  "received",
  "ready",
  "delivered",
  "return_accepted",
] as const;

export type PvzParcelStatus = (typeof PVZ_PARCEL_STATUSES)[number];

const ALLOWED: Record<PvzParcelStatus, PvzParcelStatus[]> = {
  incoming: ["received"],
  received: ["ready", "return_accepted"],
  ready: ["delivered", "return_accepted"],
  delivered: ["return_accepted"],
  return_accepted: [],
};

export const PVZ_STATUS_LABELS: Record<PvzParcelStatus, string> = {
  incoming: "Kiruvchi",
  received: "Qabul qilindi",
  ready: "Mijozga tayyor",
  delivered: "Topshirildi",
  return_accepted: "Qaytarish qabul",
};

export const PVZ_NEXT_ACTIONS: Record<PvzParcelStatus, { status: PvzParcelStatus; label: string }[]> =
  {
    incoming: [{ status: "received", label: "Qabul qilish" }],
    received: [
      { status: "ready", label: "Mijozga tayyor" },
      { status: "return_accepted", label: "Qaytarish qabul" },
    ],
    ready: [
      { status: "delivered", label: "Topshirish" },
      { status: "return_accepted", label: "Qaytarish qabul" },
    ],
    delivered: [{ status: "return_accepted", label: "Qaytarish qabul" }],
    return_accepted: [],
  };

export function isPvzParcelStatus(value: string): value is PvzParcelStatus {
  return (PVZ_PARCEL_STATUSES as readonly string[]).includes(value);
}

export function canTransitionPvzParcel(from: string, to: string): boolean {
  if (!isPvzParcelStatus(from) || !isPvzParcelStatus(to)) return false;
  if (from === to) return false;
  return ALLOWED[from].includes(to);
}

export function assertPvzParcelTransition(from: string, to: string) {
  if (!canTransitionPvzParcel(from, to)) {
    throw new Error(`PVZ_TRANSITION_DENIED:${from}->${to}`);
  }
}

export const PVZ_OPEN_RETURN_STATUSES = [
  "pending",
  "requested",
  "approved",
  "awaiting_item",
] as const;

export function isOpenPvzReturnStatus(status: string): boolean {
  return (PVZ_OPEN_RETURN_STATUSES as readonly string[]).includes(status);
}

/** return_accepted faqat ochiq qaytarish so‘rovi bo‘lsa */
export function canAcceptPvzReturn(from: string, hasOpenReturn: boolean): boolean {
  return hasOpenReturn && canTransitionPvzParcel(from, "return_accepted");
}

/** Parcel status → order status (mavjud bo‘lsa yangilanadi) */
export const PVZ_TO_ORDER_STATUS: Record<PvzParcelStatus, string> = {
  incoming: "in_transit",
  received: "at_pickup_point",
  ready: "ready_for_pickup",
  delivered: "delivered",
  return_accepted: "return_requested",
};

export const PVZ_TO_SHIPMENT_STATUS: Record<PvzParcelStatus, string> = {
  incoming: "in_transit",
  received: "arrived",
  ready: "arrived",
  delivered: "delivered",
  return_accepted: "returned",
};
