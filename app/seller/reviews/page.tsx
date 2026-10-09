import { SellerReviewsClient } from "@/components/seller/seller-reviews-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Sharhlarga javob" };

export default async function SellerReviewsPage() {
  await requireSellerPage("/seller/reviews");
  return <SellerReviewsClient />;
}
