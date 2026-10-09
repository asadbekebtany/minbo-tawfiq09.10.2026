import { SellerReturnsClient } from "@/components/seller/seller-returns-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Qaytarishlar" };

export default async function SellerReturnsPage() {
  await requireSellerPage("/seller/returns");
  return <SellerReturnsClient />;
}
