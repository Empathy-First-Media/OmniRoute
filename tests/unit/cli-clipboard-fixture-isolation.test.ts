import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Static test-fixture policy only. Do not execute the old fixture to prove this:
// its unmocked helper overwrites the host OS clipboard on macOS and Windows.
test("CLI clipboard unit fixture installs a native child-process mock before helper imports", () => {
  const source = readFileSync(new URL("./cli-clipboard.test.ts", import.meta.url), "utf8");
  const mockPosition = source.search(/mock\.method\(\s*childProcess\s*,\s*["']execSync["']/);
  const importPosition = source.indexOf('import("../../bin/cli/utils/clipboard.mjs")');
  assert.ok(mockPosition >= 0, "clipboard tests must mock the OS command boundary");
  assert.ok(importPosition > mockPosition, "the native mock must precede clipboard helper imports");
  assert.match(source, /syncBuiltinESMExports/);
});
