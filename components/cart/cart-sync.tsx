"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";

/** Login holatida savatni server bilan sinxronlashtirish */
export function CartSync() {
  const pathname = usePathname();

  useEffect(() => {
    void (async () => {
      await useCartStore.persist.rehydrate();
      const state = useCartStore.getState();
      if (!state.hydrated) await state.initialize();
      await state.syncWithSession();
    })();
  }, []);

  useEffect(() => {
    const state = useCartStore.getState();
    if (!state.hydrated || state.source === "api") return;
    void state.syncWithSession();
  }, [pathname]);

  return null;
}
