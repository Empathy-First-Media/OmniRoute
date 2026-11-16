import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { gotoDashboardRoute } from "./helpers/dashboardAuth";

// STATIC CANDIDATE: only for an owner-attested fresh, private DATA_DIR, full-shell MODE 0.
// Never run against a user's database. There is deliberately no funding/SQL/XP seed.
// Use a private config with webServer: undefined; this spec does not make root autoBoot safe.
type KeyMetadata = { id: string; name: string };
type Ledger = { balance: number; history: unknown[] };
type InviteMetadata = { id: string; revokedAt: string | null };
type NativeFixture = {
  keys: [KeyMetadata, KeyMetadata];
  api: APIRequestContext;
  origin: string;
  invites: Set<string>;
};

function isolatedOrigin(value: string | undefined): string {
  if (!value) throw new Error("An explicit isolated loopback baseURL is required");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    ["20128", "18090", "8765"].includes(url.port) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Refusing non-isolated or known production baseURL");
  return url.origin;
}

const test = base.extend<{ native: NativeFixture }>({
  native: async ({ page, baseURL }, use) => {
    // Runs before ANY goto or mutation, including setup/cleanup helpers.
    test.skip(
      process.env.OMNIROUTE_ISOLATED_QA !== "1",
      "Requires OMNIROUTE_ISOLATED_QA=1 and owner-attested fresh private full-shell MODE 0"
    );
    const origin = isolatedOrigin(baseURL);
    const api = page.request; // fresh official context; no imported real cookies/credentials
    const created: KeyMetadata[] = [];
    const invites = new Set<string>();
    const headers = { Origin: origin };
    // MODE 0 is owner-attested application mode, not an authentication bypass.
    // Authenticate through native navigation/login before reading protected settings.
    await gotoDashboardRoute(page, "/dashboard/tokens", {
      timeoutMs: 30_000,
      waitUntil: "domcontentloaded",
    });
    const settingsResponse = await api.get(`${origin}/api/settings`);
    expect(settingsResponse.status()).toBe(200);
    const settings = await settingsResponse.json();
    await settingsResponse.dispose();
    // Both key POST and DELETE can trigger cloud synchronization. Fail closed first.
    expect(settings.cloudEnabled, "Native key setup/cleanup must not synchronize to vendors").toBe(
      false
    );
    const requireOfflineCloudSync = async () => {
      const response = await api.get(`${origin}/api/settings`);
      expect(response.status()).toBe(200);
      const { cloudEnabled } = await response.json();
      await response.dispose();
      expect(
        cloudEnabled,
        "Owner must explicitly disable native cloud sync before key mutations"
      ).toBe(false);
    };
    try {
      for (let index = 0; index < 2; index += 1) {
        const name = `QA-tokens-native-${randomUUID()}-${index}`;
        await requireOfflineCloudSync();
        const response = await api.post(`${origin}/api/keys`, { headers, data: { name } });
        expect(response.status()).toBe(201);
        // Native POST returns raw key material too: never retain, log, attach or assert it.
        const { id, name: returnedName } = await response.json();
        await response.dispose();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
        created.push({ id, name });
        expect(returnedName).toBe(name);
      }
      await use({ keys: [created[0], created[1]], api, origin, invites });
    } finally {
      // Invite DELETE revokes, rather than physically deleting; only our IDs are touched.
      // Any remaining revoked rows belong to this disposable DATA_DIR, never user records.
      await requireOfflineCloudSync();
      const failures: number[] = [];
      for (const id of invites) {
        const response = await api.delete(
          `${origin}/api/gamification/invite?id=${encodeURIComponent(id)}`,
          { headers }
        );
        if (response.status() !== 200) failures.push(response.status());
        await response.dispose();
      }
      for (const key of created) {
        await requireOfflineCloudSync();
        const response = await api.delete(`${origin}/api/keys/${encodeURIComponent(key.id)}`, {
          headers,
        });
        if (response.status() !== 200) failures.push(response.status());
        await response.dispose();
      }
      expect(failures, "Cleanup of this spec's synthetic records must succeed").toEqual([]);
    }
  },
});

