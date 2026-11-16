/**
 * E2E (Playwright) — Translator friendly redesign (plano 19)
 *
 * Validates that `/dashboard/translator` now renders the 2-tab shell
 * (Translate + Monitor) with the concept card, deep-link support, and
 * that the simple mode flow narrates the result through the existing
 * `/api/translator/*` endpoints (mocked).
 *
 * Run with: npm run test:e2e -- tests/e2e/translator-friendly.spec.ts
 */

import { expect, test, type Page } from "@playwright/test";
import { gotoDashboardRoute } from "./helpers/dashboardAuth";

const TIMEOUT_MS = 300_000;
const PREVIEW_LABEL = /^(?:Preview translation only|Só ver tradução)$/i;
const SEND_LABEL = /^(?:Send and see response|Enviar e ver resposta)$/i;
const TRANSLATED_JSON_LABEL = /^(?:see translated JSON|ver JSON traduzido)$/i;

// Mocked UI contract, not backend integration. The actual simple Preview flow
// uses detect + direct translate via useTranslateSession; there is no preview API.
async function mockSimpleTranslatorApis(page: Page) {
  const detectRequests: unknown[] = [];
  const translateRequests: unknown[] = [];
  await page.route("**/api/providers", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        connections: [{ id: "translator-e2e-openai", provider: "openai", isActive: true }],
      }),
    })
  );
  await page.route("**/api/provider-nodes", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ nodes: [] }) })
  );
  await page.route("**/api/translator/detect", (route) => {
    detectRequests.push(route.request().postDataJSON());
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, format: "claude" }),
    });
  });
  const translated = { messages: [{ role: "user", content: "mocked translated request" }] };
  await page.route("**/api/translator/translate", (route) => {
    translateRequests.push(route.request().postDataJSON());
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        sourceFormat: "claude",
        targetFormat: "openai",
        result: translated,
      }),
    });
  });
  return { detectRequests, translateRequests, translated };
}

async function expectOpenAiProviderReady(page: Page) {
  const provider = page.getByRole("combobox", { name: /^(?:Send to|Enviar para)$/i });
  await expect(provider).toBeEnabled();
  await expect(provider).toHaveValue("openai");
}

test.describe("Translator friendly redesign (plano 19)", () => {
  test.setTimeout(600_000);

  test("renders two tabs (Translate + Monitor) and the concept card", async ({ page }) => {
    await gotoDashboardRoute(page, "/dashboard/translator", { timeoutMs: TIMEOUT_MS });

    // ConceptCard exposes a "How it works" disclosure button (or its PT counterpart).
    await expect(
      page.getByRole("button", { name: /how it works|como funciona/i }).first()
    ).toBeVisible({ timeout: 15_000 });

    // The shell renders a SegmentedControl with role="tablist" that holds the 2 tabs.
    await expect(page.getByRole("tab", { name: /^translate$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: /^monitor$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("clicking the Monitor tab swaps content and pushes ?tab=monitor", async ({ page }) => {
    await gotoDashboardRoute(page, "/dashboard/translator", { timeoutMs: TIMEOUT_MS });

    await page
      .getByRole("tab", { name: /^monitor$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/tab=monitor/, { timeout: 10_000 });

    // MonitorTab origin hint or stats card should now be visible.
    await expect(
      page
        .getByText(/events generated|eventos gerados|recent translations|total translations/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("simple mode: explicit Send shows a narrated response (mocked UI flow)", async ({
    page,
  }) => {
    const fixtures = await mockSimpleTranslatorApis(page);
    const sendRequests: unknown[] = [];
    await page.route("**/api/translator/send", (route) => {
      sendRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"choices":[{"delta":{"content":"mocked-send-response"}}]}\n\ndata: [DONE]\n\n',
      });
    });

    await gotoDashboardRoute(page, "/dashboard/translator?mode=send", { timeoutMs: TIMEOUT_MS });
    await expect(page.getByRole("tab", { name: SEND_LABEL })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expectOpenAiProviderReady(page);
    await page.getByRole("textbox", { name: /^(?:Input|Entrada)$/i }).fill("Olá, quem é você?");
    await page.getByRole("button", { name: SEND_LABEL }).click();

    await expect(page.getByText(/translated|traduzido|detected|detectado/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("pre").filter({ hasText: "mocked-send-response" })).toBeVisible();
    await expect(page.getByRole("button", { name: TRANSLATED_JSON_LABEL })).toBeVisible();
    expect(fixtures.detectRequests).toHaveLength(1);
    expect(fixtures.translateRequests).toEqual([
      {
        step: "direct",
        sourceFormat: "claude",
        targetFormat: "openai",
        body: { messages: [{ role: "user", content: "Olá, quem é você?" }] },
      },
    ]);
    expect(sendRequests).toEqual([{ provider: "openai", body: fixtures.translated }]);
  });

  test("simple mode: default Preview translates without sending (mocked UI flow)", async ({
    page,
  }) => {
    const fixtures = await mockSimpleTranslatorApis(page);
    const forbiddenSendRequests: string[] = [];
    await page.route("**/api/translator/send", (route) => {
      forbiddenSendRequests.push(route.request().url());
      return route.abort("blockedbyclient");
    });

    // No mode query: this must exercise the safe default, not an explicit Preview override.
    await gotoDashboardRoute(page, "/dashboard/translator", { timeoutMs: TIMEOUT_MS });
    await expect(page.getByRole("tab", { name: PREVIEW_LABEL })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.getByRole("tab", { name: SEND_LABEL })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    await expectOpenAiProviderReady(page);
    await page.getByRole("textbox", { name: /^(?:Input|Entrada)$/i }).fill("Preview only fixture");
    await page.getByRole("button", { name: PREVIEW_LABEL }).click();

    // The completed-result controls are rendered only after status=ok, not during detection.
    await expect(page.getByRole("button", { name: TRANSLATED_JSON_LABEL })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/→ translated to OpenAI|→ traduzido para OpenAI/i)).toBeVisible();
    await expect(page.getByRole("tab", { name: PREVIEW_LABEL })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(fixtures.detectRequests).toEqual([
      { body: { messages: [{ role: "user", content: "Preview only fixture" }] } },
    ]);
    expect(fixtures.translateRequests).toEqual([
      {
        step: "direct",
        sourceFormat: "claude",
        targetFormat: "openai",
        body: { messages: [{ role: "user", content: "Preview only fixture" }] },
      },
    ]);
    expect(forbiddenSendRequests).toEqual([]);
  });

  test("deep-link ?advanced=streamtransform expands the Stream Transformer accordion", async ({
    page,
  }) => {
    await gotoDashboardRoute(page, "/dashboard/translator?advanced=streamtransform", {
      timeoutMs: TIMEOUT_MS,
    });

    await expect(page.getByText(/stream transformer/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("deep-link ?tab=translate&advanced=testbench expands Test Bench accordion", async ({
    page,
  }) => {
    await gotoDashboardRoute(page, "/dashboard/translator?tab=translate&advanced=testbench", {
      timeoutMs: TIMEOUT_MS,
    });

    await expect(page.getByText(/test bench/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
