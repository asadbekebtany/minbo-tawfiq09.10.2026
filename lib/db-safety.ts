/**
 * Test/integration destructive DB ishlarini production/dev asosiy bazadan himoya qiladi.
 */

export type DbSafetyInput = {
  databaseUrl?: string | null;
  nodeEnv?: string | null;
  appEnv?: string | null;
};

export function parsePostgresDatabaseName(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const normalized = trimmed
      .replace(/^postgresql:/i, "http:")
      .replace(/^postgres:/i, "http:");
    const parsed = new URL(normalized);
    const name = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] ?? "");
    return name || null;
  } catch {
    const match = trimmed.match(/\/([^/?]+)(?:\?|$)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}

export function isSafeTestDatabase(input: DbSafetyInput = {}): boolean {
  const nodeEnv = (input.nodeEnv ?? process.env.NODE_ENV ?? "").toLowerCase();
  const appEnv = (input.appEnv ?? process.env.APP_ENV ?? "").toLowerCase();
  const url = input.databaseUrl ?? process.env.DATABASE_URL ?? "";
  const name = parsePostgresDatabaseName(url);

  if (appEnv === "production") return false;
  if (!name) return false;

  const namedTest = /tavfiq_test/i.test(name) || /_test$/i.test(name);
  const nodeTest = nodeEnv === "test";

  if (!namedTest && !nodeTest) return false;
  if (/^(postgres|tavfiq)$/i.test(name) && !namedTest) return false;
  return true;
}

export function assertSafeTestDatabase(
  reason = "destructive test cleanup",
  input: DbSafetyInput = {},
): void {
  if (!isSafeTestDatabase(input)) {
    throw new Error(
      `DB SAFETY: ${reason} rad etildi. NODE_ENV=test yoki database nomi tavfiq_test bo‘lishi shart.`,
    );
  }
}
