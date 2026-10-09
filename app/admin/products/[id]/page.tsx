import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { ProductOpsDetail } from "@/components/admin/product-ops-detail";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireAdminPagePermission(`/admin/products/${id}`, "products.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="products.view" message={gate.message} />;
  }
  return <ProductOpsDetail productId={id} />;
}
