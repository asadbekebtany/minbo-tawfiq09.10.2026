import { AdminReturnsClient } from "@/components/admin/admin-returns-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Qaytarishlar" };

export default async function AdminReturnsPage() {
  const gate = await requireAdminPagePermission("/admin/returns", "returns.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="returns.view" message={gate.message} />;
  }
  return <AdminReturnsClient />;
}
