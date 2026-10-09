ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "eventKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_eventKey_key" ON "Notification"("eventKey");
