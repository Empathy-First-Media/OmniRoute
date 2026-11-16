import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import english from "../../src/i18n/messages/en.json" with { type: "json" };
import { gotoDashboardRoute } from "./helpers/dashboardAuth";

// STATIC CANDIDATE. Runtime requires owner release of a fresh private DATA_DIR/HOME,
// English full-shell MODE 0, no providers, and explicit native cloudEnabled=false.
// Use the owner's private config with webServer: undefined: file-level skips cannot
// prevent the root config from auto-starting a server. No provider/billing/enforcement proof.
// Raw synthetic keys must never reach assertions, attachments, traces or screenshots.
type SyntheticKey = { id: string; name: string; raw: string };
type NativeFixture = {
  origin: string;
  api: APIRequestContext;
  createKey: () => Promise<SyntheticKey>;
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
    test.skip(
      process.env.OMNIROUTE_ISOLATED_QA !== "1",
      "Requires OMNIROUTE_ISOLATED_QA=1: owner-attested fresh private full-shell MODE 0"
    );
    const origin = isolatedOrigin(baseURL); // BEFORE any navigation/request/mutation
    // Native synthetic login, never imported cookies or an auth-disable setting.
    // Owner attests MODE 0 independently of authentication configuration.
    await gotoDashboardRoute(page, `${origin}/dashboard/profile`, {
      timeoutMs: 30_000,
      waitUntil: "domcontentloaded",
    });
    expect(new URL(page.url()).origin).toBe(origin);
    const api = page.request;
    const headers = { Origin: origin };
    const createdIds: string[] = [];
    const requireOfflineCloudSync = async () => {
      const response = await api.get(`${origin}/api/settings`, { maxRedirects: 0, headers });
      expect(
        response.status(),
        "Native settings must be accessible without imported credentials"
      ).toBe(200);
      const { cloudEnabled } = await response.json();
      await response.dispose();
      expect(
        cloudEnabled,
        "Explicit cloudEnabled=false required before synthetic key mutations"
      ).toBe(false);
    };
    await requireOfflineCloudSync();
    try {
      await use({
        origin,
        api,
        createKey: async () => {
          await requireOfflineCloudSync();
          const name = `QA-dashboard-safety-${randomUUID()}`;
          const response = await api.post(`${origin}/api/keys`, {
            maxRedirects: 0,
            headers,
            data: { name },
          });
          expect(response.status()).toBe(201);
          const { id, key, name: returnedName } = await response.json();
          await response.dispose();
          expect(typeof id).toBe("string");
          expect(Boolean(id)).toBe(true);
          createdIds.push(id);
          expect(returnedName).toBe(name);
          expect(typeof key === "string" && key.length > 0).toBe(true);
          return { id, name, raw: key };
        },
      });
    } finally {
      // Only IDs created here; abort cleanup rather than risking cloud synchronization.
      for (const id of createdIds) {
        await requireOfflineCloudSync();
        const response = await api.delete(`${origin}/api/keys/${encodeURIComponent(id)}`, {
          maxRedirects: 0,
          headers,
        });
        expect(response.status(), "Cleanup of this test's synthetic key").toBe(200);
        await response.dispose();
      }
    }
  },
});

test.use({
  storageState: { cookies: [], origins: [] },
  extraHTTPHeaders: {},
  httpCredentials: undefined,
  locale: "en-US",
  trace: "off",
  video: "off",
  screenshot: "off",
});

async function open(page: Page, native: NativeFixture, route: string) {
  isolatedOrigin(native.origin);
  await gotoDashboardRoute(page, `${native.origin}${route}`, {
    timeoutMs: 30_000,
    waitUntil: "domcontentloaded",
  });
  expect(new URL(page.url()).origin).toBe(native.origin);
  expect(new URL(page.url()).pathname).toBe(route);
}

