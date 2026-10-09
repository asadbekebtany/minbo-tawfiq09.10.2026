import { AdminSupportClient } from "@/components/admin/admin-support-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const gate = await requireAdminPagePermission("/admin/support", "tickets.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="tickets.view" message={gate.message} />;
  }
  return <AdminSupportClient />;
}
