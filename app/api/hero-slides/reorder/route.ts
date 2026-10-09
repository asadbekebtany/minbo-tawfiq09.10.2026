import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { reorderSlides } from "@/lib/hero-slides";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { error } = await requirePermissionApi("banners.edit");
  if (error) return error;
  try {
    const body = await request.json();
    const ids = body?.ids;
    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids massivi kerak" },
        { status: 400 }
      );
    }
    const slides = await reorderSlides(ids);
    return NextResponse.json({ slides });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}
