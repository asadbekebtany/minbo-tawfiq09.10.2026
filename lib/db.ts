import net from "node:net";
import { serverEnv } from "@/lib/env.server";
import prisma from "@/lib/prisma";

export { prisma as db } from "@/lib/prisma";

export type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  message: string;
};

let cachedConnected: boolean | null = null;
let lastCheckedAt = 0;
const CACHE_TTL_MS = 30_000;

function parseDatabaseHost(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
  };
}

function isDatabasePortReachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timeoutMs = 1500;

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function checkDatabaseConnection(
  force = false,
): Promise<boolean> {
  if (!serverEnv.hasDatabase || !serverEnv.databaseUrl) {
    cachedConnected = false;
    return false;
  }

  const now = Date.now();
  if (!force && cachedConnected !== null && now - lastCheckedAt < CACHE_TTL_MS) {
    return cachedConnected;
  }

  const { host, port } = parseDatabaseHost(serverEnv.databaseUrl);
  const reachable = await isDatabasePortReachable(host, port);

  if (!reachable) {
    cachedConnected = false;
    lastCheckedAt = now;
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    cachedConnected = true;
  } catch {
    cachedConnected = false;
  }

  lastCheckedAt = now;
  return cachedConnected;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!serverEnv.hasDatabase) {
    return {
      configured: false,
      connected: false,
      message:
        "DATABASE_URL sozlanmagan. .env faylida PostgreSQL ulanish satrini kiriting.",
    };
  }

  const connected = await checkDatabaseConnection(true);

  if (connected) {
    return {
      configured: true,
      connected: true,
      message: "PostgreSQL bazasiga muvaffaqiyatli ulandi.",
    };
  }

  return {
    configured: true,
    connected: false,
    message:
      "PostgreSQL serverga ulanib bo‘lmadi. Docker: npm run db:up yoki mahalliy PostgreSQL xizmatini ishga tushiring.",
  };
}

export function resetDatabaseConnectionCache(): void {
  cachedConnected = null;
  lastCheckedAt = 0;
}

export type DataSource = "database" | "fallback" | "unavailable";

/** DB yoki muhit siyosatiga ko‘ra JSON fallback manbasini aniqlash */
export async function resolveDataSource(): Promise<DataSource> {
  if (await checkDatabaseConnection()) return "database";
  if (serverEnv.runtime.allowJsonFallback) return "fallback";
  return "unavailable";
}

export function databaseUnavailableResponse() {
  return {
    error: serverEnv.runtime.requireDatabase
      ? "Database ulanmagan. Staging/production uchun PostgreSQL majburiy."
      : "Database ulanmagan.",
  };
}

export type DatabaseConnectionInfo = {
  host: string;
  port: number;
  database: string;
  schema: string | null;
};

/** Ulanish satridan parolsiz metadata (health/log uchun) */
export function getDatabaseConnectionInfo(): DatabaseConnectionInfo | null {
  if (!serverEnv.databaseUrl) return null;
  try {
    const parsed = new URL(serverEnv.databaseUrl);
    const schema = parsed.searchParams.get("schema");
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      database: parsed.pathname.replace(/^\//, "") || "postgres",
      schema,
    };
  } catch {
    return null;
  }
}
