import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env.server";
import { checkDatabaseConnection } from "@/lib/db";
import { effectiveRole, isSuperAdminSession } from "@/lib/demo-staff";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prisma";
import {
  hasPermission,
  type AdminRoleType,
  type Role,
  ROLE_HIERARCHY,
} from "@/lib/permissions";

export type SessionUser = {
  id: string;
  role: Role;
  adminRole?: AdminRoleType | null;
  phone?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as { id?: string; role?: string; phone?: string };
  if (!user.id) return null;

  let id = user.id;
  let role = isRole(user.role) ? user.role : "customer";
  const phone = user.phone ?? null;

  if (await checkDatabaseConnection()) {
    const select = {
      id: true,
      role: true,
      phone: true,
      isBanned: true,
      isActive: true,
      admin: { select: { role: true } },
    } as const;

    let row = await prisma.user.findUnique({
      where: { id: user.id },
      select,
    });

    if (!row && phone) {
      row = await prisma.user.findUnique({
        where: { phone: normalizePhone(phone) },
        select,
      });
    }

    if (row) {
      if (row.isBanned || !row.isActive) return null;
      id = row.id;
      role = effectiveRole(
        isRole(row.role) ? row.role : "customer",
        row.phone ?? phone,
        row.admin?.role,
      );
    } else {
      role = effectiveRole(role, phone);
    }
  } else {
    role = effectiveRole(role, phone);
  }

  return { id, role, phone };
}

function isRole(value: unknown): value is Role {
  return (
    value === "customer" ||
    value === "seller" ||
    value === "pvz_operator" ||
    value === "admin" ||
    value === "super_admin"
  );
}

function isAdminRoleType(value: unknown): value is AdminRoleType {
  return (
    value === "super_admin" ||
    value === "product_manager" ||
    value === "order_manager" ||
    value === "seller_manager" ||
    value === "content_manager" ||
    value === "support_manager" ||
    value === "finance_manager"
  );
}

function unauthorized(message = "Avtorizatsiya talab qilinadi. Iltimos, tizimga kiring.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Bu amal uchun huquqingiz yetarli emas.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    return { error: unauthorized(), user: null as null };
  }
  return { error: null, user };
}

export function hasRole(user: SessionUser, allowedRoles: Role[]): boolean {
  if (isSuperAdminSession(user)) return true;
  return allowedRoles.includes(user.role);
}

export function isAtLeastRole(user: SessionUser, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

export async function requireRoleApi(allowedRoles: Role[]) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return { error, user: null as null };

  if (!hasRole(user, allowedRoles)) {
    return { error: forbidden(), user: null as null };
  }

  return { error: null, user };
}

export async function requireAdminApi() {
  if (serverEnv.lockAdminApi) {
    return {
      error: forbidden("Admin API vaqtincha bloklangan. LOCK_ADMIN_API qiymatini tekshiring"),
      user: null as null,
    };
  }

  return requireRoleApi(["admin", "super_admin"]);
}

export async function requireSuperAdminApi() {
  return requireRoleApi(["super_admin"]);
}

/** Admin granular permission (Admin.role jadvalidan). Super admin har doim o‘tadi. */
export async function requirePermissionApi(permission: string) {
  const { error, user } = await requireAdminApi();
  if (error || !user) {
    return { error, user: null as null, adminRole: null as AdminRoleType | null };
  }

  if (user.role === "super_admin" || isSuperAdminSession(user)) {
    return {
      error: null,
      user: { ...user, adminRole: "super_admin" as const },
      adminRole: "super_admin" as const,
    };
  }

  if (!(await checkDatabaseConnection())) {
    return {
      error: forbidden("Ma'lumotlar bazasi ulanmagan. Huquq tekshiruvi amalga oshmadi."),
      user: null as null,
      adminRole: null as AdminRoleType | null,
    };
  }

  const admin = await prisma.admin.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });
  if (!admin || !isAdminRoleType(admin.role)) {
    return {
      error: forbidden("Admin roli topilmadi."),
      user: null as null,
      adminRole: null as AdminRoleType | null,
    };
  }
  const adminRole = admin.role;

  if (!hasPermission(adminRole, permission)) {
    return {
      error: forbidden(`Huquq yetarli emas: ${permission}`),
      user: null as null,
      adminRole,
    };
  }

  return { error: null, user: { ...user, adminRole }, adminRole };
}

export async function requireSellerApi() {
  const result = await requireRoleApi(["seller", "admin", "super_admin"]);
  if (result.error || !result.user) return result;

  if (result.user.role === "seller" && (await checkDatabaseConnection())) {
    const seller = await prisma.seller.findUnique({
      where: { userId: result.user.id },
      select: { isBanned: true, isActive: true },
    });
    if (!seller || seller.isBanned || !seller.isActive) {
      return { error: forbidden("Sotuvchi hisobi faol emas yoki bloklangan."), user: null as null };
    }
  }

  return result;
}

export async function requirePvzApi() {
  return requireRoleApi(["pvz_operator", "admin", "super_admin"]);
}

export { canAccessOrder } from "@/lib/permissions";

export function canManageUserRole(currentUser: SessionUser, targetRole: Role): boolean {
  if (currentUser.role !== "super_admin") return false;
  if (targetRole === "super_admin" && currentUser.role !== "super_admin") return false;
  return true;
}
