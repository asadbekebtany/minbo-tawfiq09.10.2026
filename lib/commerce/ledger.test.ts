import assert from "node:assert/strict";
import test from "node:test";
import { splitOrderFinance } from "./ledger.ts";

test("commission setting used in split", () => {
  const result = splitOrderFinance(100_000, 10);
  assert.equal(result.commissionAmount, 10_000);
  assert.equal(result.sellerRevenue, 90_000);
});

test("zero commission leaves seller full amount", () => {
  const result = splitOrderFinance(50_000, 0);
  assert.equal(result.commissionAmount, 0);
  assert.equal(result.sellerRevenue, 50_000);
});
