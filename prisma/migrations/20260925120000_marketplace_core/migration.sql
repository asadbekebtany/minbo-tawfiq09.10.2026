-- Marketplace core: roles, order/payment/stock, PVZ, audit, webhooks

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'pvz_operator';

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ready_for_shipment';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'in_transit';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'at_pickup_point';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'return_requested';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'return_approved';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'refund_pending';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'refunded';

ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'reserve';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'release';

ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'awaiting_item';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'received';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'inspection';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'refund_pending';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'product_create';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'product_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'product_delete';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'product_moderate';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'stock_adjust';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'payment_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'refund_create';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'payout_create';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'payout_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'seller_block';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'commission_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'category_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'webhook_received';

DO $$ BEGIN
  CREATE TYPE "PaymentLifecycleStatus" AS ENUM ('created', 'pending', 'paid', 'failed', 'cancelled', 'refund_pending', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductModerationStatus" AS ENUM ('draft', 'pending_moderation', 'active', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('requested', 'approved', 'processing', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShipmentStatus" AS ENUM ('created', 'packed', 'shipped', 'in_transit', 'arrived', 'delivered', 'returned', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnalyticsEventType" AS ENUM ('product_view', 'search', 'add_to_cart', 'checkout_started', 'order_created', 'payment_success', 'delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "damagedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "moderationStatus" "ProductModerationStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "warehouseCode" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "publicNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerRevenue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_publicNumber_key" ON "Order"("publicNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_storeId_idx" ON "Order"("storeId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "skuSnapshot" TEXT;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'UZS';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "lifecycle" "PaymentLifecycleStatus" NOT NULL DEFAULT 'created';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "rawResponse" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionId_key" ON "Payment"("transactionId");
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");

ALTER TABLE "PickupPoint" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "PickupPoint" ADD COLUMN IF NOT EXISTS "operatorId" TEXT;
CREATE INDEX IF NOT EXISTS "PickupPoint_operatorId_idx" ON "PickupPoint"("operatorId");

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReturnRequest" ADD COLUMN IF NOT EXISTS "publicNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ReturnRequest_publicNumber_key" ON "ReturnRequest"("publicNumber");

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldValue" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newValue" JSONB;

CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "OrderStatusEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT NOT NULL,
  "trackingNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromLabel" TEXT,
  "toLabel" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'created',
  "shippedAt" TIMESTAMP(3),
  "arrivedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");
CREATE INDEX IF NOT EXISTS "Shipment_orderId_idx" ON "Shipment"("orderId");

CREATE TABLE IF NOT EXISTS "PvzParcel" (
  "id" TEXT NOT NULL,
  "pickupPointId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'incoming',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PvzParcel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PvzParcel_pickupPointId_orderId_key" ON "PvzParcel"("pickupPointId", "orderId");

CREATE TABLE IF NOT EXISTS "PayoutRequest" (
  "id" TEXT NOT NULL,
  "publicNumber" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'requested',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutRequest_publicNumber_key" ON "PayoutRequest"("publicNumber");

CREATE TABLE IF NOT EXISTS "ProcessedWebhook" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedWebhook_provider_eventId_key" ON "ProcessedWebhook"("provider", "eventId");

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "type" "AnalyticsEventType" NOT NULL,
  "userId" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PvzParcel" ADD CONSTRAINT "PvzParcel_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
