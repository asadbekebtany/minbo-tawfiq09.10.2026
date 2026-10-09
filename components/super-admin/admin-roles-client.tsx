"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Shield, ShieldCheck } from "lucide-react";
import { PortalMenu } from "@/components/ui/portal-menu";
import { PERMISSIONS, getAdminRoleLabel, type AdminRoleType } from "@/lib/permissions";

type AdminUserRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "admin" | "super_admin";
  adminRole: AdminRoleType | null;
};

const ASSIGNABLE_ROLES: AdminRoleType[] = [
  "product_manager",
  "order_manager",
  "seller_manager",
  "content_manager",
  "support_manager",
  "finance_manager",
];

function RoleTrigger({
  user,
  isSuper,
  currentRole,
  open,
  updating,
  onToggle,
  onClose,
  onChange,
}: {
  user: AdminUserRow;
  isSuper: boolean;
  currentRole: AdminRoleType | "super_admin" | null;
  open: boolean;
  updating: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (id: string, role: AdminRoleType) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        disabled={updating || isSuper}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
          isSuper ? "bg-[#f5b51b]/15 text-[#8a6400]" : "bg-[#004733]/8 text-[#004733]"
        }`}
      >
        {isSuper ? <Shield size={10} /> : null}
        {currentRole ? getAdminRoleLabel(currentRole) : "Tayinlanmagan"}
        {!isSuper ? <ChevronDown size={10} /> : null}
      </button>
      <PortalMenu open={open} onClose={onClose} anchorRef={triggerRef} widthClass="w-52">
        {ASSIGNABLE_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onChange(user.id, role)}
            className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 ${
              user.adminRole === role ? "font-bold text-[#004733]" : "text-gray-700"
            }`}
          >
            {getAdminRoleLabel(role)}
          </button>
        ))}
      </PortalMenu>
    </>
  );
}

export function AdminRolesClient() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await response.json()) as {
        users?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Adminlarni yuklab bo‘lmadi");

      const rows = (data.users ?? [])
        .filter((u) => u.role === "admin" || u.role === "super_admin")
        .map((u) => ({
          id: String(u.id),
          name: String(u.name ?? "Admin"),
          phone: String(u.phone ?? "—"),
          email: String(u.email ?? "—"),
          role: u.role as "admin" | "super_admin",
          adminRole: (u.adminRole ?? null) as AdminRoleType | null,
        }));
      setUsers(rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Adminlarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const changeAdminRole = async (id: string, adminRole: AdminRoleType) => {
    setUpdatingId(id);
    setOpenId(null);
    try {
      const response = await fetch(`/api/admin/users/${id}/admin-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRole }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Admin roli yangilanmadi");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, adminRole } : u)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Admin roli yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#002d21]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#004733]">
          <ShieldCheck size={20} />
          <h1 className="text-2xl font-black text-gray-900">Admin rollari</h1>
        </div>
        <p className="text-sm text-gray-500">
          Adminlarga granular rol tayinlash. Rol o‘zgarganda ruxsatlar avtomatik yangilanadi.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Admin, telefon, rol..."
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#f5b51b]"
      />

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Admin", "Telefon / Email", "Admin roli", "Ruxsatlar"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users
                .filter((user) => {
                  const needle = q.trim().toLowerCase();
                  if (!needle) return true;
                  return [user.name, user.phone, user.email, user.role, user.adminRole]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(needle));
                })
                .map((user) => {
                const isSuper = user.role === "super_admin";
                const currentRole = isSuper ? "super_admin" : user.adminRole;
                return (
                  <tr key={user.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{user.phone}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleTrigger
                        user={user}
                        isSuper={isSuper}
                        currentRole={currentRole}
                        open={openId === user.id}
                        updating={updatingId === user.id}
                        onToggle={() => setOpenId(openId === user.id ? null : user.id)}
                        onClose={() => setOpenId(null)}
                        onChange={changeAdminRole}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-md flex-wrap gap-1">
                        {(currentRole ? PERMISSIONS[currentRole] : []).map((p) => (
                          <span
                            key={p}
                            className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 ring-1 ring-gray-200"
                          >
                            {p}
                          </span>
                        ))}
                        {!currentRole ? <span className="text-xs text-gray-400">—</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Admin topilmadi</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
