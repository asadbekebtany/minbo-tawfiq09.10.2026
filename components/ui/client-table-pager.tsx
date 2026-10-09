"use client";

export function ClientTablePager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500">
        {total} tadan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40"
        >
          Oldingi
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40"
        >
          Keyingi
        </button>
      </div>
    </div>
  );
}
