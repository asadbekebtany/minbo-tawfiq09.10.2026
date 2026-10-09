import { z } from "zod";
import { CLIENT_SAFE_PUBLIC_KEYS } from "@/lib/env-security";
import { appEnvSchema } from "@/lib/runtime-policy";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: appEnvSchema.default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("TAVFIQ"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().optional(),
  ),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

if (typeof process !== "undefined" && process.env) {
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (!(CLIENT_SAFE_PUBLIC_KEYS as readonly string[]).includes(key)) {
      console.warn(
        `[env.client] Noma'lum NEXT_PUBLIC_ o'zgaruvchi e'tiborsiz qoldirildi: ${key}`,
      );
    }
  }
}

if (!parsed.success) {
  console.error(
    "Public environment o'zgaruvchilari noto'g'ri:",
    parsed.error.flatten().fieldErrors,
  );
}

const data = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_APP_ENV: "development" as const,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_NAME: "TAVFIQ",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: undefined,
    };

export const clientEnv = {
  appEnv: data.NEXT_PUBLIC_APP_ENV,
  isStaging: data.NEXT_PUBLIC_APP_ENV === "staging",
  showEnvBanner: data.NEXT_PUBLIC_APP_ENV === "staging",
  appUrl: data.NEXT_PUBLIC_APP_URL,
  appName: data.NEXT_PUBLIC_APP_NAME,
  cloudinaryCloudName: data.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
} as const;

export type ClientEnv = typeof clientEnv;
