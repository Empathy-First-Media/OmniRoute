// @vitest-environment jsdom
/**
 * Phase 1 (red) test: the three Cloud Agent settings switches
 * (enabled / autoCreatePr / requireApproval) are `<button role="switch">` with
 * only an icon-like knob inside, so they have no accessible name and no
 * association with their visible label/description.
 *
 * Expected fix (src/app/(dashboard)/dashboard/cloud-agents/page.tsx only):
 * give the visible title <p> an id and set aria-labelledby on the switch
 * (and aria-describedby for the description), plus type="button".
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const translate = (key: string) => key;
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => Object.assign(translate, { has: () => false }),
}));

const { default: CloudAgentsPage } = await import("@/app/(dashboard)/dashboard/cloud-agents/page");

const roots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

function textOfIds(ids: string | null): string {
  if (!ids) return "";
  return ids
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
    .join(" ")
    .trim();
}

/** Minimal accessible-name computation: aria-labelledby > aria-label > wrapping label text. */
function accessibleName(el: Element): string {
  const labelledBy = textOfIds(el.getAttribute("aria-labelledby"));
  if (labelledBy) return labelledBy;
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  return "";
}

async function mountSettingsTab() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }))
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () => {
    root.render(<CloudAgentsPage />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  const settingsTab = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("settingsTab")
  );
  expect(settingsTab, "Settings tab button must render").toBeTruthy();
  await act(async () => {
    settingsTab!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return container;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  for (const { root, container } of roots.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Cloud Agents settings switches accessibility", () => {
  it("renders exactly three switches in the settings tab", async () => {
    const container = await mountSettingsTab();
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(3);
  });

  it("gives every switch an accessible name matching its visible setting title", async () => {
    const container = await mountSettingsTab();
    const names = Array.from(container.querySelectorAll('[role="switch"]')).map(accessibleName);
    // RED today: all three are "" (no aria-label / aria-labelledby).
    expect(names).toEqual(["settingEnableAgents", "settingAutoPR", "settingRequireApproval"]);
  });

  it("associates each switch with its description via aria-describedby", async () => {
    const container = await mountSettingsTab();
    const descriptions = Array.from(container.querySelectorAll('[role="switch"]')).map((el) =>
      textOfIds(el.getAttribute("aria-describedby"))
    );
    expect(descriptions).toEqual([
      "settingEnableAgentsDesc",
      "settingAutoPRDesc",
      "settingRequireApprovalDesc",
    ]);
  });

  it("keeps switch state and keyboard-activatable semantics (guard, should stay green)", async () => {
    const container = await mountSettingsTab();
    const first = container.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(first.tagName).toBe("BUTTON");
    expect(first.getAttribute("aria-checked")).toBe("true");
    await act(async () => {
      first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(first.getAttribute("aria-checked")).toBe("false");
  });

  it("uses unique ids for label/description references across switches", async () => {
    const container = await mountSettingsTab();
    const ids = Array.from(container.querySelectorAll('[role="switch"]')).flatMap((el) =>
      [el.getAttribute("aria-labelledby"), el.getAttribute("aria-describedby")].filter(
        (v): v is string => Boolean(v)
      )
    );
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
