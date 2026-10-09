"use client";

import { CartSync } from "@/components/cart/cart-sync";
import { FavoritesSync } from "@/components/favorites/favorites-sync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CartSync />
      <FavoritesSync />
      {children}
    </>
  );
}
