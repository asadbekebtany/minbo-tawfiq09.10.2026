"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PROJECT_SLUG } from "@/lib/brand";
import type { CatalogProduct } from "@/lib/catalog-product";
import { mapApiCartRow, type ApiCartRow } from "@/lib/cart-mapper";
import type { CartItem } from "@/lib/cart-types";

const CART_STORAGE_KEY = `${PROJECT_SLUG}-cart-v1`;

export type CartSource = "unknown" | "local" | "api";

interface CartStore {
  items: CartItem[];
  seenPrices: Record<string, number>;
  source: CartSource;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  updatingId: string | null;
  initialize: () => Promise<void>;
  syncWithSession: () => Promise<void>;
  refresh: () => Promise<void>;
  addItem: (product: CatalogProduct, qty?: number, variantId?: string | null) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: () => number;
  itemCount: () => number;
}

function applyPriceHints(items: CartItem[], seen: Record<string, number>): {
  items: CartItem[];
  seenPrices: Record<string, number>;
} {
  const nextSeen: Record<string, number> = { ...seen };
  const nextItems = items.map((item) => {
    const prev = seen[item.id];
    const current = item.product.price;
    const priceChanged = typeof prev === "number" && prev !== current;
    nextSeen[item.id] = current;
    return {
      ...item,
      priceChanged,
      previousPrice: priceChanged ? prev : item.previousPrice ?? null,
    };
  });
  return { items: nextItems, seenPrices: nextSeen };
}

let cartQueue: Promise<void> = Promise.resolve();

function enqueueCartTask(task: () => Promise<void>): Promise<void> {
  const run = cartQueue.then(task, task);
  cartQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sameVariant(item: CartItem, productId: string, variantId: string | null) {
  return item.product.id === productId && (item.variantId ?? null) === variantId;
}

async function mergeGuestCart(guestItems: CartItem[], remote: CartItem[]) {
  const pending = remote.map((item) => ({ ...item }));

  for (const guestItem of guestItems) {
    const variantId = guestItem.variantId ?? null;
    const index = pending.findIndex((item) => sameVariant(item, guestItem.product.id, variantId));
    const stock = index >= 0 ? pending[index].product.stock : guestItem.product.stock;
    const current = index >= 0 ? pending[index].quantity : 0;
    const quantity = Math.min(guestItem.quantity, Math.max(0, stock - current));
    if (quantity <= 0) continue;

    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: guestItem.product.id,
        quantity,
        variantId,
      }),
    }).catch(() => null);

    if (!response?.ok) continue;
    if (index >= 0) {
      pending[index] = { ...pending[index], quantity: current + quantity };
    } else {
      pending.push({ ...guestItem, quantity, variantId });
    }
  }
}

async function fetchCartItems(): Promise<CartItem[] | null> {
  const response = await fetch("/api/cart", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Savatni yuklab bo‘lmadi");
  }
  const data = (await response.json()) as { items?: ApiCartRow[] };
  return (data.items ?? []).map(mapApiCartRow);
}

