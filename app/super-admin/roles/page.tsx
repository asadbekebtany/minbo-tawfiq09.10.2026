import { AdminRolesClient } from "@/components/super-admin/admin-roles-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Admin rollari" };

export default async function SuperAdminRolesPage() {
  await requireSuperAdminPage("/super-admin/roles");
  return <AdminRolesClient />;
}
