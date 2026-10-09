import { AdminOrdersClient } from "@/components/admin/admin-orders-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Buyurtmalar" };

export default async function AdminOrdersPage() {
  const gate = await requireAdminPagePermission("/admin/orders", "orders.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="orders.view" message={gate.message} />;
  }
  return <AdminOrdersClient />;
}
