import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkDatabaseConnection } from "@/lib/db";
import { effectiveRole, isSuperAdminSession } from "@/lib/demo-staff";
import { isAtLeast, type Role } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prisma";

export type PageSessionUser = {
  id: string;
  role: Role;
  name?: string | null;
  phone?: string | null;
};

function parseRole(value: unknown): Role {
  if (
    value === "customer" ||
    value === "seller" ||
    value === "pvz_operator" ||
    value === "admin" ||
    value === "super_admin"
  ) {
    return value;
  }
  return "customer";
}

export async function getPageSessionUser(): Promise<PageSessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as {
    id?: string;
    role?: string;
    name?: string | null;
    phone?: string | null;
  };
  if (!user.id) return null;

  let id = user.id;
  let role = parseRole(user.role);
  const phone = user.phone ?? null;

  if (await checkDatabaseConnection()) {
    const select = {
      id: true,
      role: true,
      phone: true,
      name: true,
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
      role = effectiveRole(parseRole(row.role), row.phone ?? phone, row.admin?.role);
    } else {
      role = effectiveRole(role, phone);
    }
  } else {
    role = effectiveRole(role, phone);
  }

  return {
    id,
    role,
    name: user.name,
    phone,
  };
}

export async function requirePageSession(fromPath: string): Promise<PageSessionUser> {
  const user = await getPageSessionUser();
  if (!user) redirect(`/login?from=${encodeURIComponent(fromPath)}`);
  return user;
}

export async function requireAdminPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (!isAtLeast(user.role, "admin")) redirect("/");
  return user;
}

export async function requireSuperAdminPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (isSuperAdminSession(user)) return user;
  redirect("/super-admin/login");
}

export async function requireSellerPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (user.role !== "seller" && user.role !== "admin" && user.role !== "super_admin") {
    const next = fromPath === "/seller" ? "/seller/dashboard" : fromPath;
    redirect(`/login?from=${encodeURIComponent(next)}`);
  }
  return user;
}

export async function requirePvzPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (user.role !== "pvz_operator" && user.role !== "admin" && user.role !== "super_admin") {
    redirect("/");
  }
  return user;
}
