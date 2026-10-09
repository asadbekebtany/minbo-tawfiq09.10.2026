#!/usr/bin/env node
/**
 * .env xavfsizligi: git tracking, public secret leak, .gitignore tekshiruvi.
 * CI / commit oldidan: npm run env:check-secrets
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LOCAL_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.staging",
  ".env.staging.local",
  ".env.production",
  ".env.production.local",
];

const COMMITTED_TEMPLATES = [
  ".env.example",
  ".env.development.example",
  ".env.staging.example",
  ".env.production.example",
  ".env.test.example",
];

const FORBIDDEN_PUBLIC = /SECRET|PASSWORD|PRIVATE|TOKEN|DATABASE|CREDENTIAL|API_KEY/i;
const PUBLIC_EXCEPTIONS = new Set(["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"]);

const TRACKED_SECRET_PATTERNS = [
  {
    name: "NEXTAUTH_SECRET (placeholder emas)",
    pattern:
      /NEXTAUTH_SECRET=["']?(?!your-secret|change-me|minimum-32|example|replace-me|todo)[A-Za-z0-9+/=_-]{40,}/,
  },
  {
    name: "DATABASE_URL (default postgres:postgres emas)",
    pattern:
      /DATABASE_URL=["']?postgresql:\/\/[^:]+:(?!postgres|CHANGE_ME|PASSWORD|your-)[^@'"\s]{3,}@/,
  },
  {
    name: "SMS_API_PASSWORD",
    pattern: /SMS_API_PASSWORD=["']?[A-Za-z0-9!@#$%^&*+/=]{8,}/,
  },
  {
    name: "CLOUDINARY_API_SECRET",
    pattern: /CLOUDINARY_API_SECRET=["']?[A-Za-z0-9_-]{10,}/,
  },
];

function gitAvailable() {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: root,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function gitTracked(relativePath) {
  try {
    execSync(`git ls-files --error-unmatch "${relativePath}"`, {
      cwd: root,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function isEnvFileIgnored(file, gitignoreLines) {
  const lines = gitignoreLines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.includes(file)) return true;

  const negated = lines
    .filter((line) => line.startsWith("!"))
    .map((line) => line.slice(1));

  if (negated.includes(file)) return false;

  if (file === ".env" && lines.includes(".env")) return true;

  if (file.startsWith(".env.") && !file.endsWith(".example")) {
    if (lines.includes(".env.*")) return true;
  }

  return false;
}

function gitStaged(relativePath) {
  try {
    const out = execSync(`git diff --cached --name-only -- "${relativePath}"`, {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

const errors = [];
const warnings = [];

console.log("\nTAVFIQ env xavfsizlik tekshiruvi\n");

// 1. .gitignore
const gitignorePath = resolve(root, ".gitignore");
if (!existsSync(gitignorePath)) {
  errors.push(".gitignore topilmadi");
} else {
  const gitignore = readFileSync(gitignorePath, "utf8");
  const gitignoreLines = gitignore.split("\n");
  for (const file of LOCAL_ENV_FILES) {
    if (!isEnvFileIgnored(file, gitignoreLines)) {
      errors.push(`.gitignore "${file}" ni qoplamaydi — .env.* qoidasini tekshiring`);
    }
  }
}

// 2. Git tracked local env
if (gitAvailable()) {
  for (const file of LOCAL_ENV_FILES) {
    if (gitTracked(file)) {
      errors.push(
        `"${file}" git repoda tracked — darhol olib tashlang: git rm --cached ${file}`,
      );
    }
    if (gitStaged(file)) {
      errors.push(`"${file}" commit uchun staged — git reset HEAD ${file}`);
    }
  }
} else {
  warnings.push("Git repo yo'q — tracked .env tekshiruvi o'tkazib yuborildi");
}

// 3. NEXT_PUBLIC_ secret leak
for (const key of Object.keys(process.env)) {
  if (!key.startsWith("NEXT_PUBLIC_")) continue;
  if (PUBLIC_EXCEPTIONS.has(key)) continue;
  if (FORBIDDEN_PUBLIC.test(key)) {
    errors.push(`Xavfsizlik: ${key} client bundle ga tushishi mumkin — nomini o'zgartiring`);
  }
}

// 4. Shablon fayllarda real secret izlari
for (const file of COMMITTED_TEMPLATES) {
  const full = resolve(root, file);
  if (!existsSync(full)) continue;
  const content = readFileSync(full, "utf8");
  for (const { name, pattern } of TRACKED_SECRET_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(`${file}: ehtimoliy haqiqiy secret (${name}) — placeholder ishlating`);
    }
  }
}

// 5. ZIP tarqatish ogohlantirishi
if (existsSync(resolve(root, ".env"))) {
  warnings.push(
    ".env mavjud — ZIP/archive yaratganda .env ni qo'shmang; faqat .env.*.example shablonlari",
  );
}

if (warnings.length > 0) {
  console.warn("Ogohlantirishlar:");
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  console.warn("");
}

if (errors.length > 0) {
  console.error("Xatoliklar:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("\nBatafsil: docs/env-security.md\n");
  process.exit(1);
}

console.log("✓ Env xavfsizlik tekshiruvi o'tdi.\n");
