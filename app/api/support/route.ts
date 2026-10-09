import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(1).max(5000),
});

export async function GET() {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messageCount: t._count.messages,
      lastMessage: t.messages[0]
        ? {
            message: t.messages[0].message,
            isAdmin: t.messages[0].isAdmin,
            createdAt: t.messages[0].createdAt.toISOString(),
          }
        : null,
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
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: data.subject,
        status: "open",
        messages: {
          create: {
            userId: user.id,
            message: data.message,
            isAdmin: false,
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ticket yaratilmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
