import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";

export type WarehouseAccessStatus = "ACTIVE" | "EXPIRED" | "DISABLED";

export type WarehouseAccessFields = {
  warehouseAccessEnabled: boolean;
  warehouseAccessStartAt: Date | null;
  warehouseAccessEndAt: Date | null;
};

export function warehouseAccessStatus(
  row: WarehouseAccessFields,
  now = new Date(),
): WarehouseAccessStatus {
  if (!row.warehouseAccessEnabled) return "DISABLED";
  if (row.warehouseAccessStartAt && row.warehouseAccessStartAt.getTime() > now.getTime()) {
    return "DISABLED";
  }
  if (row.warehouseAccessEndAt && row.warehouseAccessEndAt.getTime() < now.getTime()) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

export function isWarehouseAccessActive(row: WarehouseAccessFields, now = new Date()) {
  return warehouseAccessStatus(row, now) === "ACTIVE";
}

export function serializeWarehouseAccess(row: WarehouseAccessFields, now = new Date()) {
  return {
    enabled: row.warehouseAccessEnabled,
    startAt: row.warehouseAccessStartAt?.toISOString() ?? null,
    endAt: row.warehouseAccessEndAt?.toISOString() ?? null,
    status: warehouseAccessStatus(row, now),
  };
}

const EMPTY_ACCESS: WarehouseAccessFields = {
  warehouseAccessEnabled: false,
  warehouseAccessStartAt: null,
  warehouseAccessEndAt: null,
};

/** Seller panel ko‘rsatayotgan do‘kon egasi — Super Admin yozgan seller qatori. */
export async function warehouseAccessForUser(user: { id: string; role: string }, now = new Date()) {
  const store = await getSellerStoreForUser(user.id, user.role);
  const sellerId = store && "seller" in store ? store.seller?.id : undefined;
  if (!sellerId) return { seller: null, access: serializeWarehouseAccess(EMPTY_ACCESS, now) };

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: {
      isActive: true,
      isBanned: true,
      warehouseAccessEnabled: true,
      warehouseAccessStartAt: true,
      warehouseAccessEndAt: true,
    },
  });
  if (!seller) return { seller: null, access: serializeWarehouseAccess(EMPTY_ACCESS, now) };
  return { seller, access: serializeWarehouseAccess(seller, now) };
}

export async function denyUnlessWarehouseActive(user: { id: string; role: string }) {
  const { access } = await warehouseAccessForUser(user);
  if (access.status === "ACTIVE") return null;

  const error =
    access.status === "EXPIRED" ? "Moy sklad muddati tugagan." : "Moy sklad access yo‘q.";
  return NextResponse.json({ error, status: access.status }, { status: 403 });
}
