import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cavemanCompress } from "../../../open-sse/services/compression/caveman.ts";

const config = {
  enabled: true,
  compressRoles: ["user"],
  skipRules: [],
  minMessageLength: 0,
  preservePatterns: [],
};
function compress(content: string): string {
  const result = cavemanCompress({ messages: [{ role: "user", content }] }, config);
  const messages = result.body.messages as Array<{ content: string }>;
  return messages[0].content;
}

describe("Caveman filler punctuation artifacts", () => {
  it("removes a leading orphan comma after polite framing", () => {
    const result = compress("Please, check invoice INV-7741 and do not refund $1,234.56.");
    assert.doesNotMatch(result, /^\s*[,;:]/);
    assert.ok(result.includes("INV-7741"));
    assert.ok(result.includes("$1,234.56"));
    assert.match(result, /do not/i);
  });

  it("does not leave a comma after a sentence terminator", () => {
    const result = compress("Do not refund it. Please, it is important to check invoice INV-7741.");
    assert.doesNotMatch(result, /[.!?]\s*,/);
    assert.match(result, /do not refund/i);
  });

  it("keeps punctuation inside protected code and decimal amounts", () => {
    const code = "```js\nconst punctuation = '.,';\n```";
    const result = compress("Please, preserve $1,234.56 and this code:\n" + code);
    assert.ok(result.includes(code));
    assert.ok(result.includes("$1,234.56"));
    assert.doesNotMatch(result, /^Please/, "protected punctuation must not force a full fallback");
  });

  it("does not strip dotfile names or punctuation inside inline code", () => {
    const result = compress("Please inspect .env and `.,` before changing INV-7741.");
    assert.ok(result.includes(".env"));
    assert.ok(result.includes("`.,`"));
    assert.doesNotMatch(result, /^Please/, "inline punctuation must not force a full fallback");
  });
});
