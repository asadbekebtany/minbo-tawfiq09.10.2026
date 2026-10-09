import assert from "node:assert/strict";
import test from "node:test";
import {
  canAcceptPvzReturn,
  canTransitionPvzParcel,
  isPvzParcelStatus,
  PVZ_NEXT_ACTIONS,
} from "./pvz-state.ts";

test("incoming only to received", () => {
  assert.equal(canTransitionPvzParcel("incoming", "received"), true);
  assert.equal(canTransitionPvzParcel("incoming", "ready"), false);
  assert.equal(canTransitionPvzParcel("incoming", "delivered"), false);
  assert.equal(canTransitionPvzParcel("incoming", "return_accepted"), false);
});

test("received to ready or return, not delivered skip", () => {
  assert.equal(canTransitionPvzParcel("received", "ready"), true);
  assert.equal(canTransitionPvzParcel("received", "return_accepted"), true);
  assert.equal(canTransitionPvzParcel("received", "delivered"), false);
  assert.equal(canTransitionPvzParcel("received", "incoming"), false);
});

test("ready to delivered or return", () => {
  assert.equal(canTransitionPvzParcel("ready", "delivered"), true);
  assert.equal(canTransitionPvzParcel("ready", "return_accepted"), true);
  assert.equal(canTransitionPvzParcel("ready", "incoming"), false);
});

test("delivered only to return_accepted", () => {
  assert.equal(canTransitionPvzParcel("delivered", "return_accepted"), true);
  assert.equal(canTransitionPvzParcel("delivered", "ready"), false);
  assert.equal(canTransitionPvzParcel("return_accepted", "incoming"), false);
});

test("next actions never include arbitrary jumps", () => {
  assert.deepEqual(
    PVZ_NEXT_ACTIONS.incoming.map((a) => a.status),
    ["received"],
  );
  assert.ok(isPvzParcelStatus("incoming"));
});

test("return accept needs open return", () => {
  assert.equal(canAcceptPvzReturn("ready", true), true);
  assert.equal(canAcceptPvzReturn("ready", false), false);
  assert.equal(canAcceptPvzReturn("incoming", true), false);
});
