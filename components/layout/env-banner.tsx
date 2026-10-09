"use client";

import { clientEnv } from "@/lib/env.client";

export function EnvBanner() {
  if (!clientEnv.showEnvBanner) return null;

  return (
    <div
      role="status"
      className="bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-amber-950"
    >
      STAGING muhiti — haqiqiy to‘lov va SMS ishlatilmaydi
    </div>
  );
}
