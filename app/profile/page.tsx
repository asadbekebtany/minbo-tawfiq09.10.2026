import Link from "next/link";
import { Package, Heart, Star, RotateCcw, Car, ChevronRight } from "lucide-react";
import { getUserBonusBalance } from "@/lib/bonus";
import { checkDatabaseConnection } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { requirePageSession } from "@/lib/page-auth";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Profilim" };

const quickLinks = [
  { href: "/profile/orders", icon: Package, label: "Buyurtmalar", color: "bg-[#004733]/10 text-[#004733]" },
  { href: "/profile/favorites", icon: Heart, label: "Saralanganlar", color: "bg-red-50 text-red-500" },
  { href: "/profile/reviews", icon: Star, label: "Sharhlar", color: "bg-yellow-50 text-yellow-600" },
  { href: "/profile/returns", icon: RotateCcw, label: "Qaytarishlar", color: "bg-gray-50 text-gray-600" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  paid: "To'landi",
  shipped: "Yo'lda",
  delivered: "Yetkazildi",
  cancelled: "Bekor",
};

export default async function ProfilePage() {
  const user = await requirePageSession("/profile");
  const db = await checkDatabaseConnection();
  const orders = (await listOrders(user.id)).slice(0, 3);
  const bonusBalance = await getUserBonusBalance(user.id);
  const fmtBonus = new Intl.NumberFormat("uz-UZ").format(bonusBalance);

  let name = user.name ?? "Foydalanuvchi";
  let phone = user.phone ?? "";
  let favCount = 0;
  let reviewCount = 0;
  let returnCount = 0;
  let orderCount = orders.length;
  let cars: Array<{
    id: string;
    make: string;
    model: string;
    generation: string;
    generationId: string;
  }> = [];

  if (db) {
    try {
      const [dbUser, favorites, reviews, returns, allOrders, saved] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, select: { name: true, phone: true } }),
        prisma.favorite.count({ where: { userId: user.id } }),
        prisma.review.count({ where: { userId: user.id } }),
        prisma.returnRequest.count({ where: { userId: user.id } }),
        prisma.order.count({ where: { userId: user.id } }),
        prisma.savedCar.findMany({
          where: { userId: user.id },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { generation: { include: { model: { include: { make: true } } } } },
        }),
      ]);
      if (dbUser?.name) name = dbUser.name;
      if (dbUser?.phone) phone = dbUser.phone;
      favCount = favorites;
      reviewCount = reviews;
      returnCount = returns;
      orderCount = allOrders;
      cars = saved.map((row) => ({
        id: row.id,
        make: row.generation.model.make.name,
        model: row.generation.model.name,
        generation: row.generation.name,
        generationId: row.generationId,
      }));
    } catch {
      // session qiymatlari
    }
  }

  const counts: Record<string, number> = {
    "/profile/orders": orderCount,
    "/profile/favorites": favCount,
    "/profile/reviews": reviewCount,
    "/profile/returns": returnCount,
  };

  const initial = (name || "F").slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004733] to-[#003a29] text-3xl font-black text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{name}</h1>
            <p className="text-gray-500">{phone || "Telefon kiritilmagan"}</p>
            <span className="mt-1 inline-block rounded-full bg-[#004733]/10 px-2 py-0.5 text-xs font-medium text-[#004733]">
              Xaridor
            </span>
          </div>
          <Link href="/profile/settings" className="ml-auto shrink-0 text-sm text-[#004733] hover:underline">
            Tahrirlash
          </Link>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#f5b51b]/20 bg-gradient-to-r from-[#002d21] to-[#004733] p-4">
          <div>
            <p className="mb-1 text-xs text-gray-300">Bonus ballarim</p>
            <p className="text-2xl font-black text-[#f5b51b]">{fmtBonus}</p>
            <p className="text-xs text-gray-300">= {fmtBonus} so&apos;m</p>
          </div>
          <Link
            href="/catalog"
            className="rounded-lg bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-3 py-1.5 text-xs font-bold text-[#002d21] transition-all hover:from-[#ffc733] hover:to-[#f5b51b]"
          >
            Xarid qilish
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-black text-gray-900">{counts[href] ?? 0}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">So&apos;nggi buyurtmalar</h2>
          <Link href="/profile/orders" className="flex items-center gap-1 text-sm text-[#004733] hover:underline">
            Barchasi <ChevronRight size={14} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">Hali buyurtmalar yo‘q.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/profile/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.id.slice(0, 10)}…</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("uz-UZ")} · {order.items.length} ta mahsulot
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Avtomobillarim</h2>
          <Link href="/profile/cars" className="text-sm text-[#004733] hover:underline">
            + Qo&apos;shish
          </Link>
        </div>
        {cars.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <Car size={24} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Hali avtomobil qo&apos;shilmagan</p>
              <Link href="/profile/cars" className="text-xs text-[#004733] hover:underline">
                Avtomobil qo&apos;shish →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {cars.map((car) => (
              <Link
                key={car.id}
                href={`/catalog?generationId=${encodeURIComponent(car.generationId)}&carMake=${encodeURIComponent(car.make)}&carModel=${encodeURIComponent(car.model)}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50"
              >
                <Car size={18} className="text-[#004733]" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {car.make} {car.model}
                  </p>
                  <p className="text-xs text-gray-500">{car.generation}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
