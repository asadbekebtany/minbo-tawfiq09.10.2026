import { SellerOrdersClient } from "@/components/seller/seller-orders-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Buyurtmalar" };

export default async function SellerOrdersPage() {
  await requireSellerPage("/seller/orders");
  return <SellerOrdersClient />;
}
