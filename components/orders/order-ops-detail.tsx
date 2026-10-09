/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, MapPin, Package, Phone, User } from "lucide-react";
import { getOrderStatusMeta } from "@/lib/order-status";
import { formatPrice } from "@/lib/utils";
import type { OrderDetailRecord } from "@/lib/orders";

type OrderOpsDetailProps = {
  order: OrderDetailRecord;
  backHref: string;
  canUpdateStatus: boolean;
  patchUrl: string;
  statusOptions?: string[];
};

export function OrderOpsDetail({
  order: initialOrder,
  backHref,
  canUpdateStatus,
  patchUrl,
  statusOptions,
}: OrderOpsDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const statusMeta = getOrderStatusMeta(order.status);
  const contactName = order.address?.name ?? order.buyer?.name ?? "Foydalanuvchi";
  const contactPhone = order.address?.phone ?? order.buyer?.phone ?? "—";

  const saveStatus = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status }),
      });
      const data = (await response.json()) as { error?: string; order?: { status?: string } };
      if (!response.ok) throw new Error(data.error ?? "Status yangilanmadi");
      const nextStatus = data.order?.status ?? status;
      setOrder((prev) => ({ ...prev, status: nextStatus }));
      setStatus(nextStatus);
      setSaved(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status yangilanmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#004733] hover:underline"
      >
        <ArrowLeft size={16} />
        Orqaga
      </Link>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Status yangilandi
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#004733]">
              <Package size={18} />
              <h1 className="text-xl font-bold text-gray-900">{order.id}</h1>
            </div>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleString("uz-UZ")} · {order.store}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusMeta.color}`}>
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
              <User size={16} className="text-[#004733]" />
              Mijoz ma&apos;lumotlari
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Ism</dt>
                <dd className="font-semibold text-gray-900">{contactName}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Telefon</dt>
                <dd className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <Phone size={14} className="text-gray-400" />
                  <a href={`tel:${contactPhone}`} className="hover:text-[#004733] hover:underline">
                    {contactPhone}
                  </a>
                </dd>
              </div>
              {order.buyer?.id ? (
                <div>
                  <dt className="text-xs text-gray-500">Foydalanuvchi ID</dt>
                  <dd className="break-all text-xs text-gray-600">{order.buyer.id}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
              <MapPin size={16} className="text-[#004733]" />
              Yetkazish
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Usul</dt>
                <dd className="font-semibold text-gray-900">
                  {order.deliveryType === "pickup" ? "Olish punktidan" : "Kuryer"}
                </dd>
              </div>
              {order.deliveryType === "pickup" && order.pickupPoint ? (
                <>
                  <div>
                    <dt className="text-xs text-gray-500">Punkt</dt>
                    <dd className="font-semibold text-gray-900">{order.pickupPoint.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Manzil</dt>
                    <dd className="text-gray-700">{order.pickupPoint.address}</dd>
                  </div>
                  {order.pickupPoint.workHours ? (
                    <div>
                      <dt className="text-xs text-gray-500">Ish vaqti</dt>
                      <dd className="text-gray-700">{order.pickupPoint.workHours}</dd>
                    </div>
                  ) : null}
                </>
              ) : null}
              {order.address ? (
                <div>
                  <dt className="text-xs text-gray-500">Manzil</dt>
                  <dd className="text-gray-700">
                    {[
                      order.address.city,
                      order.address.district,
                      order.address.street,
                      order.address.building ? `uy ${order.address.building}` : null,
                      order.address.apartment ? `xonadon ${order.address.apartment}` : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-gray-500">To‘lov</dt>
                <dd className="font-semibold capitalize text-gray-900">
                  {order.paymentMethod}
                  {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {order.note ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">Izoh: </span>
            {order.note}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Mahsulotlar</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(order.subtotal ?? order.items.reduce((s, i) => s + i.price * i.quantity, 0))}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Yetkazish / chegirma</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(order.deliveryCost ?? 0)}
              {order.discount ? ` / −${formatPrice(order.discount)}` : ""}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Jami</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
          </div>
        </div>

        {canUpdateStatus ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <label className="text-sm font-semibold text-gray-700">
              Status yangilash
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 block min-w-[200px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              >
                {[
                  ...(statusOptions ?? [
                    "pending",
                    "paid",
                    "accepted",
                    "packing",
                    "shipped",
                    "ready_for_pickup",
                    "delivered",
                    "cancelled",
                    "returned",
                  ]),
                ].map((value) => (
                  <option key={value} value={value}>
                    {getOrderStatusMeta(value).label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void saveStatus()}
              disabled={saving || status === order.status}
              className="inline-flex items-center gap-2 rounded-xl bg-[#002d21] px-4 py-2.5 text-sm font-bold text-[#f5b51b] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <h2 className="font-bold text-gray-900">Mahsulotlar ({order.items.length})</h2>
          {order.items.map((item) => (
            <div
              key={`${item.productId}-${item.name}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-gray-300">
                    <Package size={22} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.quantity} ta × {formatPrice(item.price)}
                </p>
                <p className="mt-0.5 break-all text-[11px] text-gray-400">ID: {item.productId}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {order.skuLines?.length ? (
          <div className="mt-6 text-sm">
            <h2 className="mb-2 font-bold text-gray-900">SKU</h2>
            {order.skuLines.map((line) => (
              <p key={`${line.sku}-${line.name}`} className="text-gray-600">
                {line.name} · {line.sku ?? "—"} · {line.quantity} × {formatPrice(line.price)}
              </p>
            ))}
          </div>
        ) : null}

        {order.payments?.length ? (
          <div className="mt-6 text-sm">
            <h2 className="mb-2 font-bold text-gray-900">To‘lov</h2>
            {order.payments.map((p) => (
              <div key={p.id} className="mb-2 rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
                <p>
                  Provider: <span className="font-semibold">{p.method}</span> · status {p.status} /{" "}
                  {p.lifecycle}
                </p>
                <p>Summa: {formatPrice(p.amount)}</p>
                <p className="break-all text-xs">
                  transactionId: {p.transactionId ?? "—"}
                  {p.providerTransactionId ? ` · providerTx ${p.providerTransactionId}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  paidAt: {p.paidAt ? new Date(p.paidAt).toLocaleString("uz-UZ") : "—"} · refundedAt:{" "}
                  {p.refundedAt ? new Date(p.refundedAt).toLocaleString("uz-UZ") : "—"}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <p>Komissiya: {formatPrice(order.commissionAmount ?? 0)} ({order.commissionRate ?? 0}%)</p>
          <p>Seller tushum: {formatPrice(order.sellerRevenue ?? 0)}</p>
          <p>Tracking: {order.trackingNumber ?? "—"}</p>
          <p>Public: {order.publicNumber ?? order.id}</p>
        </div>

        {order.statusHistory?.length ? (
          <div className="mt-6 text-sm">
            <h2 className="mb-2 font-bold text-gray-900">Timeline</h2>
            {order.statusHistory.map((e, i) => (
              <p key={`${e.toStatus}-${i}`} className="text-gray-600">
                {e.fromStatus ?? "—"} → {e.toStatus} · {new Date(e.createdAt).toLocaleString("uz-UZ")}
              </p>
            ))}
          </div>
        ) : null}

        {order.returns?.length ? (
          <div className="mt-6 text-sm">
            <h2 className="mb-2 font-bold text-gray-900">Qaytarish / refund</h2>
            {order.returns.map((r) => (
              <p key={r.id} className="text-gray-600">
                {r.publicNumber ?? r.id} · {r.status}
              </p>
            ))}
          </div>
        ) : null}

        {order.ledger?.length ? (
          <div className="mt-6 text-sm">
            <h2 className="mb-2 font-bold text-gray-900">Ledger</h2>
            {order.ledger.map((l, i) => (
              <p key={`${l.type}-${i}`} className="text-gray-600">
                {l.type} · {formatPrice(l.amount)} · {l.description ?? ""}
              </p>
            ))}
          </div>
        ) : null}

        {order.audit?.length ? (
          <div className="mt-6 text-sm">
            <h2 className="mb-2 font-bold text-gray-900">Audit</h2>
            {order.audit.map((a, i) => (
              <p key={`${a.action}-${i}`} className="text-gray-600">
                {a.action} · {a.actorRole} · {new Date(a.createdAt).toLocaleString("uz-UZ")}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
