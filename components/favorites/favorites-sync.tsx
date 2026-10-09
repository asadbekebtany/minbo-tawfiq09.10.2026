"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useFavoritesStore } from "@/lib/favorites-store";

export function FavoritesSync() {
  const pathname = usePathname();

  useEffect(() => {
    void (async () => {
      await useFavoritesStore.persist.rehydrate();
      const state = useFavoritesStore.getState();
      if (!state.hydrated) await state.initialize();
      await state.syncWithSession();
    })();
  }, []);

  useEffect(() => {
    const state = useFavoritesStore.getState();
    if (!state.hydrated || state.source === "api") return;
    void state.syncWithSession();
  }, [pathname]);

  return null;
}
