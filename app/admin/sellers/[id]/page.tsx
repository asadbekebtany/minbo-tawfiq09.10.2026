import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { SellerOpsDetail } from "@/components/admin/seller-ops-detail";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const dynamic = "force-dynamic";

export default async function AdminSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireAdminPagePermission(`/admin/sellers/${id}`, "sellers.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="sellers.view" message={gate.message} />;
  }
  return <SellerOpsDetail sellerId={id} />;
}
