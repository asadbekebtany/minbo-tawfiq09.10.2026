import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_SUPER_ADMIN_PHONE,
  allowDemoPhonePrivilege,
  demoRoleForPhone,
  effectiveRole,
  isSuperAdminSession,
} from "./demo-staff.ts";

test("demo super admin phone maps to super_admin", () => {
  assert.equal(demoRoleForPhone(DEMO_SUPER_ADMIN_PHONE), "super_admin");
  assert.equal(demoRoleForPhone("998712000000"), "super_admin");
  assert.equal(demoRoleForPhone("712000000"), "super_admin");
});

test("product admin phone stays admin", () => {
  assert.equal(demoRoleForPhone("+998712000001"), "admin");
  assert.equal(isSuperAdminSession({ role: "admin", phone: "+998712000001" }), false);
});

test("JWT admin + super admin phone elevates", () => {
  assert.equal(effectiveRole("admin", "+998712000000"), "super_admin");
  assert.equal(isSuperAdminSession({ role: "admin", phone: "+998712000000" }), true);
});

test("Admin.role super_admin elevates User.role admin", () => {
  assert.equal(effectiveRole("admin", "+998901111111", "super_admin"), "super_admin");
});

test("production does not elevate demo phone", () => {
  const prevApp = process.env.APP_ENV;
  const prevNode = process.env.NODE_ENV;
  process.env.APP_ENV = "production";
  process.env.NODE_ENV = "production";
  try {
    assert.equal(allowDemoPhonePrivilege(), false);
    assert.equal(isSuperAdminSession({ role: "admin", phone: "+998712000000" }), false);
    assert.equal(effectiveRole("admin", "+998712000000"), "admin");
  } finally {
    if (prevApp === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prevApp;
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
  }
});
