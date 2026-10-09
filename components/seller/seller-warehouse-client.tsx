"use client";

import { memo, useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Warehouse } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatPrice } from "@/lib/utils";
import { ean13Svg, isValidEan13 } from "@/lib/warehouse-barcode";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  oemNumber: string | null;
  category: string;
  categoryId: string;
  brand: string | null;
  brandId: string | null;
  supplier: string | null;
  costPrice: number;
  price: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
  total: number;
  status: string;
  updatedAt: string;
  image: string | null;
  low: boolean;
  archived?: boolean;
  barcode?: string | null;
  listedOnMarketplace?: boolean;
  moderationStatus?: string;
  marketplaceStatus?: "NOT_PUBLISHED" | "DRAFT" | "PENDING_MODERATION" | "ACTIVE" | "REJECTED";
  marketplaceProductId?: string | null;
};

type Stats = {
  products: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
  lowStock: number;
};

type HistoryRow = {
  id: string;
  kind: string;
  quantity: number;
  oldQuantity: number | null;
  newQuantity: number | null;
  actor: string;
  date: string;
  reason?: string | null;
  note: string | null;
};

type Option = { id: string; name: string };

const FILTERS = [
  ["all", "Barchasi"],
  ["available", "Mavjud"],
  ["low", "Kam qolgan"],
  ["out", "Tugagan"],
  ["reserved", "Reserved"],
  ["returned", "Returned"],
  ["damaged", "Damaged"],
  ["archived", "Archived"],
] as const;

const SORTS = [
  ["updated", "Yangilangan (yangi)"],
  ["name", "Nom A-Z"],
  ["stock_desc", "Available yuqori-past"],
  ["stock_asc", "Available past-yuqori"],
  ["price_desc", "Narx yuqori-past"],
  ["price_asc", "Narx past-yuqori"],
] as const;

const IN_REASONS = [
  ["yetkazib", "Yetkazib berish"],
  ["inventar", "Inventar correction"],
  ["boshqa", "Boshqa"],
] as const;

const OUT_REASONS = [
  ["ichki", "Ichki chiqim"],
  ["yoqolgan", "Yo‘qotilgan"],
  ["inventar", "Inventar correction"],
  ["boshqa", "Boshqa"],
] as const;

const HISTORY_KINDS = [
  ["all", "Barchasi"],
  ["in", "IN"],
  ["out", "OUT"],
  ["reserved", "RESERVED"],
  ["sold", "SOLD"],
  ["returned", "RETURNED"],
  ["damaged", "DAMAGED"],
] as const;

const emptyForm = {
  name: "",
  oemNumber: "",
  sku: "",
  categoryId: "",
  brandId: "",
  supplier: "",
  costPrice: "0",
  price: "0",
  stock: "0",
  image: "",
};

const STATUS_LABEL: Record<string, string> = {
  mavjud: "Mavjud",
  kam: "Kam qolgan",
  tugagan: "Tugagan",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("uz-UZ");
}

function errorFromHttp(res: Response, data: { error?: string; message?: string }) {
  if (data.error) return data.error;
  if (data.message) return data.message;
  if (res.status === 400) return "So‘rov noto‘g‘ri";
  if (res.status === 401) return "Kirish talab qilinadi";
  if (res.status === 403) return data.error || "Moy sklad access yo‘q";
  if (res.status === 404) return "Mahsulot topilmadi";
  if (res.status === 409) return "Amal bajarilmadi";
  if (res.status === 500) return "Server xatosi";
  if (res.status === 503) return "Database ulanmagan";
  return "Yuklanmadi";
}

const LABEL_COUNTS = [1, 10, 50] as const;

function BarcodeImage({ code }: { code: string }) {
  if (!isValidEan13(code)) {
    return <p className="text-sm text-red-600">Barcode noto‘g‘ri: {code}</p>;
  }
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-gray-100 bg-white p-2">
      <div
        className="inline-block max-w-full [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: ean13Svg(code, { width: 240, height: 72 }) }}
      />
    </div>
  );
}

const MARKETPLACE_STATUS_CLS: Record<string, string> = {
  NOT_PUBLISHED: "bg-gray-100 text-gray-600",
  DRAFT: "bg-sky-50 text-sky-800",
  PENDING_MODERATION: "bg-amber-50 text-amber-800",
  ACTIVE: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
};

function MarketplaceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex max-w-full break-all rounded-full px-2 py-0.5 text-[10px] font-bold ${
        MARKETPLACE_STATUS_CLS[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

function StatusBadge({ status, low }: { status: string; low: boolean }) {
  const label = STATUS_LABEL[status] ?? status;
  const cls =
    status === "tugagan"
      ? "bg-red-50 text-red-700"
      : low || status === "kam"
        ? "bg-amber-50 text-amber-800"
        : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
}

function StockPills({ p }: { p: ProductRow }) {
  return (
    <div className="flex flex-wrap gap-1 text-[10px]">
      <span className="rounded-md bg-gray-50 px-1.5 py-0.5">Av {p.available}</span>
      <span className="rounded-md bg-gray-50 px-1.5 py-0.5">Res {p.reserved}</span>
      <span className="rounded-md bg-gray-50 px-1.5 py-0.5">Sold {p.sold}</span>
      <span className="rounded-md bg-gray-50 px-1.5 py-0.5">Ret {p.returned}</span>
      <span className="rounded-md bg-gray-50 px-1.5 py-0.5">Dmg {p.damaged}</span>
      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-semibold">Σ {p.total}</span>
    </div>
  );
}

const ProductActions = memo(function ProductActions({
  p,
  busy,
  onView,
  onKirim,
  onChiqim,
  onDamaged,
  onHistory,
  onEdit,
  onArchive,
  onPublishMarketplace,
  onOpenMarketplace,
}: {
  p: ProductRow;
  busy: boolean;
  onView: (p: ProductRow) => void;
  onKirim: (p: ProductRow) => void;
  onChiqim: (p: ProductRow) => void;
  onDamaged: (p: ProductRow) => void;
  onHistory: (p: ProductRow) => void;
  onEdit: (p: ProductRow) => void;
  onArchive: (p: ProductRow) => void;
  onPublishMarketplace: (p: ProductRow) => void;
  onOpenMarketplace: (p: ProductRow) => void;
}) {
  const archived = Boolean(p.archived);
  const marketplaceStatus = p.marketplaceStatus ?? "NOT_PUBLISHED";
  const btn = "rounded-lg px-2 py-1 text-[11px] font-semibold disabled:opacity-50";
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {!archived && marketplaceStatus === "NOT_PUBLISHED" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onPublishMarketplace(p)}
          className={`${btn} bg-[#cb11ab] text-white`}
        >
          Marketplacega chiqarish
        </button>
      ) : null}
      {marketplaceStatus !== "NOT_PUBLISHED" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onOpenMarketplace(p)}
          className={`${btn} bg-sky-50 text-sky-800`}
        >
          Marketplace productni ochish
        </button>
      ) : null}
      <button type="button" disabled={busy} onClick={() => onView(p)} className={`${btn} bg-violet-50 text-violet-700`}>
        Ko‘rish
      </button>
      {archived ? null : (
        <>
          <button type="button" disabled={busy} onClick={() => onKirim(p)} className={`${btn} bg-green-50 text-green-700`}>
            Kirim
          </button>
          <button type="button" disabled={busy} onClick={() => onChiqim(p)} className={`${btn} bg-orange-50 text-orange-700`}>
            Chiqim
          </button>
          <button type="button" disabled={busy} onClick={() => onDamaged(p)} className={`${btn} bg-red-50 text-red-700`}>
            Damaged
          </button>
          <button type="button" disabled={busy} onClick={() => onEdit(p)} className={`${btn} bg-gray-100 text-gray-700`}>
            Tahrirlash
          </button>
        </>
      )}
      <button type="button" disabled={busy} onClick={() => onHistory(p)} className={`${btn} bg-gray-100 text-gray-700`}>
        History
      </button>
      {archived ? null : (
        <button type="button" disabled={busy} onClick={() => onArchive(p)} className={`${btn} bg-gray-100 text-gray-500`}>
          Archive
        </button>
      )}
    </div>
  );
});

const ProductRowView = memo(function ProductRowView({
  p,
  busy,
  onView,
  onKirim,
  onChiqim,
  onDamaged,
  onHistory,
  onEdit,
  onArchive,
  onPublishMarketplace,
  onOpenMarketplace,
}: {
  p: ProductRow;
  busy: boolean;
  onView: (p: ProductRow) => void;
  onKirim: (p: ProductRow) => void;
  onChiqim: (p: ProductRow) => void;
  onDamaged: (p: ProductRow) => void;
  onHistory: (p: ProductRow) => void;
  onEdit: (p: ProductRow) => void;
  onArchive: (p: ProductRow) => void;
  onPublishMarketplace: (p: ProductRow) => void;
  onOpenMarketplace: (p: ProductRow) => void;
}) {
  return (
    <tr className={p.status === "tugagan" ? "bg-red-50/40" : p.low ? "bg-amber-50/50" : undefined}>
      <td className="px-3 py-2">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gray-100 text-[10px] text-gray-400">—</div>
        )}
      </td>
      <td className="max-w-[160px] px-3 py-2 font-medium text-gray-900">{p.name}</td>
      <td className="px-3 py-2 text-gray-600">{p.oemNumber ?? "—"}</td>
      <td className="px-3 py-2 text-gray-600">{p.sku ?? "—"}</td>
      <td className="px-3 py-2 text-gray-600">{p.brand ?? "—"}</td>
      <td className={`px-3 py-2 font-bold ${p.low ? "text-amber-700" : "text-gray-900"}`}>{p.available}</td>
      <td className="px-3 py-2">{p.reserved}</td>
      <td className="px-3 py-2">{p.sold}</td>
      <td className="px-3 py-2">{p.returned}</td>
      <td className="px-3 py-2">{p.damaged}</td>
      <td className="whitespace-nowrap px-3 py-2 font-medium">{formatPrice(p.price)}</td>
      <td className="px-3 py-2">
        <StatusBadge status={p.status} low={p.low} />
      </td>
      <td className="px-3 py-2">
        <MarketplaceStatusBadge status={p.marketplaceStatus ?? "NOT_PUBLISHED"} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{formatWhen(p.updatedAt)}</td>
      <td className="px-3 py-2">
        <ProductActions
          p={p}
          busy={busy}
          onView={onView}
          onKirim={onKirim}
          onChiqim={onChiqim}
          onDamaged={onDamaged}
          onHistory={onHistory}
          onEdit={onEdit}
          onArchive={onArchive}
          onPublishMarketplace={onPublishMarketplace}
          onOpenMarketplace={onOpenMarketplace}
        />
      </td>
    </tr>
  );
});

