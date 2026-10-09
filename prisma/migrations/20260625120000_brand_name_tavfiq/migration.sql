-- Yakuniy brend nomi: TAVFIQ
ALTER TABLE "SiteSetting" ALTER COLUMN "siteName" SET DEFAULT 'TAVFIQ';
ALTER TABLE "SiteSetting" ALTER COLUMN "siteShortName" SET DEFAULT 'TAVFIQ';

UPDATE "SiteSetting"
SET
  "siteName" = 'TAVFIQ',
  "siteShortName" = 'TAVFIQ',
  "email" = COALESCE(NULLIF("email", ''), 'info@tavfiq.uz'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'main';
