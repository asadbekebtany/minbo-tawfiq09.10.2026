import assert from "node:assert/strict";
import test from "node:test";
import { buildRuntimePolicy, validateDeploymentPolicy } from "./runtime-policy.ts";

test("production rejects OTP demo even if SMS configured", () => {
  const policy = buildRuntimePolicy({ appEnv: "production", allowStagingOtpDemo: false });
  assert.equal(policy.allowOtpDemo, false);
  assert.throws(() =>
    validateDeploymentPolicy({
      policy,
      isBuildPhase: false,
      databaseUrl: "postgresql://u:p@localhost:5432/tavfiq",
      nextauthSecret: "a-real-secret-key-minimum-32-characters-long",
      lockAdminApi: false,
      otpDemoCodes: ["1234"],
      smsConfigured: true,
      allowStagingOtpDemo: false,
    }),
  );
});

test("development allows OTP demo codes", () => {
  const policy = buildRuntimePolicy({ appEnv: "development", allowStagingOtpDemo: false });
  assert.equal(policy.allowOtpDemo, true);
});

test("production requires https NEXTAUTH_URL", () => {
  const policy = buildRuntimePolicy({ appEnv: "production", allowStagingOtpDemo: false });
  assert.throws(() =>
    validateDeploymentPolicy({
      policy,
      isBuildPhase: false,
      databaseUrl: "postgresql://u:p@localhost:5432/tavfiq",
      nextauthSecret: "a-real-secret-key-minimum-32-characters-long",
      lockAdminApi: false,
      otpDemoCodes: [],
      smsConfigured: true,
      allowStagingOtpDemo: false,
      nextauthUrl: "http://tavfiq.uz",
    }),
  );
});

test("production rejects SMS mock provider", () => {
  const policy = buildRuntimePolicy({ appEnv: "production", allowStagingOtpDemo: false });
  assert.throws(() =>
    validateDeploymentPolicy({
      policy,
      isBuildPhase: false,
      databaseUrl: "postgresql://u:p@localhost:5432/tavfiq",
      nextauthSecret: "a-real-secret-key-minimum-32-characters-long",
      lockAdminApi: false,
      otpDemoCodes: [],
      smsConfigured: true,
      allowStagingOtpDemo: false,
      nextauthUrl: "https://tavfiq.uz",
      smsProvider: "mock",
    }),
  );
});
