import assert from "node:assert/strict";
import test from "node:test";
import { allowPaymentMocks, allowSmsMock } from "./errors.ts";
import { redactProviderPayload } from "./redact.ts";
import { clickSign, verifyClickSign } from "./click-adapter.ts";
import { verifyPaymeBasicAuth } from "./payme-adapter.ts";
import { InternalLogisticsProvider } from "./logistics-provider.ts";
import { InternalPayoutProvider } from "./payout-provider.ts";

test("production forbids payment and SMS mocks", () => {
  assert.equal(allowPaymentMocks("production"), false);
  assert.equal(allowSmsMock("production"), false);
  assert.equal(allowPaymentMocks("development"), true);
});

test("redacts provider secrets", () => {
  const out = redactProviderPayload({
    orderId: "o1",
    password: "super-secret",
    sign_string: "abc",
    nested: { token: "xyz" },
  });
  assert.equal(out?.orderId, "o1");
  assert.equal(out?.password, "[redacted]");
  assert.equal(out?.sign_string, "[redacted]");
  assert.equal((out?.nested as Record<string, unknown>).token, "[redacted]");
});

test("click signature verifies", () => {
  const body = {
    click_trans_id: "1",
    service_id: "10",
    merchant_trans_id: "tx-1",
    amount: "15000",
    action: "1",
    sign_time: "2026-01-01",
  };
  const secret = "click-secret";
  const sign = clickSign({
    clickTransId: "1",
    serviceId: "10",
    secret,
    merchantTransId: "tx-1",
    amount: "15000",
    action: "1",
    signTime: "2026-01-01",
  });
  assert.equal(verifyClickSign({ ...body, sign_string: sign }, secret), true);
  assert.equal(verifyClickSign({ ...body, sign_string: "deadbeef" }, secret), false);
});

test("payme basic auth verifies", () => {
  const merchantId = "mid";
  const key = "payme-key";
  const header = `Basic ${Buffer.from(`${merchantId}:${key}`).toString("base64")}`;
  assert.equal(verifyPaymeBasicAuth(header, merchantId, key), true);
  assert.equal(verifyPaymeBasicAuth(header, merchantId, "other"), false);
  assert.equal(verifyPaymeBasicAuth(null, merchantId, key), false);
});

test("internal logistics covers shipment lifecycle", async () => {
  const logistics = new InternalLogisticsProvider();
  const created = await logistics.createShipment({
    orderId: "ord-1",
    pickupPointId: "pvz-1",
    to: "PVZ",
  });
  assert.ok(created.trackingNumber);
  const mapped = await logistics.mapPvz("pvz-1");
  assert.equal(mapped.pickupPointId, "pvz-1");
  const cancelled = await logistics.cancelShipment(created.trackingNumber);
  assert.equal(cancelled.status, "cancelled");
  const ret = await logistics.createReturnShipment({ orderId: "ord-1" });
  assert.equal(ret.status, "return_created");
});

test("internal payout provider contract", async () => {
  const payout = new InternalPayoutProvider();
  const created = await payout.createPayout({
    payoutId: "p1",
    storeId: "s1",
    amount: 1000,
  });
  assert.equal(created.status, "processing");
  const checked = await payout.checkPayout(created.providerRef);
  assert.equal(checked.provider, "internal");
  const cancelled = await payout.cancelPayout(created.providerRef);
  assert.equal(cancelled.status, "cancelled");
});
