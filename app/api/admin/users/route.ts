import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = await requirePermissionApi("users.view");
  if (error) return error;

  const source = await resolveDataSource();
  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  if (source === "fallback") {
    const fallbackUsers = [
      {
        id: "super-admin-id",
        name: "Super Admin",
        phone: "+998712000000",
        email: "super@tavfiq.uz",
        role: "super_admin",
        isActive: true,
        isBanned: false,
        createdAt: new Date("2023-01-01"),
        orders: 0,
        spent: 0,
      },
      {
        id: "admin-id",
        name: "Mahsulot Admin",
        phone: "+998712000001",
        email: "admin@tavfiq.uz",
        role: "admin",
        isActive: true,
        isBanned: false,
        createdAt: new Date("2023-01-01"),
        orders: 0,
        spent: 0,
      },
      {
        id: "seller-id",
        name: "Sarvar Yusupov",
        phone: "+998712000002",
        email: null,
        role: "seller",
        isActive: true,
        isBanned: false,
        createdAt: new Date("2023-02-01"),
        orders: 0,
        spent: 0,
      },
      {
        id: "user-1-id",
        name: "Aziz Karimov",
        phone: "+998901234567",
        email: null,
        role: "customer",
        isActive: true,
        isBanned: false,
        createdAt: new Date("2024-01-15"),
        orders: 2,
        spent: 1_850_000,
      },
    ];
    return NextResponse.json({ users: fallbackUsers });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(role && role !== "all" ? { role: role as never } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      seller: { include: { store: true } },
      admin: true,
      _count: { select: { orders: true } },
      orders: {
        where: { status: { notIn: ["cancelled", "returned"] } },
        select: { total: true },
      },
    },
  });

  const mapped = users.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    adminRole: user.admin?.role ?? null,
    isActive: user.isActive,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
    orders: user._count.orders,
    spent: user.orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
  }));

  return NextResponse.json({ users: mapped });
}
