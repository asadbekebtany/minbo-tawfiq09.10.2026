import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import { expirePendingOrders } from "@/lib/commerce/expire-orders";

export const dynamic = "force-dynamic";

export async function POST() {
  const { error } = await requirePermissionApi("orders.status");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const result = await expirePendingOrders();
  return NextResponse.json({ success: true, ...result });
}
