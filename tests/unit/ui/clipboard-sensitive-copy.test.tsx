import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { copyToClipboard } from "../../../src/shared/utils/clipboard";
import { useCopyToClipboard } from "../../../src/shared/hooks/useCopyToClipboard";

const syntheticCredentialUrl = "https://gateway.test/api/v1/vscode/synthetic-test-only-key/";
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalExecCommand = Object.getOwnPropertyDescriptor(document, "execCommand");

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true });
}

function allowLegacyCopy() {
  const execCommand = vi.fn().mockReturnValue(true);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  return execCommand;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
  if (originalExecCommand) Object.defineProperty(document, "execCommand", originalExecCommand);
  else Reflect.deleteProperty(document, "execCommand");
});

describe("credential clipboard copies", () => {
  it("uses the Clipboard API without a DOM fallback when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const append = vi.spyOn(document.body, "appendChild");
    expect(await copyToClipboard(syntheticCredentialUrl, { allowFallback: false })).toBe(true);
    expect(writeText).toHaveBeenCalledWith(syntheticCredentialUrl);
    expect(append).not.toHaveBeenCalled();
  });

  it("fails closed without attaching a credential textarea when Clipboard API is absent", async () => {
    setClipboard(undefined);
    const execCommand = allowLegacyCopy();
    const append = vi.spyOn(document.body, "appendChild");
    expect(await copyToClipboard(syntheticCredentialUrl, { allowFallback: false })).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("does not attach a credential textarea when Clipboard API rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException("NotAllowedError")) });
    const execCommand = allowLegacyCopy();
    const append = vi.spyOn(document.body, "appendChild");
    expect(await copyToClipboard(syntheticCredentialUrl, { allowFallback: false })).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("preserves the default legacy fallback for ordinary non-sensitive text", async () => {
    setClipboard(undefined);
    const execCommand = allowLegacyCopy();
    expect(await copyToClipboard("ordinary public URL")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("preserves an explicitly allowed legacy fallback", async () => {
    setClipboard(undefined);
    const execCommand = allowLegacyCopy();
    expect(await copyToClipboard("ordinary public URL", { allowFallback: true })).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("forwards the no-fallback option through the real feedback hook", async () => {
    setClipboard(undefined);
    const execCommand = allowLegacyCopy();
    const { result } = renderHook(() => useCopyToClipboard());
    const append = vi.spyOn(document.body, "appendChild");
    let copied: boolean | undefined;
    await act(async () => {
      copied = await result.current.copy(syntheticCredentialUrl, "credential", {
        allowFallback: false,
      });
    });
    expect(copied).toBe(false);
    expect(result.current.copied).toBeNull();
    expect(append).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
  });
});
