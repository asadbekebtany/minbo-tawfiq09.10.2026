import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  productId: z.string().min(1),
  question: z.string().trim().min(8).max(1000),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId majburiy" }, { status: 400 });
  }
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ questions: [] });
  }

  const rows = await prisma.question.findMany({
    where: {
      productId,
      OR: [{ isApproved: true }, { answers: { some: {} } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true } },
      answers: {
        orderBy: { createdAt: "asc" },
        select: { id: true, answer: true, isSeller: true, isAdmin: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    questions: rows.map((q) => ({
      id: q.id,
      question: q.question,
      createdAt: q.createdAt.toISOString(),
      userName: q.user.name ?? "Xaridor",
      answers: q.answers.map((a) => ({
        id: a.id,
        answer: a.answer,
        from: a.isAdmin ? "admin" : a.isSeller ? "seller" : "user",
        createdAt: a.createdAt.toISOString(),
      })),
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan" }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: {
        id: true,
        name: true,
        store: { select: { seller: { select: { userId: true } } } },
      },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    const question = await prisma.question.create({
      data: {
        userId: user.id,
        productId: product.id,
        question: data.question,
        isApproved: true,
      },
    });

    const sellerUserId = product.store.seller.userId;
    if (sellerUserId && sellerUserId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: sellerUserId,
          type: "question",
          title: "Yangi savol",
          message: `${product.name} haqida savol keldi`,
          link: "/seller/questions",
        },
      });
    }

    return NextResponse.json({ success: true, questionId: question.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Savol yuborilmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
