#!/usr/bin/env node
/**
 * CI / deploy oldidan muhit o'zgaruvchilarini tekshirish.
 * Ishlatish: node scripts/validate-env.mjs
 * Yoki: npm run env:validate
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadDotEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const APP_ENVS = ["development", "staging", "production"];
const PLACEHOLDER_SECRET = /your-secret|change-me|minimum-32|example/i;

function parseBool(value) {
  return value === "true" || value === true;
}

function parseDemoCodes(value) {
  if (!value || !String(value).trim()) return [];
  return String(value)
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

const appEnv = process.env.APP_ENV ?? "development";
const errors = [];
const warnings = [];

if (!APP_ENVS.includes(appEnv)) {
  errors.push(`APP_ENV noto'g'ri: "${appEnv}" (${APP_ENVS.join(" | ")})`);
}

const publicAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
if (publicAppEnv && publicAppEnv !== appEnv) {
  errors.push(
    `NEXT_PUBLIC_APP_ENV (${publicAppEnv}) APP_ENV (${appEnv}) bilan mos emas`,
  );
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const nextauthSecret = process.env.NEXTAUTH_SECRET ?? "";
const nextauthUrl = process.env.NEXTAUTH_URL ?? "";
const lockAdminApi = parseBool(process.env.LOCK_ADMIN_API);
const allowStagingOtpDemo = parseBool(process.env.ALLOW_STAGING_OTP_DEMO);
const otpDemoCodes = parseDemoCodes(process.env.OTP_DEMO_CODES);
const smsConfigured = Boolean(
  process.env.SMS_API_URL?.trim() &&
    (process.env.SMS_API_EMAIL?.trim() || process.env.SMS_LOGIN?.trim()) &&
    (process.env.SMS_API_PASSWORD?.trim() || process.env.SMS_PASSWORD?.trim()),
);

const isBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (!nextauthSecret || nextauthSecret.length < 32) {
  errors.push("NEXTAUTH_SECRET kamida 32 belgidan iborat bo'lishi kerak");
}

if (nextauthUrl) {
  try {
    new URL(nextauthUrl);
  } catch {
    errors.push("NEXTAUTH_URL to'g'ri URL emas");
  }
} else {
  errors.push("NEXTAUTH_URL majburiy");
}

if (appEnv !== "development" && !databaseUrl && !isBuild) {
  errors.push("DATABASE_URL staging/production uchun majburiy");
}

if (appEnv === "production") {
  if (lockAdminApi) {
    errors.push("LOCK_ADMIN_API productionda false bo'lishi kerak");
  }
  if (otpDemoCodes.length > 0) {
    errors.push("OTP_DEMO_CODES productionda mutlaqo taqiqlangan");
  }
  const smsProvider = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  if (smsProvider === "mock") {
    errors.push("SMS_PROVIDER=mock productionda taqiqlangan");
  }
  if (PLACEHOLDER_SECRET.test(nextauthSecret)) {
    errors.push("NEXTAUTH_SECRET placeholder qiymat — haqiqiy kalit kiriting");
  }
  if (nextauthUrl && !nextauthUrl.startsWith("https://") && !isBuild) {
    errors.push("NEXTAUTH_URL productionda https:// bilan boshlanishi kerak");
  }
  if (process.env.PAYME_ENV === "test" && process.env.PAYME_MERCHANT_ID?.trim()) {
    warnings.push("PAYME_ENV=test production muhitida — production ga o'tkazing");
  }
}

if (
  appEnv === "staging" &&
  otpDemoCodes.length > 0 &&
  !smsConfigured &&
  !allowStagingOtpDemo
) {
  errors.push(
    "Staging OTP demo: ALLOW_STAGING_OTP_DEMO=true yoki SMS_* to'ldiring",
  );
}

if (appEnv === "development" && !databaseUrl) {
  warnings.push("DATABASE_URL yo'q — faqat JSON/demo fallback ishlaydi");
}

const PUBLIC_EXCEPTIONS = new Set(["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"]);
const FORBIDDEN_PUBLIC = /SECRET|PASSWORD|PRIVATE|TOKEN|DATABASE|CREDENTIAL|API_KEY|WEBHOOK/i;

for (const key of Object.keys(process.env)) {
  if (!key.startsWith("NEXT_PUBLIC_")) continue;
  if (PUBLIC_EXCEPTIONS.has(key)) continue;
  if (FORBIDDEN_PUBLIC.test(key)) {
    errors.push(
      `Xavfsizlik: ${key} client bundle ga tushishi mumkin — NEXT_PUBLIC_ prefiksini olib tashlang`,
    );
  }
}

console.log(`\nTAVFIQ env validation — APP_ENV=${appEnv}\n`);

if (warnings.length > 0) {
  console.warn("Ogohlantirishlar:");
  for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
  console.warn("");
}

if (errors.length > 0) {
  console.error("Xatoliklar:");
  for (const error of errors) console.error(`  ✗ ${error}`);
  console.error("\n.env.example va docs/environments.md ga qarang.");
  console.error("Xavfsizlik: docs/env-security.md\n");
  process.exit(1);
}

console.log("✓ Muhit o'zgaruvchilari yaroqli.\n");
