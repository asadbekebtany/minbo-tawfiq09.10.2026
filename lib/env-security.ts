/**
 * Server secretlari va client (NEXT_PUBLIC_*) o‘rtasidagi xavfsizlik qoidalari.
 */

/** Client bundle ga faqat shu kalitlar tushishi mumkin */
export const CLIENT_SAFE_PUBLIC_KEYS = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
] as const;

/** NEXT_PUBLIC_ prefiksida bo‘lmasligi kerak bo‘lgan secret nomlar */
const FORBIDDEN_PUBLIC_ENV_PATTERN =
  /SECRET|PASSWORD|PRIVATE|TOKEN|DATABASE|CREDENTIAL|API_KEY|WEBHOOK/i;

/** Cloudinary cloud name — public, SECRET emas */
const ALLOWED_PUBLIC_EXCEPTIONS = new Set(["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"]);

export function findUnsafePublicEnvKeys(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return Object.keys(env).filter((key) => {
    if (!key.startsWith("NEXT_PUBLIC_")) return false;
    if (ALLOWED_PUBLIC_EXCEPTIONS.has(key)) return false;
    return FORBIDDEN_PUBLIC_ENV_PATTERN.test(key);
  });
}

export function assertPublicEnvSafety(env: NodeJS.ProcessEnv = process.env): void {
  const unsafe = findUnsafePublicEnvKeys(env);
  if (unsafe.length === 0) return;

  throw new Error(
    "Xavfsizlik xatosi: quyidagi NEXT_PUBLIC_ o'zgaruvchilari client bundle ga tushishi mumkin:\n" +
      unsafe.map((key) => `  - ${key}`).join("\n") +
      "\n\nSecretlarni faqat server env da saqlang (NEXT_PUBLIC_ prefiksiz).",
  );
}

/** Git / ZIP tarqatishda commit qilinmasligi kerak bo‘lgan fayllar */
export const LOCAL_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.staging",
  ".env.staging.local",
  ".env.production",
  ".env.production.local",
  ".env.test.local",
] as const;

/** Faqat shablon — repoda qoladi, secret yo‘q */
export const COMMITTED_ENV_TEMPLATES = [
  ".env.example",
  ".env.development.example",
  ".env.staging.example",
  ".env.production.example",
] as const;

/** Production placeholder emasligi kerak */
export const PLACEHOLDER_SECRET_PATTERN =
  /your-secret|change-me|minimum-32|example|replace-me|todo/i;

/** Tracked fayllarda real secret izlari */
export const TRACKED_SECRET_PATTERNS = [
  /NEXTAUTH_SECRET=["']?(?!your-secret|change-me|minimum-32|example|replace-me|todo)[A-Za-z0-9+/=_-]{40,}/,
  /DATABASE_URL=["']?postgresql:\/\/[^:]+:(?!postgres|CHANGE_ME|PASSWORD|your-)[^@'"\s]{3,}@/,
  /SMS_API_PASSWORD=["']?[A-Za-z0-9!@#$%^&*+/=]{8,}/,
  /SMS_PASSWORD=["']?[A-Za-z0-9!@#$%^&*+/=]{8,}/,
  /CLOUDINARY_API_SECRET=["']?[A-Za-z0-9_-]{10,}/,
  /PAYME_SECRET_KEY=["']?[A-Za-z0-9_-]{8,}/,
  /PAYME_KEY=["']?[A-Za-z0-9_-]{8,}/,
  /CLICK_SECRET_KEY=["']?[A-Za-z0-9_-]{8,}/,
  /CLICK_SECRET=["']?[A-Za-z0-9_-]{8,}/,
];
