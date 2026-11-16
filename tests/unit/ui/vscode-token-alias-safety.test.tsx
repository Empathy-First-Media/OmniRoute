// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { copyMock } = vi.hoisted(() => ({ copyMock: vi.fn() }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    (
      ({
        vscodeAliasTitle: "VS Code Token Alias",
        vscodeAliasDescriptionReady: "Ready compatibility URLs",
        vscodeAliasDescriptionLoading: "Loading keys",
        vscodeAliasDescriptionError: "Could not load keys",
        vscodeAliasDescriptionPlaceholder: "Placeholder URLs",
        vscodeAliasManage: "CLI Tools",
        vscodeAliasBaseLabel: "VS Code base",
        vscodeAliasModelsLabel: "VS Code models",
        vscodeAliasChatLabel: "VS Code chat",
        copyUrl: "Copy URL",
        apiKeyRevealDisabled: "API key reveal is disabled",
        apiKeyRevealFailed: "Could not reveal the selected key",
        apiKeyRevealInvalid: "Invalid key reveal response",
        apiKeyClipboardFailed:
          "Secure clipboard unavailable. Use HTTPS and allow clipboard access.",
      }) as Record<string, string>
    )[key] ?? key,
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/shared/hooks", () => ({ useDisplayBaseUrl: () => "http://gateway.test" }));
vi.mock("@/shared/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => ({ copied: null, copy: copyMock }),
}));
vi.mock("@/shared/components", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import VscodeTokenAliasCard from "@/app/(dashboard)/dashboard/endpoint/VscodeTokenAliasCard";

const fixtureSecret = "fixture-secret-never-render";
const keySummary = {
  id: "key-active",
  key: "masked-key",
  rawKey: fixtureSecret,
  isActive: true,
};
function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
async function defaultFetch(input: RequestInfo | URL) {
  const url = String(input);
  if (url === "/api/cli-tools/keys" || url === "/api/keys?limit=100") {
    return response({ keys: [keySummary] });
  }
  if (url === "/api/keys/key-active/reveal") return response({ key: fixtureSecret });
  throw new Error("Unexpected request in token alias fixture");
}
const fetchMock = vi.fn(defaultFetch);
async function mountCard() {
  render(<VscodeTokenAliasCard variant="catalog" />);
  await screen.findByText("Ready compatibility URLs");
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset().mockImplementation(defaultFetch);
  copyMock.mockReset().mockResolvedValue(true);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("VS Code alias credential safety", () => {
  it("loads only masked key summaries and never fetches raw CLI keys during render", async () => {
    await mountCard();
    expect(fetchMock).toHaveBeenCalledWith("/api/keys?limit=100", {
      credentials: "same-origin",
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/cli-tools/keys"))).toBe(
      false
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/reveal"))).toBe(false);
  });

  it("never renders raw keys even when a summary contains an unexpected rawKey field", async () => {
    await mountCard();
    expect(document.body.textContent).not.toContain(fixtureSecret);
    expect(document.body.textContent).toContain("/api/v1/vscode/{token}/");
  });

  it("reveals only the selected key after explicit copy without putting it in the DOM", async () => {
    await mountCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code base" }));
    await waitFor(() =>
      expect(copyMock).toHaveBeenCalledWith(
        "http://gateway.test/api/v1/vscode/" + fixtureSecret + "/",
        "vscode_token_base",
        { allowFallback: false }
      )
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/keys/key-active/reveal", {
      credentials: "same-origin",
    });
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });

  it("fails closed when native reveal is disabled and never copies an unauthorized key", async () => {
    fetchMock
      .mockImplementationOnce(async () => response({ keys: [keySummary] }))
      .mockImplementationOnce(async () => response({ error: fixtureSecret }, 403));
    await mountCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code base" }));
    expect((await screen.findByRole("alert")).textContent).toContain("API key reveal is disabled");
    expect(copyMock).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });

  it("does not copy malformed reveal responses or echo their content in diagnostics", async () => {
    fetchMock
      .mockImplementationOnce(async () => response({ keys: [keySummary] }))
      .mockImplementationOnce(async () => response({ key: 42, error: fixtureSecret }));
    await mountCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code base" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Invalid key reveal response");
    expect(copyMock).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });

  it("does not select inactive, banned or malformed key identities from stored preferences", async () => {
    localStorage.setItem("omniroute-cli-key-copilot", "key-banned");
    fetchMock.mockImplementationOnce(async () =>
      response({
        keys: [
          null,
          { id: 42 },
          { id: "key-inactive", isActive: false },
          { id: "key-banned", isBanned: true },
          keySummary,
        ],
      })
    );
    await mountCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code base" }));
    await waitFor(() => expect(copyMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/keys/key-active/reveal", {
      credentials: "same-origin",
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("key-banned/reveal"))).toBe(
      false
    );
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });

  it("copies only the placeholder when no active key is available", async () => {
    fetchMock.mockImplementationOnce(async () => response({ keys: [] }));
    render(<VscodeTokenAliasCard variant="catalog" />);
    await screen.findByText("Placeholder URLs");
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code models" }));
    await waitFor(() =>
      expect(copyMock).toHaveBeenCalledWith(
        "http://gateway.test/api/v1/vscode/{token}/models",
        "vscode_token_models"
      )
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/reveal"))).toBe(false);
  });

  it("does not copy or expose errors when the authorized reveal request fails", async () => {
    fetchMock
      .mockImplementationOnce(async () => response({ keys: [keySummary] }))
      .mockImplementationOnce(async () => Promise.reject(new Error(fixtureSecret)));
    await mountCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code base" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not reveal the selected key"
    );
    expect(copyMock).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });

  it("shows a safe clipboard error when reveal succeeds but copying fails", async () => {
    copyMock.mockResolvedValue(false);
    await mountCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code base" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Secure clipboard unavailable. Use HTTPS and allow clipboard access."
    );
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });

  it("keeps the highlight variant masked while explicitly copying the selected chat URL", async () => {
    render(<VscodeTokenAliasCard variant="highlight" />);
    await screen.findByText("Ready compatibility URLs");
    fireEvent.click(screen.getByRole("button", { name: "Copy URL: VS Code chat" }));
    await waitFor(() =>
      expect(copyMock).toHaveBeenCalledWith(
        "http://gateway.test/api/v1/vscode/" + fixtureSecret + "/chat/completions",
        "vscode_token_chat",
        { allowFallback: false }
      )
    );
    expect(document.body.textContent).not.toContain(fixtureSecret);
  });
});
