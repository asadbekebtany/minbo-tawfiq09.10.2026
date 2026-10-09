import type { ProductModerationStatus } from "@prisma/client";

export type WarehouseMarketplaceStatus =
  | "NOT_PUBLISHED"
  | "DRAFT"
  | "PENDING_MODERATION"
  | "ACTIVE"
  | "REJECTED";

export function mapWarehouseMarketplaceStatus(input: {
  listedOnMarketplace: boolean;
  moderationStatus: ProductModerationStatus | string;
}): WarehouseMarketplaceStatus {
  const status = input.moderationStatus;
  if (status === "pending_moderation") return "PENDING_MODERATION";
  if (status === "active") return "ACTIVE";
  if (status === "rejected") return "REJECTED";
  if (input.listedOnMarketplace && status === "draft") return "DRAFT";
  if (!input.listedOnMarketplace) return "NOT_PUBLISHED";
  return "DRAFT";
}

export function isMarketplaceLinked(input: {
  listedOnMarketplace: boolean;
  moderationStatus: ProductModerationStatus | string;
}) {
  return mapWarehouseMarketplaceStatus(input) !== "NOT_PUBLISHED";
}
