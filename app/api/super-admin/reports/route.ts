import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import {
  getMarketplaceAnalytics,
  getProductAnalytics,
  getSellerAnalytics,
} from "@/lib/commerce/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const preset = searchParams.get("range") ?? "last30";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const view = searchParams.get("view") ?? "overview";

  if (view === "sellers") {
    return NextResponse.json({ sellers: await getSellerAnalytics() });
  }
  if (view === "products") {
    return NextResponse.json({ products: await getProductAnalytics() });
  }

  const overview = await getMarketplaceAnalytics(preset, from, to);
  return NextResponse.json(overview);
}
