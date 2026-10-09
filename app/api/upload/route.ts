import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { requireRoleApi } from "@/lib/api-auth";
import { getStorageProvider } from "@/lib/providers/storage-provider";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { error } = await requireRoleApi(["seller", "admin", "super_admin"]);
  if (error) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const folderRaw = String(form.get("folder") ?? "hero");
    const folder = ["hero", "products", "banners"].includes(folderRaw) ? folderRaw : "hero";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }

    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Faqat JPG, PNG yoki WebP formatlari qabul qilinadi" },
        { status: 415 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Rasm hajmi 5 MB dan oshmasligi kerak" },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const magicOk =
      (ext === "jpg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
      (ext === "png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
      (ext === "webp" && bytes.slice(0, 4).toString("ascii") === "RIFF" && bytes.slice(8, 12).toString("ascii") === "WEBP");
    if (!magicOk) {
      return NextResponse.json({ error: "Fayl tarkibi rasm emas yoki buzilgan" }, { status: 415 });
    }
    const originalName = (file as File).name?.toLowerCase() ?? "";
    if (/\.(exe|bat|cmd|js|mjs|sh|php|html|com|scr|dll)$/i.test(originalName)) {
      return NextResponse.json({ error: "Bu fayl turi ruxsat etilmagan" }, { status: 415 });
    }
    const extOk =
      (ext === "jpg" && (originalName.endsWith(".jpg") || originalName.endsWith(".jpeg"))) ||
      (ext === "png" && originalName.endsWith(".png")) ||
      (ext === "webp" && originalName.endsWith(".webp"));
    if (originalName && !extOk) {
      return NextResponse.json({ error: "Fayl kengaytmasi MIME bilan mos emas" }, { status: 415 });
    }
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const stored = await getStorageProvider().save({
      bytes,
      mime: file.type,
      folder,
      filename,
    });

    return NextResponse.json({ url: stored.url, key: stored.key, provider: getStorageProvider().name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Rasmni yuklashda xatolik yuz berdi" },
      { status: 500 },
    );
  }
}
