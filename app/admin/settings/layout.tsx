import { requireSuperAdminPage } from "@/lib/page-auth";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdminPage("/admin/settings");
  return children;
}
