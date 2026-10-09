export const RETURN_STATUSES = [
  "pending",
  "requested",
  "approved",
  "awaiting_item",
  "received",
  "inspection",
  "refund_pending",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type MarketplaceReturnStatus = (typeof RETURN_STATUSES)[number];

const ALLOWED: Record<string, string[]> = {
  pending: ["requested", "approved", "rejected", "cancelled"],
  requested: ["approved", "rejected", "cancelled"],
  approved: ["awaiting_item", "received", "rejected", "cancelled"],
  awaiting_item: ["received", "rejected", "cancelled"],
  received: ["inspection", "rejected"],
  inspection: ["refund_pending", "rejected"],
  refund_pending: ["completed"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function canTransitionReturn(from: string, to: string) {
  if (from === to) return true;
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertReturnTransition(from: string, to: string) {
  if (!canTransitionReturn(from, to)) {
    throw new Error(`RETURN_TRANSITION_DENIED:${from}->${to}`);
  }
}
