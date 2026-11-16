import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
  useLocale: () => "en",
}));
import TokensPage from "@/app/(dashboard)/dashboard/tokens/page";

const A = "key/a?&=",
  B = "key-b";
const mockFetch = vi.fn();
const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const entry = (from: string, to: string, reason: string) => ({
  id: reason,
  fromApiKeyId: from,
  toApiKeyId: to,
  amount: 3,
  reason,
  createdAt: "2026-01-01T00:00:00Z",
});
function respond(url: string, init?: RequestInit): Response {
  if (init?.method) return json({ success: true, code: "created-code", idempotencyKey: "tx" });
  if (url === "/api/keys")
    return json({
      keys: [
        { id: A, name: "Alpha", key: "MASKED-DO-NOT-RENDER" },
        { id: B, name: "Beta" },
      ],
    });
  const parsed = new URL(url, "http://local.invalid"),
    id = parsed.searchParams.get("apiKeyId");
  if (parsed.pathname.endsWith("/transfer"))
    return json({
      balance: id === A ? 42 : 9,
      history: id === A ? [entry(A, B, "outgoing"), entry(B, A, "incoming")] : [],
    });
  if (parsed.pathname.endsWith("/invite"))
    return json({
      invites: id === A ? [{ id: "invite-a", code: "alpha-invite", maxUses: 1, useCount: 0 }] : [],
    });
  return json({ servers: [] });
}
function mutations() {
  return mockFetch.mock.calls.filter(([, i]) => i?.method);
}
async function ready() {
  render(<TokensPage />);
  await screen.findByRole("option", { name: /Alpha/ });
}
function choose(id: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "apiKey" }), { target: { value: id } });
}
async function alpha() {
  await ready();
  choose(A);
  await screen.findByText("outgoing");
}
function transfer() {
  fireEvent.change(screen.getByPlaceholderText("tokensRecipientApiKeyIdPlaceholder"), {
    target: { value: B },
  });
  fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "3" } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url, init) => respond(url, init));
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("operator-selected token ledger identity, not funding or self-service authorization", () => {
  it("requires explicit selection, never exposes credentials, and makes no unkeyed reads or mutations", async () => {
    await ready();
    expect((screen.getByRole("combobox", { name: "apiKey" }) as HTMLSelectElement).value).toBe("");
    expect(screen.queryByText(/MASKED-DO-NOT-RENDER/)).toBeNull();
    expect(mockFetch.mock.calls.some(([url]) => /gamification\/(transfer|invite)/.test(url))).toBe(
      false
    );
    transfer();
    fireEvent.change(screen.getByPlaceholderText("tokensRedeemCodePlaceholder"), {
      target: { value: "code" },
    });
    for (const [placeholder, value] of [
      ["tokensServerNamePlaceholder", "Server"],
      ["https://server.example.com", "https://valid.example"],
      ["tokensApiKeyPlaceholder", "mock-server-key"],
    ])
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
    for (const name of [
      "tokensSendTokens",
      "tokensCreateInvite",
      "tokensRedeem",
      "tokensConnectServer",
    ]) {
      const button = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(mutations()).toHaveLength(0);
    expect(screen.queryByText("tokensNoTransactionsYet")).toBeNull();
  });
  it("encodes actual selected IDs in both GETs and classifies sent/received correctly", async () => {
    await alpha();
    for (const route of ["transfer", "invite"])
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/gamification/${route}?apiKeyId=${encodeURIComponent(A)}`
      );
    expect(
      within(screen.getByText("outgoing").closest("tr")!).getByText("tokensSent")
    ).toBeTruthy();
    expect(
      within(screen.getByText("incoming").closest("tr")!).getByText("tokensReceived")
    ).toBeTruthy();
  });
  it("binds transfer, invite creation and redemption bodies to the selected ID", async () => {
    await alpha();
    transfer();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "tokensSendTokens" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "tokensCreateInvite" }));
    });
    fireEvent.change(screen.getByPlaceholderText("tokensRedeemCodePlaceholder"), {
      target: { value: "redeem-me" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "tokensRedeem" }));
    });
    const bodies = mutations().map(([url, init]) => [url, JSON.parse(init.body)]);
    expect(bodies).toContainEqual([
      "/api/gamification/transfer",
      expect.objectContaining({ fromApiKeyId: A, toApiKeyId: B, amount: 3 }),
    ]);
    expect(bodies).toContainEqual([
      "/api/gamification/invite",
      expect.objectContaining({ apiKeyId: A }),
    ]);
    expect(bodies).toContainEqual([
      "/api/gamification/invite/redeem",
      { apiKeyId: A, code: "redeem-me" },
    ]);
  });
  it("clears old key data, form and errors immediately when selection changes", async () => {
    await alpha();
    mockFetch.mockImplementation(async (url, init) =>
      init?.method === "POST" ? json({ error: "alpha-error" }, false) : respond(url, init)
    );
    transfer();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "tokensSendTokens" }));
    });
    expect(screen.getByText("alpha-error")).toBeTruthy();
    choose(B);
    expect(screen.queryByText("outgoing")).toBeNull();
    expect(screen.queryByText("alpha-invite")).toBeNull();
    expect(screen.queryByText("alpha-error")).toBeNull();
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("");
    await screen.findByText("tokensNoTransactionsYet");
    choose("");
    expect(screen.queryByText("tokensNoTransactionsYet")).toBeNull();
  });
  it.each(["transfer", "invite"])(
    "does not turn a failed %s load into zero balance or empty history",
    async (route) => {
      mockFetch.mockImplementation(async (url, init) =>
        url.includes(`/gamification/${route}?`) ? json({}, false) : respond(url, init)
      );
      await ready();
      choose(A);
      await screen.findAllByText("failedToLoad");
      expect(screen.queryByText("tokensNoTransactionsYet")).toBeNull();
      expect(screen.queryByText("0")).toBeNull();
    }
  );
  it.each([false, true])(
    "handles empty/failed key list without keyed reads (failure=%s)",
    async (failed) => {
      mockFetch.mockImplementation(async (url, init) =>
        url === "/api/keys" ? json({ keys: [] }, !failed) : respond(url, init)
      );
      render(<TokensPage />);
      await screen.findAllByText(failed ? "failedToLoad" : "notAvailable");
      expect(
        mockFetch.mock.calls.some(([url]) => /gamification\/(transfer|invite)/.test(url))
      ).toBe(false);
      expect(
        (screen.getByRole("button", { name: "tokensCreateInvite" }) as HTMLButtonElement).disabled
      ).toBe(true);
    }
  );
  it.each([false, true])(
    "shows unavailable rather than zero/empty for pending or malformed data (malformed=%s)",
    async (malformed) => {
      const pending = deferred<Response>();
      mockFetch.mockImplementation(async (url, init) =>
        url.includes("/gamification/transfer?")
          ? malformed
            ? json({})
            : pending.promise
          : respond(url, init)
      );
      await ready();
      choose(A);
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/gamification/transfer?apiKeyId=${encodeURIComponent(A)}`
        )
      );
      if (malformed) await screen.findAllByText("failedToLoad");
      expect(screen.queryByText("0")).toBeNull();
      expect(screen.queryByText("tokensNoTransactionsYet")).toBeNull();
      if (!malformed) {
        choose(B);
        await act(async () => {
          pending.resolve(json({ balance: 0, history: [] }));
        });
      }
    }
  );
  it("ignores old-key GET responses arriving after the new key has loaded", async () => {
    const old = deferred<Response>();
    mockFetch.mockImplementation(async (url, init) =>
      url === `/api/gamification/transfer?apiKeyId=${encodeURIComponent(A)}`
        ? old.promise
        : respond(url, init)
    );
    await ready();
    choose(A);
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/gamification/transfer?apiKeyId=${encodeURIComponent(A)}`
      )
    );
    choose(B);
    await screen.findByText("tokensNoTransactionsYet");
    await act(async () => {
      old.resolve(json({ balance: 999, history: [entry(A, B, "stale-history")] }));
    });
    expect(screen.queryByText("stale-history")).toBeNull();
    expect(screen.queryByText("999")).toBeNull();
    expect(screen.queryByText("alpha-invite")).toBeNull();
  });
  it.each([false, true])(
    "ignores late old-key mutation feedback and refreshes (success=%s)",
    async (ok) => {
      await alpha();
      const post = deferred<Response>();
      mockFetch.mockImplementation(async (url, init) =>
        init?.method === "POST" ? post.promise : respond(url, init)
      );
      transfer();
      fireEvent.click(screen.getByRole("button", { name: "tokensSendTokens" }));
      choose(B);
      await screen.findByText("tokensNoTransactionsYet");
      const before = mockFetch.mock.calls.length;
      await act(async () => {
        post.resolve(json({ error: "stale-mutation-error", idempotencyKey: "stale-tx" }, ok));
      });
      expect(screen.queryByText("stale-mutation-error")).toBeNull();
      expect(mockFetch.mock.calls).toHaveLength(before);
    }
  );
});