test.use({
  storageState: { cookies: [], origins: [] },
  extraHTTPHeaders: {},
  httpCredentials: undefined,
  trace: "off",
  video: "off",
  screenshot: "off",
});
test.describe("isolated native Tokens operator contract", () => {
  test.setTimeout(120_000);

  async function openTokens(page: Page, native: NativeFixture) {
    isolatedOrigin(native.origin); // defense in depth before helper navigation
    await gotoDashboardRoute(page, "/dashboard/tokens", {
      timeoutMs: 30_000,
      waitUntil: "domcontentloaded",
    });
    const selector = page.getByRole("combobox", { name: "API Key", exact: true });
    await expect(
      selector.getByRole("option", { name: native.keys[0].name, exact: true })
    ).toBeAttached();
    await expect(selector).toHaveValue("");
    return selector;
  }
  async function selectKey(page: Page, key: KeyMetadata) {
    const isGet = (path: string) => (response: import("@playwright/test").Response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === path &&
        url.searchParams.get("apiKeyId") === key.id
      );
    };
    const transfer = page.waitForResponse(isGet("/api/gamification/transfer"));
    const invite = page.waitForResponse(isGet("/api/gamification/invite"));
    await page.getByRole("combobox", { name: "API Key", exact: true }).selectOption(key.id);
    const [transferResponse, inviteResponse] = await Promise.all([transfer, invite]);
    expect(transferResponse.status()).toBe(200);
    expect(inviteResponse.status()).toBe(200);
    const ledger = (await transferResponse.json()) as Ledger;
    await expect(page.getByText("No transactions yet", { exact: true })).toBeVisible();
    return ledger;
  }
  async function ledger(native: NativeFixture, key: KeyMetadata): Promise<Ledger> {
    const response = await native.api.get(
      `${native.origin}/api/gamification/transfer?apiKeyId=${encodeURIComponent(key.id)}`
    );
    expect(response.status()).toBe(200);
    const value = (await response.json()) as Ledger;
    await response.dispose();
    return value;
  }
  async function listInvites(native: NativeFixture, key: KeyMetadata): Promise<InviteMetadata[]> {
    const response = await native.api.get(
      `${native.origin}/api/gamification/invite?apiKeyId=${encodeURIComponent(key.id)}`
    );
    expect(response.status()).toBe(200);
    const { invites } = await response.json();
    await response.dispose();
    return invites.map(({ id, revokedAt }: InviteMetadata) => ({ id, revokedAt }));
  }

  test("explicit key selection loads native transfer/invite data with legitimate fresh zero balance", async ({
    page,
    native,
  }) => {
    await openTokens(page, native);
    for (const key of native.keys) {
      expect(await selectKey(page, key)).toEqual({ balance: 0, history: [] });
      const balance = page.getByText("Token Balance", { exact: true }).locator("..");
      await expect(balance.getByText("0", { exact: true })).toBeVisible();
      expect(await listInvites(native, key)).toEqual([]);
    }
  });

  test("insufficient transfer preserves both native ledgers and surfaces actual backend rejection", async ({
    page,
    native,
  }) => {
    await openTokens(page, native);
    const before = await Promise.all(native.keys.map((key) => ledger(native, key)));
    expect(before).toEqual([
      { balance: 0, history: [] },
      { balance: 0, history: [] },
    ]);
    await selectKey(page, native.keys[0]);
    await page
      .getByPlaceholder("Enter recipient API key ID", { exact: true })
      .fill(native.keys[1].id);
    await page.getByPlaceholder("0", { exact: true }).fill("1");
    const rejected = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/gamification/transfer" &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Send Tokens", exact: true }).click();
    const response = await rejected;
    // transfer/route.ts maps native db insufficient_balance to HTTP 400; no invented status/message.
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "insufficient_balance" });
    expect(response.request().postDataJSON()).toMatchObject({
      fromApiKeyId: native.keys[0].id,
      toApiKeyId: native.keys[1].id,
      amount: 1,
    });
    await expect(page.getByText("insufficient_balance", { exact: true })).toBeVisible();
    expect(await Promise.all(native.keys.map((key) => ledger(native, key)))).toEqual(before);
  });

  test("invite creation persists through reload, filters by selected key, and revokes natively", async ({
    page,
    native,
  }) => {
    await openTokens(page, native);
    await selectKey(page, native.keys[0]);
    const created = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/gamification/invite" &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create Invite", exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toMatchObject({
      apiKeyId: native.keys[0].id,
      maxUses: 1,
    });
    // Do not read the POST's raw invite token. Obtain only list metadata via native GET.
    const [invite] = await listInvites(native, native.keys[0]);
    expect(invite).toBeDefined();
    native.invites.add(invite.id);
    expect(invite.revokedAt).toBeNull();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("combobox", { name: "API Key", exact: true })).toHaveValue("");
    await selectKey(page, native.keys[1]);
    expect(await listInvites(native, native.keys[1])).toEqual([]);
    await expect(page.getByRole("button", { name: "Revoke", exact: true })).toHaveCount(0);
    await selectKey(page, native.keys[0]);
    const revokeButton = page.getByRole("button", { name: "Revoke", exact: true });
    await expect(revokeButton).toHaveCount(1);
    await expect(revokeButton).toBeVisible();
    const revoked = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/gamification/invite" &&
        r.request().method() === "DELETE" &&
        new URL(r.url()).searchParams.get("id") === invite.id
    );
    await revokeButton.click();
    expect((await revoked).status()).toBe(200);
    await expect(page.getByText("REVOKED", { exact: true })).toHaveCount(1);
    await expect(revokeButton).toHaveCount(0);
    expect(
      (await listInvites(native, native.keys[0])).find((item) => item.id === invite.id)?.revokedAt
    ).toBeTruthy();
  });
});
