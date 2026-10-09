import Link from "next/link";
import { Package, ChevronRight, RotateCcw } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import type { OrderRecord } from "@/lib/orders-store";

export const metadata = { title: "Buyurtmalarim" };

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Kutilmoqda", color: "bg-amber-100 text-amber-700" },
  paid: { label: "To'landi", color: "bg-[#004733]/10 text-[#004733]" },
  accepted: { label: "Qabul qilindi", color: "bg-emerald-100 text-emerald-700" },
  packing: { label: "Yig'ilmoqda", color: "bg-[#f5b51b]/20 text-[#9a6b00]" },
  shipped: { label: "Yo'lda", color: "bg-teal-100 text-teal-700" },
  ready_for_pickup: { label: "Tayyor", color: "bg-teal-100 text-teal-700" },
  delivered: { label: "Yetkazildi", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Bekor qilindi", color: "bg-red-100 text-red-700" },
  returned: { label: "Qaytarildi", color: "bg-gray-100 text-gray-700" },
};

const TABS = [
  { key: "all", label: "Barchasi" },
  { key: "active", label: "Faol" },
  { key: "delivered", label: "Yetkazildi" },
  { key: "cancelled", label: "Bekor" },
];

function filterOrders(orders: OrderRecord[], tab: string) {
  if (tab === "all") return orders;
  if (tab === "active") {
    return orders.filter(
      (order) => !["delivered", "cancelled", "returned"].includes(order.status),
    );
  }
  return orders.filter((order) => order.status === tab);
}

function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ProfileOrdersPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?from=/profile/orders");

  const sp = await searchParams;
  const tab = sp.status ?? "all";
  const orders = filterOrders(await listOrders(userId), tab);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Buyurtmalarim</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/profile/orders" : `/profile/orders?status=${t.key}`}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[#004733] text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <Package size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">Buyurtmalar yo‘q</p>
          <Link
            href="/catalog"
            className="mt-4 inline-block text-sm font-semibold text-[#004733] hover:underline"
          >
            Katalogga o‘tish
          </Link>
        </div>
      ) : (
        orders.map((order) => {
          const st = STATUS_MAP[order.status] ?? {
            label: order.status,
            color: "bg-gray-100 text-gray-700",
          };

          return (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
            >
              <Link
                href={`/profile/orders/${order.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.id}</p>
                    <p className="text-xs text-gray-500">
                      {formatOrderDate(order.createdAt)} · {order.store}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.color}`}>
                    {st.label}
                  </span>
                  <span className="hidden text-sm font-bold text-gray-900 sm:block">
                    {formatPrice(order.total)}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Link>

              {order.status === "delivered" && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <Link
                    href="/profile/returns"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#004733]"
                  >
                    <RotateCcw size={12} />
                    Qaytarish arizasi yuborish
                  </Link>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
