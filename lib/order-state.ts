export const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "confirmed",
  "accepted",
  "preparing",
  "packing",
  "ready_for_shipment",
  "shipped",
  "in_transit",
  "ready_for_pickup",
  "at_pickup_point",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "returned",
  "refund_pending",
  "refunded",
] as const;

export type MarketplaceOrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED: Record<MarketplaceOrderStatus, MarketplaceOrderStatus[]> = {
  pending: ["awaiting_payment", "paid", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["confirmed", "accepted", "cancelled", "refund_pending"],
  confirmed: ["preparing", "accepted", "packing", "ready_for_shipment", "in_transit", "ready_for_pickup", "at_pickup_point", "cancelled"],
  accepted: ["preparing", "packing", "cancelled"],
  preparing: ["packing", "ready_for_shipment", "cancelled"],
  packing: ["ready_for_shipment", "shipped", "ready_for_pickup", "cancelled"],
  ready_for_shipment: ["shipped", "in_transit", "cancelled"],
  shipped: ["in_transit", "ready_for_pickup", "at_pickup_point", "delivered"],
  in_transit: ["at_pickup_point", "ready_for_pickup", "delivered"],
  ready_for_pickup: ["at_pickup_point", "delivered", "return_requested"],
  at_pickup_point: ["ready_for_pickup", "delivered", "return_requested"],
  delivered: ["return_requested"],
  cancelled: [],
  return_requested: ["return_approved", "cancelled", "delivered", "refunded"],
  return_approved: ["returned", "refund_pending", "refunded"],
  returned: ["refund_pending", "refunded"],
  refund_pending: ["refunded"],
  refunded: [],
};

export function canTransitionOrder(
  from: string,
  to: string,
): from is MarketplaceOrderStatus {
  if (!(ORDER_STATUSES as readonly string[]).includes(from)) return false;
  if (!(ORDER_STATUSES as readonly string[]).includes(to)) return false;
  if (from === to) return true;
  return ALLOWED[from as MarketplaceOrderStatus].includes(to as MarketplaceOrderStatus);
}

export function assertOrderTransition(from: string, to: string) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`ORDER_TRANSITION_DENIED:${from}->${to}`);
  }
}

export function initialOrderStatus(paymentMethod: string): MarketplaceOrderStatus {
  if (paymentMethod === "cash") return "confirmed";
  return "awaiting_payment";
}

/** Seller panelda qo‘yilishi mumkin bo‘lgan statuslar */
export const SELLER_ALLOWED_ORDER_STATUSES: MarketplaceOrderStatus[] = [
  "accepted",
  "preparing",
  "packing",
  "ready_for_shipment",
  "shipped",
  "ready_for_pickup",
  "delivered",
  "cancelled",
];

export function isSellerAllowedOrderStatus(status: string): boolean {
  return (SELLER_ALLOWED_ORDER_STATUSES as readonly string[]).includes(status);
}
