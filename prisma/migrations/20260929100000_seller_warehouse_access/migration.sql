-- Moy sklad access: Seller-level fields + audit actions only
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'warehouse_access_enabled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'warehouse_access_disabled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'warehouse_access_extended';

ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "warehouseAccessEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "warehouseAccessStartAt" TIMESTAMP(3);
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "warehouseAccessEndAt" TIMESTAMP(3);
