import { serverEnv } from "@/lib/env.server";

/** Development-only demo hisoblar. Productionda hech qachon ishlamasin. */
export function isDevOnlyDemoAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !serverEnv.isProduction &&
    serverEnv.isDevelopment
  );
}
