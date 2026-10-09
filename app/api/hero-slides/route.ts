import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import {
  getAllSlides,
  getActiveSlides,
  createSlide,
} from "@/lib/hero-slides";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";
  if (all) {
    const { error } = await requirePermissionApi("banners.view");
    if (error) return error;
  }
  const slides = all ? await getAllSlides() : await getActiveSlides();
  return NextResponse.json({ slides });
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermissionApi("banners.create");
  if (error) return error;
  try {
    const body = await request.json();
    const slide = await createSlide(body);
    return NextResponse.json({ slide }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}
