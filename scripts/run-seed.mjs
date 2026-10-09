#!/usr/bin/env node
/**
 * Seed rejimini aniq belgilab ishga tushirish.
 * Ishlatish: npm run db:seed:dev | npm run db:seed:prod
 */
import { execSync } from "node:child_process";

const mode = process.argv[2]?.trim().toLowerCase();

if (mode !== "development" && mode !== "production") {
  console.error("\n✗ Rejim kerak: development yoki production\n");
  console.error("  npm run db:seed:dev");
  console.error("  npm run db:seed:prod\n");
  process.exit(1);
}

const appEnv = process.env.APP_ENV?.trim().toLowerCase();
const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
if (mode === "development" && (appEnv === "production" || nodeEnv === "production")) {
  console.error("\n✗ Demo seed production muhitida taqiqlangan.\n");
  process.exit(1);
}

console.log(`\n🌱 Seed rejimi: ${mode}\n`);

execSync("npx prisma db seed", {
  stdio: "inherit",
  env: { ...process.env, SEED_MODE: mode },
});
