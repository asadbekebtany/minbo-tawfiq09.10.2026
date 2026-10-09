import prisma from "@/lib/prisma";

/** Seller yoki admin/super_admin uchun do‘konni topish */
export async function getSellerStoreForUser(userId: string, role: string) {
  if (role === "admin" || role === "super_admin") {
    return prisma.store.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        seller: { select: { id: true, isActive: true, isBanned: true, userId: true } },
      },
    });
  }

  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: {
      store: true,
      application: true,
    },
  });

  if (!seller?.store) return null;

  return {
    ...seller.store,
    seller: {
      id: seller.id,
      isActive: seller.isActive,
      isBanned: seller.isBanned,
      userId: seller.userId,
    },
    application: seller.application,
  };
}

export async function requireSellerStore(userId: string, role: string) {
  const store = await getSellerStoreForUser(userId, role);
  return store;
}
