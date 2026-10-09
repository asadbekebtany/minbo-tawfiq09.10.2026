import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

async function recomputeProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count._all,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const mine = searchParams.get("mine") === "true";

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ reviews: [] });
  }

  if (mine) {
    const { error, user } = await requireSessionUser();
    if (error || !user) return error;
    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
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
        createdAt: r.createdAt.toISOString(),
        product: {
          id: r.product.id,
          name: r.product.name,
          slug: r.product.slug,
          image: r.product.images[0]?.url ?? null,
        },
      })),
    });
  }

  if (!productId) {
    return NextResponse.json({ error: "productId majburiy" }, { status: 400 });
  }

  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, phone: true } } },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      userName: r.user.name || (r.user.phone ? `${r.user.phone.slice(0, 6)}***` : "Xaridor"),
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: { userId: user.id, status: "delivered" },
      },
    });
    if (!purchased) {
      return NextResponse.json(
        { error: "Faqat yetkazilgan buyurtmadagi mahsulotga sharh qoldirish mumkin" },
        { status: 403 },
      );
    }

    const existing = await prisma.review.findFirst({
      where: { userId: user.id, productId: data.productId },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu mahsulotga allaqachon sharh qoldirgansiz" }, { status: 409 });
    }

    const { getRuntimeSettings } = await import("@/lib/system-settings");
    const settings = await getRuntimeSettings();

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        productId: data.productId,
        rating: data.rating,
        comment: data.comment || null,
        isApproved: !settings.reviewModeration,
        verifiedPurchase: true,
      },
    });

    await recomputeProductRating(data.productId);

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sharh saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
