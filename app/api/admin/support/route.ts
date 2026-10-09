import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = await requirePermissionApi("tickets.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";

  const tickets = await prisma.supportTicket.findMany({
    where: status && status !== "all" ? { status } : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, isAdmin: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      user: ticket.user,
      messageCount: ticket._count.messages,
      lastMessage: ticket.messages[0] ?? null,
    })),
  });
}
