import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    subtotal?: number;
  };
  const code = body.code?.trim().toUpperCase();
  const subtotal = typeof body.subtotal === "number" ? body.subtotal : 0;

  if (!code) {
    return NextResponse.json({ error: "Kupon kodi majburiy" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return NextResponse.json({ error: "Kupon topilmadi yoki faol emas" }, { status: 404 });
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Kupon muddati tugagan" }, { status: 400 });
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ error: "Kupon limiti tugagan" }, { status: 400 });
  }
  if (coupon.minOrder != null && subtotal < coupon.minOrder) {
    return NextResponse.json(
      { error: `Minimal buyurtma: ${coupon.minOrder.toLocaleString("uz-UZ")} so'm` },
      { status: 400 },
    );
  }

  const discount =
    coupon.type === "fixed"
      ? Math.min(coupon.value, subtotal)
      : Math.min(Math.round((subtotal * coupon.value) / 100), subtotal);

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
  });
}
