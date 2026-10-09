import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import {
  supportReplySchema,
  supportTicketStatusSchema,
  validationError,
} from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requirePermissionApi("tickets.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await context.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function POST(request: Request, context: RouteContext) {
  const { error, user: actor } = await requirePermissionApi("tickets.reply");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { message } = supportReplySchema.parse(await request.json());

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });

    const [reply] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: { ticketId: id, userId: actor.id, message, isAdmin: true },
      }),
      prisma.supportTicket.update({
        where: { id },
        data: { status: ticket.status === "closed" ? "closed" : "in_progress" },
      }),
    ]);

    return NextResponse.json({ success: true, message: reply }, { status: 201 });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requirePermissionApi("tickets.close");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { status } = supportTicketStatusSchema.parse(await request.json());

    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });

    const ticket = await prisma.supportTicket.update({ where: { id }, data: { status } });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "support_ticket_update",
      entityType: "support_ticket",
      entityId: id,
      metadata: { subject: existing.subject, previousStatus: existing.status, newStatus: status },
      ...auditContext,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
