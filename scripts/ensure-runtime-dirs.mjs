#!/usr/bin/env node
/**
 * Runtime papkalar: upload (persist), logs, backups.
 * Deploy overwrite qilmasligi uchun gitignore ostida.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upload =
  process.env.LOCAL_UPLOAD_DIR?.trim() || resolve(root, "data", "uploads");

for (const dir of [upload, resolve(root, "logs"), resolve(root, "data", "backups")]) {
  mkdirSync(dir, { recursive: true });
}
