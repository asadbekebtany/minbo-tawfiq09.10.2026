import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  reviewId: z.string().min(1),
  isApproved: z.boolean(),
});

export async function GET(request: Request) {
  const { error } = await requirePermissionApi("reviews.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const pending = searchParams.get("pending") === "true";

  const reviews = await prisma.review.findMany({
    where: pending ? { isApproved: false } : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { name: true, phone: true } },
      product: { select: { name: true, slug: true, store: { select: { name: true } } } },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      isApproved: r.isApproved,
      sellerReply: r.sellerReply,
      createdAt: r.createdAt.toISOString(),
      buyer: r.user,
      product: r.product.name,
      productSlug: r.product.slug,
      store: r.product.store.name,
    })),
  });
}

export async function PATCH(request: Request) {
  const { error } = await requirePermissionApi("reviews.approve");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    const review = await prisma.review.update({
      where: { id: data.reviewId },
      data: { isApproved: data.isApproved },
    });
    return NextResponse.json({ success: true, review });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requirePermissionApi("reviews.delete");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get("id");
  if (!reviewId) return NextResponse.json({ error: "id majburiy" }, { status: 400 });
  await prisma.review.delete({ where: { id: reviewId } });
  return NextResponse.json({ success: true });
}
