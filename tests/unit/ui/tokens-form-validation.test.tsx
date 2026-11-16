import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next-intl: return the key so assertions stay locale independent.
vi.mock("next-intl", () => {
  const t = Object.assign((key: string) => key, { has: () => false });
  return { useTranslations: () => t, useLocale: () => "en" };
});

import TokensPage from "@/app/(dashboard)/dashboard/tokens/page";

// Backend contract (NOT replaced by client validation, see last describe block):
//  - POST /api/gamification/transfer: requireManagementAuth, zod amount positive, balance
//    check in transferTokens().
//  - POST /api/gamification/servers: requireManagementAuth, zod url().
// These tests only cover client-side form gating (submit button disabled state).

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

function postCalls() {
  return fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === "POST"
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return jsonResponse({ success: true, idempotencyKey: "k1" });
    if (url.includes("/transfer")) return jsonResponse({ balance: 10, history: [] });
    if (url.includes("/invite")) return jsonResponse({ invites: [] });
    if (url.includes("/servers")) return jsonResponse({ servers: [] });
    return jsonResponse({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderPage() {
  render(<TokensPage />);
  // initial load settles (history loading state replaced)
  await waitFor(() => expect(screen.getByText("tokensNoTransactionsYet")).toBeTruthy());
}

function sendButton() {
  return screen.getByRole("button", { name: "tokensSendTokens" }) as HTMLButtonElement;
}
function connectButton() {
  return screen.getByRole("button", { name: "tokensConnectServer" }) as HTMLButtonElement;
}
function setTransfer(amount: string, recipient = "key-recipient-1") {
  fireEvent.change(screen.getByPlaceholderText("tokensRecipientApiKeyIdPlaceholder"), {
    target: { value: recipient },
  });
  fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: amount } });
}
function setServer(url: string, name = "Community", apiKey = "secret-value") {
  fireEvent.change(screen.getByPlaceholderText("tokensServerNamePlaceholder"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByPlaceholderText("https://server.example.com"), {
    target: { value: url },
  });
  fireEvent.change(screen.getByPlaceholderText("tokensApiKeyPlaceholder"), {
    target: { value: apiKey },
  });
}

describe("tokens page: Send tokens client validation", () => {
  it("is disabled while the form is empty", async () => {
    await renderPage();
    expect(sendButton().disabled).toBe(true);
  });

  it.each(["-5", "-1", "-0.5", "0", "0.0", "-0"])(
    "keeps Send disabled for zero/negative amount %s",
    async (value) => {
      await renderPage();
      setTransfer(value);
      expect(sendButton().disabled).toBe(true);
    }
  );

  it.each(["abc", "NaN", "Infinity", "-Infinity", "1e999", "--1", "1,5"])(
    "keeps Send disabled for non-finite or invalid amount %s",
    async (value) => {
      await renderPage();
      setTransfer(value);
      expect(sendButton().disabled).toBe(true);
    }
  );

  it("keeps Send disabled when amount is valid but recipient is blank", async () => {
    await renderPage();
    setTransfer("5", "");
    expect(sendButton().disabled).toBe(true);
  });

  it.each(["1", "5", "250", "1000000"])(
    "enables Send for valid positive amount %s",
    async (value) => {
      await renderPage();
      setTransfer(value);
      expect(sendButton().disabled).toBe(false);
    }
  );

  it("re-disables Send when a valid amount is edited back to an invalid one", async () => {
    await renderPage();
    setTransfer("5");
    expect(sendButton().disabled).toBe(false);
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "-5" } });
    expect(sendButton().disabled).toBe(true);
  });

  it("does not POST when clicking Send with an invalid amount", async () => {
    await renderPage();
    setTransfer("-5");
    fireEvent.click(sendButton());
    expect(postCalls()).toHaveLength(0);
  });
});

describe("tokens page: Connect server client validation", () => {
  it("is disabled while the form is empty", async () => {
    await renderPage();
    expect(connectButton().disabled).toBe(true);
  });

  it.each([
    "not a url",
    "example.com",
    "//server.example.com",
    "ftp://server.example.com",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:text/plain,hi",
    "ws://server.example.com",
    "http://",
    "https://",
  ])("keeps Connect disabled for invalid / non-HTTP(S) URL %s", async (url) => {
    await renderPage();
    setServer(url);
    expect(connectButton().disabled).toBe(true);
  });

  it.each([
    "https://server.example.com",
    "http://localhost:20128",
    "HTTPS://Server.Example.com/path?x=1",
    "http://192.168.1.10:8080",
  ])("enables Connect for valid HTTP(S) URL %s", async (url) => {
    await renderPage();
    setServer(url);
    expect(connectButton().disabled).toBe(false);
  });

  it("still requires name and API key even when the URL is valid", async () => {
    await renderPage();
    setServer("https://server.example.com", "", "secret-value");
    expect(connectButton().disabled).toBe(true);
    setServer("https://server.example.com", "Community", "");
    expect(connectButton().disabled).toBe(true);
  });

  it("does not POST when clicking Connect with an invalid URL", async () => {
    await renderPage();
    setServer("ftp://server.example.com");
    fireEvent.click(connectButton());
    expect(postCalls()).toHaveLength(0);
  });
});

describe("tokens page: client validation does not replace backend authorization/balance checks", () => {
  it("sends a client-valid amount above the displayed balance and leaves the balance decision to the server", async () => {
    await renderPage(); // displayed balance is 10
    setTransfer("999");
    expect(sendButton().disabled).toBe(false); // no client-side balance gate
    await act(async () => {
      fireEvent.click(sendButton());
    });
    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const [url, init] = postCalls()[0];
    expect(url).toBe("/api/gamification/transfer");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.amount).toBe(999);
    // Preserve the existing sentinel; this UI test does not establish backend identity resolution.
    expect(body.fromApiKeyId).toBe("current");
  });

  it("surfaces a backend rejection for a client-valid transfer", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ error: "Insufficient balance" }, { ok: false, status: 400 });
      }
      if (url.includes("/transfer")) return jsonResponse({ balance: 10, history: [] });
      if (url.includes("/invite")) return jsonResponse({ invites: [] });
      return jsonResponse({ servers: [] });
    });
    await renderPage();
    setTransfer("999");
    fireEvent.click(sendButton());
    expect(await screen.findByText("Insufficient balance")).toBeTruthy();
  });

  it("surfaces a backend rejection for a client-valid server URL", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ error: "Invalid request" }, { ok: false, status: 400 });
      }
      if (url.includes("/transfer")) return jsonResponse({ balance: 0, history: [] });
      if (url.includes("/invite")) return jsonResponse({ invites: [] });
      return jsonResponse({ servers: [] });
    });
    await renderPage();
    setServer("https://server.example.com");
    fireEvent.click(connectButton());
    expect(await screen.findByText("Invalid request")).toBeTruthy();
  });
});
