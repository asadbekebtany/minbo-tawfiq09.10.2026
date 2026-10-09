import { SellerNotificationsClient } from "@/components/seller/seller-notifications-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Bildirishnomalar" };

export default async function SellerNotificationsPage() {
  await requireSellerPage("/seller/notifications");
  return <SellerNotificationsClient />;
}
