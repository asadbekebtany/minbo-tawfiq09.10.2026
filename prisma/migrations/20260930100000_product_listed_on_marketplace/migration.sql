-- Warehouse product ↔ marketplace listing (same Product row; no second stock)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "listedOnMarketplace" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product"
SET "listedOnMarketplace" = true
WHERE "moderationStatus" IN ('pending_moderation', 'active', 'rejected')
   OR "isApproved" = true
   OR "isActive" = true;

CREATE INDEX IF NOT EXISTS "Product_listedOnMarketplace_idx" ON "Product"("listedOnMarketplace");
