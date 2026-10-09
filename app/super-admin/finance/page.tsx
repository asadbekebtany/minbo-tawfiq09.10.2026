import { SuperAdminFinanceClient } from "@/components/super-admin/super-admin-finance-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Super Admin Moliya" };

export default async function SuperAdminFinancePage() {
  await requireSuperAdminPage("/super-admin/finance");
  return <SuperAdminFinanceClient />;
}
