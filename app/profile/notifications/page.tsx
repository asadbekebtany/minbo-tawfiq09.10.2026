"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yuklanmadi");
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#002d21]">Bildirishnomalar</h1>
          {unread > 0 ? (
            <p className="text-sm text-gray-500">{unread} ta o‘qilmagan</p>
          ) : null}
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => void markAll()}
            className="text-sm font-medium text-[#004733] hover:underline"
          >
            Barchasini o‘qilgan
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
          <Bell className="mx-auto mb-3 text-[#004733]" />
          Hali bildirishnoma yo‘q.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const content = (
              <div
                className={`rounded-2xl border p-4 transition-colors ${
                  n.isRead ? "border-gray-100 bg-white" : "border-[#004733]/20 bg-[#004733]/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{n.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                  {!n.isRead ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        void markOne(n.id);
                      }}
                      className="shrink-0 text-xs font-medium text-[#004733] hover:underline"
                    >
                      O‘qildi
                    </button>
                  ) : null}
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => void markOne(n.id)}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
