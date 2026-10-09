"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  Store,
  BarChart2,
  Menu,
  X,
  Wallet,
  PackageX,
  MessageSquare,
  HelpCircle,
  Warehouse,
  Bell,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";

const nav = [
  { href: "/seller/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/seller/orders", icon: ShoppingBag, label: "Buyurtmalar" },
  { href: "/seller/products", icon: Package, label: "Mahsulotlar" },
  { href: "/seller/products/add", icon: PlusCircle, label: "Mahsulot qo‘shish" },
  { href: "/seller/warehouse", icon: Warehouse, label: "Ombor" },
  { href: "/seller/returns", icon: PackageX, label: "Qaytarishlar" },
  { href: "/seller/reviews", icon: MessageSquare, label: "Sharhlar" },
  { href: "/seller/questions", icon: HelpCircle, label: "Savollar" },
  { href: "/seller/finance", icon: Wallet, label: "Moliya" },
  { href: "/seller/analytics", icon: BarChart2, label: "Statistika" },
  { href: "/seller/notifications", icon: Bell, label: "Bildirishnomalar" },
  { href: "/seller/settings", icon: Store, label: "Do‘kon sozlamalari" },
];

export function SellerSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("Do‘kon");
  const [statusLabel, setStatusLabel] = useState("Yuklanmoqda...");
  const [statusOk, setStatusOk] = useState(false);
  const [unread, setUnread] = useState(0);
  const [warehouseStatus, setWarehouseStatus] = useState<"ACTIVE" | "EXPIRED" | "DISABLED" | "unknown">(
    "unknown",
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profileRes = await fetch("/api/seller/profile", { cache: "no-store" });
        if (cancelled) return;
        if (profileRes.ok) {
          const data = (await profileRes.json()) as {
            store?: { name?: string };
            seller?: {
              isActive?: boolean;
              isBanned?: boolean;
              warehouseAccess?: { status?: "ACTIVE" | "EXPIRED" | "DISABLED" };
            };
          };
          setStoreName(data.store?.name ?? "Do‘kon");
          setWarehouseStatus(data.seller?.warehouseAccess?.status ?? "DISABLED");
          if (data.seller?.isBanned) {
            setStatusLabel("Bloklangan");
            setStatusOk(false);
          } else if (data.seller?.isActive) {
            setStatusLabel("Faol");
            setStatusOk(true);
          } else {
            setStatusLabel("Tekshiruvda");
            setStatusOk(false);
          }
        } else if (profileRes.status === 503) {
          setStoreName("Do‘kon");
          setStatusLabel("DB ulanmagan");
          setStatusOk(false);
          setWarehouseStatus("DISABLED");
        } else {
          setStoreName("Do‘kon yo‘q");
          setStatusLabel("Ro‘yxatdan o‘ting");
          setStatusOk(false);
          setWarehouseStatus("DISABLED");
        }
      } catch {
        setWarehouseStatus("DISABLED");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const notiRes = await fetch("/api/notifications", { cache: "no-store" });
        if (cancelled || !notiRes.ok) return;
        const n = (await notiRes.json()) as { unread?: number };
        setUnread(n.unread ?? 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-4 py-5">
        <Link href="/seller/dashboard" className="flex items-center gap-2">
          <BrandEmblem className="h-8 w-8 shrink-0" />
          <div>
            <p className="text-xs tracking-wide">
              <BrandName variant="light" className="text-xs" />
            </p>
            <p className="text-[10px] text-gray-500">Seller Panel</p>
          </div>
        </Link>
      </div>

      <div className="border-b border-gray-100 bg-[#004733]/5 px-4 py-3">
        <p className="text-xs text-gray-500">Do‘koningiz</p>
        <p className="truncate text-sm font-semibold text-gray-900">{storeName}</p>
        <p className={`text-xs ${statusOk ? "text-green-600" : "text-amber-600"}`}>
          ● {statusLabel}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ href, icon: Icon, label }) => {
          const active =
            path === href ||
            (href !== "/seller/dashboard" &&
              href !== "/seller/products/add" &&
              path.startsWith(href));
          const warehouseLocked =
            href === "/seller/warehouse" && warehouseStatus !== "ACTIVE";
          const itemLabel = href === "/seller/warehouse" ? "Moy sklad" : label;
          const itemClass = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            active ? "bg-[#004733] text-white" : "text-gray-700 hover:bg-gray-100"
          }`;
          if (warehouseLocked) {
            return (
              <span
                key={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400"
                title={warehouseStatus === "EXPIRED" ? "Moy sklad muddati tugagan" : "Moy sklad yopiq"}
              >
                <Icon size={16} />
                <span className="flex-1">{itemLabel}</span>
                <span className="text-[10px] font-semibold uppercase">
                  {warehouseStatus === "unknown" ? "…" : warehouseStatus === "EXPIRED" ? "expired" : "locked"}
                </span>
              </span>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <Icon size={16} />
              <span className="flex-1">{itemLabel}</span>
              {href === "/seller/notifications" && unread > 0 ? (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    active ? "bg-white text-[#004733]" : "bg-[#004733] text-white"
                  }`}
                >
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          Saytga qaytish →
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm lg:hidden"
      >
        <Menu size={16} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4"
            >
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      ) : null}

      <aside className="hidden min-h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-white lg:flex">
        {content}
      </aside>
    </>
  );
}
