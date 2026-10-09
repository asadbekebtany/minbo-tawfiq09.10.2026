import "server-only";
import { z } from "zod";
import { assertPublicEnvSafety } from "@/lib/env-security";
import {
  appEnvSchema,
  buildRuntimePolicy,
  validateDeploymentPolicy,
  type AppEnv,
} from "@/lib/runtime-policy";

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const serverEnvSchema = z.object({
  APP_ENV: appEnvSchema.default("development"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  ALLOW_STAGING_OTP_DEMO: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(false),
  ),

  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .min(1)
      .refine(
        (url) =>
          url.startsWith("postgresql://") || url.startsWith("postgres://"),
        "DATABASE_URL postgresql:// yoki postgres:// bilan boshlanishi kerak",
      )
      .optional(),
  ),

  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET kamida 32 belgidan iborat bo'lishi kerak"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL to'g'ri URL bo'lishi kerak"),

  LOCK_ADMIN_API: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(false),
  ),

  OTP_DEMO_CODES: z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return [];
    return value
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
  }, z.array(z.string()).default([])),

  OTP_TTL_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(30).default(5),
  ),

  OTP_RESEND_COOLDOWN_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(30).max(300).default(60),
  ),

  OTP_MAX_VERIFY_ATTEMPTS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(3).max(10).default(5),
  ),

  OTP_SEND_IP_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(10),
  ),
  OTP_SEND_IP_WINDOW_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1440).default(60),
  ),
  OTP_SEND_PHONE_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(50).default(5),
  ),
  OTP_SEND_PHONE_WINDOW_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1440).default(60),
  ),

  OTP_VERIFY_IP_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(200).default(30),
  ),
  OTP_VERIFY_IP_WINDOW_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1440).default(15),
  ),
  OTP_VERIFY_PHONE_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(15),
  ),
  OTP_VERIFY_PHONE_WINDOW_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1440).default(15),
  ),

  AUTH_SIGNIN_IP_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(200).default(20),
  ),
  AUTH_SIGNIN_IP_WINDOW_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1440).default(15),
  ),
  AUTH_SIGNIN_PHONE_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(10),
  ),
  AUTH_SIGNIN_PHONE_WINDOW_MINUTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1440).default(15),
  ),

  CLOUDINARY_CLOUD_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),

  PAYME_MERCHANT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYME_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYME_TEST_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYME_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYME_TEST_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYME_RETURN_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  PAYME_ENV: z.enum(["test", "production"]).default("test"),
  PAYME_ENABLED: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(true),
  ),

  CLICK_SERVICE_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  CLICK_MERCHANT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  CLICK_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CLICK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  CLICK_MERCHANT_USER_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  CLICK_RETURN_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  CLICK_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  CLICK_ENABLED: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(true),
  ),

  SMS_PROVIDER: z.preprocess(emptyToUndefined, z.string().default("auto")),
  SMS_API_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SMS_API_EMAIL: z.preprocess(emptyToUndefined, z.string().optional()),
  SMS_API_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
  SMS_LOGIN: z.preprocess(emptyToUndefined, z.string().optional()),
  SMS_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
  SMS_SENDER_NAME: z.preprocess(
    emptyToUndefined,
    z.string().default("TAVFIQ"),
  ),

  LOGISTICS_PROVIDER: z.preprocess(emptyToUndefined, z.string().default("internal")),
  LOGISTICS_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYOUT_PROVIDER: z.preprocess(emptyToUndefined, z.string().default("internal")),
  PAYOUT_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),

  STORAGE_PROVIDER: z.preprocess(emptyToUndefined, z.string().default("local")),
  LOCAL_UPLOAD_DIR: z.preprocess(emptyToUndefined, z.string().optional()),
});

function formatEnvErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

