"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Loader2, Search } from "lucide-react";
import { ClientTablePager } from "@/components/ui/client-table-pager";
import { PortalMenu } from "@/components/ui/portal-menu";
import { ORDER_STATUS_OPTIONS } from "@/lib/order-status";
import type { OrderListRow } from "@/lib/orders";

const PAGE_SIZE = 50;

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

const OrdersTableRow = memo(function OrdersTableRow({
  order,
  status,
  open,
  updating,
  onToggleMenu,
  onCloseMenu,
  onUpdateStatus,
}: {
  order: OrderListRow;
  status: { label: string; color: string };
  open: boolean;
  updating: boolean;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <tr className="transition-colors hover:bg-gray-50">
      <td className="px-4 py-3">
        <Link
          href={`/admin/orders/${order.id}`}
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
      <td className="px-4 py-3 text-sm text-gray-700">{order.store}</td>
      <td className="px-4 py-3">
        <p className="line-clamp-2 max-w-36 text-sm text-gray-700">{order.product}</p>
        <p className="text-xs text-gray-400">{order.delivery}</p>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
          {order.payment}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">
        {fmt(order.total)} so'm
      </td>
      <td className="px-4 py-3">
        <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => onToggleMenu(order.id)}
          disabled={updating}
          className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200"
        >
          Status <ChevronDown size={11} />
        </button>
        <PortalMenu open={open} onClose={onCloseMenu} anchorRef={triggerRef} align="right">
          {ORDER_STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onUpdateStatus(order.id, s.value)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 ${
                order.status === s.value ? "font-bold text-[#cb11ab]" : "text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </PortalMenu>
      </td>
    </tr>
  );
});

export function AdminOrdersClient() {
  const [orders, setOrders] = useState<OrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"date" | "total">("date");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders?admin=true", {
        cache: "no-store",
        signal: signal ?? AbortSignal.timeout(12000),
      });
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
          ? `${first.name}${first.quantity > 1 ? ` ×${first.quantity}` : ""}${items.length > 1 ? ` +${items.length - 1}` : ""}`
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
    const hang = window.setTimeout(() => controller.abort(), 12000);
    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hang);
      controller.abort();
    };
  }, [load]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status }),
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
  }, []);

  const getStatus = (val: string) =>
    ORDER_STATUS_OPTIONS.find((s) => s.value === val) ?? {
      label: val,
      color: "bg-gray-100 text-gray-600",
    };

  const qNeedle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    const rows = orders.filter((o) => {
      const matchQ =
        !qNeedle ||
        o.id.toLowerCase().includes(qNeedle) ||
        o.buyer.toLowerCase().includes(qNeedle) ||
        o.store.toLowerCase().includes(qNeedle);
      const matchStatus = filterStatus === "all" || o.status === filterStatus;
      return matchQ && matchStatus;
    });
    return [...rows].sort((a, b) => (sort === "total" ? b.total - a.total : 0));
  }, [filterStatus, orders, qNeedle, sort]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled" && o.status !== "returned")
        .reduce((s, o) => s + o.total, 0),
    [orders],
  );

  useEffect(() => {
    setPage(1);
  }, [qNeedle, filterStatus]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#002d21]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Buyurtmalar boshqaruvi</h1>
        <button
          type="button"
          onClick={() => {
            const header = "id,buyer,phone,store,product,total,status,date,payment,delivery";
            const lines = filtered.map((o) =>
              [o.id, o.buyer, o.phone, o.store, o.product, o.total, o.status, o.date, o.payment, o.delivery]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(","),
            );
            const blob = new Blob([`${header}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "admin-orders.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Jami buyurtmalar", val: String(orders.length), color: "text-gray-900" },
          {
            label: "Yangi (pending)",
            val: String(orders.filter((o) => o.status === "pending").length),
            color: "text-yellow-600",
          },
          {
            label: "Yetkazildi",
            val: String(orders.filter((o) => o.status === "delivered").length),
            color: "text-green-600",
          },
          { label: "Jami summa", val: `${fmt(totalRevenue)} so'm`, color: "text-[#cb11ab]" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className={`text-xl font-black ${color}`}>{val}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, xaridor yoki do'kon..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-[#cb11ab] focus:outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="date">Sana</option>
          <option value="total">Summa</option>
        </select>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium ${
              filterStatus === "all"
                ? "border-[#cb11ab] bg-[#cb11ab] text-white"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            Barchasi ({orders.length})
          </button>
          {ORDER_STATUS_OPTIONS.slice(0, 5).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setFilterStatus(s.value)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium ${
                filterStatus === s.value
                  ? "border-[#cb11ab] bg-[#cb11ab] text-white"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {s.label} ({orders.filter((o) => o.status === s.value).length})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Buyurtma", "Xaridor", "Do'kon", "Mahsulot", "To'lov", "Summa", "Holat", "Amallar"].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map((order) => (
                <OrdersTableRow
                  key={order.id}
                  order={order}
                  status={getStatus(order.status)}
                  open={openMenu === order.id}
                  updating={updatingId === order.id}
                  onToggleMenu={(id) => setOpenMenu((current) => (current === id ? null : id))}
                  onCloseMenu={() => setOpenMenu(null)}
                  onUpdateStatus={updateStatus}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Buyurtmalar topilmadi</div>
          ) : null}
        </div>
        <ClientTablePager
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPage={setPage}
        />
      </div>
    </div>
  );
}
