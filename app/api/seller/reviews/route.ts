import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { z } from "zod";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  reviewId: z.string().min(1),
  sellerReply: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ reviews: [] });

  const { searchParams } = new URL(request.url);
  const unanswered = searchParams.get("unanswered") === "true";

  const reviews = await prisma.review.findMany({
    where: {
      product: { storeId: store.id },
      ...(unanswered ? { OR: [{ sellerReply: null }, { sellerReply: "" }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, phone: true } },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      sellerReply: r.sellerReply,
      isApproved: r.isApproved,
      createdAt: r.createdAt.toISOString(),
      buyer: { name: r.user.name, phone: r.user.phone },
      product: {
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        image: r.product.images[0]?.url ?? null,
      },
    })),
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const store = await getSellerStoreForUser(user.id, user.role);
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    const data = replySchema.parse(await request.json());
    const review = await prisma.review.findFirst({
      where: { id: data.reviewId, product: { storeId: store.id } },
      include: { user: { select: { id: true } }, product: { select: { name: true, slug: true } } },
    });
    if (!review) return NextResponse.json({ error: "Sharh topilmadi" }, { status: 404 });

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { sellerReply: data.sellerReply },
    });

    await prisma.notification.create({
      data: {
        userId: review.user.id,
        type: "review",
        title: "Sotuvchi javob berdi",
        message: `${review.product.name} bo‘yicha sharhingizga javob keldi`,
        link: `/product/${review.product.slug}`,
      },
    });

    return NextResponse.json({ success: true, review: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Javob saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
