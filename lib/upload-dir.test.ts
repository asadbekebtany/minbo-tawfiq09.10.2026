import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { assertPathInsideRoot, publicUploadUrl } from "./upload-dir.ts";

test("upload url is public /uploads path", () => {
  assert.equal(publicUploadUrl("hero/a.jpg"), "/uploads/hero/a.jpg");
});

test("rejects path traversal", () => {
  const root = path.resolve("/var/lib/tavfiq/uploads");
  assert.equal(assertPathInsideRoot(root, path.join(root, "hero", "a.jpg")), true);
  assert.equal(assertPathInsideRoot(root, path.resolve(root, "..", "etc", "passwd")), false);
});
