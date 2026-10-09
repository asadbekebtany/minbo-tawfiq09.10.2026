import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import { notifyUser } from "@/lib/commerce/notify";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  sellerId: z.string().min(1),
  action: z.enum(["approve", "reject", "ban", "unban"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const { error } = await requirePermissionApi("sellers.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const sellers = await prisma.seller.findMany({
    include: {
      user: true,
      store: {
        include: {
          _count: { select: { products: true, orders: true } },
        },
      },
      application: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = await Promise.all(
    sellers.map(async (seller) => {
      const revenueAgg = seller.store
        ? await prisma.order.aggregate({
            where: {
              storeId: seller.store.id,
              status: { in: ["paid", "accepted", "packing", "shipped", "ready_for_pickup", "delivered"] },
            },
            _sum: { total: true, commissionAmount: true },
          })
        : { _sum: { total: null, commissionAmount: null } };

      let status: "pending" | "approved" | "rejected" | "banned" = "pending";
      if (seller.isBanned) status = "banned";
      else if (seller.application?.status === "rejected") status = "rejected";
      else if (seller.isActive || seller.application?.status === "approved") status = "approved";
      else status = "pending";

      return {
        id: seller.id,
        name: seller.application?.contactName || seller.user.name || "—",
        store: seller.store?.name || seller.application?.companyName || "—",
        phone: seller.application?.phone || seller.user.phone,
        email: seller.application?.email || "",
        status,
        products: seller.store?._count.products ?? 0,
        orders: seller.store?._count.orders ?? 0,
        revenue: revenueAgg._sum.total ?? 0,
        commission: revenueAgg._sum.commissionAmount ?? 0,
        joinedAt: seller.createdAt.toISOString().slice(0, 10),
        inn: seller.application?.inn ?? undefined,
        applicationId: seller.application?.id,
        userId: seller.userId,
      };
    }),
  );

  return NextResponse.json({ sellers: mapped });
}

export async function PATCH(request: Request) {
  const { error, user: actor } = await requirePermissionApi("sellers.approve");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  try {
    const data = patchSchema.parse(await request.json());
    const seller = await prisma.seller.findUnique({
      where: { id: data.sellerId },
      include: { application: true, store: true, user: true },
    });
    if (!seller) return NextResponse.json({ error: "Sotuvchi topilmadi" }, { status: 404 });

    const auditContext = getAuditContextFromRequest(request);

    if (data.action === "approve") {
      await prisma.$transaction(async (tx) => {
        await tx.seller.update({
          where: { id: seller.id },
          data: { isActive: true, isBanned: false },
        });
        await tx.user.update({
          where: { id: seller.userId },
          data: { role: "seller" },
        });
        if (seller.application) {
          await tx.sellerApplication.update({
            where: { id: seller.application.id },
            data: { status: "approved", rejectedReason: null },
          });
        }
        if (seller.store) {
          await tx.store.update({
            where: { id: seller.store.id },
            data: { isVerified: true },
          });
        }
        await writeAuditLog(
          {
            actorId: actor.id,
            actorRole: actor.role,
            action: "user_role_update",
            entityType: "seller",
            entityId: seller.id,
            metadata: { action: data.action, reason: data.reason ?? null, userId: seller.userId },
            ...auditContext,
          },
          tx,
        );
      });
    } else if (data.action === "reject") {
      await prisma.$transaction(async (tx) => {
        await tx.seller.update({
          where: { id: seller.id },
          data: { isActive: false },
        });
        if (seller.application) {
          await tx.sellerApplication.update({
            where: { id: seller.application.id },
            data: { status: "rejected", rejectedReason: data.reason || "Rad etildi" },
          });
        }
        await writeAuditLog(
          {
            actorId: actor.id,
            actorRole: actor.role,
            action: "user_role_update",
            entityType: "seller",
            entityId: seller.id,
            metadata: { action: data.action, reason: data.reason ?? null, userId: seller.userId },
            ...auditContext,
          },
          tx,
        );
      });
    } else if (data.action === "ban" || data.action === "unban") {
      await prisma.$transaction(async (tx) => {
        await tx.seller.update({
          where: { id: seller.id },
          data:
            data.action === "ban"
              ? { isBanned: true, isActive: false }
              : { isBanned: false, isActive: seller.application?.status === "approved" },
        });
        await writeAuditLog(
          {
            actorId: actor.id,
            actorRole: actor.role,
            action: "seller_block",
            entityType: "seller",
            entityId: seller.id,
            metadata: { action: data.action, reason: data.reason ?? null, userId: seller.userId },
            ...auditContext,
          },
          tx,
        );
        await notifyUser(tx, {
          userId: seller.userId,
          type: "system",
          title: data.action === "ban" ? "Hisob bloklandi" : "Blok olib tashlandi",
          message:
            data.action === "ban"
              ? "Sotuvchi hisobingiz bloklandi. Yangi mahsulot va buyurtma qabul qilinmaydi."
              : "Sotuvchi hisobingiz qayta faollashtirildi.",
          link: "/seller",
          eventKey: `seller-block:${seller.id}:${data.action}`,
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilab bo‘lmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
