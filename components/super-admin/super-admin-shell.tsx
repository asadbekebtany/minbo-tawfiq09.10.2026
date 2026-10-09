import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar";
import { SuperAdminSearch } from "@/components/super-admin/super-admin-search";

export function SuperAdminShell({
  children,
  userLabel,
}: {
  children: React.ReactNode;
  userLabel?: string | null;
}) {
  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-clip bg-[#f4f2f8]">
      <SuperAdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#1a0533] via-[#3b0764] to-[#1a0533] px-4 py-2.5 pl-14 text-white lg:px-6 lg:pl-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#f5b51b] to-[#d99a0a] text-[10px] font-black text-[#1a0533]">
              SA
            </span>
            <p className="text-xs font-black uppercase tracking-widest text-[#f5b51b]">
              Super Admin rejimi
            </p>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80 md:inline">
              To‘liq dostup — barcha bo‘limlar ochiq
            </span>
          </div>
          <SuperAdminSearch />
          <p className="hidden max-w-[140px] truncate text-xs text-white/70 sm:block">
            {userLabel ?? ""}
          </p>
        </div>
        <main className="min-w-0 flex-1 overflow-x-clip p-4 pl-14 lg:p-6 lg:pl-6">{children}</main>
      </div>
    </div>
  );
}
