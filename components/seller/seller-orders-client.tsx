"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Loader2, Search } from "lucide-react";
import { ORDER_STATUS_OPTIONS } from "@/lib/order-status";
import { SELLER_ALLOWED_ORDER_STATUSES } from "@/lib/order-state";
import type { OrderListRow } from "@/lib/orders";
import { PortalMenu } from "@/components/ui/portal-menu";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

function SellerStatusMenu({
  currentStatus,
  open,
  updating,
  onToggle,
  onClose,
  onUpdate,
}: {
  currentStatus: string;
  open: boolean;
  updating: boolean;
  onToggle: () => void;
  onClose: () => void;
  onUpdate: (status: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        disabled={updating}
        className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
      >
        Status <ChevronDown size={11} />
      </button>
      <PortalMenu open={open} onClose={onClose} anchorRef={triggerRef} align="right">
        {ORDER_STATUS_OPTIONS.filter((s) =>
          (SELLER_ALLOWED_ORDER_STATUSES as readonly string[]).includes(s.value),
        ).map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onUpdate(s.value)}
            className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 ${
              currentStatus === s.value ? "font-bold text-[#004733]" : "text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </PortalMenu>
    </>
  );
}

export function SellerOrdersClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/seller/orders", { cache: "no-store", signal });
      const data = (await response.json()) as {
        orders?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Buyurtmalarni yuklab bo‘lmadi");

      const rows: OrderListRow[] = (data.orders ?? []).map((order) => {
        const user = order.user as { name?: string; phone?: string } | undefined;
        const store = order.store as { name?: string } | string | undefined;
        const items = (order.items as Array<{ name: string; quantity: number }> | undefined) ?? [];
        const first = items[0];
        const product = first
          ? `${first.name}${first.quantity > 1 ? ` (×${first.quantity})` : ""}${
              items.length > 1 ? ` +${items.length - 1}` : ""
            }`
          : "—";

        return {
          id: String(order.id),
          userId: String(order.userId),
          buyer: user?.name ?? "Foydalanuvchi",
          phone: user?.phone ?? "—",
          store: typeof store === "string" ? store : store?.name ?? "—",
          product,
          total: Number(order.total ?? 0),
          status: String(order.status ?? "pending"),
          date: new Date(String(order.createdAt ?? Date.now())).toLocaleDateString("uz-UZ"),
          payment: String(order.paymentMethod ?? "cash"),
          delivery: String(order.deliveryType) === "pickup" ? "Punkt" : "Kuryer",
        };
      });

      setOrders(rows);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Buyurtmalarni yuklab bo‘lmadi");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/seller/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(12000),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Status yangilanmadi");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      setOpenMenu(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchQ =
      !q ||
      o.id.toLowerCase().includes(q.toLowerCase()) ||
      o.buyer.toLowerCase().includes(q.toLowerCase());
    return matchStatus && matchQ;
  });

  const getStatus = (val: string) =>
    ORDER_STATUS_OPTIONS.find((s) => s.value === val) ?? {
      label: val,
      color: "bg-gray-100 text-gray-600",
    };

  if (loading && orders.length === 0) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#004733]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Buyurtmalar</h1>
        <a
          href="/api/seller/orders/export"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <Download size={14} />
          CSV yuklab olish
        </a>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buyurtma ID yoki xaridor..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-[#004733] focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">Barcha statuslar</option>
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Buyurtma", "Xaridor", "Mahsulot", "Summa", "Status", "Amallar"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const st = getStatus(order.status);
                return (
                  <tr
                    key={order.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/seller/orders/${order.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/seller/orders/${order.id}`);
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/seller/orders/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-bold text-[#004733] hover:underline"
                      >
                        {order.id}
                      </Link>
                      <p className="text-xs text-gray-400">{order.date}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{order.buyer}</p>
                      <p className="text-xs text-gray-400">{order.phone}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-sm text-gray-700">{order.product}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {fmt(order.total)} so'm
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <SellerStatusMenu
                        currentStatus={order.status}
                        open={openMenu === order.id}
                        updating={updatingId === order.id}
                        onToggle={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                        onClose={() => setOpenMenu(null)}
                        onUpdate={(status) => void updateStatus(order.id, status)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Buyurtmalar topilmadi</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
