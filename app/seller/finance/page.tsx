import { SellerFinanceClient } from "@/components/seller/seller-finance-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Seller moliya" };

export default async function SellerFinancePage() {
  await requireSellerPage("/seller/finance");
  return <SellerFinanceClient />;
}
