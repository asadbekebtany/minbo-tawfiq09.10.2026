import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Foydalanuvchilar" };

export default async function AdminUsersPage() {
  const gate = await requireAdminPagePermission("/admin/users", "users.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="users.view" message={gate.message} />;
  }
  return <AdminUsersClient />;
}
