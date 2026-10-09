"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import {
  Heart,
  ShoppingCart,
  Truck,
  RotateCcw,
  Shield,
  MapPin,
  ChevronRight,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/product/product-grid";
import type { CatalogProduct } from "@/lib/catalog-product";

interface ProductDetailClientProps {
  product: CatalogProduct;
  related: CatalogProduct[];
}

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
};

type QuestionRow = {
  id: string;
  question: string;
  createdAt: string;
  userName: string;
  answers: { id: string; answer: string; from: string; createdAt: string }[];
};

export function ProductDetailClient({ product, related }: ProductDetailClientProps) {
  const addItem = useCartStore((store) => store.addItem);
  const addError = useCartStore((store) => store.error);
  const isFav = useFavoritesStore((store) =>
    store.products.some((p) => p.id === product.id),
  );
  const toggleFavorite = useFavoritesStore((store) => store.toggle);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants?.[0]?.id ?? null,
  );
  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayStock = selectedVariant?.stock ?? product.stock;
  const displaySku = selectedVariant?.sku ?? product.sku ?? "—";
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews" | "questions">("desc");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewCount, setReviewCount] = useState(product.reviewCount);
  const [ratingForm, setRatingForm] = useState(5);
  const [commentForm, setCommentForm] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");

  const images = product.images.length > 0
    ? product.images
    : [{ url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" }];

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setDeliveryDate(d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.reviews)) {
          setReviews(data.reviews);
          setReviewCount(data.reviews.length);
        }
      })
      .catch(() => undefined);

    fetch(`/api/questions?productId=${encodeURIComponent(product.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.questions)) setQuestions(data.questions);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [product.id]);

  const handleAddToCart = async () => {
    try {
      await addItem(product, quantity, selectedVariantId);
      setAddedToCart(true);
      window.setTimeout(() => setAddedToCart(false), 2000);
    } catch {
      // xato store.error da
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          rating: ratingForm,
          comment: commentForm || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Sharh saqlanmadi");
      setCommentForm("");
      const refreshed = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`, {
        cache: "no-store",
      });
      const refreshedData = await refreshed.json();
      if (Array.isArray(refreshedData?.reviews)) {
        setReviews(refreshedData.reviews);
        setReviewCount(refreshedData.reviews.length);
      }
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Sharh saqlanmadi");
    } finally {
      setReviewLoading(false);
    }
  };

  const description = product.description?.trim() ?? "";

  return (
    <div className="mx-auto max-w-[1280px] overflow-x-hidden px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-[#004733]">Bosh sahifa</Link>
        <ChevronRight size={14} />
        <Link href="/catalog" className="hover:text-[#004733]">Katalog</Link>
        <ChevronRight size={14} />
        <Link href={`/catalog/${product.category.slug}`} className="hover:text-[#004733]">
          {product.category.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Images */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {/* Main image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3 border border-gray-100">
              <Image
                src={images[selectedImage].url}
                alt={product.name}
                fill
                className="object-contain p-6"
                priority
              />
              {product.discount > 0 && (
                <div className="absolute top-4 left-4">
                  <Badge variant="discount" className="text-sm px-3 py-1">
                    -{product.discount}%
                  </Badge>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? "border-[#004733]" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <Image src={img.url} alt="" width={64} height={64} className="object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-1">
          {/* Brand */}
          {product.brand && (
            <Link
              href={`/brand/${product.brand.name.toLowerCase()}`}
              className="text-sm text-[#004733] font-medium hover:underline mb-2 block"
            >
              {product.brand.name}
            </Link>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <Rating value={product.rating} count={reviewCount} size="md" />
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-500">{product.soldCount} ta sotilgan</span>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-gray-900">{formatPrice(displayPrice)}</span>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.oldPrice)}</span>
              )}
            </div>
            {product.discount > 0 && product.oldPrice && (
              <p className="text-sm text-green-600 mt-1">
                Tejaysiz: {formatPrice(product.oldPrice - product.price)}
              </p>
            )}
          </div>

          {/* Store */}
          <Link
            href={`/store/${product.store.slug}`}
            className="mb-6 flex items-center gap-2 rounded-xl bg-gray-50 p-3 transition hover:bg-[#f5b51b]/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004733]/10 text-sm font-bold text-[#004733]">
              {product.store.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{product.store.name}</p>
              {product.store.isVerified ? (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check size={10} /> Tasdiqlangan sotuvchi
                </p>
              ) : (
                <p className="text-xs text-gray-500">Do‘konga o‘tish →</p>
              )}
            </div>
          </Link>

          {/* Tabs */}
          <div className="relative mb-4">
            <div className="product-tabs-clip">
              <div className="product-tabs-scroll">
                <div className="flex h-10 min-w-max items-stretch" role="tablist">
                  {[
                    { key: "desc", label: "Tavsif" },
                    { key: "specs", label: "Xarakteristika" },
                    { key: "reviews", label: `Sharhlar (${reviewCount})` },
                    { key: "questions", label: "Savollar" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`relative h-10 shrink-0 px-3.5 text-[13px] font-semibold leading-none whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
                        activeTab === tab.key
                          ? "text-[#004733]"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                      <span
                        aria-hidden
                        className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full ${
                          activeTab === tab.key ? "bg-[#004733]" : "bg-transparent"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gray-200" />
          </div>

          <div className="text-sm text-gray-700">
            {activeTab === "desc" && (
              <div className="space-y-2">
                {description ? (
                  <p className="whitespace-pre-wrap">{description}</p>
                ) : (
                  <p className="text-gray-500">Tavsif kiritilmagan.</p>
                )}
                {product.oemNumber ? (
                  <p className="text-xs text-gray-500">OEM: {product.oemNumber}</p>
                ) : null}
              </div>
            )}
            {activeTab === "specs" && (
              <div className="space-y-2">
                {[
                  ["Kategoriya", product.category.name],
                  ["Brend", product.brand?.name ?? "—"],
                  ["SKU", displaySku],
                  ["OEM", product.oemNumber ?? "—"],
                  ["Mavjudlik", displayStock > 0 ? `${displayStock} ta omborda` : "Tugagan"],
                  ["Kafolat", product.warranty ?? "12 oy"],
                  ["Qaytarish", product.returnPolicy ?? "14 kun"],
                ].map(([key, val]) => (
                  <div key={key} className="flex gap-4 py-2 border-b border-gray-100">
                    <span className="text-gray-500 w-32 shrink-0">{key}</span>
                    <span className="text-gray-900 font-medium">{val}</span>
                  </div>
                ))}
                {product.compatibility && product.compatibility.length > 0 ? (
                  <div className="pt-3">
                    <p className="mb-2 font-semibold text-gray-900">Mos avtomobillar</p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {product.compatibility.map((row) => (
                        <li key={row.generationId}>
                          <Link
                            href={`/catalog?generationId=${encodeURIComponent(row.generationId)}`}
                            className="text-[#004733] hover:underline"
                          >
                            {row.label}
                          </Link>
                          {row.note ? <span className="text-gray-400"> — {row.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="pt-2 text-xs text-gray-400">Moslashuv ma’lumoti kiritilmagan.</p>
                )}
              </div>
            )}
            {activeTab === "reviews" && (
              <div className="space-y-5">
                <form onSubmit={submitReview} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Sharh qoldirish</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Baholash:</span>
                    <select
                      value={ratingForm}
                      onChange={(e) => setRatingForm(Number(e.target.value))}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} ★
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={commentForm}
                    onChange={(e) => setCommentForm(e.target.value)}
                    rows={3}
                    placeholder="Mahsulot haqida fikringiz..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#004733]"
                  />
                  {reviewError ? (
                    <p className="text-sm text-red-600">{reviewError}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Faqat yetkazilgan buyurtma uchun</p>
                  )}
                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="rounded-xl bg-[#004733] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {reviewLoading ? "Saqlanmoqda..." : "Yuborish"}
                  </button>
                </form>

                {reviews.length === 0 ? (
                  <p className="text-gray-400">Hali sharh yo&apos;q. Birinchi sharh qoldiring!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Rating value={review.rating} size="sm" />
                          <span className="text-sm font-medium text-gray-900">{review.userName}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString("uz-UZ")}
                          </span>
                        </div>
                        {review.comment ? (
                          <p className="text-sm text-gray-600">{review.comment}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === "questions" && (
              <div className="space-y-4">
                <form
                  className="space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setQuestionError(null);
                    setQuestionLoading(true);
                    try {
                      const res = await fetch("/api/questions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ productId: product.id, question: questionText }),
                      });
                      const data = (await res.json()) as { error?: string };
                      if (!res.ok) throw new Error(data.error ?? "Yuborilmadi. Avval kiring.");
                      setQuestionText("");
                      const reload = await fetch(
                        `/api/questions?productId=${encodeURIComponent(product.id)}`,
                        { cache: "no-store" },
                      );
                      const json = await reload.json();
                      if (Array.isArray(json.questions)) setQuestions(json.questions);
                    } catch (err: unknown) {
                      setQuestionError(err instanceof Error ? err.message : "Yuborilmadi");
                    } finally {
                      setQuestionLoading(false);
                    }
                  }}
                >
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={3}
                    placeholder="Mahsulot haqida savol yozing..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                  {questionError ? <p className="text-xs text-red-600">{questionError}</p> : null}
                  <button
                    type="submit"
                    disabled={questionLoading || questionText.trim().length < 8}
                    className="rounded-xl bg-[#004733] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Savol yuborish
                  </button>
                </form>
                {questions.length === 0 ? (
                  <p className="text-gray-400">Hali savol yo‘q. Birinchi bo‘lib so‘rang.</p>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q) => (
                      <div key={q.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-900">{q.question}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {q.userName} · {new Date(q.createdAt).toLocaleDateString("uz-UZ")}
                        </p>
                        {q.answers.map((a) => (
                          <p key={a.id} className="mt-2 text-sm text-[#004733]">
                            <span className="font-semibold">
                              {a.from === "seller" ? "Sotuvchi" : a.from === "admin" ? "Admin" : "Javob"}:{" "}
                            </span>
                            {a.answer}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Buy box */}
        <div className="lg:col-span-1">
          <div className="scroll-mb-[calc(6rem+env(safe-area-inset-bottom,0px))] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:scroll-mb-0">
            {/* Stock */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${displayStock > 0 ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`text-sm font-medium ${displayStock > 0 ? "text-green-600" : "text-red-500"}`}>
                {displayStock > 0 ? `Omborda: ${displayStock} ta` : "Tugagan"}
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">SKU: {displaySku}</p>
            {product.variants && product.variants.length > 0 ? (
              <div className="mb-4 flex max-w-full flex-wrap gap-2 overflow-x-auto pb-1">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      selectedVariantId === variant.id
                        ? "border-[#004733] bg-[#004733]/5 text-[#004733]"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {variant.value}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Price */}
            <div className="mb-4">
              <div className="text-2xl font-black text-gray-900">{formatPrice(displayPrice)}</div>
              {product.oldPrice && (
                <div className="text-sm text-gray-400 line-through">{formatPrice(product.oldPrice)}</div>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-gray-600">Miqdor:</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Add to cart */}
            {addError ? (
              <p className="mb-3 text-xs text-red-600">{addError}</p>
            ) : null}
            <button
              onClick={handleAddToCart}
              disabled={displayStock === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mb-3 ${
                displayStock === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : addedToCart
                  ? "bg-green-600 text-white"
                  : "bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] hover:from-[#ffc733] hover:to-[#f5b51b]"
              }`}
            >
              {addedToCart ? (
                <><Check size={16} /> Savatga qo'shildi!</>
              ) : (
                <><ShoppingCart size={16} /> Savatga qo'shish</>
              )}
            </button>

            {/* Buy now */}
            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 border-[#004733] text-[#004733] hover:bg-[#004733]/5 transition-colors mb-4"
            >
              Hoziroq sotib olish
            </Link>

            {/* Favorite */}
            <button
              onClick={() => void toggleFavorite(product)}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-colors ${
                isFav ? "text-red-500 bg-red-50" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Heart size={16} className={isFav ? "fill-red-500" : ""} />
              {isFav ? "Sevimlilardan olib tashlash" : "Sevimlilar ro'yxatiga"}
            </button>

            <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <Truck size={16} className="text-[#004733] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Yetkazib berish</p>
                  <p className="text-gray-500">Kuryerga: {deliveryDate}</p>
                  <p className="text-gray-500">Punktga: 1-2 kun</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={16} className="text-[#004733] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Olish punkti</p>
                  <p className="text-gray-500">Olish punktidan olish mumkin</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Shield size={16} className="text-[#004733] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Kafolat</p>
                  <p className="text-gray-500">
                    {product.warranty?.trim() || "Kafolat ko‘rsatilmagan"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <RotateCcw size={16} className="text-[#004733] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Qaytarish</p>
                  <p className="text-gray-500">
                    {product.returnPolicy?.trim() || "Qaytarish shartlari ko‘rsatilmagan"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">O'xshash mahsulotlar</h2>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}
