import test, { after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

// Mock the native command boundary before loading the helper. Real pbcopy/clip
// would replace the developer's clipboard merely by running the unit suite.
const commandMock = mock.method(childProcess, "execSync", () => Buffer.alloc(0));
syncBuiltinESMExports();

beforeEach(() => {
  commandMock.mock.resetCalls();
  commandMock.mock.mockImplementation(() => Buffer.alloc(0));
});

after(() => {
  commandMock.mock.restore();
  syncBuiltinESMExports();
});

test("clipboard.mjs pode ser importado sem erro", async () => {
  const mod = await import("../../bin/cli/utils/clipboard.mjs");
  assert.equal(typeof mod.copyToClipboard, "function");
  assert.equal(typeof mod.isClipboardSupported, "function");
});

test("isClipboardSupported returns true for an available mocked platform command", async () => {
  const { isClipboardSupported } = await import("../../bin/cli/utils/clipboard.mjs");
  assert.equal(isClipboardSupported(), true);
});

test("copyToClipboard uses the mocked platform command without touching the host clipboard", async () => {
  const { copyToClipboard } = await import("../../bin/cli/utils/clipboard.mjs");
  assert.equal(copyToClipboard("test-text"), true);
  assert.equal(commandMock.mock.calls.length, 1);
  const expectedCommand =
    process.platform === "darwin"
      ? "pbcopy"
      : process.platform === "win32"
        ? "clip"
        : "xclip -selection clipboard";
  assert.equal(commandMock.mock.calls[0].arguments[0], expectedCommand);
  assert.deepEqual(commandMock.mock.calls[0].arguments[1], {
    input: "test-text",
    stdio: ["pipe", "ignore", "ignore"],
    timeout: 2000,
  });
});

test("copyToClipboard returns false when mocked platform commands are unavailable", async () => {
  commandMock.mock.mockImplementation(() => {
    throw new Error("Clipboard command unavailable in fixture");
  });
  const { copyToClipboard } = await import("../../bin/cli/utils/clipboard.mjs");
  assert.equal(copyToClipboard("some text"), false);
  assert.ok(commandMock.mock.calls.length >= 1);
});
