"use client";

import { useCallback, useEffect, useState } from "react";
import { Headphones } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: { message: string; isAdmin: boolean; createdAt: string } | null;
};

type Message = {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
};

const STATUS: Record<string, string> = {
  open: "Ochiq",
  in_progress: "Jarayonda",
  closed: "Yopilgan",
};

export default function ProfileSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/support", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yuklanmadi");
      setTickets(data.tickets ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openTicket = async (id: string) => {
    setSelectedId(id);
    setError(null);
    try {
      const response = await fetch(`/api/support/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ticket yuklanmadi");
      setMessages(data.ticket?.messages ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ticket yuklanmadi");
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yaratilmadi");
      setSubject("");
      setMessage("");
      await load();
      if (data.ticket?.id) await openTicket(data.ticket.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yaratilmadi");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/support/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Javob yuborilmadi");
      setReply("");
      await openTicket(selectedId);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Javob yuborilmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-[#002d21]">Yordam / Support</h1>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={createTicket} className="rounded-2xl border bg-white p-5 space-y-3">
        <h2 className="font-bold text-gray-900">Yangi murojaat</h2>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Mavzu"
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
        />
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Muammoni yozing..."
          className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none"
        />
        <button
          disabled={busy}
          className="rounded-xl bg-[#004733] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "..." : "Yuborish"}
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 font-bold text-gray-900">Murojaatlarim</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Yuklanmoqda...</p>
          ) : tickets.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Headphones className="mx-auto mb-2 text-[#004733]" />
              Hali murojaat yo‘q
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void openTicket(t.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedId === t.id
                      ? "border-[#004733] bg-[#004733]/5"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 line-clamp-1">{t.subject}</p>
                    <span className="shrink-0 text-xs text-gray-500">{STATUS[t.status] ?? t.status}</span>
                  </div>
                  {t.lastMessage ? (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1">{t.lastMessage.message}</p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 font-bold text-gray-900">Suhbat</h2>
          {!selectedId ? (
            <p className="text-sm text-gray-500">Murojaatni tanlang</p>
          ) : (
            <>
              <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      m.isAdmin ? "bg-gray-100 text-gray-800" : "bg-[#004733]/10 text-gray-900"
                    }`}
                  >
                    <p className="text-[11px] font-medium text-gray-500 mb-0.5">
                      {m.isAdmin ? "Support" : "Siz"}
                    </p>
                    {m.message}
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Javob yozing..."
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />
                <button
                  disabled={busy || !reply.trim()}
                  className="rounded-xl bg-[#004733] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Jo‘natish
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
