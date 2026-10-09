import type { Prisma } from "@prisma/client";
import type { NotificationType } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof import("@/lib/prisma").default;

export async function notifyUser(
  db: Tx,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
    eventKey?: string | null;
  },
) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        eventKey: input.eventKey ?? null,
      },
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "P2002") return;
    throw error;
  }
}
