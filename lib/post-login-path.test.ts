import assert from "node:assert/strict";
import test from "node:test";
import { loginMustReauthenticate, postLoginPath } from "./post-login-path.ts";

test("pvz operator always lands on /pvz", () => {
  assert.equal(postLoginPath("pvz_operator"), "/pvz");
  assert.equal(postLoginPath("pvz_operator", "/catalog"), "/pvz");
  assert.equal(postLoginPath("pvz_operator", "/pvz"), "/pvz");
});

test("buyer and seller cannot land on /pvz", () => {
  assert.equal(postLoginPath("customer", "/pvz"), "/profile");
  assert.equal(postLoginPath("seller", "/pvz"), "/seller/dashboard");
});

test("wrong session stays on the login form for seller and super admin", () => {
  assert.equal(loginMustReauthenticate("customer", "/seller/dashboard"), true);
  assert.equal(loginMustReauthenticate("customer", "/super-admin/dashboard"), true);
  assert.equal(loginMustReauthenticate("seller", "/seller/dashboard"), false);
  assert.equal(loginMustReauthenticate("super_admin", "/super-admin/dashboard"), false);
  assert.equal(loginMustReauthenticate("customer", "/seller/register"), false);
  assert.equal(loginMustReauthenticate("customer", "/cart"), false);
});

test("admin default stays admin; from=/pvz allowed", () => {
  assert.equal(postLoginPath("admin"), "/admin/dashboard");
  assert.equal(postLoginPath("admin", "/pvz"), "/pvz");
  assert.equal(postLoginPath("super_admin"), "/super-admin/dashboard");
  assert.equal(postLoginPath("super_admin", "/pvz"), "/pvz");
});
