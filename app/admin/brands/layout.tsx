import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export default async function AdminBrandsLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdminPagePermission("/admin/brands", "brands.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="brands.view" message={gate.message} />;
  }
  return children;
}
