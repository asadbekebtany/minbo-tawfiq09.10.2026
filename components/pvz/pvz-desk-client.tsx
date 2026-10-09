"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatPrice } from "@/lib/utils";
import {
  PVZ_NEXT_ACTIONS,
  PVZ_PARCEL_STATUSES,
  PVZ_STATUS_LABELS,
  isPvzParcelStatus,
  type PvzParcelStatus,
} from "@/lib/pvz-state";

type Point = { id: string; name: string; address: string; district?: string | null; city?: string | null };

type ParcelListItem = {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  publicNumber: string | null;
  trackingNumber: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  sellerName: string | null;
  storeName: string | null;
  itemCount: number;
  itemSummary: string | null;
  orderStatus: string | null;
  hasOpenReturn?: boolean;
};

type ParcelDetail = ParcelListItem & {
  items: { name: string; quantity: number; price: number; sku: string | null; image: string | null }[];
  shipments: {
    id: string;
    trackingNumber: string;
    status: string;
    shippedAt: string | null;
    arrivedAt: string | null;
    deliveredAt: string | null;
  }[];
  timeline: { at: string; label: string; source: string }[];
  returns: {
    id: string;
    publicNumber: string | null;
    status: string;
    reason: string;
    comment: string | null;
    createdAt: string;
  }[];
};

const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Hammasi" },
  ...PVZ_PARCEL_STATUSES.map((status) => ({ id: status, label: PVZ_STATUS_LABELS[status] })),
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function visibleActions(status: PvzParcelStatus | null, hasOpenReturn: boolean) {
  if (!status) return [];
  return PVZ_NEXT_ACTIONS[status].filter(
    (action) => action.status !== "return_accepted" || hasOpenReturn,
  );
}

