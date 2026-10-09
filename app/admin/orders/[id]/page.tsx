import { notFound } from "next/navigation";
import { canAccessOrder } from "@/lib/api-auth";
import { getOrderDetailById } from "@/lib/orders";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";
import { OrderOpsDetail } from "@/components/orders/order-ops-detail";

export const metadata = { title: "Buyurtma tafsilotlari" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const gate = await requireAdminPagePermission(`/admin/orders/${id}`, "orders.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="orders.view" message={gate.message} />;
  }

  const order = await getOrderDetailById(id);
  if (!order) notFound();

  if (!canAccessOrder(gate.user, order.userId, order.storeSellerUserId)) {
    notFound();
  }

  return (
    <OrderOpsDetail
      order={order}
      backHref="/admin/orders"
      canUpdateStatus
      patchUrl="/api/orders"
    />
  );
}
