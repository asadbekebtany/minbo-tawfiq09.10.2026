import { SuperAdminOverviewClient } from "@/components/super-admin/super-admin-overview-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Super Admin Dashboard" };

export default async function SuperAdminDashboardPage() {
  await requireSuperAdminPage("/super-admin/dashboard");
  return (
    <div className="mx-auto max-w-6xl">
      <SuperAdminOverviewClient />
    </div>
  );
}
