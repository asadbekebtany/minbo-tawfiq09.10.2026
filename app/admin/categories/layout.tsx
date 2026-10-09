import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export default async function AdminCategoriesLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdminPagePermission("/admin/categories", "categories.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="categories.view" message={gate.message} />;
  }
  return children;
}
