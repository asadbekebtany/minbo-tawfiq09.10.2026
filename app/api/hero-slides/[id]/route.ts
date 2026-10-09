import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { updateSlide, deleteSlide } from "@/lib/hero-slides";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requirePermissionApi("banners.edit");
  if (error) return error;
  try {
    const body = await request.json();
    const slide = await updateSlide(id, body);
    if (!slide) {
      return NextResponse.json({ error: "Slayd topilmadi" }, { status: 404 });
    }
    return NextResponse.json({ slide });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requirePermissionApi("banners.delete");
  if (error) return error;
  const ok = await deleteSlide(id);
  if (!ok) {
    return NextResponse.json({ error: "Slayd topilmadi" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
