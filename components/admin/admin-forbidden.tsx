import Link from "next/link";

export function AdminForbidden({
  permission,
  message,
}: {
  permission?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
      <p className="text-lg font-black text-amber-950">Ruxsat yo‘q</p>
      <p className="mt-2 text-sm text-amber-800">
        {message ?? "Bu sahifa uchun huquqingiz yetarli emas."}
      </p>
      {permission ? (
        <p className="mt-1 font-mono text-xs text-amber-700">{permission}</p>
      ) : null}
      <Link
        href="/admin/dashboard"
        className="mt-4 inline-block rounded-xl bg-[#002d21] px-4 py-2 text-sm font-bold text-[#f5b51b]"
      >
        Dashboardga qaytish
      </Link>
    </div>
  );
}
