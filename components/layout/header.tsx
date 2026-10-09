"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  MapPin,
  Package,
  ChevronDown,
  X,
  Store,
} from "lucide-react";
import { CatalogMenu } from "./catalog-menu";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import { formatPrice } from "@/lib/utils";

const NAV_CATEGORIES = [
  { href: "/catalog/shinalar", label: "Shinalar" },
  { href: "/catalog/disklar", label: "Disklar" },
  { href: "/catalog/moylar", label: "Motor moylari" },
  { href: "/catalog/akkumulyator", label: "Akkumulyator" },
  { href: "/catalog/tormoz", label: "Tormoz tizimi" },
  { href: "/catalog/faralar", label: "Faralar" },
  { href: "/catalog/aksessuarlar", label: "Aksessuarlar" },
  { href: "/catalog/elektronika", label: "Elektronika" },
];

type SearchProduct = {
  id: string;
  name: string;
  href: string;
  price?: number;
  store?: string;
};

type SearchStore = {
  id: string;
  name: string;
  href: string;
  productCount?: number;
  isVerified?: boolean;
};

type SearchFieldProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showSearch: boolean;
  setShowSearch: (value: boolean) => void;
  submitSearch: () => void;
  productResults: SearchProduct[];
  storeResults: SearchStore[];
  popular: string[];
  compact?: boolean;
};