// Existing api-keys-flow in-page adapter pattern, extended with denied mode and
// fallback detection. This is device simulation ONLY: no route.fulfill/API mocks.
async function installClipboardMock(page: Page, denied = false) {
  await page.addInitScript(
    ({ denied }) => {
      let clipboardValue = "";
      const state = { writes: 0, execCalls: 0, textareas: 0 };
      Object.defineProperty(window, "__qaClipboard", {
        configurable: true,
        value: { state, read: () => clipboardValue },
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            state.writes += 1;
            if (denied) throw new Error("QA clipboard permission denied");
            clipboardValue = value;
          },
          readText: async () => clipboardValue,
        },
      });
      // Never delegate to a host clipboard, including a mistaken legacy fallback.
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: () => {
          state.execCalls += 1;
          return false;
        },
      });
      const createElement = document.createElement.bind(document);
      document.createElement = ((...args: Parameters<typeof document.createElement>) => {
        if (String(args[0]).toLowerCase() === "textarea") state.textareas += 1;
        return createElement(...args);
      }) as typeof document.createElement;
    },
    { denied }
  );
}

async function clipboard(page: Page) {
  return page.evaluate(() => {
    const adapter = (
      window as Window & {
        __qaClipboard?: {
          state: { writes: number; execCalls: number; textareas: number };
          read: () => string;
        };
      }
    ).__qaClipboard;
    if (!adapter) throw new Error("QA clipboard adapter missing");
    return { ...adapter.state, value: adapter.read() };
  });
}

function isResponse(origin: string, path: string, method = "GET") {
  return (response: import("@playwright/test").Response) => {
    const url = new URL(response.url());
    return url.origin === origin && url.pathname === path && response.request().method() === method;
  };
}

async function openAlias(page: Page, native: NativeFixture, key: SyntheticKey) {
  await open(page, native, "/dashboard/api-endpoints");
  await page.evaluate((id) => localStorage.setItem("omniroute-cli-key-copilot", id), key.id);
  const summaries = page.waitForResponse(isResponse(native.origin, "/api/keys"));
  await page.reload({ waitUntil: "domcontentloaded" });
  expect((await summaries).status()).toBe(200);
  const button = page.getByRole("button", { name: "Copy URL: VS Code base", exact: true });
  await expect(button).toBeEnabled();
  const row = button.locator("..");
  await expect(row.locator("code")).toContainText("/api/v1/vscode/{token}/");
  return { button, row };
}

async function readBudget(native: NativeFixture, id: string) {
  const response = await native.api.get(
    `${native.origin}/api/usage/budget?apiKeyId=${encodeURIComponent(id)}`,
    { headers: { Origin: native.origin }, maxRedirects: 0 }
  );
  expect(response.status()).toBe(200);
  const data = await response.json();
  await response.dispose();
  return {
    apiKeyId: id,
    dailyLimitUsd: data.dailyLimitUsd,
    weeklyLimitUsd: data.weeklyLimitUsd,
    monthlyLimitUsd: data.monthlyLimitUsd,
    warningThreshold: data.warningThreshold,
    resetInterval: data.resetInterval,
    resetTime: data.resetTime,
  };
}

const revealAttestation = () =>
  test.skip(
    process.env.OMNIROUTE_QA_KEY_REVEAL !== "1",
    "Requires OMNIROUTE_QA_KEY_REVEAL=1 attesting QA server ALLOW_API_KEY_REVEAL=1"
  );