function applyProviderEnvAliases(env: NodeJS.ProcessEnv) {
  if (!env.SMS_API_EMAIL?.trim() && env.SMS_LOGIN?.trim()) {
    env.SMS_API_EMAIL = env.SMS_LOGIN;
  }
  if (!env.SMS_API_PASSWORD?.trim() && env.SMS_PASSWORD?.trim()) {
    env.SMS_API_PASSWORD = env.SMS_PASSWORD;
  }
  if (!env.CLICK_SECRET_KEY?.trim() && env.CLICK_SECRET?.trim()) {
    env.CLICK_SECRET_KEY = env.CLICK_SECRET;
  }
  if (!env.PAYME_SECRET_KEY?.trim() && env.PAYME_KEY?.trim()) {
    env.PAYME_SECRET_KEY = env.PAYME_KEY;
  }
  if (!env.PAYME_TEST_SECRET_KEY?.trim() && env.PAYME_TEST_KEY?.trim()) {
    env.PAYME_TEST_SECRET_KEY = env.PAYME_TEST_KEY;
  }
}

function parseServerEnv() {
  applyProviderEnvAliases(process.env);
  assertPublicEnvSafety();

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = formatEnvErrors(result.error);
    console.error(
      "Environment o'zgaruvchilari noto'g'ri:\n" +
        details +
        "\n\n.env.example faylini .env ga ko'chirib, qiymatlarni to'ldiring.",
    );
    throw new Error("Invalid server environment variables");
  }

  const data = result.data;

  const cloudinaryConfigured = Boolean(
    data.CLOUDINARY_CLOUD_NAME &&
      data.CLOUDINARY_API_KEY &&
      data.CLOUDINARY_API_SECRET,
  );

  const smsLogin = data.SMS_API_EMAIL || data.SMS_LOGIN;
  const smsPassword = data.SMS_API_PASSWORD || data.SMS_PASSWORD;
  const smsConfigured = Boolean(data.SMS_API_URL && smsLogin && smsPassword);

  const paymeSecret =
    data.PAYME_ENV === "test"
      ? data.PAYME_TEST_SECRET_KEY || data.PAYME_TEST_KEY
      : data.PAYME_SECRET_KEY || data.PAYME_KEY;

  const paymeConfigured = Boolean(data.PAYME_MERCHANT_ID && paymeSecret);

  const clickSecret = data.CLICK_SECRET_KEY || data.CLICK_SECRET;
  const clickConfigured = Boolean(
    data.CLICK_SERVICE_ID && data.CLICK_MERCHANT_ID && clickSecret,
  );

  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  const runtime = buildRuntimePolicy({
    appEnv: data.APP_ENV,
    allowStagingOtpDemo: data.ALLOW_STAGING_OTP_DEMO,
  });

  validateDeploymentPolicy({
    policy: runtime,
    isBuildPhase,
    databaseUrl: data.DATABASE_URL,
    nextauthSecret: data.NEXTAUTH_SECRET,
    lockAdminApi: data.LOCK_ADMIN_API,
    otpDemoCodes: data.OTP_DEMO_CODES,
    smsConfigured,
    allowStagingOtpDemo: data.ALLOW_STAGING_OTP_DEMO,
    publicAppEnv: process.env.NEXT_PUBLIC_APP_ENV,
    nextauthUrl: data.NEXTAUTH_URL,
    smsProvider: data.SMS_PROVIDER,
  });

  const otpDemoEnabled =
    runtime.allowOtpDemo &&
    !smsConfigured &&
    data.OTP_DEMO_CODES.length > 0;

  return {
    appEnv: data.APP_ENV as AppEnv,
    nodeEnv: data.NODE_ENV,
    isProduction: runtime.isProduction,
    isDevelopment: runtime.isDevelopment,
    isStaging: runtime.isStaging,
    runtime,
    databaseUrl: data.DATABASE_URL,
    hasDatabase: Boolean(data.DATABASE_URL),
    auth: {
      secret: data.NEXTAUTH_SECRET,
      url: data.NEXTAUTH_URL,
      otpDemoCodes: runtime.allowOtpDemo ? data.OTP_DEMO_CODES : [],
      otpDemoEnabled,
      otpTtlMinutes: data.OTP_TTL_MINUTES,
      otpTtlMs: data.OTP_TTL_MINUTES * 60 * 1000,
      otpResendCooldownSec: data.OTP_RESEND_COOLDOWN_SECONDS,
      otpResendCooldownMs: data.OTP_RESEND_COOLDOWN_SECONDS * 1000,
      otpMaxVerifyAttempts: data.OTP_MAX_VERIFY_ATTEMPTS,
    },
    rateLimit: {
      otpMaxVerifyAttempts: data.OTP_MAX_VERIFY_ATTEMPTS,
      otpSendIpMax: data.OTP_SEND_IP_MAX,
      otpSendIpWindowMin: data.OTP_SEND_IP_WINDOW_MINUTES,
      otpSendPhoneMax: data.OTP_SEND_PHONE_MAX,
      otpSendPhoneWindowMin: data.OTP_SEND_PHONE_WINDOW_MINUTES,
      otpVerifyIpMax: data.OTP_VERIFY_IP_MAX,
      otpVerifyIpWindowMin: data.OTP_VERIFY_IP_WINDOW_MINUTES,
      otpVerifyPhoneMax: data.OTP_VERIFY_PHONE_MAX,
      otpVerifyPhoneWindowMin: data.OTP_VERIFY_PHONE_WINDOW_MINUTES,
      authSigninIpMax: data.AUTH_SIGNIN_IP_MAX,
      authSigninIpWindowMin: data.AUTH_SIGNIN_IP_WINDOW_MINUTES,
      authSigninPhoneMax: data.AUTH_SIGNIN_PHONE_MAX,
      authSigninPhoneWindowMin: data.AUTH_SIGNIN_PHONE_WINDOW_MINUTES,
    },
    lockAdminApi: data.LOCK_ADMIN_API && runtime.allowAdminApiLock,
    cloudinary: {
      cloudName: data.CLOUDINARY_CLOUD_NAME,
      apiKey: data.CLOUDINARY_API_KEY,
      apiSecret: data.CLOUDINARY_API_SECRET,
      isConfigured: cloudinaryConfigured,
    },
    payme: {
      merchantId: data.PAYME_MERCHANT_ID,
      secretKey: paymeSecret,
      env: data.PAYME_ENV,
      returnUrl: data.PAYME_RETURN_URL,
      enabled: data.PAYME_ENABLED,
      isConfigured: paymeConfigured,
    },
    click: {
      serviceId: data.CLICK_SERVICE_ID,
      merchantId: data.CLICK_MERCHANT_ID,
      secretKey: clickSecret,
      merchantUserId: data.CLICK_MERCHANT_USER_ID,
      returnUrl: data.CLICK_RETURN_URL,
      webhookSecret: data.CLICK_WEBHOOK_SECRET || clickSecret,
      enabled: data.CLICK_ENABLED,
      isConfigured: clickConfigured,
    },
    sms: {
      provider: data.SMS_PROVIDER || "auto",
      apiUrl: data.SMS_API_URL,
      email: smsLogin,
      password: smsPassword,
      senderName: data.SMS_SENDER_NAME,
      isConfigured: smsConfigured,
    },
    logistics: {
      provider: data.LOGISTICS_PROVIDER || "internal",
      webhookSecret: data.LOGISTICS_WEBHOOK_SECRET,
    },
    payout: {
      provider: data.PAYOUT_PROVIDER || "internal",
      webhookSecret: data.PAYOUT_WEBHOOK_SECRET,
    },
    storage: {
      provider: data.STORAGE_PROVIDER || "local",
      localUploadDir: data.LOCAL_UPLOAD_DIR,
    },
  };
}

export const serverEnv = parseServerEnv();

export type ServerEnv = typeof serverEnv;
