#!/usr/bin/env node
/**
 * PostgreSQL ulanishini tekshirish.
 * Ishlatish: npm run db:ping
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("\n✗ DATABASE_URL topilmadi. .env faylini tekshiring.\n");
  process.exit(1);
}

let host = "localhost";
let port = 5432;
let database = "tavfiq";

try {
  const parsed = new URL(databaseUrl);
  host = parsed.hostname;
  port = Number(parsed.port || 5432);
  database = parsed.pathname.replace(/^\//, "") || database;
} catch {
  console.error("\n✗ DATABASE_URL noto'g'ri format.\n");
  process.exit(1);
}

function waitForPort(targetHost, targetPort, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const attempt = () => {
      const socket = net.createConnection({ host: targetHost, port: targetPort });
      socket.setTimeout(2000);
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("timeout", () => {
        socket.destroy();
        retry();
      });
      socket.once("error", () => {
        socket.destroy();
        retry();
      });
      function retry() {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Port ${targetHost}:${targetPort} ochilmadi`));
          return;
        }
        setTimeout(attempt, 1000);
      }
    };
    attempt();
  });
}

async function main() {
  console.log(`\nTAVFIQ DB ping — ${host}:${port}/${database}\n`);

  try {
    await waitForPort(host, port);
    console.log("✓ PostgreSQL porti ochiq");
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : error}`);
    console.error("\nYordam: npm run db:up  (Docker Desktop kerak)\n");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log("✓ Prisma orqali ulanish muvaffaqiyatli");
    console.log(`  ${result[0]?.version?.split(" on ")[0] ?? "PostgreSQL"}`);

    const tables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    console.log(`✓ public schema jadvallari: ${tables[0]?.count ?? 0}`);
  } catch (error) {
    console.error("✗ Prisma ulanishi muvaffaqiyatsiz:");
    console.error(`  ${error instanceof Error ? error.message : error}`);
    console.error("\nYordam: npm run db:setup  (migrate + seed)\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n✓ PostgreSQL tayyor.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
