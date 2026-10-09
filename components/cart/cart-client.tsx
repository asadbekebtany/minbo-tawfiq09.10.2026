"use client";

import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Heart, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export function CartClient() {
  const { items, removeItem, updateQty, total, itemCount, isLoading, updatingId, error, source, hydrated } =
    useCartStore();
  const toggleFavorite = useFavoritesStore((store) => store.toggle);
  const favProducts = useFavoritesStore((store) => store.products);

  const subtotal = total();
  const delivery = subtotal >= 500_000 ? 0 : 30_000;
  const grandTotal = subtotal + delivery;
  const blocked = items.some((item) => item.unavailable);

  if (!hydrated || isLoading) {
    return (
      <div className="mx-auto grid max-w-[1280px] min-h-[320px] place-items-center px-4 py-16">
        <Loader2 className="animate-spin text-[#004733]" size={32} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
        <div className="max-w-sm mx-auto">
          <ShoppingBag size={80} className="text-gray-200 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Savat bo'sh</h1>
          <p className="text-gray-500 mb-8">
            Hali hech narsa qo'shilmagan. Katalogdan mahsulot tanlang.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] px-8 py-3 rounded-xl font-bold hover:from-[#ffc733] hover:to-[#f5b51b] transition-all"
          >
            Xarid qilishni boshlash
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  const byStore: Record<string, typeof items> = {};
  items.forEach((item) => {
    const storeName = item.product.store.name;
    if (!byStore[storeName]) byStore[storeName] = [];
    byStore[storeName].push(item);
  });

  return (
    <div className="mx-auto max-w-[1280px] overflow-x-clip px-3 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-4 md:pb-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Savat</h1>
        <span className="rounded-full bg-[#004733] px-2.5 py-0.5 text-sm font-bold text-white">
          {itemCount()} ta
        </span>
        {source === "api" ? (
          <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
            Serverda saqlangan
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {blocked ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ba’zi SKU’lar mavjud emas. Ularni olib tashlang yoki checkoutdan oldin tuzating.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Object.entries(byStore).map(([storeName, storeItems]) => (
            <div key={storeName} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#004733]/10 text-xs font-bold text-[#004733]">
                  {storeName[0]}
                </div>
                <span className="text-sm font-semibold text-gray-900">{storeName}</span>
              </div>

              <div className="divide-y divide-gray-50">
                {storeItems.map((item) => {
                  const img = item.product.images[0]?.url ?? "";
                  const isFav = favProducts.some((p) => p.id === item.product.id);
                  const rowBusy = updatingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 p-3 sm:gap-4 sm:p-4 ${item.unavailable ? "bg-red-50/40" : ""}`}
                    >
                      <Link href={`/product/${item.product.slug}`} className="shrink-0">
                        <div className="h-16 w-16 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 sm:h-20 sm:w-20">
                          {img ? (
                            <Image
                              src={img}
                              alt={item.product.name}
                              width={80}
                              height={80}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : null}
                        </div>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="mb-1 line-clamp-2 text-sm font-medium text-gray-900 hover:text-[#004733]"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mb-1 text-xs text-gray-400">
                          SKU: {item.sku ?? item.product.sku ?? "—"}
                          {item.product.brand ? ` · ${item.product.brand.name}` : ""}
                        </p>
                        {item.unavailable ? (
                          <p className="mb-2 text-xs font-medium text-red-600">
                            {item.unavailableReason ?? "SKU mavjud emas"}
                          </p>
                        ) : null}
                        {item.priceChanged && item.previousPrice ? (
                          <p className="mb-2 text-xs font-medium text-amber-700">
                            Narx o‘zgardi: {formatPrice(item.previousPrice)} → {formatPrice(item.product.price)}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-gray-900">{formatPrice(item.product.price)}</span>
                            {item.product.oldPrice ? (
                              <span className="ml-2 text-xs text-gray-400 line-through">
                                {formatPrice(item.product.oldPrice)}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() => void updateQty(item.id, item.quantity - 1)}
                                disabled={rowBusy}
                                className="px-2.5 py-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="grid w-8 place-items-center text-center text-sm font-semibold">
                                {rowBusy ? <Loader2 size={14} className="animate-spin text-[#004733]" /> : item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => void updateQty(item.id, item.quantity + 1)}
                                disabled={rowBusy || item.unavailable || item.quantity >= item.product.stock}
                                className="px-2.5 py-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => void removeItem(item.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleFavorite(item.product)}
                              className={`rounded-lg p-1.5 transition-colors ${
                                isFav ? "text-red-500" : "text-gray-400 hover:bg-[#004733]/10 hover:text-[#004733]"
                              }`}
                            >
                              <Heart size={15} className={isFav ? "fill-red-500" : ""} />
                            </button>
                          </div>
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                          Jami:{" "}
                          <span className="font-semibold text-gray-800">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                          {item.product.stock > 0 ? (
                            <span className="ml-2 text-gray-400">max {item.product.stock}</span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="scroll-mb-[calc(6rem+env(safe-area-inset-bottom,0px))] rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:scroll-mb-0">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Buyurtma xulosasi</h2>
            <div className="mb-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mahsulotlar ({itemCount()} ta)</span>
                <span className="text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Yetkazib berish</span>
                <span className={delivery === 0 ? "font-medium text-green-600" : "text-gray-900"}>
                  {delivery === 0 ? "Bepul" : formatPrice(delivery)}
                </span>
              </div>
            </div>
            <p className="mb-4 text-xs text-gray-500">Kupon checkoutda qo‘llanadi.</p>
            <div className="mb-4 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span className="text-base font-bold text-gray-900">Jami</span>
                <span className="text-xl font-black text-gray-900">{formatPrice(grandTotal)}</span>
              </div>
            </div>
            {blocked ? (
              <p className="mb-3 text-center text-xs text-red-600">Mavjud bo‘lmagan SKU bilan buyurtma berib bo‘lmaydi.</p>
            ) : null}
            <Link
              href={blocked ? "/cart" : "/checkout"}
              aria-disabled={blocked}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all ${
                blocked
                  ? "pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] hover:from-[#ffc733] hover:to-[#f5b51b]"
              }`}
            >
              Buyurtma berish
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
