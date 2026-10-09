"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart2,
  Crown,
  FileText,
  Headphones,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Package,
  PackageX,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  TicketPercent,
  Users,
  Wallet,
  Wrench,
  X,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";

const navItems: Array<{ href: string; icon: typeof Crown; label: string }> = [
  { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/super-admin/reports", icon: BarChart2, label: "Reports / Analytics" },
  { href: "/super-admin/admins", icon: Users, label: "Admins" },
  { href: "/super-admin/roles", icon: ShieldCheck, label: "Roles" },
  { href: "/super-admin/platform", icon: Settings, label: "Platform" },
  { href: "/super-admin/finance", icon: DollarSign, label: "Finance" },
  { href: "/super-admin/commissions", icon: TicketPercent, label: "Commissions" },
  { href: "/super-admin/finance#payouts", icon: Wallet, label: "Payouts" },
  { href: "/admin/sellers", icon: Store, label: "Sellers" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/admin/returns", icon: PackageX, label: "Returns" },
  { href: "/admin/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/admin/support", icon: Headphones, label: "Support" },
  { href: "/admin/hero-slides", icon: FileText, label: "Hero slides" },
  { href: "/admin/banners", icon: ImageIcon, label: "Banners" },
  { href: "/admin/categories", icon: Tag, label: "Categories" },
  { href: "/admin/brands", icon: Award, label: "Brands" },
  { href: "/admin/coupons", icon: TicketPercent, label: "Coupons" },
  { href: "/admin/pickup-points", icon: Store, label: "Pickup points" },
  { href: "/admin/settings", icon: Wrench, label: "Settings" },
];

function navPath(href: string) {
  return href.split("#")[0] ?? href;
}

export function SuperAdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    setMounted(true);
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [path]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#f5b51b]/25 px-4 py-5">
        <Link href="/super-admin/dashboard" className="flex items-center gap-3">
          <BrandEmblem className="h-9 w-9" />
          <div>
            <p className="text-xs tracking-wide">
              <BrandName className="text-xs" />
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f5b51b] to-[#ffdf7e] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#1a0533]">
              Super Admin
            </p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const pathname = navPath(href);
          const wantHash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
          const hashActive = wantHash ? hash === wantHash : hash !== "#payouts" || pathname !== "/super-admin/finance";
          const pathActive =
            path === pathname ||
            (pathname !== "/super-admin/dashboard" && path.startsWith(pathname));
          const active = Boolean(pathActive && hashActive);
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-[#f5b51b] to-[#d99a0a] text-[#1a0533] shadow-lg shadow-[#f5b51b]/20"
                  : "text-[#d5cbe8] hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-[#f5b51b]/25 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#b3a6cf] hover:bg-white/8 hover:text-white"
        >
          <Wrench size={15} />
          Saytga qaytish →
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {mounted ? (
        <button
          type="button"
          aria-label="Menyu"
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-xl bg-[#1a0533] text-[#f5b51b] shadow-xl lg:hidden"
        >
          <Menu size={18} />
        </button>
      ) : (
        <span className="fixed left-4 top-4 z-40 h-10 w-10 lg:hidden" aria-hidden />
      )}
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 overflow-y-auto bg-gradient-to-b from-[#1a0533] via-[#12042a] to-[#050011] shadow-2xl">
            <button
              type="button"
              aria-label="Yopish"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 text-[#d5cbe8]"
            >
              <X size={19} />
            </button>
            {content}
          </div>
        </div>
      ) : null}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#1a0533] via-[#12042a] to-[#050011] lg:flex">
        {content}
      </aside>
    </>
  );
}
