import assert from "node:assert/strict";
import test from "node:test";
import { resolveAnalyticsRange } from "./date-range.ts";

test("today range starts today", () => {
  const r = resolveAnalyticsRange("today");
  assert.equal(r.from.getDate(), r.to.getDate());
});

test("custom range parses ISO", () => {
  const r = resolveAnalyticsRange("custom", "2026-01-01", "2026-01-31");
  assert.equal(r.from.toISOString().startsWith("2026-01-01"), true);
});
