import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ questions: [] });

  const { searchParams } = new URL(request.url);
  const unanswered = searchParams.get("unanswered") === "true";

  const questions = await prisma.question.findMany({
    where: {
      product: { storeId: store.id },
      ...(unanswered ? { answers: { none: { isSeller: true } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, phone: true } },
      product: { select: { id: true, name: true, slug: true } },
      answers: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      isApproved: q.isApproved,
      createdAt: q.createdAt.toISOString(),
      buyer: q.user,
      product: q.product,
      answers: q.answers.map((a) => ({
        id: a.id,
        answer: a.answer,
        isSeller: a.isSeller,
        isAdmin: a.isAdmin,
      })),
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
    const question = await prisma.question.findFirst({
      where: { id: data.questionId, product: { storeId: store.id } },
      include: { user: { select: { id: true } }, product: { select: { name: true, slug: true } } },
    });
    if (!question) return NextResponse.json({ error: "Savol topilmadi" }, { status: 404 });

    await prisma.answer.create({
      data: {
        questionId: question.id,
        userId: user.id,
        answer: data.answer,
        isSeller: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: question.user.id,
        type: "question",
        title: "Sotuvchi javob berdi",
        message: `${question.product.name} bo‘yicha savolingizga javob keldi`,
        link: `/product/${question.product.slug}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Javob saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
