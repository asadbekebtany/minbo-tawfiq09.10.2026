import { NextResponse } from "next/server";
import { listActivePickupPoints } from "@/lib/pickup-points";

export const dynamic = "force-dynamic";

export async function GET() {
  const points = await listActivePickupPoints();
  return NextResponse.json({ points });
}
