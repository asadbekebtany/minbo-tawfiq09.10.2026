-- DB readiness: safe unique/index/FK patches for existing production rows.

-- Empty unique keys would collide; null them first.
UPDATE "Product" SET "sku" = NULL WHERE "sku" IS NOT NULL AND btrim("sku") = '';
UPDATE "ProductVariant" SET "sku" = NULL WHERE "sku" IS NOT NULL AND btrim("sku") = '';
UPDATE "Order" SET "trackingNumber" = NULL WHERE "trackingNumber" IS NOT NULL AND btrim("trackingNumber") = '';
UPDATE "Payment" SET "providerTransactionId" = NULL WHERE "providerTransactionId" IS NOT NULL AND btrim("providerTransactionId") = '';
UPDATE "Notification" SET "eventKey" = NULL WHERE "eventKey" IS NOT NULL AND btrim("eventKey") = '';

-- Duplicate provider transaction ids: keep oldest, suffix the rest.
UPDATE "Payment" p
SET "providerTransactionId" = p."providerTransactionId" || '-' || left(p.id, 8)
WHERE p."providerTransactionId" IS NOT NULL
  AND p.id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY "providerTransactionId" ORDER BY "createdAt", id) AS rn
      FROM "Payment"
      WHERE "providerTransactionId" IS NOT NULL
    ) d WHERE d.rn > 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerTransactionId_key"
  ON "Payment"("providerTransactionId")
  WHERE "providerTransactionId" IS NOT NULL AND btrim("providerTransactionId") <> '';

-- Cart: PostgreSQL UNIQUE treats NULLs as distinct; collapse duplicate null-variant rows.
DELETE FROM "CartItem" a
USING "CartItem" b
WHERE a."variantId" IS NULL
  AND b."variantId" IS NULL
  AND a."userId" = b."userId"
  AND a."productId" = b."productId"
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_null_variant_key"
  ON "CartItem"("userId", "productId")
  WHERE "variantId" IS NULL;

-- Query indexes (IF NOT EXISTS — existing DBs safe)
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX IF NOT EXISTS "ReturnRequest_status_idx" ON "ReturnRequest"("status");
CREATE INDEX IF NOT EXISTS "ReturnRequest_createdAt_idx" ON "ReturnRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_trackingNumber_idx" ON "Order"("trackingNumber");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX IF NOT EXISTS "PvzParcel_orderId_idx" ON "PvzParcel"("orderId");
CREATE INDEX IF NOT EXISTS "SellerFinance_storeId_idx" ON "SellerFinance"("storeId");
CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId");
CREATE INDEX IF NOT EXISTS "Commission_categoryId_idx" ON "Commission"("categoryId");

-- Orphan parcels cannot receive an Order FK.
DELETE FROM "PvzParcel" p
WHERE NOT EXISTS (SELECT 1 FROM "Order" o WHERE o.id = p."orderId");

DO $$ BEGIN
  ALTER TABLE "PvzParcel"
    ADD CONSTRAINT "PvzParcel_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payout store FK: drop orphan payouts rather than fail migrate.
DELETE FROM "PayoutRequest" p
WHERE NOT EXISTS (SELECT 1 FROM "Store" s WHERE s.id = p."storeId");

DO $$ BEGIN
  ALTER TABLE "PayoutRequest"
    ADD CONSTRAINT "PayoutRequest_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE "Commission" c
SET "categoryId" = NULL
WHERE c."categoryId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Category" cat WHERE cat.id = c."categoryId");

DO $$ BEGIN
  ALTER TABLE "Commission"
    ADD CONSTRAINT "Commission_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
