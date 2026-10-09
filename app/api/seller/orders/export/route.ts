import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null | undefined) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    include: {
      user: { select: { name: true, phone: true } },
      items: true,
      address: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const header = [
    "id",
    "sana",
    "status",
    "xaridor",
    "telefon",
    "mahsulotlar",
    "jami",
    "tolov",
    "yetkazish",
    "manzil",
  ];
  const lines = [
    header.join(","),
    ...orders.map((o) =>
      [
        csvEscape(o.id),
        csvEscape(o.createdAt.toISOString()),
        csvEscape(o.status),
        csvEscape(o.address?.name ?? o.user.name),
        csvEscape(o.address?.phone ?? o.user.phone),
        csvEscape(o.items.map((i) => `${i.name} x${i.quantity}`).join("; ")),
        csvEscape(o.total),
        csvEscape(o.paymentMethod),
        csvEscape(o.deliveryType),
        csvEscape(
          o.address
            ? [o.address.city, o.address.street, o.address.building, o.address.apartment]
                .filter(Boolean)
                .join(" ")
            : "",
        ),
      ].join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="buyurtmalar-${store.slug}.csv"`,
    },
  });
}
