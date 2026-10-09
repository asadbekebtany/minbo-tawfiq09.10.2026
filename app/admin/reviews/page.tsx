import { AdminReviewsClient } from "@/components/admin/admin-reviews-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Sharhlar" };

export default async function AdminReviewsPage() {
  const gate = await requireAdminPagePermission("/admin/reviews", "reviews.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="reviews.view" message={gate.message} />;
  }
  return <AdminReviewsClient />;
}
