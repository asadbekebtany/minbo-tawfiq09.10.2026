import { NextResponse } from "next/server";
import { canAccessOrder, requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getOrderById } from "@/lib/orders";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;

  if (await checkDatabaseConnection()) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        store: { include: { seller: { select: { userId: true } } } },
        items: true,
        address: true,
        payments: true,
        shipments: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        returnRequests: true,
      },
    });
    if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    if (!canAccessOrder(user, order.userId, order.store.seller.userId)) {
      return NextResponse.json({ error: "Bu buyurtmani ko‘rish huquqingiz yo‘q" }, { status: 403 });
    }
    return NextResponse.json({ order });
  }

  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  if (!canAccessOrder(user, order.userId)) {
    return NextResponse.json({ error: "Bu buyurtmani ko‘rish huquqingiz yo‘q" }, { status: 403 });
  }
  return NextResponse.json({ order });
}
