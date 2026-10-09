-- Warehouse EAN-13 barcode (global unique; NULLs allowed)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX IF NOT EXISTS "Product_barcode_idx" ON "Product"("barcode");