const ProductCard = memo(function ProductCard({
  p,
  busy,
  onView,
  onKirim,
  onChiqim,
  onDamaged,
  onHistory,
  onEdit,
  onArchive,
  onPublishMarketplace,
  onOpenMarketplace,
}: {
  p: ProductRow;
  busy: boolean;
  onView: (p: ProductRow) => void;
  onKirim: (p: ProductRow) => void;
  onChiqim: (p: ProductRow) => void;
  onDamaged: (p: ProductRow) => void;
  onHistory: (p: ProductRow) => void;
  onEdit: (p: ProductRow) => void;
  onArchive: (p: ProductRow) => void;
  onPublishMarketplace: (p: ProductRow) => void;
  onOpenMarketplace: (p: ProductRow) => void;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-3">
      <div className="flex min-w-0 gap-3">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gray-100 text-[10px] text-gray-400">
            —
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 truncate font-semibold text-gray-900">{p.name}</p>
            <StatusBadge status={p.status} low={p.low} />
          </div>
          <div className="mt-1 min-w-0">
            <MarketplaceStatusBadge status={p.marketplaceStatus ?? "NOT_PUBLISHED"} />
          </div>
          <p className="text-xs text-gray-500">
            {p.oemNumber ?? "—"} · {p.sku ?? "—"} · {p.brand ?? "—"}
          </p>
          <p className="mt-0.5 text-xs font-medium">{formatPrice(p.price)}</p>
        </div>
      </div>
      <div className="mt-2">
        <StockPills p={p} />
      </div>
      <p className="mt-1 text-[10px] text-gray-400">{formatWhen(p.updatedAt)}</p>
      <div className="mt-2 min-w-0">
        <ProductActions
          p={p}
          busy={busy}
          onView={onView}
          onKirim={onKirim}
          onChiqim={onChiqim}
          onDamaged={onDamaged}
          onHistory={onHistory}
          onEdit={onEdit}
          onArchive={onArchive}
          onPublishMarketplace={onPublishMarketplace}
          onOpenMarketplace={onOpenMarketplace}
        />
      </div>
    </article>
  );
});

