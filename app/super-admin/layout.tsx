import { headers } from "next/headers";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { requireSuperAdminPage } from "@/lib/page-auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/super-admin/login" || pathname.startsWith("/super-admin/login/")) {
    return <>{children}</>;
  }

  const user = await requireSuperAdminPage("/super-admin");
  return <SuperAdminShell userLabel={user.name ?? user.phone}>{children}</SuperAdminShell>;
}
