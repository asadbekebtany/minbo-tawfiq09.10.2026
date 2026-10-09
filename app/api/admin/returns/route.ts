import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = await requirePermissionApi("returns.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";

  const returns = await prisma.returnRequest.findMany({
    where:
      status && status !== "all"
        ? { status: status as "pending" | "approved" | "rejected" | "completed" }
        : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: {
        select: { id: true, total: true, store: { select: { name: true } } },
      },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({
    returns: returns.map((row) => ({
      id: row.id,
      reason: row.reason,
      comment: row.comment,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      user: row.user,
      orderId: row.order.id,
      orderTotal: row.order.total,
      storeName: row.order.store.name,
      items: row.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
      })),
    })),
  });
}
