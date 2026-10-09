import { SuperAdminCommissionsClient } from "@/components/super-admin/super-admin-commissions-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Komissiya" };

export default async function SuperAdminCommissionsPage() {
  await requireSuperAdminPage("/super-admin/commissions");
  return <SuperAdminCommissionsClient />;
}
