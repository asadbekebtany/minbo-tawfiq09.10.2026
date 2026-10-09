/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, MapPin, Package, RotateCcw, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { OrderDetailRecord } from "@/lib/orders";

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

function formatOrderDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderDetailView({ order }: { order: OrderDetailRecord }) {
  const status = STATUS_MAP[order.status] ?? {
    label: order.status,
    color: "bg-gray-100 text-gray-700",
  };
  const tracking = order.trackingNumber ?? order.shipments?.[0]?.trackingNumber ?? null;
  const timeline = order.statusHistory?.length
    ? order.statusHistory
    : [{ fromStatus: null, toStatus: order.status, createdAt: order.createdAt }];

  return (
    <div className="space-y-4 overflow-x-clip">
      <Link
        href="/profile/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#004733] hover:underline"
      >
        <ArrowLeft size={16} />
        Buyurtmalarga qaytish
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#004733]">
              <Package size={18} />
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                {order.publicNumber ?? order.id}
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              {formatOrderDate(order.createdAt)} · {order.store}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Yetkazish</p>
            <p className="text-sm font-semibold text-gray-900">
              {order.deliveryType === "pickup" ? "Olish punktidan" : "Kuryer"}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">To‘lov</p>
            <p className="text-sm font-semibold capitalize text-gray-900">
              {order.paymentMethod}
              {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Jami summa</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Tracking</p>
            <p className="break-all text-sm font-semibold text-gray-900">{tracking ?? "Hali yo‘q"}</p>
          </div>
        </div>

        {order.pickupPoint ? (
          <div className="mt-4 rounded-xl border border-[#004733]/15 bg-[#004733]/5 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#002d21]">
              <MapPin size={16} /> PVZ / olish punkti
            </p>
            <p className="text-sm text-gray-800">{order.pickupPoint.name}</p>
            <p className="text-xs text-gray-500">{order.pickupPoint.address}</p>
            {order.pickupPoint.workHours ? (
              <p className="mt-1 text-xs text-gray-500">{order.pickupPoint.workHours}</p>
            ) : null}
            {order.pickupPoint.phone ? (
              <p className="text-xs text-gray-500">{order.pickupPoint.phone}</p>
            ) : null}
          </div>
        ) : null}

        {order.address ? (
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
            <p className="mb-1 font-semibold text-gray-900">Yetkazish manzili</p>
            <p className="text-gray-600">
              {order.address.city}
              {order.address.district ? `, ${order.address.district}` : ""}, {order.address.street}
              {order.address.building ? `, ${order.address.building}` : ""}
              {order.address.apartment ? `, ${order.address.apartment}` : ""}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {order.address.name} · {order.address.phone}
            </p>
          </div>
        ) : null}

        {order.shipments && order.shipments.length > 0 ? (
          <div className="mt-4 rounded-xl border border-gray-100 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Truck size={16} /> Jo‘natma
            </p>
            <div className="space-y-2">
              {order.shipments.map((s) => (
                <div key={s.trackingNumber} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-mono text-gray-800">{s.trackingNumber}</span>
                  <span className="text-gray-500">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="mb-3 font-bold text-gray-900">Holatlar tarixi</h2>
          <ol className="space-y-3 border-l-2 border-[#004733]/20 pl-4">
            {timeline.map((event, idx) => (
              <li key={`${event.toStatus}-${event.createdAt}-${idx}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#004733]" />
                <p className="text-sm font-medium text-gray-900">
                  {STATUS_MAP[event.toStatus]?.label ?? event.toStatus}
                </p>
                <p className="text-xs text-gray-500">{formatOrderDate(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="font-bold text-gray-900">Mahsulotlar</h2>
          {order.items.map((item, idx) => (
            <div key={`${item.productId}-${item.name}-${idx}`} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-gray-100 bg-gray-50 object-contain p-1"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-lg bg-gray-50 text-gray-400">
                  <Package size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.quantity} ta × {formatPrice(item.price)}
                  {order.skuLines?.[idx]?.sku ? ` · SKU ${order.skuLines[idx].sku}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex gap-2">
            {order.status === "delivered" && (
              <Link
                href="/profile/returns"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw size={12} />
                Qaytarish
              </Link>
            )}
          </div>
          <p className="font-bold text-gray-900">Jami: {formatPrice(order.total)}</p>
        </div>
      </div>
    </div>
  );
}
