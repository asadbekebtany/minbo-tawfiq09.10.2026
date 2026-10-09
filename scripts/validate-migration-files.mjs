#!/usr/bin/env node
/**
 * Prisma migration fayllarini DBsiz tekshirish (CI va offline).
 * Ishlatish: npm run db:migrate:check-offline
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "prisma", "migrations");
const schemaPath = join(root, "prisma", "schema.prisma");
const lockPath = join(migrationsDir, "migration_lock.toml");

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", cwd: root });
}

console.log("\nPrisma migration offline tekshiruvi\n");

console.log("1/3 — schema.prisma validatsiyasi");
run("npx prisma validate");

console.log("\n2/3 — migration_lock.toml");
if (!existsSync(lockPath)) {
  fail("prisma/migrations/migration_lock.toml topilmadi.");
}

const lock = readFileSync(lockPath, "utf8");
if (!lock.includes('provider = "postgresql"')) {
  fail('migration_lock.toml provider "postgresql" bo\'lishi kerak.');
}

console.log("\n3/3 — migration papkalari");
const entries = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (entries.length === 0) {
  fail("Hech qanday migration papkasi topilmadi.");
}

for (const name of entries) {
  const sqlPath = join(migrationsDir, name, "migration.sql");
  if (!existsSync(sqlPath)) {
    fail(`${name}/migration.sql mavjud emas.`);
  }
  const sql = readFileSync(sqlPath, "utf8").trim();
  if (!sql) {
    fail(`${name}/migration.sql bo'sh.`);
  }
}

console.log(`\n✓ ${entries.length} ta migration fayli tartibli va to'liq:`);
for (const name of entries) {
  console.log(`  - ${name}`);
}

if (!existsSync(schemaPath)) {
  fail("prisma/schema.prisma topilmadi.");
}

console.log("\n✓ Offline migration tekshiruvi muvaffaqiyatli.\n");
console.log(
  "To'liq deploy/drift tekshiruvi uchun PostgreSQL ishga tushiring:\n  npm run db:migrate:verify\n",
);
