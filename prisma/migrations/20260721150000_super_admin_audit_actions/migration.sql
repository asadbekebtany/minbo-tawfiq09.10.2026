-- AlterEnum: super admin panel amallari uchun yangi audit action turlari
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'admin_role_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'coupon_create';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'coupon_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'coupon_delete';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'support_ticket_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'return_status_update';
