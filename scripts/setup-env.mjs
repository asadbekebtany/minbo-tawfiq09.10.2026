#!/usr/bin/env node
/**
 * .env faylini xavfsiz yaratish — mavjud .env ustiga yozmaydi.
 * Ishlatish: npm run env:setup
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".env");
const source = resolve(root, ".env.development.example");
const fallback = resolve(root, ".env.example");

if (existsSync(target)) {
  console.log("\n✓ .env allaqachon mavjud — ustiga yozilmadi (xavfsizlik).\n");
  console.log("  Yangi secret kerak bo‘lsa, qo‘lda tahrirlang yoki .env ni o‘chirib qayta ishga tushiring.\n");
  process.exit(0);
}

const template = existsSync(source) ? source : fallback;

if (!existsSync(template)) {
  console.error("\n✗ .env.development.example yoki .env.example topilmadi.\n");
  process.exit(1);
}

copyFileSync(template, target);

console.log("\n✓ .env yaratildi (shablon: " + template.split(/[/\\]/).pop() + ")\n");
console.log("  Keyingi qadamlar:");
console.log("  1. NEXTAUTH_SECRET yangilang: openssl rand -base64 32");
console.log("  2. npm run env:validate");
console.log("  3. .env ni HECH QACHON git/ZIP ga qo‘shmang\n");
