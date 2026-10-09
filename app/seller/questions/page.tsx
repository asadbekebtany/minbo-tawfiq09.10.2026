import { SellerQuestionsClient } from "@/components/seller/seller-questions-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Savollarga javob" };

export default async function SellerQuestionsPage() {
  await requireSellerPage("/seller/questions");
  return <SellerQuestionsClient />;
}
