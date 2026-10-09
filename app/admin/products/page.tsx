import { AdminProductsClient } from "@/components/admin/admin-products-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export default async function AdminProductsPage() {
  const gate = await requireAdminPagePermission("/admin/products", "products.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="products.view" message={gate.message} />;
  }
  return <AdminProductsClient />;
}
