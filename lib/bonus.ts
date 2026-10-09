import prisma from "@/lib/prisma";
import { checkDatabaseConnection } from "@/lib/db";

/** Buyurtma yetkazilganda xaridor oladigan keshbek foizi */
export const CASHBACK_PERCENT = 5;

export const BONUS_TYPE_CASHBACK = "cashback";

export function calcCashbackAmount(orderTotal: number): number {
  if (orderTotal <= 0) return 0;
  return Math.floor((orderTotal * CASHBACK_PERCENT) / 100);
}

/**
 * Yetkazilgan buyurtma uchun 5% keshbek yozadi.
 * Bir xil orderId uchun takroran yozilmaydi.
 */
export async function creditOrderCashback(orderId: string): Promise<{
  credited: boolean;
  amount: number;
}> {
  if (!(await checkDatabaseConnection())) {
    return { credited: false, amount: 0 };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true, total: true },
    });
    if (!order || order.status !== "delivered") {
      return { credited: false, amount: 0 };
    }

    const amount = calcCashbackAmount(order.total);
    if (amount <= 0) return { credited: false, amount: 0 };

    const existing = await prisma.bonusTransaction.findFirst({
      where: { orderId: order.id, type: BONUS_TYPE_CASHBACK },
      select: { id: true },
    });
    if (existing) return { credited: false, amount };

    await prisma.$transaction([
      prisma.bonusTransaction.create({
        data: {
          userId: order.userId,
          amount,
          type: BONUS_TYPE_CASHBACK,
          description: `Buyurtma keshbeki ${CASHBACK_PERCENT}%`,
          orderId: order.id,
        },
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: { bonusBalance: { increment: amount } },
      }),
    ]);

    return { credited: true, amount };
  } catch {
    return { credited: false, amount: 0 };
  }
}

/** Foydalanuvchining yetkazilgan, lekin keshbeksiz buyurtmalarini to‘ldiradi */
export async function ensureCashbackForUser(userId: string): Promise<number> {
  if (!(await checkDatabaseConnection())) return 0;

  try {
    const delivered = await prisma.order.findMany({
      where: { userId, status: "delivered" },
      select: { id: true },
    });

    let totalCredited = 0;
    for (const order of delivered) {
      const result = await creditOrderCashback(order.id);
      if (result.credited) totalCredited += result.amount;
    }
    return totalCredited;
  } catch {
    return 0;
  }
}

export async function getUserBonusBalance(userId: string): Promise<number> {
  if (!(await checkDatabaseConnection())) return 0;
  try {
    await ensureCashbackForUser(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bonusBalance: true },
    });
    return user?.bonusBalance ?? 0;
  } catch {
    return 0;
  }
}
