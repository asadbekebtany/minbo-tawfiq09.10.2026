import path from "node:path";

/** Diskdagi yuklama ildizi — deploy/git pull buzmasligi kerak. */
export function getLocalUploadRoot(): string {
  const requested = process.env.LOCAL_UPLOAD_DIR?.trim();
  if (requested) return path.resolve(requested);
  return path.resolve(process.cwd(), "data", "uploads");
}

export function publicUploadUrl(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/uploads/${normalized}`;
}

export function assertPathInsideRoot(root: string, target: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
