"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Star, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import type { CatalogProduct } from "@/lib/catalog-product";
import { useEffect, useState } from "react";

interface ProductCardProps {
  product: CatalogProduct;
}

function soldLabel(count: number) {
  if (count <= 0) return null;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(".0", "")}k sotilgan`;
  return `${count} sotilgan`;
}

function defaultVariantId(product: CatalogProduct): string | null {
  return product.variants?.[0]?.id ?? null;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((store) => store.addItem);
  const persistedFav = useFavoritesStore((store) =>
    store.products.some((p) => p.id === product.id),
  );
  const toggleFavorite = useFavoritesStore((store) => store.toggle);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const isFav = clientReady && persistedFav;

  const image = product.images[0]?.url || "/placeholder-product.png";
  const sold = soldLabel(product.soldCount);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    setCartError(null);
    try {
      await addItem(product, 1, defaultVariantId(product));
      setAddedToCart(true);
      window.setTimeout(() => setAddedToCart(false), 1800);
    } catch (err: unknown) {
      setCartError(err instanceof Error ? err.message : "Savatga qo‘shib bo‘lmadi");
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleFavorite(product);
    } catch {
      // ignore
    }
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#f5b51b]/15 bg-[#fffdf7] transition hover:border-[#f5b51b]/55 hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-white">
        <Image
          src={image}
          alt={product.name}
          fill
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.discount > 0 ? (
            <span className="rounded-md bg-[#e23b3b] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              −{product.discount}%
            </span>
          ) : null}
          {product.soldCount > 100 ? (
            <span className="rounded-md bg-[#002d21] px-1.5 py-0.5 text-[10px] font-bold text-[#f5b51b] shadow-sm">
              HIT
            </span>
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        onClick={handleFavorite}
        aria-label="Sevimlilarga"
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-md transition hover:scale-110"
      >
        <Heart
          size={15}
          className={isFav ? "fill-[#e23b3b] text-[#e23b3b]" : "text-gray-400"}
        />
      </button>

      <div className="flex flex-1 flex-col gap-1 p-2.5 pt-2">
        {/* WB-style: price first */}
        <div>
          <p className="text-base font-extrabold leading-tight text-[#002d21] sm:text-lg">
            {formatPrice(product.price)}
          </p>
          {product.oldPrice && product.oldPrice > product.price ? (
            <p className="text-[11px] text-gray-400 line-through">{formatPrice(product.oldPrice)}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-0.5 font-semibold text-gray-700">
            <Star size={11} className="fill-[#f5b51b] text-[#f5b51b]" />
            {product.rating.toFixed(1)}
          </span>
          {product.reviewCount > 0 ? <span>· {product.reviewCount} sharh</span> : null}
          {sold ? <span>· {sold}</span> : null}
        </div>

        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-xs font-medium leading-snug text-gray-800 hover:text-[#004733] sm:text-[13px]"
        >
          {product.name}
        </Link>

        {product.subtitle ? (
          <p className="line-clamp-1 text-[11px] text-gray-400">{product.subtitle}</p>
        ) : null}

        <Link
          href={`/store/${product.store.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 truncate text-[11px] font-medium text-[#004733] hover:underline"
        >
          {product.store.name}
          {product.store.isVerified ? " ✓" : ""}
        </Link>

        {product.stock > 0 ? (
          <p className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <Truck size={11} />
            1–3 kunda yetkaziladi
          </p>
        ) : (
          <p className="text-[11px] font-medium text-red-500">Omborda yo‘q</p>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
            product.stock === 0
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : addedToCart
                ? "bg-[#004733] text-white"
                : "bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] hover:from-[#ffc733] hover:to-[#f5b51b]"
          }`}
        >
          <ShoppingCart size={14} strokeWidth={2.4} />
          {product.stock === 0 ? "Tugagan" : addedToCart ? "Qo‘shildi ✓" : "Savatga"}
        </button>
        {cartError ? (
          <p className="text-[11px] font-medium leading-snug text-red-500">{cartError}</p>
        ) : null}
      </div>
    </article>
  );
}
