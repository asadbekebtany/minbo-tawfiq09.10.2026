import { execSync } from "node:child_process";
import net from "node:net";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/tavfiq?schema=public";

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

function commandExists(name) {
  try {
    execSync(process.platform === "win32" ? `where ${name}` : `command -v ${name}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function waitForPort(host, port, timeoutMs = 60_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`PostgreSQL ${host}:${port} porti ochilmadi.`));
          return;
        }
        setTimeout(attempt, 1500);
      });
    };

    attempt();
  });
}

async function main() {
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (appEnv === "production" || nodeEnv === "production") {
    console.error(
      "\n✗ npm run db:setup faqat local/dev. Production: npx prisma migrate deploy (demo seed avtomatik emas).\n",
    );
    process.exit(1);
  }

  process.env.DATABASE_URL = DATABASE_URL;

  if (commandExists("docker")) {
    run("docker compose up -d postgres");
    console.log("\nPostgreSQL konteyneri ishga tushirilmoqda...");
    await waitForPort("127.0.0.1", 5432);
  } else {
    console.log(
      "Docker topilmadi. Mahalliy PostgreSQL xizmati ishlayotganiga ishonch hosil qiling.",
    );
    await waitForPort("127.0.0.1", 5432);
  }

  run("npx prisma generate");
  run("npx prisma migrate deploy");
  run("npx prisma migrate status");
  process.env.SEED_MODE = "development";
  run("npx prisma db seed");

  console.log("\nPostgreSQL tayyor: migrate deploy va seed muvaffaqiyatli yakunlandi.");
}

main().catch((error) => {
  console.error("\nDatabase setup xatosi:", error.message);
  console.error(
    "\nYordam:\n  1. Docker o‘rnating va `npm run db:up` bajaring\n  2. .env dagi DATABASE_URL ni tekshiring\n  3. `npm run db:setup` ni qayta ishga tushiring",
  );
  process.exit(1);
});
