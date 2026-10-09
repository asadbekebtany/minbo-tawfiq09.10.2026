import { SuperAdminAdminsClient } from "@/components/super-admin/super-admin-admins-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Adminlar" };

export default async function SuperAdminAdminsPage() {
  await requireSuperAdminPage("/super-admin/admins");
  return <SuperAdminAdminsClient />;
}
