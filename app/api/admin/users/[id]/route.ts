import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requireAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { userBanUpdateSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

const FALLBACK_USERS: Record<
  string,
  { id: string; name: string; phone: string; email: string | null; role: string; isActive: boolean; createdAt: string }
> = {
  "super-admin-id": {
    id: "super-admin-id",
    name: "Super Admin",
    phone: "+998712000000",
    email: "super@tavfiq.uz",
    role: "super_admin",
    isActive: true,
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  "admin-id": {
    id: "admin-id",
    name: "Mahsulot Admin",
    phone: "+998712000001",
    email: "admin@tavfiq.uz",
    role: "admin",
    isActive: true,
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  "seller-id": {
    id: "seller-id",
    name: "Sarvar Yusupov",
    phone: "+998712000002",
    email: null,
    role: "seller",
    isActive: true,
    createdAt: "2023-02-01T00:00:00.000Z",
  },
  "user-1-id": {
    id: "user-1-id",
    name: "Aziz Karimov",
    phone: "+998901234567",
    email: null,
    role: "customer",
    isActive: true,
    createdAt: "2024-01-15T00:00:00.000Z",
  },
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await context.params;

  if (await checkDatabaseConnection()) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        seller: { include: { store: true } },
        admin: true,
        _count: { select: { orders: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    return NextResponse.json({ user });
  }

  const user = FALLBACK_USERS[id];
  if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
  return NextResponse.json({ user: { ...user, _count: { orders: 0 } } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requireAdminApi();
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { isBanned } = userBanUpdateSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true, phone: true, name: true, isBanned: true },
    });
    if (!existing) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (existing.role === "super_admin") {
      return NextResponse.json({ error: "Super admin bloklanmaydi." }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned, isActive: !isBanned },
    });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "user_ban_update",
      entityType: "user",
      entityId: id,
      metadata: {
        targetUserId: id,
        targetPhone: existing.phone,
        targetName: existing.name,
        previousIsBanned: existing.isBanned,
        newIsBanned: isBanned,
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
