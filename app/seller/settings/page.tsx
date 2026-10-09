import { SellerSettingsClient } from "@/components/seller/seller-settings-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Do‘kon sozlamalari" };

export default async function SellerSettingsPage() {
  await requireSellerPage("/seller/settings");
  return <SellerSettingsClient />;
}
