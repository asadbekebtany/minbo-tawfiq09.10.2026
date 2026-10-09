"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Database,
  Loader2,
  Settings,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type OverviewPayload = {
  health: {
    database: boolean;
    sms: boolean;
    payme: boolean;
    click: boolean;
    adminApiLocked: boolean;
    maintenanceMode: boolean;
  };
  site: { siteName: string; commissionPercent: number; freeDeliveryMin: number };
  platform: {
    maintenanceMode: boolean;
    allowNewSellerRegistration: boolean;
    paymeEnabled: boolean;
    clickEnabled: boolean;
    lowStockThreshold: number;
    payoutHoldDays: number;
  };
  counts: {
    users: number;
    sellersActive: number;
    sellersPending: number;
    productsPending: number;
    ordersToday: number;
    returnsPending: number;
    ticketsOpen: number;
    lowStock: number;
    admins: number;
  };
};

type ReportSlice = {
  gmv?: number;
  totalCommission?: number;
  refundAmount?: number;
  products?: number;
  orderCount?: number;
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

function HealthDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
      {ok ? (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
      ) : (
        <XCircle size={16} className="shrink-0 text-red-500" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-500">{ok ? "OK" : "Muammo"}</p>
      </div>
    </div>
  );
}

export function SuperAdminOverviewClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [report, setReport] = useState<ReportSlice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, reportRes] = await Promise.all([
        fetch("/api/super-admin/overview", { cache: "no-store" }),
        fetch("/api/super-admin/reports?range=month", { cache: "no-store" }),
      ]);
      const json = (await res.json()) as OverviewPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yuklanmadi");
      setData(json);
      if (reportRes.ok) {
        const rj = (await reportRes.json()) as ReportSlice;
        setReport(rj);
      } else {
        setReport(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#1a0533]" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Ma’lumot yo‘q"}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const alerts: Array<{ text: string; href: string }> = [];
  if (data.health.maintenanceMode) {
    alerts.push({ text: "Maintenance mode yoqilgan", href: "/super-admin/platform" });
  }
  if (data.health.adminApiLocked) {
    alerts.push({ text: "Admin API bloklangan (LOCK_ADMIN_API)", href: "/super-admin/platform" });
  }
  if (!data.health.database) {
    alerts.push({ text: "Database ulanmagan", href: "/super-admin/platform" });
  }
  if (data.counts.sellersPending > 0) {
    alerts.push({
      text: `${data.counts.sellersPending} ta seller arizasi kutmoqda`,
      href: "/admin/sellers",
    });
  }
  if (data.counts.productsPending > 0) {
    alerts.push({
      text: `${data.counts.productsPending} ta mahsulot tasdiqlanmagan`,
      href: "/admin/products",
    });
  }
  if (data.counts.returnsPending > 0) {
    alerts.push({
      text: `${data.counts.returnsPending} ta qaytarish kutilmoqda`,
      href: "/admin/returns",
    });
  }
  if (data.counts.ticketsOpen > 0) {
    alerts.push({
      text: `${data.counts.ticketsOpen} ta ochiq support`,
      href: "/admin/support",
    });
  }
  if (data.counts.lowStock > 0) {
    alerts.push({
      text: `${data.counts.lowStock} ta past zaxira (≤${data.platform.lowStockThreshold})`,
      href: "/admin/products",
    });
  }

  const kpis = [
    { label: "Oylik GMV", value: report ? fmt(report.gmv ?? 0) : "—", href: "/super-admin/reports" },
    { label: "Komissiya", value: report ? fmt(report.totalCommission ?? 0) : "—", href: "/super-admin/finance" },
    { label: "Refund", value: report ? fmt(report.refundAmount ?? 0) : "—", href: "/admin/returns" },
    { label: "Mahsulotlar", value: report ? fmt(report.products ?? 0) : "—", href: "/admin/products" },
    { label: "Bugungi buyurtmalar", value: fmt(data.counts.ordersToday), href: "/admin/orders" },
    { label: "Foydalanuvchilar", value: fmt(data.counts.users), href: "/admin/users" },
    { label: "Faol sellerlar", value: fmt(data.counts.sellersActive), href: "/admin/sellers" },
    { label: "Adminlar", value: fmt(data.counts.admins), href: "/super-admin/admins" },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a0533] via-[#3b0764] to-[#1a0533] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f5b51b] to-[#ffdf7e] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1a0533]">
              <Crown size={12} />
              Platforma holati
            </div>
            <h1 className="text-2xl font-black">{data.site.siteName} — Super Admin</h1>
            <p className="mt-1 text-sm text-white/70">
              Komissiya {data.site.commissionPercent}% · Hold {data.platform.payoutHoldDays} kun ·
              Bepul yetkazish {fmt(data.site.freeDeliveryMin)} so‘mdan
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin/platform"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/20"
            >
              <Settings size={14} />
              Platforma
            </Link>
            <Link
              href="/super-admin/finance"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f5b51b] px-4 py-2 text-sm font-bold text-[#1a0533]"
            >
              <Activity size={14} />
              Settlements
            </Link>
          </div>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:border-amber-300"
            >
              <AlertTriangle size={16} className="shrink-0" />
              <span className="flex-1 font-medium">{a.text}</span>
              <span className="text-xs font-bold">Ochish →</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Database size={16} className="text-[#3b0764]" />
          <h2 className="font-black text-gray-900">Infrastruktura</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <HealthDot ok={data.health.database} label="PostgreSQL" />
          <HealthDot ok={data.health.sms} label="SMS / OTP" />
          <HealthDot ok={data.health.payme} label="Payme secret" />
          <HealthDot ok={data.health.click} label="Click secret" />
          <HealthDot ok={!data.health.adminApiLocked} label="Admin API ochiq" />
          <HealthDot ok={!data.health.maintenanceMode} label="Sayt ishlayapti" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-2xl border border-[#3b0764]/10 bg-white p-5 transition hover:border-[#f5b51b]/50 hover:shadow-lg"
          >
            <p className="text-2xl font-black text-gray-900">{k.value}</p>
            <p className="mt-1 text-xs text-gray-500">{k.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/super-admin/admins", label: "Adminlar", icon: ShieldCheck, desc: "Ro‘yxat + faollik" },
          { href: "/super-admin/roles", label: "Rollar", icon: Crown, desc: "Granular RBAC" },
          { href: "/super-admin/finance", label: "Moliya", icon: Activity, desc: "Settlements / payout" },
          { href: "/super-admin/platform", label: "Sozlamalar", icon: Settings, desc: "To‘lov, SMS, flaglar" },
        ].map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-[#3b0764]/10 bg-white p-4 transition hover:border-[#f5b51b]/50 hover:shadow-lg"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#1a0533] to-[#3b0764] text-[#f5b51b]">
              <Icon size={17} />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
