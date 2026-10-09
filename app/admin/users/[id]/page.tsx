import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Shield, User as UserIcon } from "lucide-react";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getRoleLabel } from "@/lib/permissions";

export const metadata = { title: "Foydalanuvchi" };

type PageProps = { params: Promise<{ id: string }> };

const FALLBACK_USERS: Record<
  string,
  { name: string; phone: string; email: string | null; role: string; isActive: boolean; createdAt: string }
> = {
  "super-admin-id": {
    name: "Super Admin",
    phone: "+998712000000",
    email: "super@tavfiq.uz",
    role: "super_admin",
    isActive: true,
    createdAt: "2023-01-01",
  },
  "admin-id": {
    name: "Mahsulot Admin",
    phone: "+998712000001",
    email: "admin@tavfiq.uz",
    role: "admin",
    isActive: true,
    createdAt: "2023-01-01",
  },
  "seller-id": {
    name: "Sarvar Yusupov",
    phone: "+998712000002",
    email: null,
    role: "seller",
    isActive: true,
    createdAt: "2023-02-01",
  },
  "user-1-id": {
    name: "Aziz Karimov",
    phone: "+998901234567",
    email: null,
    role: "customer",
    isActive: true,
    createdAt: "2024-01-15",
  },
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const gate = await requireAdminPagePermission(`/admin/users/${id}`, "users.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="users.view" message={gate.message} />;
  }

  let user:
    | {
        id: string;
        name: string | null;
        phone: string | null;
        email: string | null;
        role: string;
        isActive: boolean;
        createdAt: Date;
        _count?: { orders: number };
        seller?: { store?: { name: string } | null } | null;
      }
    | undefined;

  let recentOrders: Array<{ id: string; status: string; total: number; createdAt: Date }> = [];

  if (await checkDatabaseConnection()) {
    user =
      (await prisma.user.findUnique({
        where: { id },
        include: {
          seller: { include: { store: true } },
          _count: { select: { orders: true } },
        },
      })) ?? undefined;
    if (user) {
      recentOrders = await prisma.order.findMany({
        where: { userId: id },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, total: true, createdAt: true },
      });
    }
  } else {
    const fallback = FALLBACK_USERS[id];
    if (fallback) {
      user = {
        id,
        name: fallback.name,
        phone: fallback.phone,
        email: fallback.email,
        role: fallback.role,
        isActive: fallback.isActive,
        createdAt: new Date(fallback.createdAt),
        _count: { orders: 0 },
      };
    }
  }

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#004733] hover:underline"
      >
        <ArrowLeft size={16} />
        Foydalanuvchilarga qaytish
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#002d21] text-xl font-bold text-[#f5b51b]">
            {(user.name ?? "U")[0]}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{user.name ?? "Foydalanuvchi"}</h1>
            <p className="text-sm text-gray-500">ID: {id}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <Phone size={14} /> Telefon
            </p>
            <p className="font-semibold text-gray-900">{user.phone ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <Shield size={14} /> Rol
            </p>
            <p className="font-semibold text-gray-900">{getRoleLabel(user.role as never)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <UserIcon size={14} /> Email
            </p>
            <p className="font-semibold text-gray-900">{user.email ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-1 text-xs text-gray-500">Buyurtmalar</p>
            <p className="font-semibold text-gray-900">{user._count?.orders ?? 0} ta</p>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-black text-gray-900">Buyurtmalar tarixi</h2>
          {recentOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
              Buyurtma yo‘q
            </p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm hover:border-[#f5b51b]/40"
                >
                  <span className="font-semibold text-[#004733]">#{order.id.slice(-8)}</span>
                  <span className="text-xs text-gray-500">{order.status}</span>
                  <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat("uz-UZ").format(order.total)} so‘m
                  </span>
                  <span className="text-xs text-gray-400">
                    {order.createdAt.toLocaleDateString("uz-UZ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {user.seller?.store?.name ? (
          <div className="mt-4 rounded-xl border border-[#f5b51b]/25 bg-[#fff8df] p-4 text-sm text-[#5d4700]">
            Do‘kon: <b>{user.seller.store.name}</b>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-gray-400">
          Ro‘yxatdan o‘tgan: {user.createdAt.toLocaleDateString("uz-UZ")}
          {!user.isActive ? " · Nofaol" : ""}
        </p>
      </div>
    </div>
  );
}
