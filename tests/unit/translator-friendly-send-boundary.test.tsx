// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslateSession } from "@/app/(dashboard)/dashboard/translator/hooks/useTranslateSession";

// Real session hook; every endpoint reply is synthetic. No provider/network access.
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/translator/detect")
      return { json: async () => ({ success: true, format: "claude" }) };
    if (url === "/api/translator/translate")
      return {
        json: async () => ({
          success: true,
          result: { messages: [{ role: "user", content: "synthetic" }] },
        }),
      };
    if (url === "/api/translator/send") return { ok: true, body: null };
    throw new Error(`Unexpected endpoint ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Translator explicit send boundary", () => {
  it.each(["preview", "send"] as const)(
    "%s mode uses only its intended synthetic endpoints",
    async (mode) => {
      const { result } = renderHook(() => useTranslateSession());
      await act(async () => {
        await result.current.run({
          source: "claude",
          target: "openai",
          provider: "openai",
          inputText: '{"messages":[{"role":"user","content":"synthetic"}]}',
          mode,
        });
      });
      const endpoints = fetchMock.mock.calls.map((call) => call[0]);
      expect(endpoints).toEqual(
        mode === "send"
          ? ["/api/translator/detect", "/api/translator/translate", "/api/translator/send"]
          : ["/api/translator/detect", "/api/translator/translate"]
      );
      expect(result.current.result.status).toBe("ok");
      expect(result.current.result.translatedJson).toContain("synthetic");
    }
  );
});
