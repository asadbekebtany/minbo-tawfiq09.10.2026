-- Idempotent patch: HeroSlide va SiteSetting jadvallari mavjud bo'lmasa yaratiladi.
-- Yangi o'rnatishlarda 20260624000000_init_schema allaqachon jadvallarni yaratadi.
CREATE TABLE IF NOT EXISTS "HeroSlide" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT,
  "discountText" TEXT,
  "buttonText" TEXT,
  "buttonUrl" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "siteName" TEXT NOT NULL DEFAULT 'TAVFIQ',
  "siteShortName" TEXT NOT NULL DEFAULT 'TAVFIQ',
  "tagline" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "freeDeliveryMin" INTEGER NOT NULL DEFAULT 500000,
  "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "primaryColor" TEXT NOT NULL DEFAULT '#002d21',
  "accentColor" TEXT NOT NULL DEFAULT '#f5b51b',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