function SearchField({
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  submitSearch,
  productResults,
  storeResults,
  popular,
  compact = false,
}: SearchFieldProps) {
  return (
    <div className="relative min-w-0 w-full">
      <div className="flex overflow-hidden rounded-xl ring-1 ring-[#f5b51b]/40">
        <div className="relative min-w-0 flex-1">
          <Search
            size={compact ? 14 : 16}
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${compact ? "left-2.5" : "left-3.5"}`}
          />
          <input
            type="text"
            name={compact ? "tavfiq-q-mobile" : "tavfiq-q-desktop"}
            autoComplete="off"
            suppressHydrationWarning
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSearch();
              }
            }}
            placeholder={compact ? "Qidirish..." : "Ehtiyot qism, shina, disk qidiring..."}
            className={`w-full bg-white text-gray-800 focus:outline-none ${
              compact ? "py-2 pl-8 pr-7 text-xs" : "py-2.5 pl-11 pr-4 text-sm"
            }`}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                compact ? "right-2" : "right-2.5"
              }`}
              aria-label="Tozalash"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={submitSearch}
          className={`flex shrink-0 items-center justify-center bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] transition-all hover:from-[#ffc733] hover:to-[#f5b51b] ${
            compact ? "px-2.5" : "px-5"
          }`}
          aria-label="Qidirish"
        >
          <Search size={compact ? 16 : 19} strokeWidth={2.5} />
        </button>
      </div>

      {showSearch ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-100 bg-white shadow-2xl">
          <div className="border-b border-gray-100 p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">
              {searchQuery.trim().length >= 2 ? "Qidiruv natijalari" : "Mashhur qidiruvlar"}
            </p>

            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-3">
                {storeResults.length > 0 ? (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#004733]">
                      Do‘konlar
                    </p>
                    <div className="space-y-1">
                      {storeResults.map((s) => (
                        <Link
                          key={s.id}
                          href={s.href}
                          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#004733]"
                        >
                          <Store size={14} className="shrink-0 text-[#004733]" />
                          <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                          {typeof s.productCount === "number" ? (
                            <span className="shrink-0 text-xs text-gray-400">{s.productCount} mahsulot</span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {productResults.length > 0 ? (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Mahsulotlar
                    </p>
                    <div className="space-y-1">
                      {productResults.map((p) => (
                        <Link
                          key={p.id}
                          href={p.href}
                          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#004733]"
                        >
                          <Search size={12} className="shrink-0 text-gray-400" />
                          <span className="min-w-0 flex-1 line-clamp-1">{p.name}</span>
                          {typeof p.price === "number" ? (
                            <span className="shrink-0 text-xs font-semibold text-gray-900">
                              {formatPrice(p.price)}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {storeResults.length === 0 && productResults.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-gray-500">Hech narsa topilmadi</p>
                ) : null}

                <Link
                  href={`/catalog?q=${encodeURIComponent(searchQuery.trim())}`}
                  className="block px-2 pt-1 text-sm font-medium text-[#004733] hover:underline"
                >
                  Barcha natijalar →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {popular.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery(s);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-[#004733]"
                  >
                    <Search size={12} className="shrink-0 text-gray-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Kategoriyalar</p>
            <div className="flex flex-wrap gap-2">
              {["Shinalar", "Disklar", "Moylar", "Filtrlar", "Akkumulyator"].map((cat) => (
                <Link
                  key={cat}
                  href={`/catalog?category=${cat.toLowerCase()}`}
                  className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-[#004733]/10 hover:text-[#004733]"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const CITIES = [
  "Toshkent",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Namangan",
  "Farg‘ona",
  "Qarshi",
  "Nukus",
];

const CITY_KEY = "tavfiq-city";

function DeliveryLocation({ compact = false }: { compact?: boolean }) {
  const [city, setCity] = useState("Toshkent");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved && CITIES.includes(saved)) setCity(saved);
    } catch {
      // ignore
    }
  }, []);

  const pick = (next: string) => {
    setCity(next);
    try {
      localStorage.setItem(CITY_KEY, next);
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex shrink-0 items-center gap-1.5 text-sm text-white transition-colors hover:text-[#f5b51b] ${
          compact ? "px-1" : ""
        }`}
        aria-expanded={open}
        aria-label="Yetkazish shahri"
      >
        <MapPin size={compact ? 16 : 18} className="text-[#f5b51b]" />
        {compact ? null : (
          <div className="text-left">
            <p className="text-[10px] leading-none text-[#f8d57e]/70">Yetkazish</p>
            <p className="mt-0.5 text-xs font-medium leading-none" suppressHydrationWarning>
              {city}
            </p>
          </div>
        )}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white text-gray-900 shadow-xl">
          <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">
            Shaharni tanlang
          </p>
          <div className="max-h-64 overflow-y-auto py-1">
            {CITIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => pick(item)}
                className={`flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  city === item ? "font-semibold text-[#004733]" : "text-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <Link
            href="/pickup-points"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-3 py-2 text-xs font-semibold text-[#004733] hover:bg-[#004733]/5"
          >
            Olish punktlari →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function Header({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <Suspense fallback={<HeaderBar loggedIn={loggedIn} urlQuery={null} />}>
      <HeaderFromUrl loggedIn={loggedIn} />
    </Suspense>
  );
}

function HeaderFromUrl({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onResultsPage = pathname === "/catalog" || pathname === "/search";
  const urlQuery = onResultsPage ? (searchParams.get("q") ?? "") : null;
  return <HeaderBar loggedIn={loggedIn} urlQuery={urlQuery} />;
}

function HeaderBar({
  loggedIn = false,
  urlQuery,
}: {
  loggedIn?: boolean;
  urlQuery: string | null;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(urlQuery ?? "");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [productResults, setProductResults] = useState<SearchProduct[]>([]);
  const [storeResults, setStoreResults] = useState<SearchStore[]>([]);
  const [countsReady, setCountsReady] = useState(false);
  const [popular, setPopular] = useState<string[]>([
    "Michelin 205/55 R16",
    "Shell 5W-40",
    "Bosch akkumulyator",
    "TyreWorld",
    "AutoParts Pro",
  ]);
  const itemCount = useCartStore((store) => store.itemCount());
  const favCount = useFavoritesStore((store) => store.products.length);
  const shownItemCount = countsReady ? itemCount : 0;
  const shownFavCount = countsReady ? favCount : 0;
  const accountLabel = loggedIn ? "Profil" : "Kirish";

  useEffect(() => {
    setCountsReady(true);
  }, []);

  useEffect(() => {
    if (urlQuery !== null) setSearchQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setProductResults([]);
      setStoreResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          setProductResults(data.results ?? []);
          setStoreResults(data.stores ?? []);
          if (Array.isArray(data.popular) && data.popular.length) {
            setPopular(data.popular);
          }
        })
        .catch(() => undefined);
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const submitSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    // Agar do‘kon topilsa — birinchi do‘konga o‘tish mumkin, aks holda katalog
    if (storeResults.length === 1 && productResults.length === 0) {
      router.push(storeResults[0].href);
    } else {
      router.push(`/catalog?q=${encodeURIComponent(query)}`);
    }
    setShowSearch(false);
  };

  return (
    <>
      {/* Row 1 — top info bar */}
      <div className="bg-[#002016] text-xs py-2 hidden md:block border-b border-[#f5b51b]/15">
        <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#f8d57e]">
            <MapPin size={13} className="text-[#f5b51b]" />
            <span>Toshkent bo&apos;yicha bepul yetkazib berish 500 000 so&apos;mdan</span>
          </div>
          <div className="flex items-center gap-5 text-[#e7e0cf]">
            <Link href="/seller/register" className="hover:text-[#f5b51b] transition-colors">
              Sotuvchi bo&apos;lish
            </Link>
            <span className="text-[#f5b51b]/40">|</span>
            <Link href="/help" className="hover:text-[#f5b51b] transition-colors">
              Yordam
            </Link>
            <span className="text-[#f5b51b]/40">|</span>
            <Link href="/pickup-points" className="hover:text-[#f5b51b] transition-colors">
              Olish punktlari
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2 — logo / catalog / search / actions */}
      <header className="sticky top-0 z-50 overflow-x-clip bg-[#002d21] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="mx-auto max-w-[1280px] px-3 sm:px-4">
          {/* —— Mobil: emblem + TAVFIQ | qidiruv | menyu —— */}
          <div className="flex items-center gap-2 py-2.5 md:hidden" suppressHydrationWarning>
            <Link href="/" className="flex shrink-0 items-center gap-1.5">
              <BrandEmblem className="h-9 w-9 shrink-0" gradientId="hdr-mobile" />
              <span className="text-base font-black tracking-tight text-[#f5b51b]">
                TAVFIQ
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <SearchField
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showSearch={showSearch}
                setShowSearch={setShowSearch}
                submitSearch={submitSearch}
                productResults={productResults}
                storeResults={storeResults}
                popular={popular}
                compact
              />
            </div>
            <DeliveryLocation compact />
            <button
              type="button"
              onClick={() => setShowCatalog(!showCatalog)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] shadow-sm active:scale-95"
              aria-label="Katalog menyusi"
            >
              <Menu size={20} strokeWidth={2.4} />
            </button>
          </div>

          {/* —— Desktop —— */}
          <div className="hidden items-center gap-4 py-3 md:flex">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <BrandEmblem className="h-11 w-11 shrink-0" gradientId="hdr-desktop" />
              <BrandName stacked className="text-xl leading-none tracking-tight" />
            </Link>

            <button
              type="button"
              onClick={() => setShowCatalog(!showCatalog)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-5 py-2.5 text-sm font-bold text-[#002d21] shadow-sm transition-all hover:from-[#ffc733] hover:to-[#f5b51b]"
            >
              <Menu size={17} />
              <span>Katalog</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showCatalog ? "rotate-180" : ""}`}
              />
            </button>

            <div className="relative min-w-0 flex-1">
              <SearchField
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showSearch={showSearch}
                setShowSearch={setShowSearch}
                submitSearch={submitSearch}
                productResults={productResults}
                storeResults={storeResults}
                popular={popular}
              />
            </div>

            <div className="hidden lg:block">
              <DeliveryLocation />
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Link
                href="/profile/orders"
                className="flex flex-col items-center px-2.5 py-1 text-white transition-colors hover:text-[#f5b51b]"
              >
                <Package size={21} />
                <span className="mt-0.5 text-[10px]">Buyurtmalar</span>
              </Link>
              <Link
                href="/favorites"
                className="relative flex flex-col items-center px-2.5 py-1 text-white transition-colors hover:text-[#f5b51b]"
              >
                <div className="relative">
                  <Heart size={21} />
                  {shownFavCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e23b3b] px-0.5 text-[10px] font-bold text-white">
                      {shownFavCount > 99 ? "99+" : shownFavCount}
                    </span>
                  ) : null}
                </div>
                <span className="mt-0.5 text-[10px]">Sevimlilar</span>
              </Link>
              <Link
                href="/profile"
                className="flex flex-col items-center px-2.5 py-1 text-white transition-colors hover:text-[#f5b51b]"
              >
                <User size={21} />
                <span className="mt-0.5 text-[10px]">{accountLabel}</span>
              </Link>
              <Link
                href="/cart"
                className="relative flex flex-col items-center px-2.5 py-1 text-white transition-colors hover:text-[#f5b51b]"
              >
                <div className="relative">
                  <ShoppingCart size={21} />
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#f5b51b] text-[10px] font-bold text-[#002d21]">
                    {shownItemCount}
                  </span>
                </div>
                <span className="mt-0.5 text-[10px]">Savatcha</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Row 3 — category nav (own band) */}
        <div className="hidden md:block bg-[#00231a] border-t border-[#f5b51b]/15">
          <div className="max-w-[1280px] mx-auto px-4">
            <nav className="flex items-center gap-1 py-2 text-sm text-[#e7e0cf] overflow-x-auto scrollbar-hide">
              {NAV_CATEGORIES.map((item, i) => (
                <span key={item.href} className="flex items-center">
                  <Link
                    href={item.href}
                    className="whitespace-nowrap hover:text-[#f5b51b] transition-colors py-1 px-3 rounded-lg"
                  >
                    {item.label}
                  </Link>
                  {i < NAV_CATEGORIES.length - 1 && (
                    <span className="w-px h-3.5 bg-[#f5b51b]/25" />
                  )}
                </span>
              ))}
              <Link
                href="/catalog"
                className="whitespace-nowrap text-[#f5b51b] font-semibold hover:text-[#ffc733] transition-colors py-1 px-3 ml-1"
              >
                Barcha kategoriyalar →
              </Link>
            </nav>
          </div>
        </div>

        {/* Catalog dropdown / mobile drawer */}
        {showCatalog && (
          <div className="absolute left-0 right-0 top-full z-40">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setShowCatalog(false)}
            />
            {/* Mobile: full-screen drawer */}
            <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
              <CatalogMenu onClose={() => setShowCatalog(false)} />
            </div>
            {/* Desktop: dropdown panel */}
            <div className="relative mx-auto hidden max-w-[1280px] px-4 md:block">
              <CatalogMenu onClose={() => setShowCatalog(false)} />
            </div>
          </div>
        )}
      </header>

      {/* Mobile bottom nav — 5 ta, ixcham */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#f5b51b]/20 bg-[#002d21] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        aria-label="Asosiy menyu"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 py-1.5">
          <Link href="/" className="flex flex-col items-center gap-0.5 py-1 text-[10px] text-[#e7e0cf]">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Bosh
          </Link>
          <button
            type="button"
            onClick={() => setShowCatalog(true)}
            className="flex flex-col items-center gap-0.5 py-1 text-[10px] text-[#e7e0cf]"
          >
            <Menu size={20} />
            Katalog
          </button>
          <Link
            href="/favorites"
            className="relative flex flex-col items-center gap-0.5 py-1 text-[10px] text-[#e7e0cf]"
          >
            <div className="relative">
              <Heart size={20} />
              {shownFavCount > 0 ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e23b3b] px-0.5 text-[10px] font-bold text-white">
                  {shownFavCount > 99 ? "99+" : shownFavCount}
                </span>
              ) : null}
            </div>
            Sevimli
          </Link>
          <Link
            href="/cart"
            className="relative flex flex-col items-center gap-0.5 py-1 text-[10px] text-[#e7e0cf]"
          >
            <div className="relative">
              <ShoppingCart size={20} />
              {shownItemCount > 0 ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f5b51b] px-0.5 text-[10px] font-bold text-[#002d21]">
                  {shownItemCount > 99 ? "99+" : shownItemCount}
                </span>
              ) : null}
            </div>
            Savat
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 py-1 text-[10px] text-[#e7e0cf]">
            <User size={20} />
            Profil
          </Link>
        </div>
      </nav>
    </>
  );
}

