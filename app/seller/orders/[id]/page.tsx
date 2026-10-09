import { notFound } from "next/navigation";
import { canAccessOrder } from "@/lib/api-auth";
import { getOrderDetailById } from "@/lib/orders";
import { requireSellerPage } from "@/lib/page-auth";
import { OrderOpsDetail } from "@/components/orders/order-ops-detail";
import { SELLER_ALLOWED_ORDER_STATUSES } from "@/lib/order-state";

export const metadata = { title: "Buyurtma tafsilotlari" };

type PageProps = { params: Promise<{ id: string }> };

export default async function SellerOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireSellerPage(`/seller/orders/${id}`);

  const order = await getOrderDetailById(id);
  if (!order) notFound();

  if (!canAccessOrder(user, order.userId, order.storeSellerUserId)) {
    notFound();
  }

  return (
    <OrderOpsDetail
      order={order}
      backHref="/seller/orders"
      canUpdateStatus={user.role === "seller" || user.role === "admin" || user.role === "super_admin"}
      patchUrl={`/api/seller/orders/${id}`}
      statusOptions={[order.status, ...SELLER_ALLOWED_ORDER_STATUSES].filter(
        (value, index, arr) => arr.indexOf(value) === index,
      )}
    />
  );
}
