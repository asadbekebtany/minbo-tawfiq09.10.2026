-- Unique SKU / tracking / payout cancelled / return cancelled
-- Existing duplicate SKU/tracking qiymatlari unique indexdan oldin suffix bilan ajratiladi.

ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'cancelled';

UPDATE "Product" p
SET sku = p.sku || '-' || left(p.id, 8)
WHERE p.sku IS NOT NULL AND btrim(p.sku) <> ''
  AND p.id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY sku ORDER BY "createdAt", id) AS rn
      FROM "Product"
      WHERE sku IS NOT NULL AND btrim(sku) <> ''
    ) d WHERE d.rn > 1
  );

UPDATE "ProductVariant" v
SET sku = v.sku || '-' || left(v.id, 8)
WHERE v.sku IS NOT NULL AND btrim(v.sku) <> ''
  AND v.id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY sku ORDER BY id) AS rn
      FROM "ProductVariant"
      WHERE sku IS NOT NULL AND btrim(sku) <> ''
    ) d WHERE d.rn > 1
  );

UPDATE "Order" o
SET "trackingNumber" = o."trackingNumber" || '-' || left(o.id, 6)
WHERE o."trackingNumber" IS NOT NULL AND btrim(o."trackingNumber") <> ''
  AND o.id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY "trackingNumber" ORDER BY "createdAt", id) AS rn
      FROM "Order"
      WHERE "trackingNumber" IS NOT NULL AND btrim("trackingNumber") <> ''
    ) d WHERE d.rn > 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_sku_unique"
  ON "ProductVariant"("sku")
  WHERE "sku" IS NOT NULL AND btrim("sku") <> '';

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_unique"
  ON "Product"("sku")
  WHERE "sku" IS NOT NULL AND btrim("sku") <> '';

CREATE UNIQUE INDEX IF NOT EXISTS "Order_trackingNumber_key"
  ON "Order"("trackingNumber")
  WHERE "trackingNumber" IS NOT NULL AND btrim("trackingNumber") <> '';
