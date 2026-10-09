-- Existing empty unique keys would collide on UNIQUE indexes.
-- Null/rewrite empties before relying on uniqueness in production.

UPDATE "Order"
SET "publicNumber" = NULL
WHERE "publicNumber" IS NOT NULL AND btrim("publicNumber") = '';

UPDATE "ReturnRequest"
SET "publicNumber" = NULL
WHERE "publicNumber" IS NOT NULL AND btrim("publicNumber") = '';

UPDATE "Payment"
SET "transactionId" = NULL
WHERE "transactionId" IS NOT NULL AND btrim("transactionId") = '';

UPDATE "PayoutRequest"
SET "publicNumber" = 'PAY-' || left("id", 10)
WHERE btrim("publicNumber") = '';

UPDATE "Shipment"
SET "trackingNumber" = "trackingNumber" || '-' || left("id", 6)
WHERE "id" IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "trackingNumber" ORDER BY "createdAt", id) AS rn
    FROM "Shipment"
  ) d WHERE d.rn > 1
);
