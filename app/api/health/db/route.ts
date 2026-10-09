import { NextResponse } from "next/server";
import { getDatabaseConnectionInfo, getDatabaseStatus } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Readiness — PostgreSQL ping. */
export async function GET() {
  const status = await getDatabaseStatus();
  const info = getDatabaseConnectionInfo();

  if (!status.connected) {
    log.warn("health.db", status.message, { configured: status.configured });
  }

  return NextResponse.json(
    {
      ok: status.connected,
      configured: status.configured,
      message: status.message,
      appEnv: serverEnv.appEnv,
      ...(serverEnv.isDevelopment && info
        ? {
            database: {
              host: info.host,
              port: info.port,
              name: info.database,
              schema: info.schema,
            },
          }
        : {}),
    },
    { status: status.connected ? 200 : 503 },
  );
}
