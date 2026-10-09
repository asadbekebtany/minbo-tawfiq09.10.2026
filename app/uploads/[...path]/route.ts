import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { assertPathInsideRoot, getLocalUploadRoot } from "@/lib/upload-dir";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const relative = (segments ?? []).join("/");
  if (!relative || relative.includes("\0")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = getLocalUploadRoot();
  const target = path.resolve(root, relative);
  if (!assertPathInsideRoot(root, target)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext];
    if (!type) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const bytes = await readFile(target);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
