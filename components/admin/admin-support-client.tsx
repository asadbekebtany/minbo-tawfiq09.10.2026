"use client";

import { useCallback, useEffect, useState } from "react";
import { Headphones, Loader2, MessageSquare, Send, X } from "lucide-react";

type TicketRow = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null };
  messageCount: number;
  lastMessage: { message: string; isAdmin: boolean; createdAt: string } | null;
};

type TicketMessage = {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
};

type TicketDetail = TicketRow & { messages: TicketMessage[] };

const STATUS_LABELS: Record<TicketRow["status"], string> = {
  open: "Yangi",
  in_progress: "Jarayonda",
  closed: "Yopilgan",
};

const STATUS_COLORS: Record<TicketRow["status"], string> = {
  open: "bg-orange-50 text-orange-600",
  in_progress: "bg-blue-50 text-blue-600",
  closed: "bg-gray-100 text-gray-500",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminSupportClient() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | TicketRow["status"]>("all");
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const response = await fetch(`/api/admin/support?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { tickets?: TicketRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Ticketlarni yuklab bo‘lmadi");
      setTickets(data.tickets ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ticketlarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/support/${id}`, { cache: "no-store" });
      const data = (await response.json()) as { ticket?: TicketDetail; error?: string };
      if (!response.ok || !data.ticket) throw new Error(data.error ?? "Ticket yuklanmadi");
      setSelected(data.ticket);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ticket yuklanmadi");
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/api/admin/support/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Javob yuborilmadi");
      setReply("");
      await openTicket(selected.id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Javob yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (id: string, status: TicketRow["status"]) => {
    try {
      const response = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Status yangilanmadi");
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status yangilanmadi");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#004733]">
          <Headphones size={20} />
          <h1 className="text-2xl font-black text-gray-900">Support murojaatlari</h1>
        </div>
        <p className="text-sm text-gray-500">Xaridor va seller murojaatlarini boshqarish.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {(["all", "open", "in_progress", "closed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              filter === status
                ? "border-[#004733] bg-[#004733] text-white"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {status === "all" ? "Barchasi" : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="animate-spin text-[#002d21]" size={28} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => void openTicket(ticket.id)}
              className="flex w-full items-center gap-3 border-b p-4 text-left transition-colors last:border-0 hover:bg-gray-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#002d21] text-[#f5b51b]">
                <MessageSquare size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="text-gray-900">{ticket.subject}</b>
                <p className="truncate text-xs text-gray-500">
                  {ticket.user.name ?? ticket.user.phone ?? "Foydalanuvchi"} ·{" "}
                  {ticket.lastMessage
                    ? `${ticket.lastMessage.isAdmin ? "Admin: " : ""}${ticket.lastMessage.message}`
                    : "Xabar yo‘q"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
                <p className="mt-1 text-[10px] text-gray-400">{formatDate(ticket.updatedAt)}</p>
              </div>
            </button>
          ))}
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Murojaat topilmadi</div>
          ) : null}
        </div>
      )}

      {selected || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {detailLoading || !selected ? (
              <div className="grid min-h-[200px] place-items-center">
                <Loader2 className="animate-spin text-[#002d21]" size={28} />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b p-4">
                  <div>
                    <b className="text-gray-900">{selected.subject}</b>
                    <p className="text-xs text-gray-500">
                      {selected.user.name ?? "—"} · {selected.user.phone ?? selected.user.email ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selected.status}
                      onChange={(e) => void setStatus(selected.id, e.target.value as TicketRow["status"])}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                    >
                      <option value="open">Yangi</option>
                      <option value="in_progress">Jarayonda</option>
                      <option value="closed">Yopilgan</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {selected.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.isAdmin
                          ? "ml-auto bg-[#002d21] text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p>{msg.message}</p>
                      <p className={`mt-1 text-[10px] ${msg.isAdmin ? "text-white/60" : "text-gray-400"}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  ))}
                  {selected.messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">Hozircha xabar yo‘q</p>
                  ) : null}
                </div>
                <div className="flex gap-2 border-t p-4">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                    placeholder="Javob yozing..."
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#f5b51b]"
                  />
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#002d21] px-4 py-2.5 text-sm font-bold text-[#f5b51b] disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Yuborish
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
