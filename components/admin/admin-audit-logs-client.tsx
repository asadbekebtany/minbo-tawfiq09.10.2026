"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ScrollText, Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getRoleLabel } from "@/lib/permissions";

type AuditAction =
  | "user_role_update"
  | "user_ban_update"
  | "order_status_update"
  | "site_settings_update"
  | "auth_login"
  | "admin_role_update"
  | "coupon_create"
  | "coupon_update"
  | "coupon_delete"
  | "support_ticket_update"
  | "return_status_update";

type AuditLogRow = {
  id: string;
  action: AuditAction;
  actionLabel: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    role: string;
  };
};

const ACTION_OPTIONS: Array<{ value: "" | AuditAction; label: string }> = [
  { value: "", label: "Barcha amallar" },
  { value: "user_role_update", label: "Rol o'zgartirish" },
  { value: "user_ban_update", label: "Blok / faollashtirish" },
  { value: "order_status_update", label: "Buyurtma statusi" },
  { value: "site_settings_update", label: "Sayt sozlamalari" },
  { value: "auth_login", label: "Kirish" },
  { value: "admin_role_update", label: "Admin roli" },
  { value: "coupon_create", label: "Kupon yaratish" },
  { value: "coupon_update", label: "Kupon yangilash" },
  { value: "coupon_delete", label: "Kupon o'chirish" },
  { value: "support_ticket_update", label: "Support ticket" },
  { value: "return_status_update", label: "Qaytarish statusi" },
];

function formatMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  try {
    return JSON.stringify(metadata);
  } catch {
    return "—";
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminAuditLogsClient() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [action, setAction] = useState<"" | AuditAction>("");
  const debouncedQ = useDebouncedValue(q, 300);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (action) params.set("action", action);
      params.set("limit", "50");

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = (await response.json()) as {
        logs?: AuditLogRow[];
        total?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Audit loglarni yuklab bo‘lmadi");
      }

      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Audit loglarni yuklab bo‘lmadi");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [action, debouncedQ]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[#004733]">
            <ScrollText size={20} />
            <h1 className="text-2xl font-black text-gray-900">Audit log</h1>
          </div>
          <p className="text-sm text-gray-500">
            Admin va super admin amallari tarixi ({total} ta yozuv)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Yangilash
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Actor, entity ID yoki telefon bo‘yicha qidirish..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-[#004733] focus:outline-none"
            />
          </div>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as "" | AuditAction)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#004733] focus:outline-none"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="grid min-h-[280px] place-items-center">
            <Loader2 className="animate-spin text-[#004733]" size={28} />
          </div>
        ) : logs.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center px-4 text-center">
            <div>
              <ScrollText size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">Audit yozuvlari topilmadi</p>
              <p className="mt-1 text-sm text-gray-500">
                Admin amallari bajarilganda bu yerda ko‘rinadi.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  {["Vaqt", "Amal", "Actor", "Entity", "Tafsilot", "IP"].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[#004733]/8 px-2.5 py-1 text-xs font-medium text-[#004733]">
                        {log.actionLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-900">{log.actor.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{log.actor.phone ?? log.actor.email ?? "—"}</p>
                      <p className="text-xs text-gray-400">{getRoleLabel(log.actor.role as never)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <p>{log.entityType}</p>
                      <p className="text-xs text-gray-500">{log.entityId ?? "—"}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-gray-600 break-all">
                      {formatMetadata(log.metadata)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {log.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
