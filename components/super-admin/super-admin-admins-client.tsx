"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Shield, Users } from "lucide-react";
import { getAdminRoleLabel, type AdminRoleType } from "@/lib/permissions";
import { formatUtc } from "@/components/super-admin/format-ts";

type AdminRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  adminRole: AdminRoleType | null;
  adminRoleLabel: string | null;
  auditCount: number;
  lastAction: {
    action: string;
    entityType: string;
    createdAt: string;
  } | null;
};

export function SuperAdminAdminsClient() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRoleType>("support_manager");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/admins", { cache: "no-store" });
      const data = (await res.json()) as { admins?: AdminRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setAdmins(data.admins ?? []);
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

  const createAdmin = async () => {
    if (!phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim() || undefined, adminRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yaratilmadi");
      setPhone("");
      setName("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yaratilmadi");
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (userId: string, isActive: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yangilanmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yangilanmadi");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#1a0533]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[#3b0764]">
            <Users size={20} />
            <h1 className="text-2xl font-black text-gray-900">Adminlar</h1>
          </div>
          <p className="text-sm text-gray-500">
            Barcha admin / super admin hisoblar, rollar va oxirgi faollik.
          </p>
        </div>
        <Link
          href="/super-admin/roles"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1a0533] to-[#3b0764] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Shield size={14} />
          Rollarni boshqarish
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ism, telefon, rol..."
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#f5b51b]"
      />

      <div className="rounded-2xl border border-[#3b0764]/10 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-gray-900">Yangi admin</p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefon"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ism"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={adminRole}
            onChange={(e) => setAdminRole(e.target.value as AdminRoleType)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            {(
              [
                "product_manager",
                "order_manager",
                "seller_manager",
                "content_manager",
                "support_manager",
                "finance_manager",
              ] as const
            ).map((r) => (
              <option key={r} value={r}>
                {getAdminRoleLabel(r)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !phone.trim()}
            onClick={() => void createAdmin()}
            className="rounded-xl bg-[#1a0533] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Yaratish
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3b0764]/10 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Oxirgi amal</th>
                <th className="px-4 py-3">Audit</th>
                <th className="px-4 py-3">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.filter((a) => {
                const needle = q.trim().toLowerCase();
                if (!needle) return true;
                return [a.name, a.phone, a.email, a.role, a.adminRoleLabel]
                  .filter(Boolean)
                  .some((v) => String(v).toLowerCase().includes(needle));
              }).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Admin topilmadi
                  </td>
                </tr>
              ) : (
                admins
                  .filter((a) => {
                    const needle = q.trim().toLowerCase();
                    if (!needle) return true;
                    return [a.name, a.phone, a.email, a.role, a.adminRoleLabel]
                      .filter(Boolean)
                      .some((v) => String(v).toLowerCase().includes(needle));
                  })
                  .map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{a.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{a.phone ?? a.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {a.role === "super_admin"
                          ? "Super Admin"
                          : a.adminRoleLabel ??
                            (a.adminRole ? getAdminRoleLabel(a.adminRole) : "Tayinlanmagan")}
                      </p>
                      <p className="text-[11px] text-gray-400">{a.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      {a.isBanned ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                          Banned
                        </span>
                      ) : a.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          Faol
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                          Nofaol
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {a.lastAction ? (
                        <>
                          <p className="font-medium">{a.lastAction.action}</p>
                          <p className="text-gray-400">
                            {formatUtc(a.lastAction.createdAt)}
                          </p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">{a.auditCount}</td>
                    <td className="px-4 py-3">
                      {a.role === "admin" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void setActive(a.id, !a.isActive)}
                          className="text-xs font-bold text-[#3b0764] hover:underline disabled:opacity-50"
                        >
                          {a.isActive ? "Deaktiv" : "Faollashtirish"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Link
        href="/admin/audit-logs"
        className="inline-block text-sm font-bold text-[#3b0764] hover:underline"
      >
        To‘liq audit log →
      </Link>
    </div>
  );
}
