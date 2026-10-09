import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

/** Liveness — PostgreSQL talab qilmaydi (reverse proxy / PM2). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "tavfiq",
    appEnv: serverEnv.appEnv,
    uptimeSec: Math.round(process.uptime()),
  });
}
