// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real shell, deep-link hook, TranslateTab, controls, and detail panels.
// Only navigation, data hooks, Monaco and presentational shared components are faked.
const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
const session = vi.hoisted(() => ({
  run: vi.fn(),
  reset: vi.fn(),
  result: {
    status: "ok",
    detected: "claude",
    target: "openai",
    responsePreview: null,
    translatedJson: '{"messages":[{"role":"user","content":"translated-marker"}]}',
    intermediateJson: null,
    pipelinePath: "direct",
    errorMessage: null,
    latencyMs: 2,
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => nav.params,
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/app/(dashboard)/dashboard/translator/hooks/useTranslateSession", () => ({
  useTranslateSession: () => session,
}));
vi.mock("@/app/(dashboard)/dashboard/translator/hooks/useProviderOptions", () => ({
  useProviderOptions: () => ({
    provider: "openai",
    setProvider: vi.fn(),
    providerOptions: [{ value: "openai", label: "OpenAI" }],
    loading: false,
  }),
}));
vi.mock("@/app/(dashboard)/dashboard/translator/components/MonitorTab", () => ({
  default: () => null,
}));
vi.mock("@/app/(dashboard)/dashboard/translator/components/TranslatorConceptCard", () => ({
  default: () => null,
}));
vi.mock(
  "@/app/(dashboard)/dashboard/translator/components/advanced/StreamTransformerAccordion",
  () => ({ default: () => null })
);
vi.mock("@/app/(dashboard)/dashboard/translator/components/advanced/TestBenchAccordion", () => ({
  default: () => null,
}));
vi.mock(
  "@/app/(dashboard)/dashboard/translator/components/advanced/CompressionPreviewAccordion",
  () => ({ default: () => null })
);
vi.mock("@/shared/components/MonacoEditor", () => ({
  default: ({ value }: { value: string }) => <pre data-editor>{value}</pre>,
}));
vi.mock("@/shared/components", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  InfoTooltip: () => null,
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    "aria-label": label,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} disabled={disabled || loading} aria-label={label}>
      {children}
    </button>
  ),
  Select: ({
    options,
    value,
    onChange,
    "aria-label": label,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: React.ChangeEventHandler<HTMLSelectElement>;
    "aria-label"?: string;
  }) => (
    <select value={value} onChange={onChange} aria-label={label}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
  SegmentedControl: ({
    options,
    value,
    onChange,
    "aria-label": label,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
    "aria-label"?: string;
  }) => (
    <div role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          data-value={o.value}
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

import TranslatorDetailsAccordion from "@/app/(dashboard)/dashboard/translator/components/advanced/TranslatorDetailsAccordion";
import TranslatorPageClient from "@/app/(dashboard)/dashboard/translator/TranslatorPageClient";
import { useTranslateDeepLink } from "@/app/(dashboard)/dashboard/translator/hooks/useTranslateDeepLink";

let host: HTMLDivElement;
let root: Root;
async function render(query = "") {
  nav.params = new URLSearchParams(query);
  await act(async () => {
    root.render(<TranslatorPageClient />);
  });
}
function button(label: string) {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!found) throw new Error(`Button missing: ${label}`);
  return found;
}
async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  // Emulate the App Router delivering fresh readonly search params on navigation.
  await act(async () => {
    root.render(<TranslatorPageClient />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
}
function selectedMode() {
  return host
    .querySelector('[role="tablist"][aria-label="Mode"] [aria-selected="true"]')
    ?.getAttribute("data-value");
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  nav.replace.mockImplementation((href: string) => {
    nav.params = new URLSearchParams(href.slice(1));
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network in UI regression");
    })
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Translator safe mode and detail activation", () => {
  it("mounts detail content lazily and preserves its DOM and edits through close/reopen", async () => {
    const show = async (open: boolean) => {
      await act(async () =>
        root.render(
          <TranslatorDetailsAccordion title="Details" open={open} onOpenChange={() => {}}>
            <input defaultValue="initial" />
          </TranslatorDetailsAccordion>
        )
      );
    };
    await show(false);
    expect(host.querySelector("input")).toBeNull();
    await show(true);
    const input = host.querySelector("input")!;
    input.value = "edited";
    await show(false);
    expect(host.querySelector("input")).toBe(input);
    expect(input.closest("[hidden]")).not.toBeNull();
    await show(true);
    expect(host.querySelector("input")).toBe(input);
    expect(input.value).toBe("edited");
    expect(input.closest("[hidden]")).toBeNull();
  });
  it.each(["", "mode=invalid", "mode=", "mode=preview"])(
    "initializes Preview for %s",
    async (query) => {
      await render(query);
      expect(selectedMode()).toBe("preview");
    }
  );
  it.each(["", "mode=invalid"])("deep-link hook itself defaults safely for %s", async (query) => {
    nav.params = new URLSearchParams(query);
    function Probe() {
      return <output>{useTranslateDeepLink().state.mode}</output>;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(host.querySelector("output")?.textContent).toBe("preview");
  });
  it("honors explicit Send deep links and permits selecting Send", async () => {
    await render("mode=send");
    expect(selectedMode()).toBe("send");
    await click(button("Preview translation only"));
    await click(button("Send and see response"));
    expect(nav.params.get("mode")).toBe("send");
    expect(selectedMode()).toBe("send");
  });
  it.each(["preview", "send"])(
    "action accessible name equals its %s visible label",
    async (mode) => {
      await render(`mode=${mode}`);
      const action = host.querySelector(
        'button[aria-label="Send and see response"], button[aria-label="Preview translation only"]'
      );
      expect(action?.textContent).toBe(
        mode === "preview" ? "Preview translation only" : "Send and see response"
      );
      expect(action?.getAttribute("aria-label")).toBe(action?.textContent);
    }
  );
  it.each([
    ["see translated JSON", "rawjson"],
    ["see pipeline", "pipeline"],
  ])("selecting Preview then %s preserves preview in URL", async (label, slug) => {
    await render("mode=send&keep=1");
    await click(button("Preview translation only"));
    await click(button(label));
    expect(nav.params.get("mode")).toBe("preview");
    expect(nav.params.get("advanced")).toBe(slug);
    expect(nav.params.get("keep")).toBe("1");
    expect(selectedMode()).toBe("preview");
  });
  it.each([
    ["see translated JSON", "Raw JSON"],
    ["see pipeline", "Pipeline OpenAI"],
  ])("%s opens an already-mounted collapsed panel", async (label, prefix) => {
    await render("mode=preview");
    await click(button(label));
    const toggle = [...host.querySelectorAll("button[aria-expanded]")].find((b) =>
      b.textContent?.includes(prefix)
    );
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });
  it("pipeline detail expands the actual completed provider-format content", async () => {
    await render("mode=preview");
    await click(button("see pipeline"));
    const step = [
      ...host.querySelectorAll<HTMLButtonElement>("[data-pipeline-container] button"),
    ].find((b) => b.textContent?.includes("Provider Format"));
    expect(step).toBeTruthy();
    await click(step!);
    expect(host.querySelector("[data-pipeline-container] pre")?.textContent).toBe(
      session.result.translatedJson
    );
  });
  it("translated JSON detail shows the completed simple-session result without running conversion", async () => {
    await render("mode=preview");
    await click(button("see translated JSON"));
    expect(
      [...host.querySelectorAll("[data-editor]")].some(
        (e) => e.textContent === session.result.translatedJson
      )
    ).toBe(true);
    expect(session.run).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
