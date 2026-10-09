import { CheckoutClient } from "@/components/checkout/checkout-client";
import { requirePageSession } from "@/lib/page-auth";
import { listActivePickupPoints } from "@/lib/pickup-points";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const metadata = { title: "Buyurtma berish" };

export default async function CheckoutPage() {
  const sessionUser = await requirePageSession("/checkout");
  const pickupPoints = await listActivePickupPoints();

  let initialName = sessionUser.name ?? "";
  let initialPhone = sessionUser.phone ?? "";

  if (await checkDatabaseConnection()) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { name: true, phone: true },
      });
      if (dbUser?.name) initialName = dbUser.name;
      if (dbUser?.phone) initialPhone = dbUser.phone;

      if (!initialName || !initialPhone) {
        const defaultAddress = await prisma.address.findFirst({
          where: { userId: sessionUser.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: { name: true, phone: true },
        });
        if (!initialName && defaultAddress?.name) initialName = defaultAddress.name;
        if (!initialPhone && defaultAddress?.phone) initialPhone = defaultAddress.phone;
      }
    } catch {
      // session qiymatlari yetarli
    }
  }

  return (
    <CheckoutClient
      pickupPoints={pickupPoints}
      initialName={initialName}
      initialPhone={initialPhone}
    />
  );
}
