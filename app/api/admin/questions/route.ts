import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  questionId: z.string().min(1),
  isApproved: z.boolean().optional(),
  answer: z.string().trim().min(1).max(2000).optional(),
});

export async function GET(request: Request) {
  const { error } = await requirePermissionApi("questions.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const pending = searchParams.get("pending") === "true";

  const questions = await prisma.question.findMany({
    where: pending ? { isApproved: false } : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { name: true, phone: true } },
      product: { select: { name: true, slug: true, store: { select: { name: true } } } },
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
      product: q.product.name,
      productSlug: q.product.slug,
      store: q.product.store.name,
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
  const { error, user } = await requirePermissionApi("questions.approve");
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    if (typeof data.isApproved === "boolean") {
      await prisma.question.update({
        where: { id: data.questionId },
        data: { isApproved: data.isApproved },
      });
    }
    if (data.answer) {
      await prisma.answer.create({
        data: {
          questionId: data.questionId,
          userId: user.id,
          answer: data.answer,
          isAdmin: true,
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