function localItemId(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

function upsertLocalItem(
  items: CartItem[],
  product: CatalogProduct,
  qty: number,
  variantId?: string | null,
): CartItem[] {
  const id = localItemId(product.id, variantId);
  const existing = items.find((item) => item.id === id);
  const stock = product.stock;
  if (existing) {
    return items.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.min(item.quantity + qty, stock) }
        : item,
    );
  }
  const variant = product.variants?.find((v) => v.id === variantId);
  const priced: CatalogProduct = variant
    ? {
        ...product,
        name: `${product.name} · ${variant.value}`,
        price: variant.price ?? product.price,
        stock: variant.stock,
        sku: variant.sku ?? product.sku,
      }
    : product;
  return [
    ...items,
    {
      id,
      product: priced,
      quantity: Math.min(qty, priced.stock),
      variantId: variantId ?? null,
      sku: priced.sku,
      unavailable: priced.stock <= 0,
    },
  ];
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      seenPrices: {},
      source: "unknown",
      hydrated: false,
      isLoading: false,
      error: null,
      updatingId: null,

      refresh: async () => {
        const items = await fetchCartItems();
        if (items === null) {
          set({ source: "local" });
          return;
        }
        const hinted = applyPriceHints(items, get().seenPrices);
        set({ items: hinted.items, seenPrices: hinted.seenPrices, source: "api", error: null });
      },

      initialize: () =>
        enqueueCartTask(async () => {
          if (get().hydrated) return;
          set({ isLoading: true, error: null });

          try {
            const items = await fetchCartItems();

            if (items === null) {
              set({ source: "local", hydrated: true, isLoading: false });
              return;
            }

            await mergeGuestCart(get().items, items);
            const merged = await fetchCartItems();
            const hinted = applyPriceHints(merged ?? items, get().seenPrices);
            set({
              items: hinted.items,
              seenPrices: hinted.seenPrices,
              source: "api",
              hydrated: true,
              error: null,
            });
          } catch (err: unknown) {
            set({
              source: "local",
              hydrated: true,
              error: err instanceof Error ? err.message : "Savatni sinxronlashda xato",
            });
          } finally {
            set({ isLoading: false });
          }
        }),

      syncWithSession: () =>
        enqueueCartTask(async () => {
          if (!get().hydrated || get().source === "api") return;

          try {
            const remote = await fetchCartItems();
            if (remote === null) {
              set({ source: "local" });
              return;
            }

            await mergeGuestCart(get().items, remote);
            const merged = await fetchCartItems();
            const hinted = applyPriceHints(merged ?? remote, get().seenPrices);
            set({
              items: hinted.items,
              seenPrices: hinted.seenPrices,
              source: "api",
              hydrated: true,
              isLoading: false,
              error: null,
            });
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Savatni sinxronlashda xato",
            });
          }
        }),

      addItem: async (product, qty = 1, variantId = null) => {
        const { source } = get();

        if (source === "api") {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: product.id, quantity: qty, variantId }),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Savatga qo‘shib bo‘lmadi");
            await get().refresh();
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Savatga qo‘shib bo‘lmadi",
            });
            throw err;
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({
          items: upsertLocalItem(get().items, product, qty, variantId),
          source: get().source === "unknown" ? "local" : get().source,
        });
      },

      removeItem: async (itemId) => {
        const { source, items } = get();

        if (source === "api") {
          const row = items.find((item) => item.id === itemId);
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            if (row?.id) params.set("itemId", row.id);
            else params.set("productId", itemId);

            const response = await fetch(`/api/cart?${params.toString()}`, { method: "DELETE" });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "O‘chirib bo‘lmadi");
            await get().refresh();
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "O‘chirib bo‘lmadi",
            });
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({ items: items.filter((item) => item.id !== itemId) });
      },

      updateQty: async (itemId, qty) => {
        const { source, items } = get();

        if (source === "api") {
          const row = items.find((item) => item.id === itemId);
          if (!row) return;

          set({ updatingId: itemId, error: null });
          try {
            const response = await fetch("/api/cart", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: row.id, quantity: qty }),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Miqdorni yangilab bo‘lmadi");
            await get().refresh();
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Miqdorni yangilab bo‘lmadi",
            });
          } finally {
            set({ updatingId: null });
          }
          return;
        }

        if (qty <= 0) {
          set({ items: items.filter((item) => item.id !== itemId) });
          return;
        }

        set({
          items: items.map((item) =>
            item.id === itemId
              ? { ...item, quantity: Math.min(qty, item.product.stock) }
              : item,
          ),
        });
      },

      clearCart: async () => {
        const { source } = get();

        if (source === "api") {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch("/api/cart", { method: "DELETE" });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Savatni tozalab bo‘lmadi");
            set({ items: [] });
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Savatni tozalab bo‘lmadi",
            });
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({ items: [] });
      },

      total: () =>
        get().items.reduce((sum, item) => {
          if (item.unavailable) return sum;
          return sum + item.product.price * item.quantity;
        }, 0),

      itemCount: () =>
        get().items.reduce((sum, item) => (item.unavailable ? sum : sum + item.quantity), 0),
    }),
    {
      name: CART_STORAGE_KEY,
      skipHydration: true,
      partialize: (state) => ({
        items: state.source === "api" ? [] : state.items,
        seenPrices: state.seenPrices,
      }),
      onRehydrateStorage: () => undefined,
    },
  ),
);
