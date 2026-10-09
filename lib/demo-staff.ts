import { normalizePhone } from "@/lib/phone";
import type { Role } from "@/lib/permissions";

export const DEMO_SUPER_ADMIN_PHONE = "+998712000000";

export const DEMO_PHONE_ROLES: Record<string, Role> = {
  "+998712000000": "super_admin",
  "+998712000001": "admin",
  "+998712000002": "seller",
  "+998712000006": "pvz_operator",
  "+998901234567": "customer",
  "+998911234567": "customer",
};

export function demoRoleForPhone(phone: string | null | undefined): Role | null {
  if (!phone) return null;
  return DEMO_PHONE_ROLES[normalizePhone(phone)] ?? null;
}

export function isDemoSuperAdminPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return normalizePhone(phone) === DEMO_SUPER_ADMIN_PHONE;
}

/** Productionda demo telefon orqali privilege yo‘q. */
export function allowDemoPhonePrivilege(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();
  return nodeEnv !== "production" && appEnv !== "production";
}

/** JWT / DB / Admin.role / demo telefon — Super Admin shaxsi. */
export function isSuperAdminSession(user: {
  role?: string | null;
  phone?: string | null;
  adminRole?: string | null;
}): boolean {
  if (user.role === "super_admin") return true;
  if (user.adminRole === "super_admin") return true;
  return allowDemoPhonePrivilege() && isDemoSuperAdminPhone(user.phone);
}

export function effectiveRole(
  role: Role,
  phone?: string | null,
  adminRole?: string | null,
): Role {
  if (isSuperAdminSession({ role, phone, adminRole })) return "super_admin";
  return role;
}
