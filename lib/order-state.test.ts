import assert from "node:assert/strict";
import test from "node:test";
import { assertOrderTransition, canTransitionOrder, initialOrderStatus } from "./order-state.ts";

test("cash starts confirmed, online awaiting payment", () => {
  assert.equal(initialOrderStatus("cash"), "confirmed");
  assert.equal(initialOrderStatus("payme"), "awaiting_payment");
});

test("allows paid from awaiting_payment", () => {
  assert.equal(canTransitionOrder("awaiting_payment", "paid"), true);
});

test("blocks delivered from pending", () => {
  assert.equal(canTransitionOrder("pending", "delivered"), false);
  assert.throws(() => assertOrderTransition("pending", "delivered"));
});

test("PVZ receive then ready_for_pickup", () => {
  assert.equal(canTransitionOrder("confirmed", "at_pickup_point"), true);
  assert.equal(canTransitionOrder("at_pickup_point", "ready_for_pickup"), true);
});
