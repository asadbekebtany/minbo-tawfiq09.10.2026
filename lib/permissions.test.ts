import assert from "node:assert/strict";
import test from "node:test";
import { canAccess, canAccessOrder, canSearchPvzCustomerPhone } from "./permissions.ts";

test("pvz can search customer phone via pickup permission", () => {
  assert.equal(canSearchPvzCustomerPhone("pvz_operator"), true);
  assert.equal(canSearchPvzCustomerPhone("admin"), true);
  assert.equal(canSearchPvzCustomerPhone("customer"), false);
  assert.equal(canSearchPvzCustomerPhone("seller"), false);
});

test("pvz cannot access admin finance", () => {
  assert.equal(canAccess("pvz_operator", "finance.view"), false);
});

test("super admin has wildcard", () => {
  assert.equal(canAccess("super_admin", "orders.status"), true);
});

test("seller cannot access other sellers via admin sellers.ban", () => {
  assert.equal(canAccess("seller", "sellers.ban"), false);
});

test("seller isolation: other seller cannot access foreign order", () => {
  assert.equal(
    canAccessOrder({ id: "seller-b", role: "seller" }, "buyer-a", "seller-a"),
    false,
  );
  assert.equal(
    canAccessOrder({ id: "seller-a", role: "seller" }, "buyer-a", "seller-a"),
    true,
  );
  assert.equal(
    canAccessOrder({ id: "admin-1", role: "admin" }, "buyer-a", "seller-a"),
    true,
  );
});
