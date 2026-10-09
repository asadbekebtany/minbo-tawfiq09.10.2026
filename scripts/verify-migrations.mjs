import { execSync } from "node:child_process";
import net from "node:net";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/tavfiq?schema=public";

const STRICT = process.env.DB_MIGRATE_VERIFY_STRICT === "1";

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", env: { ...process.env, DATABASE_URL } });
}

function waitForPort(host, port, timeoutMs = 30_000) {
  const started = Date.now();

  return new Promise((resolve) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });
}

function getShadowDatabaseUrl() {
  if (process.env.SHADOW_DATABASE_URL) {
    return process.env.SHADOW_DATABASE_URL;
  }
  const parsed = new URL(DATABASE_URL);
  const dbName = parsed.pathname.replace(/^\//, "") || "tavfiq";
  parsed.pathname = `/${dbName}_shadow`;
  return parsed.toString();
}

async function main() {
  console.log("Prisma migration tekshiruvi boshlandi...\n");

  console.log("1/5 — Offline migration fayllari");
  run("node scripts/validate-migration-files.mjs");

  console.log("\n2/5 — Prisma client generatsiyasi");
  run("npx prisma generate");

  const dbReady = await waitForPort("127.0.0.1", 5432);
  if (!dbReady) {
    const message =
      "PostgreSQL ishlamayapti. migrate deploy va drift tekshiruvi o'tkazilmadi.";
    if (STRICT) {
      console.error(`\n✗ ${message}\n`);
      process.exit(1);
    }
    console.warn(`\n⚠ ${message}`);
    console.warn("To'liq tekshiruv: npm run db:setup && npm run db:migrate:verify");
    return;
  }

  console.log("\n3/5 — Migration deploy");
  run("npx prisma migrate deploy");

  console.log("\n4/5 — Migration holati");
  run("npx prisma migrate status");

  console.log("\n5/5 — Schema drift tekshiruvi (DB vs schema.prisma)");
  run(
    `npx prisma migrate diff --from-url "${DATABASE_URL}" --to-schema-datamodel prisma/schema.prisma --exit-code`,
  );

  const shadowUrl = getShadowDatabaseUrl();
  console.log("\nQo'shimcha — migrationlar vs schema (shadow DB)");
  run(
    `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "${shadowUrl}" --exit-code`,
  );

  console.log("\n✓ Migrationlar schema bilan mos. Tekshiruv muvaffaqiyatli.\n");
}

main().catch((error) => {
  console.error("\nMigration tekshiruvi xato:", error.message);
  process.exit(1);
});
