"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Rating } from "@/components/ui/rating";

type MyReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string; image: string | null };
};

type DeliveredItem = {
  productId: string;
  name: string;
  image?: string | null;
  orderId: string;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [pending, setPending] = useState<DeliveredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ productId: "", rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewsRes, ordersRes] = await Promise.all([
        fetch("/api/reviews?mine=true", { cache: "no-store" }),
        fetch("/api/orders?status=delivered", { cache: "no-store" }),
      ]);
      const reviewsData = await reviewsRes.json();
      const ordersData = await ordersRes.json();
      if (!reviewsRes.ok) throw new Error(reviewsData.error ?? "Sharhlar yuklanmadi");
      if (!ordersRes.ok) throw new Error(ordersData.error ?? "Buyurtmalar yuklanmadi");

      const myReviews: MyReview[] = reviewsData.reviews ?? [];
      setReviews(myReviews);
      const reviewed = new Set(myReviews.map((r) => r.product.id));

      const items: DeliveredItem[] = [];
      for (const order of ordersData.orders ?? []) {
        for (const item of order.items ?? []) {
          if (item.productId && !reviewed.has(item.productId)) {
            items.push({
              productId: item.productId,
              name: item.name,
              image: item.image,
              orderId: order.id,
            });
          }
        }
      }
      setPending(items);
      if (!form.productId && items[0]) {
        setForm((f) => ({ ...f, productId: items[0].productId }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, [form.productId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          rating: form.rating,
          comment: form.comment || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Saqlanmadi");
      setForm({ productId: "", rating: 5, comment: "" });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-[#002d21]">Sharhlarim</h1>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {pending.length > 0 && (
        <form onSubmit={submit} className="rounded-2xl border bg-white p-5 space-y-3">
          <h2 className="font-bold text-gray-900">Yangi sharh</h2>
          <select
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          >
            {pending.map((item) => (
              <option key={`${item.orderId}-${item.productId}`} value={item.productId}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} yulduz
              </option>
            ))}
          </select>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={3}
            placeholder="Fikringiz..."
            className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none"
          />
          <button
            disabled={submitting}
            className="rounded-xl bg-[#004733] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "..." : "Yuborish"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">Yuklanmoqda...</div>
      ) : reviews.length === 0 ? (
        <div className="mt-5 rounded-2xl border bg-white p-10 text-center text-gray-500">
          <Star className="mx-auto mb-3 text-[#f5b51b]" />
          Hali sharh qoldirmagansiz.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3 rounded-2xl border bg-white p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                {review.product.image ? (
                  <Image src={review.product.image} alt="" fill className="object-contain p-1" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${review.product.slug}`} className="font-semibold text-gray-900 hover:text-[#004733]">
                  {review.product.name}
                </Link>
                <div className="mt-1">
                  <Rating value={review.rating} size="sm" />
                </div>
                {review.comment ? <p className="mt-1 text-sm text-gray-600">{review.comment}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
