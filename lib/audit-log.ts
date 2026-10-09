import "server-only";
import type { AuditAction, Prisma, Role } from "@prisma/client";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";

export type { AuditAction };

export type WriteAuditLogInput = {
  actorId: string;
  actorRole: Role | string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  user_role_update: "Foydalanuvchi roli o'zgartirildi",
  user_ban_update: "Foydalanuvchi blok holati o'zgartirildi",
  order_status_update: "Buyurtma statusi o'zgartirildi",
  site_settings_update: "Sayt sozlamalari yangilandi",
  auth_login: "Tizimga kirish",
  admin_role_update: "Admin roli o'zgartirildi",
  coupon_create: "Kupon yaratildi",
  coupon_update: "Kupon yangilandi",
  coupon_delete: "Kupon o'chirildi",
  support_ticket_update: "Support ticket yangilandi",
  return_status_update: "Qaytarish statusi o'zgartirildi",
  product_create: "Mahsulot yaratildi",
  product_update: "Mahsulot yangilandi",
  product_delete: "Mahsulot o'chirildi",
  product_moderate: "Mahsulot moderatsiyasi",
  stock_adjust: "Omborni o'zgartirish",
  payment_update: "To'lov yangilandi",
  refund_create: "Refund",
  payout_create: "Payout yaratildi",
  payout_update: "Payout yangilandi",
  seller_block: "Sotuvchi bloklandi",
  commission_update: "Komissiya o'zgardi",
  category_update: "Kategoriya o'zgardi",
  webhook_received: "Webhook qabul qilindi",
  warehouse_access_enabled: "Moy sklad access berildi",
  warehouse_access_disabled: "Moy sklad access yopildi",
  warehouse_access_extended: "Moy sklad muddati uzaytirildi",
};

export function getAuditContextFromRequest(request: Request) {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
  };
}

/** Audit yozuvini DB ga saqlash (DB yo'q bo'lsa jim o'tkaziladi) */
export async function writeAuditLog(
  input: WriteAuditLogInput,
  tx?: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const db = tx ?? prisma;
  if (!tx && !(await checkDatabaseConnection())) return;

  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole as Role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        oldValue: (input.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (input.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    if (tx) throw error;
    console.error("[audit-log] yozib bo'lmadi:", error);
  }
}

export type AuditLogListFilters = {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listAuditLogs(filters: AuditLogListFilters = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const q = filters.q?.trim();

  const where: Prisma.AuditLogWhereInput = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.entityId ? { entityId: filters.entityId } : {}),
    ...(q
      ? {
          OR: [
            { entityId: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
            { actor: { name: { contains: q, mode: "insensitive" } } },
            { actor: { phone: { contains: q, mode: "insensitive" } } },
            { actor: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: { id: true, name: true, phone: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}
