import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compressionPreviewConfigSchema,
  compressionSettingsUpdateSchema,
  ultraConfigSchema,
} from "../../../src/shared/validation/compressionConfigSchemas.ts";
import { DEFAULT_ULTRA_CONFIG } from "../../../open-sse/services/compression/types.ts";

describe("Ultra optional model path form contract", () => {
  it("accepts the blank model path sent by the heuristic preview form", () => {
    const result = compressionPreviewConfigSchema.safeParse({
      ultra: { ...DEFAULT_ULTRA_CONFIG, modelPath: "" },
    });
    assert.equal(result.success, true);
  });

  it("allows an existing model path to be cleared on save", () => {
    const result = compressionSettingsUpdateSchema.safeParse({ ultra: { modelPath: "" } });
    assert.equal(result.success, true);
  });

  it("normalizes an all-whitespace model path to the unset value", () => {
    const result = ultraConfigSchema.safeParse({ modelPath: "  \t " });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.modelPath, "");
  });

  it("retains a supplied local model path", () => {
    const result = ultraConfigSchema.parse({ modelPath: " /models/local.onnx " });
    assert.equal(result.modelPath, "/models/local.onnx");
  });

  it("does not weaken model path type validation", () => {
    assert.equal(ultraConfigSchema.safeParse({ modelPath: 42 }).success, false);
    assert.equal(ultraConfigSchema.safeParse({ modelPath: null }).success, false);
  });

  it("keeps unknown Ultra configuration fields rejected", () => {
    assert.equal(ultraConfigSchema.safeParse({ modelPath: "", unexpected: true }).success, false);
  });
});
