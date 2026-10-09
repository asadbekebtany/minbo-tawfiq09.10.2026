import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { supportReplySchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await context.params;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function POST(request: Request, context: RouteContext) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { message } = supportReplySchema.parse(await request.json());

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: user.id },
    });
    if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
    if (ticket.status === "closed") {
      return NextResponse.json({ error: "Yopilgan ticketga javob yozib bo‘lmaydi" }, { status: 400 });
    }

    const [reply] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: { ticketId: id, userId: user.id, message, isAdmin: false },
      }),
      prisma.supportTicket.update({
        where: { id },
        data: { status: ticket.status === "open" ? "open" : "in_progress" },
      }),
    ]);

    return NextResponse.json({ success: true, message: reply }, { status: 201 });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