test.describe("isolated native dashboard safety acceptance", () => {
  test.setTimeout(120_000);

  test("Profile native catalog opens labelled dialog, traps focus and restores opener on Escape", async ({
    page,
    native,
  }) => {
    const response = await native.api.get(`${native.origin}/api/gamification/badges`, {
      headers: { Origin: native.origin },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    const { badges } = (await response.json()) as {
      badges: Array<{ id: string; name: string; hidden?: boolean | number }>;
    };
    await response.dispose();
    const badge = badges.find((entry) => !entry.hidden);
    expect(Boolean(badge), "Native catalog must supply a visible nonhidden badge").toBe(true);
    if (!badge) throw new Error("No visible native badge; prerequisite blocked");
    const translations = english.gamification.badges as Record<string, { name?: string }>;
    const name = translations[badge.id]?.name || badge.name;
    await open(page, native, "/dashboard/profile");
    const opener = page.getByRole("button").filter({ has: page.getByText(name, { exact: true }) });
    await expect(opener).toHaveCount(1);
    await opener.focus();
    await opener.press("Enter");
    const dialog = page.getByRole("dialog", { name, exact: true });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    const closeButtons = dialog.getByRole("button", { name: "Close", exact: true });
    await expect(closeButtons).toHaveCount(2);
    await expect(closeButtons.first()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButtons.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButtons.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.press("Enter");
    await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    // No native Profile preference-save exists. No invented save assertion.
  });

  test("Cloud Settings three labelled switches persist only in localStorage", async ({
    page,
    native,
  }) => {
    await open(page, native, "/dashboard/cloud-agents");
    const storageKey = "omniroute-cloud-agents-settings";
    const previous = await page.evaluate((key) => localStorage.getItem(key), storageKey);
    const mutations: string[] = [];
    const observe = (request: import("@playwright/test").Request) => {
      const url = new URL(request.url());
      if (
        url.origin === native.origin &&
        url.pathname.startsWith("/api/") &&
        !["GET", "HEAD", "OPTIONS"].includes(request.method())
      ) {
        mutations.push(`${request.method()} ${url.pathname}`);
      }
    };
    page.on("request", observe);
    try {
      await page.getByRole("button", { name: /Settings/ }).click();
      const fields = [
        ["Enable cloud agents", "enabled"],
        ["Auto-create PR", "autoCreatePr"],
        ["Require plan approval", "requireApproval"],
      ] as const;
      const changed: Record<string, boolean> = {};
      for (const [name, field] of fields) {
        const control = page.getByRole("switch", { name, exact: true });
        const initial = await control.getAttribute("aria-checked");
        expect(["true", "false"].includes(initial || "")).toBe(true);
        await expect(control).toHaveAttribute("aria-describedby", /.+/);
        changed[field] = initial !== "true";
        await control.click();
        await expect(control).toHaveAttribute("aria-checked", String(changed[field]));
      }
      expect(
        await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), storageKey)
      ).toEqual(changed);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /Settings/ }).click();
      for (const [name, field] of fields) {
        await expect(page.getByRole("switch", { name, exact: true })).toHaveAttribute(
          "aria-checked",
          String(changed[field])
        );
      }
      expect(mutations, "Settings switches must not mutate native APIs").toEqual([]);
    } finally {
      page.off("request", observe);
      await page.evaluate(
        ({ key, previous }) => {
          if (previous === null) localStorage.removeItem(key);
          else localStorage.setItem(key, previous);
        },
        { key: storageKey, previous }
      );
    }
    // Never select Agents/Configure or POST provider credentials/tasks.
  });

  test("Alias explicit native reveal copies synthetic URL while DOM stays masked", async ({
    page,
    native,
  }) => {
    revealAttestation();
    const key = await native.createKey();
    await installClipboardMock(page);
    let reveals = 0;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === native.origin && /\/api\/keys\/[^/]+\/reveal$/.test(url.pathname))
        reveals += 1;
    });
    const { button, row } = await openAlias(page, native, key);
    expect(reveals, "No implicit reveal on initial render or reload").toBe(0);
    const placeholder = await row.locator("code").innerText();
    const revealed = page.waitForResponse(
      isResponse(native.origin, `/api/keys/${encodeURIComponent(key.id)}/reveal`)
    );
    await button.click();
    expect((await revealed).status(), "QA reveal must succeed, not count 403 as positive").toBe(
      200
    );
    await expect.poll(async () => (await clipboard(page)).writes).toBe(1);
    expect(
      (await clipboard(page)).value === placeholder.replace("{token}", encodeURIComponent(key.raw))
    ).toBe(true);
    await expect(row.locator("code")).toHaveText(placeholder);
    expect((await page.locator("body").evaluate((body) => body.outerHTML)).includes(key.raw)).toBe(
      false
    );
    expect(reveals).toBe(1);
    expect((await clipboard(page)).execCalls).toBe(0);
    await page.evaluate(() => localStorage.removeItem("omniroute-cli-key-copilot"));
  });

  test("Alias denied device clipboard fails closed after native reveal without DOM fallback or success", async ({
    page,
    native,
  }) => {
    revealAttestation();
    const key = await native.createKey();
    await installClipboardMock(page, true);
    let reveals = 0;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === native.origin && /\/api\/keys\/[^/]+\/reveal$/.test(url.pathname))
        reveals += 1;
    });
    const { button, row } = await openAlias(page, native, key);
    expect(reveals).toBe(0);
    const before = await clipboard(page);
    const revealed = page.waitForResponse(
      isResponse(native.origin, `/api/keys/${encodeURIComponent(key.id)}/reveal`)
    );
    await button.click();
    expect((await revealed).status()).toBe(200);
    await expect(page.getByRole("alert")).toHaveText(
      "Secure clipboard unavailable. Use HTTPS and allow clipboard access."
    );
    const after = await clipboard(page);
    expect(after.value.length).toBe(0);
    expect(after.writes).toBe(1);
    expect(after.execCalls).toBe(0);
    expect(after.textareas - before.textareas).toBe(0);
    await expect(row.locator("code")).toContainText("{token}");
    await expect(button).toContainText("content_copy");
    expect((await page.locator("body").evaluate((body) => body.outerHTML)).includes(key.raw)).toBe(
      false
    );
    expect(reveals).toBe(1);
    await page.evaluate(() => localStorage.removeItem("omniroute-cli-key-copilot"));
  });

  test("Budget native valid configuration survives reload; negative limit returns 400 unchanged", async ({
    page,
    native,
  }, testInfo) => {
    const key = await native.createKey();
    await open(page, native, "/dashboard/costs/budget");
    const expand = () =>
      page.getByRole("button").filter({ has: page.getByText(key.name, { exact: true }) });
    await expand().click();
    const daily = page.getByLabel("Daily $", { exact: true });
    await daily.fill("0.01");
    await page.getByLabel("Weekly $", { exact: true }).fill("0");
    await page.getByLabel("Monthly $", { exact: true }).fill("1.23");
    await page.getByLabel("Warn at %", { exact: true }).fill("80");
    // The per-key native label/control association is part of the acceptance contract.
    const interval = page.getByRole("combobox", { name: "Reset Interval", exact: true });
    await expect(interval).toHaveCount(1);
    await interval.selectOption("daily");
    await page.getByLabel("Reset Time (UTC)", { exact: true }).fill("00:00");
    const expected = {
      apiKeyId: key.id,
      dailyLimitUsd: 0.01,
      weeklyLimitUsd: 0,
      monthlyLimitUsd: 1.23,
      warningThreshold: 0.8,
      resetInterval: "daily",
      resetTime: "00:00",
    };
    const saved = page.waitForResponse(isResponse(native.origin, "/api/usage/budget", "POST"));
    await page.getByRole("button", { name: "Save Limits", exact: true }).click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual(expected);
    expect((await response.json()).success).toBe(true);
    expect(await readBudget(native, key.id)).toEqual(expected);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expand().click();
    await expect(daily).toHaveValue("0.01");
    await expect(page.getByLabel("Monthly $", { exact: true })).toHaveValue("1.23");
    await daily.fill("-0.01");
    const rejected = page.waitForResponse(isResponse(native.origin, "/api/usage/budget", "POST"));
    await page.getByRole("button", { name: "Save Limits", exact: true }).click();
    expect((await rejected).status()).toBe(400);
    await expect(page.getByText("Failed to save budget", { exact: true })).toBeVisible();
    expect(await readBudget(native, key.id)).toEqual(expected);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expand().click();
    await expect(daily).toHaveValue("0.01");
    await expect(page.getByLabel("Monthly $", { exact: true })).toHaveValue("1.23");
    // Safe visual proof contains only this synthetic key's numeric editor, never credentials.
    const editor = page.getByRole("button", { name: "Save Limits", exact: true }).locator("../..");
    await testInfo.attach("budget-config-state", {
      body: await editor.ariaSnapshot(),
      contentType: "text/plain",
    });
    const proofPath = testInfo.outputPath("budget-config-proof.png");
    await editor.screenshot({ path: proofPath });
    await testInfo.attach("budget-config-proof", { path: proofPath, contentType: "image/png" });
    // Configuration only. Tiny nonzero spend, disk durability across restart,
    // provider billing and enforcement are UNTESTED. DATA_DIR disposal owns budget rows.
  });
});
