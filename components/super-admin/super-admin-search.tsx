"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PortalMenu } from "@/components/ui/portal-menu";

type Hit = { type: string; id: string; title: string; href: string; meta?: string | null };

export function SuperAdminSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setError(null);
      setLoading(false);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      setOpen(true);
      fetch(`/api/super-admin/search?q=${encodeURIComponent(q.trim())}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (r) => {
          const data = (await r.json()) as { results?: Hit[]; error?: string };
          if (!r.ok) throw new Error(data.error ?? "Qidiruv xato");
          setHits(data.results ?? []);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (err instanceof Error && err.name === "AbortError") return;
          setHits([]);
          setError(err instanceof Error ? err.message : "Qidiruv xato");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  return (
    <div className="relative min-w-0 flex-1 max-w-md">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (q.trim().length >= 2) setOpen(true);
        }}
        placeholder="Order, seller, telefon, SKU, OEM, payout, tracking..."
        className="w-full min-w-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none"
      />
      <PortalMenu
        open={open && q.trim().length >= 2}
        onClose={() => setOpen(false)}
        anchorRef={inputRef}
        matchAnchorWidth
      >
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin" /> Qidirilmoqda...
          </div>
        ) : error ? (
          <p className="px-3 py-3 text-xs text-red-600">{error}</p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-3 text-xs text-gray-400">Natija topilmadi</p>
        ) : (
          hits.map((hit) => (
            <Link
              key={`${hit.type}-${hit.id}`}
              href={hit.href}
              className="block px-3 py-2 text-xs text-gray-800 hover:bg-gray-50"
              onClick={() => {
                setHits([]);
                setOpen(false);
              }}
            >
              <span className="font-semibold uppercase text-[#7c3aed]">{hit.type}</span>{" "}
              {hit.title}
              {hit.meta ? <span className="text-gray-400"> · {hit.meta}</span> : null}
            </Link>
          ))
        )}
      </PortalMenu>
    </div>
  );
}
