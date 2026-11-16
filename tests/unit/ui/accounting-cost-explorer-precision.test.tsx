// @vitest-environment jsdom
// Render the real cost explorer with synthetic analytics, never a live provider.
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

// The costs tab lazy-loads recharts cards via next/dynamic. They are unrelated
// to the disclosure contract and are expensive to mount in jsdom.
vi.mock("@/app/(dashboard)/dashboard/costs/components/CostCharts", () => ({
  CostTrendCard: () => <div data-testid="cost-trend-card" />,
  ProviderSpendCard: () => <div data-testid="provider-spend-card" />,
  WeeklyPatternCard: () => <div data-testid="weekly-pattern-card" />,
}));

// Keep the shared barrel out of jsdom — CostOverviewTab only needs these four.
vi.mock("@/shared/components", () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  EmptyState: ({ title, description }: { title?: string; description?: string }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  SegmentedControl: () => <div data-testid="segmented-control" />,
  CardSkeleton: () => <div data-testid="card-skeleton" />,
}));

const { default: CostOverviewTab } =
  await import("../../../src/app/(dashboard)/dashboard/costs/CostOverviewTab.tsx");

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    summary: {
      totalCost: 30,
      totalRequests: 4,
      uniqueModels: 1,
      uniqueAccounts: 1,
      uniqueApiKeys: 1,
      totalTokens: 2_000_000,
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      fallbackCount: 0,
      fallbackRatePct: 0,
      requestedModelCoveragePct: 100,
      streak: 0,
    },
    byProvider: [{ provider: "claude", requests: 4, totalTokens: 2_000_000, cost: 30 }],
    byModel: [{ model: "claude-opus-5", requests: 4, totalTokens: 2_000_000, cost: 30 }],
    byApiKey: [],
    byAccount: [],
    dailyTrend: [{ date: "2026-08-25", cost: 30 }],
    weeklyPattern: [],
    activityMap: {},
    presetSummaries: { "1d": { totalCost: 30 }, "7d": { totalCost: 30 }, "30d": { totalCost: 30 } },
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;
let downloadedBlobs: Blob[];

function installFetch(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/usage/analytics")) {
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })
  );
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  downloadedBlobs = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  // downloadFile() round-trips the export through an object URL; capture the Blob.
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn((blob: Blob) => {
      downloadedBlobs.push(blob);
      return "blob:mock";
    }),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function renderWith(payload: unknown) {
  installFetch(payload);
  await act(async () => {
    root.render(<CostOverviewTab />);
  });
  // let the analytics fetch resolve and re-render
  await act(async () => {
    await Promise.resolve();
  });
}

describe("cost explorer accounting precision", () => {
  it("preserves $0.002 per request while keeping an explicit numeric zero as zero cost", async () => {
    await renderWith(
      buildPayload({
        summary: { totalCost: 0.004, totalRequests: 3, totalTokens: 3 },
        byProvider: [
          { provider: "Tiny fixture", cost: 0.004, requests: 2, totalTokens: 2 },
          { provider: "Zero fixture", cost: 0, requests: 1, totalTokens: 1 },
        ],
      })
    );
    const row = Array.from(container.querySelectorAll("tr")).find((r) =>
      r.textContent?.includes("Tiny fixture")
    );
    expect(row).toBeTruthy();
    expect(row!.querySelectorAll("td")[4].textContent).toMatch(/\$0\.002(?:0*)/);
    const zero = Array.from(container.querySelectorAll("tr")).find((r) =>
      r.textContent?.includes("Zero fixture")
    );
    expect(zero).toBeTruthy();
    expect(zero!.querySelectorAll("td")[1].textContent).toBe("$0.00");
    expect(zero!.textContent).not.toMatch(/unknown/i);
  });
});
