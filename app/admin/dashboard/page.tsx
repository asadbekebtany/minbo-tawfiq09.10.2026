import Link from "next/link";
import { Users, ShoppingBag, Package, Store, DollarSign, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import {
  formatAdminStat,
  getAdminDashboardStats,
  getAdminPendingProducts,
  getAdminRecentOrders,
} from "@/lib/admin-stats";
import { getSiteSettings } from "@/lib/site-settings";
import { getAdminPanelSubtitle } from "@/lib/brand";
import { hasPermission } from "@/lib/permissions";
import { getAdminGranularRole } from "@/lib/admin-page-permission";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Admin Dashboard" };

const STATUS_CLR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  packing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LBL: Record<string, string> = {
  pending: "Yangi",
  accepted: "Qabul",
  packing: "Yig'ilmoqda",
  shipped: "Yo'lda",
  delivered: "Yetkazildi",
  cancelled: "Bekor",
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins || 1} min oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export default async function AdminDashboard() {
  const user = await requireAdminPage("/admin/dashboard");
  const adminRole = await getAdminGranularRole(user);
  const can = (perm: string) => {
    if (user.role === "super_admin") return true;
    if (!adminRole) return false;
    return hasPermission(adminRole, perm);
  };

  const [{ siteName }, stats, pendingProducts, recentOrders] = await Promise.all([
    getSiteSettings(),
    getAdminDashboardStats(),
    getAdminPendingProducts(5),
    getAdminRecentOrders(5),
  ]);

  const statCards = [
    {
      label: "Jami foydalanuvchilar",
      value: stats.fromDatabase ? fmt(stats.users) : "—",
      change: stats.fromDatabase ? "Database" : "DB ulanmagan",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Jami buyurtmalar",
      value: stats.fromDatabase ? fmt(stats.orders) : "—",
      change: stats.fromDatabase ? "Jami" : "—",
      icon: ShoppingBag,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Faol mahsulotlar",
      value: stats.fromDatabase ? fmt(stats.products) : "—",
      change: stats.fromDatabase ? `${stats.pendingProducts} ta kutmoqda` : "—",
      icon: Package,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Faol sotuvchilar",
      value: stats.fromDatabase ? fmt(stats.sellers) : "—",
      change: stats.fromDatabase ? "Faol" : "—",
      icon: Store,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Oylik daromad",
      value: stats.fromDatabase ? `${formatAdminStat(stats.monthlyRevenue)} so'm` : "—",
      change: stats.fromDatabase ? "Joriy oy" : "—",
      icon: DollarSign,
      color: "bg-pink-50 text-pink-600",
    },
    {
      label: "Komissiya (10%)",
      value: stats.fromDatabase ? `${formatAdminStat(Math.round(stats.monthlyRevenue * 0.1))} so'm` : "—",
      change: stats.fromDatabase ? "Taxminiy" : "—",
      icon: TrendingUp,
      color: "bg-teal-50 text-teal-600",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">{getAdminPanelSubtitle(siteName)}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={14} />
          {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {!stats.fromDatabase && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          PostgreSQL ulanmagan — statistika ko‘rsatilmaydi. DB ulangandan keyin ma’lumotlar avtomatik yangilanadi.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={16} />
            </div>
            <p className="text-lg font-black text-gray-900 leading-tight">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
            <p className="text-xs text-green-600 mt-1">{change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-gray-900">Tasdiqlash kutmoqda</h2>
            {pendingProducts.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingProducts.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {pendingProducts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Kutilayotgan mahsulot yo‘q</p>
            ) : (
              pendingProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100"
                >
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {product.storeName} · {timeAgo(product.createdAt)}
                    </p>
                  </div>
                  <ApproveProductButton productId={product.id} />
                </div>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/admin/sellers"
              className="flex-1 text-center text-xs py-2 bg-[#004733] text-white rounded-lg font-medium hover:bg-[#003a29] transition-colors"
            >
              Sotuvchilar
            </Link>
            <Link
              href="/admin/products"
              className="flex-1 text-center text-xs py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Mahsulotlar
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">So&apos;nggi buyurtmalar</h2>
            <Link href="/admin/orders" className="text-xs text-[#004733] hover:underline">
              Barchasi →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Buyurtmalar yo‘q</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["ID", "Xaridor", "Do'kon", "Summa", "Status"].map((h) => (
                      <th key={h} className="text-left pb-2 text-xs font-semibold text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 text-sm font-bold text-gray-900 truncate max-w-[100px]">
                        <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                          {o.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="py-2.5 text-sm text-gray-700">{o.buyer}</td>
                      <td className="py-2.5 text-xs text-gray-500">{o.store}</td>
                      <td className="py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {fmt(o.total)} so&apos;m
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            STATUS_CLR[o.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LBL[o.status] ?? o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { href: "/admin/products", label: "Mahsulotlar", perm: "products.view" },
          { href: "/admin/orders", label: "Buyurtmalar", perm: "orders.view" },
          { href: "/admin/sellers", label: "Sotuvchilar", perm: "sellers.view" },
          { href: "/admin/returns", label: "Qaytarishlar", perm: "returns.view" },
          { href: "/admin/support", label: "Support", perm: "tickets.view" },
          { href: "/admin/questions", label: "Savol-javob", perm: "questions.view" },
          { href: "/admin/users", label: "Foydalanuvchilar", perm: "users.view" },
          { href: "/admin/coupons", label: "Kuponlar", perm: "coupons.view" },
        ]
          .filter((item) => can(item.perm))
          .map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition-all hover:border-[#004733]/30 hover:shadow-md"
          >
            <p className="text-xs font-medium text-gray-700">{label}</p>
            {href === "/admin/sellers" && stats.pendingSellers > 0 ? (
              <p className="mt-1 text-[10px] text-orange-600">{stats.pendingSellers} ariza</p>
            ) : null}
            {href === "/admin/returns" && stats.pendingReturns > 0 ? (
              <p className="mt-1 text-[10px] text-orange-600">{stats.pendingReturns} kutmoqda</p>
            ) : null}
            {href === "/admin/support" && stats.openTickets > 0 ? (
              <p className="mt-1 text-[10px] text-orange-600">{stats.openTickets} ochiq</p>
            ) : null}
            {href === "/admin/questions" && stats.unansweredQuestions > 0 ? (
              <p className="mt-1 text-[10px] text-orange-600">{stats.unansweredQuestions} javobsiz</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
