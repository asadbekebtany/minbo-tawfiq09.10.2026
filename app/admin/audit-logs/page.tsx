import { AdminAuditLogsClient } from "@/components/admin/admin-audit-logs-client";
import { requireSuperAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Audit log" };

export default async function AdminAuditLogsPage() {
  await requireSuperAdminPage("/admin/audit-logs");
  return <AdminAuditLogsClient />;
}
