import "server-only";
import type { PickupPointSummary } from "@/lib/pickup-point-types";
import { resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export type { PickupPointSummary } from "@/lib/pickup-point-types";

const FALLBACK_PICKUP_POINTS: PickupPointSummary[] = [
  {
    id: "fallback-chilonzor",
    name: "Chilonzor savdo markazi",
    address: "Chilonzor t., 14-kvartal, 2-uy",
    city: "Toshkent",
    district: "Chilonzor",
    workHours: "09:00–21:00",
    phone: null,
    rating: 4.7,
    isFree: true,
  },
  {
    id: "fallback-yunusobod",
    name: "Yunusobod filial",
    address: "Amir Temur shoh ko'ch., 108",
    city: "Toshkent",
    district: "Yunusobod",
    workHours: "09:00–21:00",
    phone: null,
    rating: 4.6,
    isFree: true,
  },
  {
    id: "fallback-sergeli",
    name: "Sergeli omborxona",
    address: "Sergeli tumani, 7-mavze, 1A",
    city: "Toshkent",
    district: "Sergeli",
    workHours: "10:00–20:00",
    phone: null,
    rating: 4.5,
    isFree: true,
  },
  {
    id: "fallback-mirzo-ulugbek",
    name: "Mirzo Ulug'bek filial",
    address: "Bog'ishamol ko'ch., 55",
    city: "Toshkent",
    district: "Mirzo Ulug'bek",
    workHours: "09:00–20:00",
    phone: null,
    rating: 4.4,
    isFree: true,
  },
];

function mapDbPickupPoint(row: {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  workHours: string | null;
  phone: string | null;
  rating: number;
  isFree: boolean;
}): PickupPointSummary {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    district: row.district,
    workHours: row.workHours,
    phone: row.phone,
    rating: row.rating,
    isFree: row.isFree,
  };
}

export async function listActivePickupPoints(): Promise<PickupPointSummary[]> {
  const source = await resolveDataSource();

  if (source === "database") {
    const rows = await prisma.pickupPoint.findMany({
      where: { isActive: true },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        district: true,
        workHours: true,
        phone: true,
        rating: true,
        isFree: true,
      },
    });
    if (rows.length > 0) {
      return rows.map(mapDbPickupPoint);
    }
    return [];
  }

  return FALLBACK_PICKUP_POINTS;
}
