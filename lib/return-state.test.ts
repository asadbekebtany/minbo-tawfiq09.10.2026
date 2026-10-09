import assert from "node:assert/strict";
import test from "node:test";
import { assertReturnTransition, canTransitionReturn } from "./return-state.ts";

test("return requested to approved allowed", () => {
  assert.equal(canTransitionReturn("requested", "approved"), true);
});

test("return cannot skip to completed", () => {
  assert.equal(canTransitionReturn("requested", "completed"), false);
  assert.throws(() => assertReturnTransition("requested", "completed"));
});

test("refund_pending to completed allowed", () => {
  assert.equal(canTransitionReturn("refund_pending", "completed"), true);
});
