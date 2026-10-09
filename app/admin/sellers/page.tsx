"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Check, X, Ban, CheckCircle, Store } from "lucide-react";

type SellerStatus = "pending" | "approved" | "rejected" | "banned";

type Seller = {
  id: string;
  name: string;
  store: string;
  phone: string;
  email: string;
  status: SellerStatus;
  products: number;
  orders: number;
  revenue: number;
  commission: number;
  joinedAt: string;
  inn?: string;
};

const STATUS_CFG: Record<SellerStatus, { label: string; color: string }> = {
  pending: { label: "Ariza kutmoqda", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Faol", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rad etildi", color: "bg-red-100 text-red-700" },
  banned: { label: "Bloklangan", color: "bg-gray-100 text-gray-600" },
};

const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + " M" : new Intl.NumberFormat("uz-UZ").format(n);

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | SellerStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasRows = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!hasRows.current) setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/sellers", { cache: "no-store", signal });
      const data = (await response.json()) as { sellers?: Seller[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Yuklab bo‘lmadi");
      setSellers(data.sellers ?? []);
      hasRows.current = true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Yuklab bo‘lmadi");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject" | "ban" | "unban") => {
    setBusyId(id);
    try {
      const response = await fetch("/api/admin/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: id, action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Amaliyot bajarilmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Amaliyot bajarilmadi");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = sellers.filter((s) => {
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.store.toLowerCase().includes(q.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchQ && matchStatus;
  });

  const pending = sellers.filter((s) => s.status === "pending").length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-black text-gray-900">Sotuvchilar</h1>
        {pending > 0 && (
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pending} yangi ariza
          </span>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Jami sotuvchilar", val: sellers.length, c: "text-gray-900" },
          { label: "Faol", val: sellers.filter((s) => s.status === "approved").length, c: "text-green-600" },
          { label: "Ariza kutmoqda", val: pending, c: "text-orange-500" },
          {
            label: "Jami savdo",
            val: fmt(sellers.reduce((a, s) => a + s.revenue, 0)) + " so'm",
            c: "text-[#cb11ab]",
          },
        ].map(({ label, val, c }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className={`text-xl font-black ${c}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sotuvchi yoki do'kon nomi..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "approved", "rejected", "banned"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                filterStatus === s
                  ? "bg-[#cb11ab] text-white border-[#cb11ab]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {s === "all" ? "Barchasi" : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading && sellers.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">Yuklanmoqda...</div>
      ) : null}

      {sellers.filter((s) => s.status === "pending").length > 0 && filterStatus !== "approved" && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">⏳ Tasdiqlash kutilmoqda</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sellers
              .filter(
                (s) =>
                  s.status === "pending" &&
                  (!q ||
                    s.name.toLowerCase().includes(q.toLowerCase()) ||
                    s.store.toLowerCase().includes(q.toLowerCase())),
              )
              .map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-orange-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#cb11ab]/10 flex items-center justify-center">
                        <Store size={18} className="text-[#cb11ab]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.store}</p>
                        <p className="text-xs text-gray-500">{s.name}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      Yangi
                    </span>
                  </div>
                  <div className="space-y-1 mb-4 text-xs text-gray-600">
                    <p>📞 {s.phone}</p>
                    <p>📧 {s.email || "—"}</p>
                    {s.inn && <p>🏢 INN: {s.inn}</p>}
                    <p>📅 {s.joinedAt}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === s.id}
                      onClick={() => void act(s.id, "approve")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Tasdiqlash
                    </button>
                    <button
                      disabled={busyId === s.id}
                      onClick={() => void act(s.id, "reject")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <X size={13} /> Rad etish
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Do'kon", "Sotuvchi", "Mahsulotlar", "Buyurtmalar", "Savdo", "Komissiya", "Holat", "Amallar"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered
                .filter((s) => s.status !== "pending")
                .map((seller) => {
                  const st = STATUS_CFG[seller.status];
                  return (
                    <tr
                      key={seller.id}
                      className={`hover:bg-gray-50 transition-colors ${seller.status === "banned" ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#cb11ab]/10 flex items-center justify-center text-[#cb11ab] font-bold text-sm shrink-0">
                            {seller.store[0]}
                          </div>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            <Link href={`/admin/sellers/${seller.id}`} className="hover:text-[#cb11ab] hover:underline">
                              {seller.store}
                            </Link>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{seller.name}</p>
                        <p className="text-xs text-gray-400">{seller.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{seller.products}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{seller.orders}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                        {fmt(seller.revenue)} so&apos;m
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 whitespace-nowrap">
                        {fmt(seller.commission)} so&apos;m
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={busyId === seller.id}
                          onClick={() => void act(seller.id, seller.status === "banned" ? "unban" : "ban")}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50 ${
                            seller.status === "banned"
                              ? "bg-green-50 text-green-600 hover:bg-green-100"
                              : "bg-red-50 text-red-500 hover:bg-red-100"
                          }`}
                        >
                          {seller.status === "banned" ? (
                            <>
                              <CheckCircle size={12} /> Ochish
                            </>
                          ) : (
                            <>
                              <Ban size={12} /> Bloklash
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
