"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  DollarSign,
  GalleryHorizontalEnd,
  Headphones,
  HelpCircle,
  Image,
  LayoutDashboard,
  Menu,
  Package,
  PackageX,
  ScrollText,
  Settings,
  ShoppingBag,
  Shield,
  Store,
  Tag,
  TicketPercent,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";
import { hasPermission, type AdminRoleType } from "@/lib/permissions";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Shield;
  permission?: string | null;
  superOnly?: boolean;
};

const nav: NavItem[] = [
  { label: "Super Admin", href: "/super-admin/dashboard", icon: Shield, superOnly: true },
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Buyurtmalar", href: "/admin/orders", icon: ShoppingBag, permission: "orders.view" },
  { label: "Qaytarishlar", href: "/admin/returns", icon: PackageX, permission: "returns.view" },
  { label: "Moliya", href: "/admin/finance", icon: DollarSign, permission: "finance.view" },
  { label: "Mahsulotlar", href: "/admin/products", icon: Package, permission: "products.view" },
  { label: "Kategoriyalar", href: "/admin/categories", icon: Tag, permission: "categories.view" },
  { label: "Brendlar", href: "/admin/brands", icon: Award, permission: "brands.view" },
  { label: "Foydalanuvchilar", href: "/admin/users", icon: Users, permission: "users.view" },
  { label: "Sotuvchilar", href: "/admin/sellers", icon: Store, permission: "sellers.view" },
  {
    label: "Hero slayderlar",
    href: "/admin/hero-slides",
    icon: GalleryHorizontalEnd,
    permission: "banners.view",
  },
  { label: "Bannerlar", href: "/admin/banners", icon: Image, permission: "banners.view" },
  { label: "Olish punktlari", href: "/admin/pickup-points", icon: Store, permission: "pickup_points.view" },
  { label: "Sharhlar", href: "/admin/reviews", icon: Award, permission: "reviews.view" },
  { label: "Savol-javob", href: "/admin/questions", icon: HelpCircle, permission: "questions.view" },
  { label: "Kuponlar", href: "/admin/coupons", icon: TicketPercent, permission: "coupons.view" },
  { label: "Support", href: "/admin/support", icon: Headphones, permission: "tickets.view" },
  { label: "Audit log", href: "/admin/audit-logs", icon: ScrollText, superOnly: true },
  { label: "Sozlamalar", href: "/admin/settings", icon: Settings, superOnly: true },
];

export function AdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRoleType | "super_admin" | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          role?: string;
          adminRole?: AdminRoleType;
        };
        if (cancelled) return;
        setUserRole(data.role ?? null);
        setAdminRole(data.adminRole ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = nav.filter((item) => {
    if (item.superOnly) return userRole === "super_admin";
    if (!item.permission) return true;
    if (userRole === "super_admin" || adminRole === "super_admin") return true;
    if (!adminRole) return false;
    return hasPermission(adminRole, item.permission);
  });

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#f5b51b]/15 px-4 py-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <BrandEmblem className="h-9 w-9" />
          <div>
            <p className="text-xs tracking-wide">
              <BrandName className="text-xs" />
            </p>
            <p className="text-[10px] text-[#9eaea7]">Admin panel</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/admin/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-[#f5b51b] to-[#d99a0a] text-[#002d21] shadow"
                  : "text-[#cbd6d1] hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#f5b51b]/15 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#aab9b3] hover:bg-white/8 hover:text-white"
        >
          <Wrench size={15} />
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
        className="fixed left-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-xl bg-[#002d21] text-[#f5b51b] shadow-xl lg:hidden"
      >
        <Menu size={18} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 bg-[#001f17] shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-[#cbd6d1]"
            >
              <X size={19} />
            </button>
            {content}
          </div>
        </div>
      ) : null}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-[#001f17] lg:flex">
        {content}
      </aside>
    </>
  );
}
