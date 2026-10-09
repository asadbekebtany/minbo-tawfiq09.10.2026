import { AdminFinanceClient } from "@/components/admin/admin-finance-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Moliya" };

export default async function AdminFinancePage() {
  const gate = await requireAdminPagePermission("/admin/finance", "finance.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="finance.view" message={gate.message} />;
  }
  return <AdminFinanceClient />;
}
