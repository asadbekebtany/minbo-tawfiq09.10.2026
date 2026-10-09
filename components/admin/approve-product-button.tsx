"use client";

import { useState } from "react";

export function ApproveProductButton({ productId }: { productId: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) return <span className="text-[10px] font-semibold text-green-700">Tasdiqlandi</span>;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: true, isActive: true }),
        });
        setBusy(false);
        if (res.ok) setDone(true);
      }}
      className="shrink-0 rounded-lg bg-[#004733] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
    >
      Tasdiq
    </button>
  );
}
