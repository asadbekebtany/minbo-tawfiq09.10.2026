import { SuperAdminReportsClient } from "@/components/super-admin/super-admin-reports-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Hisobotlar" };

export default async function SuperAdminReportsPage() {
  await requireSuperAdminPage("/super-admin/reports");
  return (
    <div className="mx-auto max-w-6xl">
      <SuperAdminReportsClient />
    </div>
  );
}
