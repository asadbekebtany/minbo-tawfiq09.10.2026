import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import { listSellerOrderRows } from "@/lib/orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;

  const source = await resolveDataSource();

  if (source === "database") {
    const where =
      user.role === "seller" ? { store: { seller: { userId: user.id } } } : undefined;
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        store: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  const rows = await listSellerOrderRows(user.id, user.role);
  const orders = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    total: row.total,
    status: row.status,
    paymentMethod: row.payment,
    deliveryType: row.delivery === "Punkt" ? "pickup" : "courier",
    createdAt: new Date().toISOString(),
    user: { name: row.buyer, phone: row.phone },
    store: { name: row.store },
    items: [{ name: row.product, quantity: 1 }],
  }));

  return NextResponse.json({ orders });
}
