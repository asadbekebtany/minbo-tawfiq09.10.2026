"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckCircle, ChevronDown, Loader2, Search, Shield } from "lucide-react";
import { ClientTablePager } from "@/components/ui/client-table-pager";
import { PortalMenu } from "@/components/ui/portal-menu";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type Role = "customer" | "seller" | "admin" | "super_admin";

type UserRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  isActive: boolean;
  isBanned: boolean;
  orders: number;
  spent: number;
  joinedAt: string;
};

const ROLE_LABELS: Record<Role, string> = {
  customer: "Xaridor",
  seller: "Sotuvchi",
  admin: "Admin",
  super_admin: "Super Admin",
};

const ROLE_COLORS: Record<Role, string> = {
  customer: "bg-gray-100 text-gray-600",
  seller: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  super_admin: "bg-[#cb11ab]/10 text-[#cb11ab]",
};

const ROLE_FILTERS = ["all", "customer", "seller", "admin", "super_admin"] as const;
const ASSIGNABLE_ROLES: Role[] = ["customer", "seller", "admin"];
const PAGE_SIZE = 50;

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

type UsersTableRowProps = {
  user: UserRow;
  open: boolean;
  updating: boolean;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  onChangeRole: (id: string, role: Role) => void;
  onToggleBan: (id: string, isBanned: boolean) => void;
};

const UsersTableRow = memo(function UsersTableRow({
  user,
  open,
  updating,
  onToggleMenu,
  onCloseMenu,
  onChangeRole,
  onToggleBan,
}: UsersTableRowProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <tr className={`transition-colors hover:bg-gray-50 ${user.isBanned ? "opacity-60" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a0533] to-[#cb11ab] text-xs font-bold text-white">
            {(user.name[0] ?? "U").toUpperCase()}
          </div>
          <p className="whitespace-nowrap text-sm font-medium text-gray-900">
            <Link href={`/admin/users/${user.id}`} className="hover:text-[#cb11ab] hover:underline">
              {user.name}
            </Link>
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-700">{user.phone}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => onToggleMenu(user.id)}
          disabled={updating || user.role === "super_admin"}
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLORS[user.role]}`}
        >
          {user.role === "super_admin" && <Shield size={10} />}
          {ROLE_LABELS[user.role]}
          {user.role !== "super_admin" ? <ChevronDown size={10} /> : null}
        </button>
        <PortalMenu
          open={open}
          onClose={onCloseMenu}
          anchorRef={triggerRef}
          widthClass="w-40"
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onChangeRole(user.id, role)}
              className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 ${
                user.role === role ? "font-bold text-[#cb11ab]" : "text-gray-700"
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </PortalMenu>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.orders}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">
        {user.spent > 0 ? `${fmt(user.spent)} so'm` : "—"}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{user.joinedAt}</td>
      <td className="px-4 py-3">
        {user.isBanned ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
            Bloklangan
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
            Faol
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.role !== "super_admin" ? (
          <button
            type="button"
            disabled={updating}
            onClick={() => onToggleBan(user.id, user.isBanned)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              user.isBanned
                ? "bg-green-50 text-green-600 hover:bg-green-100"
                : "bg-red-50 text-red-500 hover:bg-red-100"
            }`}
          >
            {user.isBanned ? (
              <>
                <CheckCircle size={12} /> Blokni ochish
              </>
            ) : (
              <>
                <Ban size={12} /> Bloklash
              </>
            )}
          </button>
        ) : null}
      </td>
    </tr>
  );
});

export function AdminUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q, 300);
  const hasRows = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (hasRows.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (filterRole !== "all") params.set("role", filterRole);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = (await response.json()) as {
        users?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Foydalanuvchilarni yuklab bo‘lmadi");

      const rows: UserRow[] = (data.users ?? []).map((user) => ({
        id: String(user.id),
        name: String(user.name ?? "Foydalanuvchi"),
        phone: String(user.phone ?? "—"),
        email: String(user.email ?? "—"),
        role: String(user.role ?? "customer") as Role,
        isActive: Boolean(user.isActive ?? true),
        isBanned: Boolean(user.isBanned ?? false),
        orders: Number(user.orders ?? 0),
        spent: Number(user.spent ?? 0),
        joinedAt: new Date(String(user.createdAt ?? Date.now())).toLocaleDateString("uz-UZ", {
          month: "short",
          year: "numeric",
        }),
      }));

      setUsers(rows);
      hasRows.current = true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Foydalanuvchilarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedQ, filterRole]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, filterRole]);

  const toggleBan = useCallback(async (id: string, isBanned: boolean) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !isBanned }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Holat yangilanmadi");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, isBanned: !isBanned, isActive: isBanned } : u,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Holat yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const changeRole = useCallback(async (id: string, role: Role) => {
    setUpdatingId(id);
    setOpenRole(null);
    try {
      const response = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Rol yangilanmadi");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rol yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const onToggleMenu = useCallback((id: string) => {
    setOpenRole((current) => (current === id ? null : id));
  }, []);

  const onCloseMenu = useCallback(() => setOpenRole(null), []);

  const qNeedle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchQ =
        !qNeedle ||
        u.name.toLowerCase().includes(qNeedle) ||
        u.phone.includes(q) ||
        u.email.toLowerCase().includes(qNeedle);
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchQ && matchRole;
    });
  }, [filterRole, q, qNeedle, users]);

  const stats = useMemo(
    () => [
      { label: "Jami", val: users.length, color: "text-gray-900" },
      { label: "Xaridorlar", val: users.filter((u) => u.role === "customer").length, color: "text-blue-600" },
      { label: "Sotuvchilar", val: users.filter((u) => u.role === "seller").length, color: "text-purple-600" },
      { label: "Bloklangan", val: users.filter((u) => u.isBanned).length, color: "text-red-500" },
    ],
    [users],
  );

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#002d21]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <h1 className="text-xl font-black text-gray-900">Foydalanuvchilar</h1>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, val, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className={`text-2xl font-black ${color}`}>{val}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, telefon yoki email..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-[#cb11ab] focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setFilterRole(role)}
              className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                filterRole === role
                  ? "border-[#cb11ab] bg-[#cb11ab] text-white"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {role === "all" ? "Barchasi" : ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {refreshing ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-gray-100">
            <div className="h-full w-1/3 animate-pulse bg-[#cb11ab]" />
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Foydalanuvchi", "Telefon / Email", "Role", "Buyurtmalar", "Jami xarid", "Ro'yxatdan", "Holat", "Amallar"].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map((user) => (
                <UsersTableRow
                  key={user.id}
                  user={user}
                  open={openRole === user.id}
                  updating={updatingId === user.id}
                  onToggleMenu={onToggleMenu}
                  onCloseMenu={onCloseMenu}
                  onChangeRole={changeRole}
                  onToggleBan={toggleBan}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Foydalanuvchi topilmadi</div>
          ) : null}
        </div>
        <ClientTablePager
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPage={setPage}
        />
      </div>
    </div>
  );
}
