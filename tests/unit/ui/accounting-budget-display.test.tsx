// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/shared/components", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, loading, variant, size, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input {...props} />
    </label>
  ),
  EmptyState: ({ title, description }: any) => (
    <div>
      {title}
      {description}
    </div>
  ),
}));
vi.mock("@/store/notificationStore", () => ({
  useNotificationStore: () => ({ success: vi.fn(), error: vi.fn() }),
}));
const { default: BudgetPage } =
  await import("../../../src/app/(dashboard)/dashboard/costs/budget/page");
let container: HTMLDivElement;
let root: Root;
let bulkOk: boolean;
let analyticsOk: boolean;
let analyticsEmpty: boolean;
let requests: string[];
// A separator in the ID catches query interpolation regressions; not a real key.
const keyId = "fixture&second";
beforeEach(() => {
  bulkOk = analyticsOk = true;
  analyticsEmpty = false;
  requests = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, options?: RequestInit) => {
      const url = String(input);
      requests.push(url);
      if (options?.method && options.method !== "GET") throw new Error("Read-only fixture");
      if (url === "/api/keys") return Response.json({ keys: [{ id: keyId, name: "Fixture key" }] });
      if (url === "/api/usage/budget/bulk")
        return Response.json(
          bulkOk
            ? {
                budgets: {
                  [keyId]: {
                    totalCostToday: 0.002,
                    totalCostMonth: 0.12,
                    activeLimitUsd: 0,
                    dailyLimitUsd: 0,
                    monthlyLimitUsd: 0,
                    budgetCheck: { allowed: true },
                  },
                },
              }
            : { error: "unavailable" },
          { status: bulkOk ? 200 : 503 }
        );
      if (url.startsWith("/api/usage/analytics?"))
        return Response.json(
          analyticsOk
            ? {
                includesFlatRateEstimates: false,
                byProvider: analyticsEmpty
                  ? []
                  : [{ provider: "Fixture provider", cost: 9, requests: 2 }],
              }
            : { error: "unavailable" },
          { status: analyticsOk ? 200 : 503 }
        );
      throw new Error(`Unexpected fixture request: ${url}`);
    })
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}
async function mount() {
  await act(async () => {
    root.render(<BudgetPage />);
  });
  await settle();
}
async function expand() {
  const trigger = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Fixture key")
  );
  expect(trigger).toBeTruthy();
  await act(async () => trigger!.click());
  await settle();
}
it("identifies recorded budget spend separately from pricing analytics and provider billing", async () => {
  await mount();
  await expand();
  expect(container.textContent).toMatch(/recorded.*budget.*spend|budget.*ledger/i);
  expect(container.textContent).toMatch(/token.price.*estimate/i);
  expect(container.textContent).toMatch(/not.*provider.*bill/i);
  expect(container.textContent).toContain("$0.12");
  expect(container.textContent).toContain("$9.00"); // Do not force unlike data sources to match.
});
it("preserves tiny positive budget amounts instead of rounding them to zero", async () => {
  await mount();
  expect(container.textContent).toMatch(/\$0\.002(?:0*)/);
});
it("encodes the exact key in the rolling 30-day breakdown request", async () => {
  await mount();
  await expand();
  const request = requests.find((u) => u.startsWith("/api/usage/analytics?"));
  expect(request).toBeTruthy();
  const url = new URL(request!, "http://fixture.invalid");
  expect(url.searchParams.get("apiKeyIds")).toBe(keyId);
  expect(url.searchParams.get("range")).toBe("30d");
  expect(container.textContent).toMatch(/30 days|30 DAYS/i);
});
it("does not describe an unlimited key as on track against a nonexistent cap", async () => {
  await mount();
  expect(container.textContent).toMatch(/no limit|unlimited/i);
  expect(container.textContent).not.toMatch(/on track/i);
});
it("keeps unavailable budget data distinct from unlimited or zero usage", async () => {
  bulkOk = false;
  await mount();
  expect(container.textContent).toMatch(/unavailable|could not load|failed to load/i);
  expect(container.textContent).not.toMatch(/no limit|on track/i);
});
it("renders a failed breakdown as unavailable, not indefinite loading or no spend", async () => {
  analyticsOk = false;
  await mount();
  await expand();
  expect(container.textContent).toMatch(/breakdown.*unavailable|could not load.*breakdown/i);
  expect(container.textContent).not.toMatch(/Loading…|No spend/i);
});
it("an empty analytics result describes pricing data, not absence of ledger spend", async () => {
  analyticsEmpty = true;
  await mount();
  await expand();
  expect(container.textContent).toMatch(
    /no.*(?:pricing|analytics|estimate).*data|no.*estimated.*cost/i
  );
  expect(container.textContent).toContain("$0.12");
});
