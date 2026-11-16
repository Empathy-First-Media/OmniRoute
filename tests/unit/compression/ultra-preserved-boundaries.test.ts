import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ultraCompress } from "../../../open-sse/services/compression/ultra.ts";
import {
  __resetUltraEntryForTests,
  __setUltraSlmTestHooks,
} from "../../../open-sse/services/compression/engines/llmlingua/ultraEntry.ts";

const config = {
  enabled: true,
  maxTokensPerMessage: 0,
  compressionRate: 0.5,
  minScoreThreshold: 0.3,
};
const code = "```ts\nconst amount = 1234.56;\n```";
const fixture =
  "Invoice INV-7741 is $1,234.56 and should NOT refund it. Please check /etc/app/config.yaml. Thank you so much for your help.\n\nHere is the fix:\n" +
  code +
  "\n\nThen call `calc_total()` and check https://example.com/billing for details.";

afterEach(() => __resetUltraEntryForTests());

for (const tier of ["heuristic", "slm", "heuristic-fallback"] as const) {
  describe(`Ultra preserved boundaries: ${tier}`, () => {
    it("keeps separators around amounts, paths, code fences and URLs", async () => {
      if (tier !== "heuristic") {
        __setUltraSlmTestHooks({
          available: true,
          run: async (text) => {
            if (tier === "heuristic-fallback") throw new Error("synthetic unavailable backend");
            return text.trim();
          },
        });
      }
      const result = await ultraCompress([{ role: "user", content: fixture }], {
        ...config,
        ultraEngine: tier === "heuristic" ? "heuristic" : "slm",
      });
      const text = result.messages[0].content as string;
      assert.match(text, /\$1,234\.56\s+/);
      assert.match(text, /config\.yaml\.\s+Thank/);
      assert.ok(text.includes("\n" + code + "\n"), "fenced code must remain on its own lines");
      assert.match(text, /\s+`calc_total\(\)`\s+/);
      assert.match(text, /\s+https:\/\/example\.com\/billing\s+/);
      assert.ok(text.includes("NOT"), "polarity must survive");
      assert.equal(result.stats.ultraTier, tier);
    });

    it("keeps whitespace-only spans between preserved blocks", async () => {
      if (tier !== "heuristic") {
        __setUltraSlmTestHooks({
          available: true,
          run: async (text) => {
            if (tier === "heuristic-fallback") throw new Error("synthetic unavailable backend");
            return text.trim();
          },
        });
      }
      const input = "`alpha()`\n\n`beta()`";
      const result = await ultraCompress([{ role: "user", content: input }], {
        ...config,
        ultraEngine: tier === "heuristic" ? "heuristic" : "slm",
      });
      assert.equal(result.messages[0].content, input);
    });
  });
}
