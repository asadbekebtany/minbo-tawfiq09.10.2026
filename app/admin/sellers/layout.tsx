import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export default async function AdminSellersLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdminPagePermission("/admin/sellers", "sellers.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="sellers.view" message={gate.message} />;
  }
  return children;
}
