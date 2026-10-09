import { SellerProductsClient } from "@/components/seller/seller-products-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Mahsulotlar" };

export default async function SellerProductsPage() {
  await requireSellerPage("/seller/products");
  return <SellerProductsClient />;
}