function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Yopish" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative z-[81] max-h-[90vh] w-full overflow-y-auto overflow-x-clip rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl ${
          wide ? "sm:max-w-xl" : "sm:max-w-lg"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Yopish
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SellerWarehouseClient({ accessDenied = false }: { accessDenied?: boolean }) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("updated");
  const [busy, setBusy] = useState(false);
  const hasRows = useRef(false);

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductRow | null>(null);
  const [stockMode, setStockMode] = useState<"in" | "out" | "damaged" | null>(null);
  const [qty, setQty] = useState("1");
  const [inReason, setInReason] = useState<(typeof IN_REASONS)[number][0]>("yetkazib");
  const [outReason, setOutReason] = useState<(typeof OUT_REASONS)[number][0]>("ichki");
  const [note, setNote] = useState("");
  const requestIdRef = useRef<string>("");

  const [historyProduct, setHistoryProduct] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyKind, setHistoryKind] = useState<(typeof HISTORY_KINDS)[number][0]>("all");
  const historyAbort = useRef<AbortController | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<ProductRow | null>(null);

  const [detail, setDetail] = useState<ProductRow | null>(null);
  const [detailMoves, setDetailMoves] = useState<HistoryRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [scanQ, setScanQ] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [labelCount, setLabelCount] = useState<(typeof LABEL_COUNTS)[number]>(1);
  const [labelBusy, setLabelBusy] = useState<"generate" | "print" | "pdf" | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!hasRows.current) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: debouncedQ, filter, sort });
        const res = await fetch(`/api/seller/stock?${params}`, { cache: "no-store", signal });
        const data = (await res.json()) as { products?: ProductRow[]; stats?: Stats; error?: string; message?: string };
        if (!res.ok) throw new Error(errorFromHttp(res, data));
        setProducts(data.products ?? []);
        setStats(data.stats ?? null);
        hasRows.current = true;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Yuklanmadi");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [debouncedQ, filter, sort],
  );

  useEffect(() => {
    if (accessDenied) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [accessDenied, load]);

  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(null), 2500);
    return () => window.clearTimeout(t);
  }, [ok]);

  const loadMeta = useCallback(async () => {
    if (categories.length && brands.length) return;
    const [catRes, brandRes] = await Promise.all([
      fetch("/api/categories?active=true", { cache: "no-store" }),
      fetch("/api/brands?active=true", { cache: "no-store" }),
    ]);
    if (catRes.ok) {
      const data = (await catRes.json()) as { categories?: Option[] };
      setCategories(data.categories ?? []);
    }
    if (brandRes.ok) {
      const data = (await brandRes.json()) as { brands?: Option[] };
      setBrands(data.brands ?? []);
    }
  }, [categories.length, brands.length]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", "products");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string; message?: string };
      if (!res.ok || !data.url) throw new Error(errorFromHttp(res, data));
      setForm((prev) => ({ ...prev, image: data.url as string }));
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Rasm yuklanmadi");
    } finally {
      setUploading(false);
    }
  };

  const submitStock = async () => {
    if (!stockTarget || !stockMode || busy) return;
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFormError("Miqdor musbat butun son bo‘lsin");
      return;
    }
    if ((stockMode === "out" || stockMode === "damaged") && quantity > stockTarget.available) {
      setFormError("Available’dan ko‘p chiqim qilib bo‘lmaydi");
      return;
    }
    const reason =
      stockMode === "out"
        ? (OUT_REASONS.find((r) => r[0] === outReason)?.[1] ?? outReason)
        : stockMode === "in"
          ? (IN_REASONS.find((r) => r[0] === inReason)?.[1] ?? inReason)
          : "Shikastlangan";
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/seller/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: stockTarget.id,
          type: stockMode,
          quantity,
          reason,
          note: note.trim() || null,
          requestId: requestIdRef.current || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string; duplicate?: boolean };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      setOk(
        data.duplicate
          ? "Bu amal allaqachon saqlangan"
          : stockMode === "in"
            ? "Kirim saqlandi"
            : stockMode === "out"
              ? "Chiqim saqlandi"
              : "Damaged saqlandi",
      );
      setStockTarget(null);
      setStockMode(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  };

  const submitAdd = async () => {
    if (busy) return;
    setFormError(null);
    if (!form.name.trim()) return setFormError("Nom majburiy");
    if (!form.oemNumber.trim()) return setFormError("Artikul majburiy");
    if (!form.sku.trim()) return setFormError("SKU majburiy");
    if (!form.categoryId) return setFormError("Kategoriya majburiy");
    const costPrice = Number(form.costPrice);
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (costPrice < 0 || price < 0) return setFormError("Narx manfiy bo‘lmasin");
    if (stock < 0) return setFormError("Stock manfiy bo‘lmasin");
    setBusy(true);
    try {
      const res = await fetch("/api/seller/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          oemNumber: form.oemNumber.trim(),
          sku: form.sku.trim(),
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          supplier: form.supplier.trim() || null,
          costPrice,
          price,
          stock,
          image: form.image || null,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      setOk("Mahsulot skladga qo‘shildi");
      setAddOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editProduct || busy) return;
    setFormError(null);
    if (!form.name.trim()) return setFormError("Nom majburiy");
    if (!form.categoryId) return setFormError("Kategoriya majburiy");
    const costPrice = Number(form.costPrice);
    const price = Number(form.price);
    if (costPrice < 0 || price < 0) return setFormError("Narx manfiy bo‘lmasin");
    setBusy(true);
    try {
      const res = await fetch("/api/seller/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: editProduct.id,
          name: form.name.trim(),
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          supplier: form.supplier.trim() || null,
          costPrice,
          price,
          image: form.image || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      setOk("Mahsulot yangilandi");
      setEditProduct(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  };

  const submitArchive = async () => {
    if (!archiveTarget || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/seller/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: archiveTarget.id, archive: true }),
      });
      const data = (await res.json()) as { error?: string; message?: string; duplicate?: boolean };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      setOk(data.duplicate ? "Allaqachon arxivlangan" : "Mahsulot arxivlandi");
      setArchiveTarget(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Arxivlanmadi");
    } finally {
      setBusy(false);
    }
  };

  const openKirim = useCallback((row: ProductRow) => {
    requestIdRef.current = crypto.randomUUID();
    setStockTarget(row);
    setStockMode("in");
    setQty("1");
    setInReason("yetkazib");
    setNote("");
    setFormError(null);
  }, []);

  const openChiqim = useCallback((row: ProductRow) => {
    requestIdRef.current = crypto.randomUUID();
    setStockTarget(row);
    setStockMode("out");
    setQty("1");
    setOutReason("ichki");
    setNote("");
    setFormError(null);
  }, []);

  const openDamaged = useCallback((row: ProductRow) => {
    requestIdRef.current = crypto.randomUUID();
    setStockTarget(row);
    setStockMode("damaged");
    setQty("1");
    setNote("");
    setFormError(null);
  }, []);

  const openEdit = useCallback(
    (row: ProductRow) => {
      setEditProduct(row);
      setForm({
        name: row.name,
        oemNumber: row.oemNumber ?? "",
        sku: row.sku ?? "",
        categoryId: row.categoryId,
        brandId: row.brandId ?? "",
        supplier: row.supplier ?? "",
        costPrice: String(row.costPrice),
        price: String(row.price),
        stock: String(row.available),
        image: row.image ?? "",
      });
      setFormError(null);
      void loadMeta();
    },
    [loadMeta],
  );

  const openArchive = useCallback((row: ProductRow) => {
    setArchiveTarget(row);
    setFormError(null);
  }, []);

  const openMarketplace = useCallback(
    (p: ProductRow) => {
      const id = p.marketplaceProductId ?? p.id;
      router.push(`/seller/products/${id}/edit`);
    },
    [router],
  );

  const publishMarketplace = useCallback(
    async (p: ProductRow) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setOk(null);
      try {
        const res = await fetch("/api/seller/stock/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: p.id }),
        });
        let data: {
          productId?: string;
          editPath?: string;
          alreadyListed?: boolean;
          error?: string;
          message?: string;
        } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          throw new Error(errorFromHttp(res, {}));
        }
        if (res.status === 409 && (data.productId || data.alreadyListed)) {
          setError(data.error ?? "Marketplace product allaqachon mavjud");
          await load();
          return;
        }
        if (!res.ok) throw new Error(errorFromHttp(res, data));
        if (!data.productId) throw new Error("Draft yaratilmadi");
        setOk("Marketplace draft yaratildi");
        await load();
        router.push(data.editPath ?? `/seller/products/${data.productId}/edit`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Marketplace draft yaratilmadi");
      } finally {
        setBusy(false);
      }
    },
    [busy, load, router],
  );

  const fetchHistory = useCallback(async (productId: string, kind: string) => {
    historyAbort.current?.abort();
    const controller = new AbortController();
    historyAbort.current = controller;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams({ history: productId, kind });
      const res = await fetch(`/api/seller/stock?${params}`, { cache: "no-store", signal: controller.signal });
      const data = (await res.json()) as { history?: HistoryRow[]; error?: string; message?: string };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      setHistory(data.history ?? []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setHistoryError(err instanceof Error ? err.message : "History yuklanmadi");
    } finally {
      if (!controller.signal.aborted) setHistoryLoading(false);
    }
  }, []);

  const openHistory = useCallback(
    (p: ProductRow) => {
      setHistoryProduct(p);
      setHistory([]);
      setHistoryKind("all");
      void fetchHistory(p.id, "all");
    },
    [fetchHistory],
  );

  const openView = useCallback(async (p: ProductRow) => {
    setDetail(p);
    setDetailMoves([]);
    setDetailLoading(true);
    setDetailError(null);
    setLabelError(null);
    try {
      const res = await fetch(`/api/seller/stock?detail=${encodeURIComponent(p.id)}`, { cache: "no-store" });
      const data = (await res.json()) as {
        product?: ProductRow;
        lastMovements?: HistoryRow[];
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      if (data.product) setDetail(data.product);
      setDetailMoves(data.lastMovements ?? []);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const applyBarcode = useCallback((productId: string, barcode: string) => {
    setDetail((prev) => (prev && prev.id === productId ? { ...prev, barcode } : prev));
    setProducts((prev) => prev.map((row) => (row.id === productId ? { ...row, barcode } : row)));
  }, []);

  const submitScan = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const cleaned = scanQ.replace(/\D/g, "");
    if (!cleaned) {
      setScanError("Barcode kiriting");
      return;
    }
    if (!/^\d{8,14}$/.test(cleaned)) {
      setScanError("Barcode noto‘g‘ri");
      return;
    }
    setScanBusy(true);
    setScanError(null);
    try {
      const res = await fetch(`/api/seller/stock?scan=${encodeURIComponent(cleaned)}`, { cache: "no-store" });
      const data = (await res.json()) as { product?: ProductRow; error?: string; message?: string };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      if (!data.product) throw new Error("Barcode topilmadi");
      setScanQ("");
      await openView(data.product);
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Topilmadi");
    } finally {
      setScanBusy(false);
    }
  };

  const generateBarcode = async () => {
    if (!detail || labelBusy) return;
    setLabelBusy("generate");
    setLabelError(null);
    try {
      const res = await fetch("/api/seller/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: detail.id, generateBarcode: true }),
      });
      const data = (await res.json()) as { barcode?: string; existed?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(errorFromHttp(res, data));
      if (!data.barcode) throw new Error("Barcode yaratilmadi");
      applyBarcode(detail.id, data.barcode);
      setOk(data.existed ? "Mavjud shtrix-kod ko‘rsatildi" : "Shtrix-kod saqlandi");
    } catch (err: unknown) {
      setLabelError(err instanceof Error ? err.message : "Yaratilmadi");
    } finally {
      setLabelBusy(null);
    }
  };

  const openLabels = async (format: "html" | "pdf") => {
    if (!detail || labelBusy) return;
    if (!detail.barcode) {
      setLabelError("Avval shtrix-kod yarating");
      return;
    }
    setLabelBusy(format === "html" ? "print" : "pdf");
    setLabelError(null);
    try {
      const params = new URLSearchParams({
        productId: detail.id,
        count: String(labelCount),
        format,
      });
      const res = await fetch(`/api/seller/stock/labels?${params}`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(errorFromHttp(res, data));
      }
      if (format === "pdf") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tavfiq-barcode-${labelCount}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } else {
        const html = await res.text();
        const w = window.open("", "_blank");
        if (!w) throw new Error("Brauzer popup blokladi. Chop etish oynasiga ruxsat bering.");
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        window.setTimeout(() => {
          try {
            w.print();
          } catch {
            /* print dialog ochilmasa ham layout ochiq qoladi */
          }
        }, 300);
      }
    } catch (err: unknown) {
      setLabelError(err instanceof Error ? err.message : "Etiketka ochilmadi");
    } finally {
      setLabelBusy(null);
    }
  };

  useEffect(() => {
    return () => historyAbort.current?.abort();
  }, []);

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
        <h1 className="text-lg font-black text-gray-900">Moy sklad yopiq</h1>
        <p className="mt-2 text-sm text-gray-600">Access ACTIVE emas. Direct URL va yozish amallari bloklangan.</p>
      </div>
    );
  }

  if (loading && products.length === 0 && !error) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  const statCards = [
    ["Jami mahsulot", stats?.products ?? 0],
    ["Available", stats?.available ?? 0],
    ["Reserved", stats?.reserved ?? 0],
    ["Sold", stats?.sold ?? 0],
    ["Returned", stats?.returned ?? 0],
    ["Damaged", stats?.damaged ?? 0],
    ["Low stock", stats?.lowStock ?? 0],
  ] as const;

  const actionProps = {
    busy,
    onView: openView,
    onKirim: openKirim,
    onChiqim: openChiqim,
    onDamaged: openDamaged,
    onHistory: openHistory,
    onEdit: openEdit,
    onArchive: openArchive,
    onPublishMarketplace: (p: ProductRow) => void publishMarketplace(p),
    onOpenMarketplace: openMarketplace,
  };

  return (
    <div className="mx-auto max-w-[100%] space-y-5 overflow-x-clip">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Warehouse size={20} className="text-[#cb11ab]" />
          <h1 className="text-xl font-black text-gray-900">Moy sklad</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setFormError(null);
            setAddOpen(true);
            void loadMeta();
          }}
          className="rounded-xl bg-[#cb11ab] px-4 py-2 text-sm font-bold text-white"
        >
          Mahsulot qo‘shish
        </button>
      </div>
      <p className="text-xs text-gray-500">Hozircha AI yo‘q. Ruchnoy forma.</p>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold"
          >
            Qayta urinish
          </button>
        </div>
      ) : null}
      {ok ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{ok}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {statCards.map(([label, val]) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-3">
            <p className="text-lg font-black text-gray-900">{val}</p>
            <p className="text-[11px] text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => void submitScan(e)} className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input
          value={scanQ}
          onChange={(e) => setScanQ(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Barcode scan / qidirish"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={scanBusy}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {scanBusy ? "Qidirilmoqda..." : "Skaner / topish"}
        </button>
      </form>
      {scanError ? <p className="text-sm text-red-600">{scanError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, artikul, SKU, brand, shtrix-kod..."
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {SORTS.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium ${
              filter === id ? "border-[#cb11ab] bg-[#cb11ab] text-white" : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3 lg:hidden">
        {products.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-400">
            Mahsulot yo‘q
          </p>
        ) : (
          products.map((p) => <ProductCard key={p.id} p={p} {...actionProps} />)
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] text-left text-sm">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                {[
                  "Rasm",
                  "Nom",
                  "Artikul",
                  "SKU",
                  "Brand",
                  "Available",
                  "Reserved",
                  "Sold",
                  "Returned",
                  "Damaged",
                  "Sotuv narxi",
                  "Status",
                  "Marketplace",
                  "Yangilangan",
                  "Amallar",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-10 text-center text-sm text-gray-400">
                    Mahsulot yo‘q
                  </td>
                </tr>
              ) : (
                products.map((p) => <ProductRowView key={p.id} p={p} {...actionProps} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen ? (
        <Modal title="Mahsulot qo‘shish" onClose={() => setAddOpen(false)}>
          <ProductFields
            form={form}
            setForm={setForm}
            categories={categories}
            brands={brands}
            skuLocked={false}
            showStock
            uploading={uploading}
            onUpload={(file) => void uploadImage(file)}
          />
          {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => void submitAdd()}
            className="mt-4 w-full rounded-xl bg-[#cb11ab] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </Modal>
      ) : null}

      {editProduct ? (
        <Modal title="Mahsulotni tahrirlash" onClose={() => setEditProduct(null)}>
          <ProductFields
            form={form}
            setForm={setForm}
            categories={categories}
            brands={brands}
            skuLocked
            showStock={false}
            uploading={uploading}
            onUpload={(file) => void uploadImage(file)}
          />
          {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => void submitEdit()}
            className="mt-4 w-full rounded-xl bg-[#cb11ab] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </Modal>
      ) : null}

      {stockTarget && stockMode ? (
        <Modal
          title={
            stockMode === "in"
              ? `Kirim — ${stockTarget.name}`
              : stockMode === "out"
                ? `Chiqim — ${stockTarget.name}`
                : `Damaged — ${stockTarget.name}`
          }
          onClose={() => {
            setStockTarget(null);
            setStockMode(null);
          }}
        >
          <p className="mb-2 text-xs text-gray-500">Available: {stockTarget.available}</p>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Quantity"
          />
          {stockMode === "in" ? (
            <select
              value={inReason}
              onChange={(e) => setInReason(e.target.value as typeof inReason)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              {IN_REASONS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
          {stockMode === "out" ? (
            <select
              value={outReason}
              onChange={(e) => setOutReason(e.target.value as typeof outReason)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              {OUT_REASONS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Izoh (ixtiyoriy)"
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitStock()}
            className="mt-4 w-full rounded-xl bg-[#cb11ab] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saqlanmoqda..." : "Tasdiqlash"}
          </button>
        </Modal>
      ) : null}

      {historyProduct ? (
        <Modal title={`History — ${historyProduct.name}`} onClose={() => setHistoryProduct(null)} wide>
          <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
            {HISTORY_KINDS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setHistoryKind(id);
                  void fetchHistory(historyProduct.id, id);
                }}
                className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                  historyKind === id ? "border-[#cb11ab] bg-[#cb11ab] text-white" : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {historyLoading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="animate-spin text-[#cb11ab]" />
            </div>
          ) : historyError ? (
            <p className="py-6 text-center text-sm text-red-600">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Harakat yo‘q</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
                  <p className="font-semibold text-gray-900">
                    {h.kind} · {h.quantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    {h.oldQuantity ?? "—"} → {h.newQuantity ?? "—"} · {h.actor}
                  </p>
                  <p className="text-xs text-gray-500">Sabab: {h.reason ?? "—"} · Izoh: {h.note ?? "—"}</p>
                  <p className="text-xs text-gray-400">{formatWhen(h.date)}</p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {detail ? (
        <Modal title={`Ko‘rish — ${detail.name}`} onClose={() => setDetail(null)} wide>
          {detailLoading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="animate-spin text-[#cb11ab]" />
            </div>
          ) : detailError ? (
            <p className="text-sm text-red-600">{detailError}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                {detail.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                ) : null}
                <div>
                  <p className="font-bold text-gray-900">{detail.name}</p>
                  <div className="mt-1 flex min-w-0 flex-wrap gap-1">
                    <StatusBadge status={detail.status} low={detail.low} />
                    <MarketplaceStatusBadge status={detail.marketplaceStatus ?? "NOT_PUBLISHED"} />
                  </div>
                </div>
              </div>
              <p>Artikul: {detail.oemNumber ?? "—"} · SKU: {detail.sku ?? "—"}</p>
              <div className="flex min-w-0 flex-wrap gap-1">
                {!detail.archived && (detail.marketplaceStatus ?? "NOT_PUBLISHED") === "NOT_PUBLISHED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void publishMarketplace(detail)}
                    className="rounded-lg bg-[#cb11ab] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    Marketplacega chiqarish
                  </button>
                ) : null}
                {(detail.marketplaceStatus ?? "NOT_PUBLISHED") !== "NOT_PUBLISHED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openMarketplace(detail)}
                    className="rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800 disabled:opacity-50"
                  >
                    Marketplace productni ochish
                  </button>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase text-gray-500">Shtrix-kod</p>
                {detail.barcode ? (
                  <>
                    <p className="break-all font-mono text-sm font-semibold text-gray-900">{detail.barcode}</p>
                    <BarcodeImage code={detail.barcode} />
                    <p className="text-xs text-gray-500">
                      SKU: {detail.sku ?? "—"} · Artikul: {detail.oemNumber ?? "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Hali shtrix-kod yo‘q</p>
                )}
                <button
                  type="button"
                  disabled={Boolean(labelBusy)}
                  onClick={() => void generateBarcode()}
                  className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 sm:w-auto"
                >
                  {labelBusy === "generate"
                    ? "Yaratilmoqda..."
                    : detail.barcode
                      ? "Mavjud shtrix-kodni ko‘rsatish"
                      : "Shtrix-kod yaratish"}
                </button>
                <div className="flex flex-wrap gap-1">
                  {LABEL_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLabelCount(n)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        labelCount === n
                          ? "border-[#cb11ab] bg-[#cb11ab] text-white"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {n} dona
                    </button>
                  ))}
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(labelBusy)}
                    onClick={() => void openLabels("html")}
                    className="min-w-0 flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 sm:flex-none"
                  >
                    {labelBusy === "print" ? "Ochilmoqda..." : "Print"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(labelBusy)}
                    onClick={() => void openLabels("pdf")}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 disabled:opacity-50 sm:flex-none"
                  >
                    {labelBusy === "pdf" ? "Yuklanmoqda..." : "PDF chiqarish"}
                  </button>
                </div>
                {labelError ? <p className="text-sm text-red-600">{labelError}</p> : null}
              </div>
              <p>Kategoriya: {detail.category} · Brand: {detail.brand ?? "—"}</p>
              <p>Supplier: {detail.supplier ?? "—"}</p>
              <p>
                Zakup: {formatPrice(detail.costPrice)} · Sotuv: {formatPrice(detail.price)}
              </p>
              <StockPills p={detail} />
              <p className="text-xs text-gray-400">Yangilangan: {formatWhen(detail.updatedAt)}</p>
              <h3 className="font-bold">Oxirgi harakatlar</h3>
              {detailMoves.length === 0 ? (
                <p className="text-xs text-gray-400">Harakat yo‘q</p>
              ) : (
                detailMoves.map((h) => (
                  <p key={h.id} className="text-xs text-gray-600">
                    {h.kind} · {h.quantity} · {h.oldQuantity ?? "—"} → {h.newQuantity ?? "—"} · {formatWhen(h.date)}
                  </p>
                ))
              )}
            </div>
          )}
        </Modal>
      ) : null}

      {archiveTarget ? (
        <Modal title="Arxivlash" onClose={() => setArchiveTarget(null)}>
          <p className="text-sm text-gray-700">
            {archiveTarget.name} arxivlanadi. Hard delete yo‘q — history saqlanadi, listdan yashiriladi.
          </p>
          {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitArchive()}
            className="mt-4 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "..." : "Arxivlash"}
          </button>
        </Modal>
      ) : null}
    </div>
  );
}

function ProductFields({
  form,
  setForm,
  categories,
  brands,
  skuLocked,
  showStock,
  uploading,
  onUpload,
}: {
  form: typeof emptyForm;
  setForm: Dispatch<SetStateAction<typeof emptyForm>>;
  categories: Option[];
  brands: Option[];
  skuLocked: boolean;
  showStock: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500">
        Rasm
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </label>
      {form.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : null}
      {uploading ? <p className="text-xs text-gray-500">Yuklanmoqda...</p> : null}
      <input
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        placeholder="Nom *"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        value={form.oemNumber}
        disabled={skuLocked}
        onChange={(e) => setForm((p) => ({ ...p, oemNumber: e.target.value }))}
        placeholder="Artikul *"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
      />
      <input
        value={form.sku}
        disabled={skuLocked}
        onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
        placeholder="SKU *"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
      />
      <select
        value={form.categoryId}
        onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      >
        <option value="">Kategoriya *</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={form.brandId}
        onChange={(e) => setForm((p) => ({ ...p, brandId: e.target.value }))}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      >
        <option value="">Brand</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <input
        value={form.supplier}
        onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
        placeholder="Supplier"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        type="number"
        min={0}
        value={form.costPrice}
        onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
        placeholder="Zakup narxi"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        type="number"
        min={0}
        value={form.price}
        onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
        placeholder="Sotuv narxi"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
      {showStock ? (
        <input
          type="number"
          min={0}
          value={form.stock}
          onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
          placeholder="Boshlang‘ich stock"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}
