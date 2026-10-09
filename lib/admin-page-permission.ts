import "server-only";

import { checkDatabaseConnection } from "@/lib/db";
import { isSuperAdminSession } from "@/lib/demo-staff";
import { hasPermission, type AdminRoleType } from "@/lib/permissions";
import { requireAdminPage, type PageSessionUser } from "@/lib/page-auth";
import prisma from "@/lib/prisma";

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

export type AdminPageGate =
  | { user: PageSessionUser; forbidden: false; adminRole: AdminRoleType | null }
  | { user: PageSessionUser; forbidden: true; message: string; adminRole: AdminRoleType | null };

/** Admin sahifa huquqi — `requirePermissionApi` bilan bir xil qoida. Auth core o‘zgarmaydi. */
export async function requireAdminPagePermission(
  fromPath: string,
  permission?: string | null,
): Promise<AdminPageGate> {
  const user = await requireAdminPage(fromPath);

  if (!permission) {
    return { user, forbidden: false, adminRole: null };
  }

  if (user.role === "super_admin" || isSuperAdminSession(user)) {
    return { user, forbidden: false, adminRole: "super_admin" };
  }

  if (!(await checkDatabaseConnection())) {
    return { user, forbidden: false, adminRole: null };
  }

  const admin = await prisma.admin.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });
  if (!admin || !isAdminRoleType(admin.role)) {
    return { user, forbidden: true, message: "Admin roli topilmadi.", adminRole: null };
  }
  if (!hasPermission(admin.role, permission)) {
    return {
      user,
      forbidden: true,
      message: `Huquq yetarli emas: ${permission}`,
      adminRole: admin.role,
    };
  }
  return { user, forbidden: false, adminRole: admin.role };
}

export async function getAdminGranularRole(
  user: PageSessionUser,
): Promise<AdminRoleType | null> {
  if (user.role === "super_admin" || isSuperAdminSession(user)) return "super_admin";
  if (!(await checkDatabaseConnection())) return null;
  const admin = await prisma.admin.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });
  return isAdminRoleType(admin?.role) ? admin.role : null;
}
