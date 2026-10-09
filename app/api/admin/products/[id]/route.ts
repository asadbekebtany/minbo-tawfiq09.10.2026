import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getProductAnalytics } from "@/lib/commerce/analytics";
import { listAuditLogs } from "@/lib/audit-log";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { error } = await requirePermissionApi("products.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      store: { include: { seller: { include: { user: { select: { phone: true, name: true } } } } } },
      reviews: { take: 10, orderBy: { createdAt: "desc" } },
    },
  });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
  const analytics = (await getProductAnalytics()).find((p) => p.productId === id) ?? null;
  const audit = await listAuditLogs({ entityId: id, limit: 30 });
  return NextResponse.json({ product, analytics, audit: audit.logs });
}
