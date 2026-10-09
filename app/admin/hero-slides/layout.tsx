import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export default async function AdminHeroSlidesLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdminPagePermission("/admin/hero-slides", "banners.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="banners.view" message={gate.message} />;
  }
  return children;
}