export function PvzDeskClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const pointParam = searchParams.get("pointId") ?? "";
  const parcelParam = searchParams.get("parcel") ?? "";
  const daysParam = searchParams.get("days") ?? "";

  const [qDraft, setQDraft] = useState(qParam);
  const [points, setPoints] = useState<Point[]>([]);
  const [parcels, setParcels] = useState<ParcelListItem[]>([]);
  const [assigned, setAssigned] = useState(true);
  const [canSearchPhone, setCanSearchPhone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [detail, setDetail] = useState<ParcelDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [ok, setOk] = useState("");
  const inFlight = useRef<Set<string>>(new Set());

  const setQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (qParam) params.set("q", qParam);
    if (statusParam) params.set("status", statusParam);
    if (pointParam) params.set("pointId", pointParam);
    if (daysParam === "7" || daysParam === "30") params.set("days", daysParam);
    try {
      const res = await fetch(`/api/pvz/parcels${params.toString() ? `?${params}` : ""}`, {
        cache: "no-store",
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Yuklab bo‘lmadi");
        setParcels([]);
        setPoints([]);
        return;
      }
      setError("");
      setPoints(data.points ?? []);
      setParcels(data.parcels ?? []);
      setAssigned(data.assigned !== false);
      setCanSearchPhone(Boolean(data.canSearchPhone));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Yuklab bo‘lmadi");
      setParcels([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [daysParam, pointParam, qParam, statusParam]);

  useEffect(() => {
    setQDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = qDraft.trim();
      if (next === qParam) return;
      setQuery({ q: next || null });
    }, 300);
    return () => window.clearTimeout(t);
  }, [qDraft, qParam, setQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loadDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await fetch(`/api/pvz/parcels?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setDetail(null);
        setDetailError(data.error ?? "Posilka topilmadi");
        return;
      }
      setDetail(data.parcel ?? null);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      setDetail(null);
      setDetailError("Posilka yuklanmadi");
    } finally {
      if (!signal?.aborted) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!parcelParam) {
      setDetail(null);
      setDetailError("");
      setDetailLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadDetail(parcelParam, controller.signal);
    return () => controller.abort();
  }, [loadDetail, parcelParam]);

  async function setStatus(parcelId: string, status: string) {
    if (inFlight.current.has(parcelId)) return;
    inFlight.current.add(parcelId);
    setBusyId(parcelId);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/pvz/parcels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? data.message ?? "Status o‘zgarmadi");
        return;
      }
      setOk("Holat yangilandi");
      window.setTimeout(() => setOk(""), 2500);
      await load();
      if (parcelParam === parcelId) await loadDetail(parcelId);
    } catch {
      setError("Status o‘zgarmadi");
    } finally {
      inFlight.current.delete(parcelId);
      setBusyId("");
    }
  }

  const headerPoint = useMemo(() => {
    if (pointParam) return points.find((p) => p.id === pointParam) ?? null;
    return points.length === 1 ? points[0] : null;
  }, [pointParam, points]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery({ q: qDraft.trim() || null });
  }

  const emptyReason = !assigned
    ? "Sizga PickupPoint biriktirilmagan."
    : qParam || statusParam || daysParam
      ? "Qidiruv yoki filter bo‘yicha posilka topilmadi."
      : "Hozircha posilka yo‘q.";

  const hasFilters = Boolean(qParam || statusParam || daysParam || pointParam);

  return (
    <div className="min-h-[100dvh] max-w-[100vw] overflow-x-clip bg-[#f4f6f5]">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#004733]">PVZ desk</p>
            <h1 className="truncate text-lg font-black text-gray-900 sm:text-xl">
              {headerPoint?.name ?? (points.length > 1 ? "Barcha punktlar" : "PVZ operator")}
            </h1>
            {headerPoint ? (
              <p className="truncate text-xs text-gray-500">{headerPoint.address}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
              onClick={() => void load()}
            >
              Yangilash
            </button>
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-5">
        <form onSubmit={submitSearch} className="mb-3 flex flex-wrap gap-2">
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder={
              canSearchPhone
                ? "Buyurtma raqami, tracking, telefon"
                : "Buyurtma raqami yoki tracking"
            }
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-[#004733] focus:ring-2"
          />
          {qDraft ? (
            <button
              type="button"
              className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600"
              onClick={() => {
                setQDraft("");
                setQuery({ q: null });
              }}
            >
              Tozalash
            </button>
          ) : null}
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[#004733] px-3 py-2.5 text-sm font-semibold text-white"
          >
            Qidir
          </button>
        </form>

        <div className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = statusParam === filter.id;
            return (
              <button
                key={filter.id || "all"}
                type="button"
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active ? "bg-[#004733] text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
                }`}
                onClick={() => setQuery({ status: filter.id || null })}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {(["", "7", "30"] as const).map((id) => (
            <button
              key={id || "all-days"}
              type="button"
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                daysParam === id ? "bg-[#004733] text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
              }`}
              onClick={() => setQuery({ days: id || null })}
            >
              {id === "" ? "Barcha sanalar" : `${id} kun`}
            </button>
          ))}
          {hasFilters ? (
            <button
              type="button"
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200"
              onClick={() => {
                setQDraft("");
                setQuery({ q: null, status: null, days: null, pointId: null });
              }}
            >
              Filterlarni tozalash
            </button>
          ) : null}
        </div>
        {points.length > 1 ? (
          <select
            value={pointParam}
            onChange={(e) => setQuery({ pointId: e.target.value || null })}
            className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Barcha punktlar</option>
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
              </option>
            ))}
          </select>
        ) : null}

        {ok ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {ok}
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" className="mt-1 text-xs font-semibold underline" onClick={() => void load()}>
              Qayta urinish
            </button>
          </div>
        ) : null}

        {loading ? (
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
            ))}
          </ul>
        ) : !error && parcels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
            {emptyReason}
          </div>
        ) : (
          <ul className="space-y-2">
            {parcels.map((parcel) => {
              const status = isPvzParcelStatus(parcel.status) ? parcel.status : null;
              const actions = visibleActions(status, Boolean(parcel.hasOpenReturn));
              return (
                <li key={parcel.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setQuery({ parcel: parcel.id })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900">
                          {parcel.publicNumber ?? parcel.orderId.slice(0, 10)}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {parcel.trackingNumber ? `Track: ${parcel.trackingNumber}` : "Tracking yo‘q"}
                          {parcel.buyerName ? ` · ${parcel.buyerName}` : ""}
                          {` · ${formatWhen(parcel.updatedAt)}`}
                        </p>
                        {parcel.itemSummary ? (
                          <p className="mt-1 truncate text-xs text-gray-600">
                            {parcel.itemSummary}
                            {parcel.itemCount > 1 ? ` · ${parcel.itemCount} dona` : ""}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#e8f3ef] px-2 py-1 text-[11px] font-semibold text-[#004733]">
                        {status ? PVZ_STATUS_LABELS[status] : parcel.status}
                      </span>
                    </div>
                  </button>
                  {actions.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          disabled={busyId === parcel.id}
                          className="min-h-10 flex-1 rounded-xl bg-[#004733] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:flex-none"
                          onClick={() => void setStatus(parcel.id, action.status)}
                        >
                          {busyId === parcel.id ? "..." : action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && parcels.length >= 80 ? (
          <p className="mt-3 text-center text-xs text-gray-400">Ko‘pi bilan 80 ta posilka ko‘rsatiladi.</p>
        ) : null}
      </div>

      {parcelParam ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Yopish"
            onClick={() => setQuery({ parcel: null })}
          />
              <aside className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto overflow-x-clip rounded-t-2xl bg-white p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:w-[min(420px,100vw)] md:max-h-none md:rounded-none">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-black">Posilka</h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-gray-500"
                onClick={() => setQuery({ parcel: null })}
              >
                Yopish
              </button>
            </div>
            {detailLoading || (parcelParam && !detail && !detailError) ? (
              <p className="text-sm text-gray-500">Yuklanmoqda...</p>
            ) : detailError ? (
              <p className="text-sm text-red-600">{detailError}</p>
            ) : detail ? (
              <ParcelDetailBody
                detail={detail}
                busy={busyId === detail.id}
                onStatus={(status) => void setStatus(detail.id, status)}
              />
            ) : (
              <p className="text-sm text-gray-500">Ma’lumot yo‘q.</p>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function ParcelDetailBody({
  detail,
  busy,
  onStatus,
}: {
  detail: ParcelDetail;
  busy: boolean;
  onStatus: (status: PvzParcelStatus) => void;
}) {
  const status = isPvzParcelStatus(detail.status) ? detail.status : null;
  const actions = visibleActions(status, Boolean(detail.hasOpenReturn));

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-1 gap-2">
        <Row label="Buyurtma" value={detail.publicNumber ?? detail.orderId} />
        <Row label="Tracking" value={detail.trackingNumber ?? "—"} />
        <Row label="Holat" value={status ? PVZ_STATUS_LABELS[status] : detail.status} />
        <Row label="Xaridor" value={detail.buyerName ?? "—"} />
        {detail.buyerPhone ? <Row label="Telefon" value={detail.buyerPhone} /> : null}
        <Row label="Sotuvchi" value={detail.storeName ?? detail.sellerName ?? "—"} />
        <Row label="Punkt" value={detail.pickupPointName} />
      </dl>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Mahsulotlar</h3>
        {detail.items.length === 0 ? (
          <p className="text-gray-500">Mahsulot yo‘q</p>
        ) : (
          <ul className="space-y-2">
            {detail.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.quantity} × {formatPrice(item.price)}
                  {item.sku ? ` · ${item.sku}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Yetkazish</h3>
        {detail.shipments.length === 0 ? (
          <p className="text-gray-500">Shipment yo‘q</p>
        ) : (
          <ul className="space-y-2">
            {detail.shipments.map((s) => (
              <li key={s.id} className="rounded-xl bg-gray-50 px-3 py-2 text-xs">
                <p className="font-semibold">{s.trackingNumber}</p>
                <p className="text-gray-500">{s.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Qaytarish</h3>
        {detail.returns.length === 0 ? (
          <p className="text-gray-500">Qaytarish yo‘q</p>
        ) : (
          <ul className="space-y-2">
            {detail.returns.map((r) => (
              <li key={r.id} className="rounded-xl bg-gray-50 px-3 py-2 text-xs">
                <p className="font-semibold">{r.publicNumber ?? r.id.slice(0, 8)} · {r.status}</p>
                <p className="text-gray-500">{r.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Timeline</h3>
        <ol className="space-y-2 border-l border-gray-200 pl-3">
          {detail.timeline.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <p className="font-medium">{event.label}</p>
              <p className="text-xs text-gray-500">{formatWhen(event.at)}</p>
            </li>
          ))}
        </ol>
      </section>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2 pb-6">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={busy}
              className="min-h-10 flex-1 rounded-xl bg-[#004733] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => onStatus(action.status)}
            >
              {busy ? "..." : action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-1">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-all">{value}</dd>
    </div>
  );
}
