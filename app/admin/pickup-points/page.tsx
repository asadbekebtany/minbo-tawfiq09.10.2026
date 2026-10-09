import { PickupPointsClient } from "@/components/admin/pickup-points-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Olish punktlari" };

export default async function AdminPickupPointsPage() {
  const gate = await requireAdminPagePermission("/admin/pickup-points", "pickup_points.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="pickup_points.view" message={gate.message} />;
  }
  return <PickupPointsClient />;
}
