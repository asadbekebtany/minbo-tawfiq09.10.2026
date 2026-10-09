import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { isSuperAdminSession } from "@/lib/demo-staff";
import { requireAdminPage } from "@/lib/page-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage("/admin");

  if (isSuperAdminSession(user)) {
    return <SuperAdminShell userLabel={user.name ?? user.phone}>{children}</SuperAdminShell>;
  }

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-clip bg-[#f3f5f1]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-clip p-4 pl-14 lg:p-6">{children}</main>
    </div>
  );
}
