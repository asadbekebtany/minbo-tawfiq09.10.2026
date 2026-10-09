import { SellerWarehouseClient } from "@/components/seller/seller-warehouse-client";
import { checkDatabaseConnection } from "@/lib/db";
import { requireSellerPage } from "@/lib/page-auth";
import { warehouseAccessForUser } from "@/lib/warehouse-access";

export const metadata = { title: "Moy sklad" };

export default async function SellerWarehousePage() {
  const user = await requireSellerPage("/seller/warehouse");
  let accessDenied = false;
  if (await checkDatabaseConnection()) {
    const { seller, access } = await warehouseAccessForUser(user);
    accessDenied = !seller || seller.isBanned || !seller.isActive || access.status !== "ACTIVE";
  }
  return <SellerWarehouseClient accessDenied={accessDenied} />;
}
