import { AdminCouponsClient } from "@/components/admin/admin-coupons-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Kuponlar" };

export default async function CouponsPage() {
  const gate = await requireAdminPagePermission("/admin/coupons", "coupons.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="coupons.view" message={gate.message} />;
  }
  return <AdminCouponsClient />;
}
