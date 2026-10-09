import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeTestDatabase, isSafeTestDatabase, parsePostgresDatabaseName } from "./db-safety.ts";

test("parses postgres database name", () => {
  assert.equal(
    parsePostgresDatabaseName("postgresql://postgres:postgres@localhost:5432/tavfiq_test?schema=public"),
    "tavfiq_test",
  );
});

test("allows tavfiq_test even without NODE_ENV=test", () => {
  assert.equal(
    isSafeTestDatabase({
      databaseUrl: "postgresql://u:p@localhost:5432/tavfiq_test",
      nodeEnv: "development",
      appEnv: "development",
    }),
    true,
  );
});

test("refuses default docker tavfiq db", () => {
  assert.equal(
    isSafeTestDatabase({
      databaseUrl: "postgresql://postgres:postgres@localhost:5432/tavfiq",
      nodeEnv: "test",
      appEnv: "development",
    }),
    false,
  );
});

test("refuses production app env", () => {
  assert.equal(
    isSafeTestDatabase({
      databaseUrl: "postgresql://u:p@host:5432/tavfiq_test",
      nodeEnv: "test",
      appEnv: "production",
    }),
    false,
  );
});

test("assert throws on unsafe db", () => {
  assert.throws(() =>
    assertSafeTestDatabase("cleanup", {
      databaseUrl: "postgresql://u:p@localhost:5432/tavfiq",
      nodeEnv: "test",
      appEnv: "development",
    }),
  );
});
