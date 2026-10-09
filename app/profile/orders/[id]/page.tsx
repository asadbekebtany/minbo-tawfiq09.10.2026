import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessOrder } from "@/lib/api-auth";
import { getOrderDetailById } from "@/lib/orders";
import { OrderDetailView } from "@/components/profile/order-detail-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Buyurtma tafsilotlari" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ProfileOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?from=/profile/orders/${id}`);
  }

  const order = await getOrderDetailById(id);
  if (!order) notFound();

  const user = session.user as { id?: string; role?: string };
  if (!user.id || !canAccessOrder({ id: user.id, role: user.role ?? "customer" }, order.userId)) {
    notFound();
  }

  return <OrderDetailView order={order} />;
}
