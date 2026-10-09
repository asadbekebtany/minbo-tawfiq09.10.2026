import { SuperAdminPlatformClient } from "@/components/super-admin/super-admin-platform-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Platforma sozlamalari" };

export default async function SuperAdminPlatformPage() {
  await requireSuperAdminPage("/super-admin/platform");
  return <SuperAdminPlatformClient />;
}
