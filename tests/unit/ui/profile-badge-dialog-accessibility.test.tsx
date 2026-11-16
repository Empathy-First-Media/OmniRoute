// @vitest-environment jsdom
/**
 * Phase 1 (red) test: the Profile badge detail "modal" is a bare
 * `<div className="fixed inset-0 ...">` with no role="dialog", no aria-modal,
 * no aria-labelledby, no Escape handling, no focus move/trap and no focus
 * restore. The shared <Modal> (src/shared/components/Modal.tsx) already
 * implements all of that; the fix should reuse it without changing Modal.
 *
 * Eventual fix scope: src/app/(dashboard)/dashboard/profile/** only.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const translate = (key: string) => key;
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => Object.assign(translate, { has: () => false }),
}));

const { default: ProfilePage } = await import("@/app/(dashboard)/dashboard/profile/page");

const BADGES = [
  {
    id: "first_token",
    name: "First Token",
    description: "d1",
    rarity: "common",
    category: "usage",
    criteria: "c1",
    icon: "x",
  },
  {
    id: "second_badge",
    name: "Second Badge",
    description: "d2",
    rarity: "rare",
    category: "usage",
    criteria: "c2",
    icon: "y",
  },
  { id: "hidden_badge", name: "Secret Badge", description: "secret", rarity: "rare", hidden: true },
];

const roots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const sleep = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

async function mountLoadedProfile() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/level")) {
        return { ok: true, json: async () => ({ level: { totalXp: 150, currentLevel: 2 } }) };
      }
      if (url.endsWith("/badges/earned")) {
        return { ok: true, json: async () => ({ badges: [] }) };
      }
      return { ok: true, json: async () => ({ badges: BADGES }) };
    })
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () => {
    root.render(<ProfilePage />);
  });
  for (let i = 0; i < 40 && container.querySelector('[role="status"]'); i++) await sleep(10);
  return container;
}

function badgeButton(container: HTMLElement, name: string) {
  const btn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(name)
  );
  expect(btn, `badge button ${name}`).toBeTruthy();
  return btn as HTMLButtonElement;
}

async function openBadge(container: HTMLElement, name: string) {
  const trigger = badgeButton(container, name);
  trigger.focus();
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(120); // shared Modal focuses its first control after a 50ms timer
  return trigger;
}

function pressKey(target: EventTarget, key: string) {
  return act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

afterEach(() => {
  for (const { root, container } of roots.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  document.body.style.overflow = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Profile badge detail dialog accessibility", () => {
  it("exposes a labelled modal dialog", async () => {
    const container = await mountLoadedProfile();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await openBadge(container, "First Token");

    const dialog = document.querySelector('[role="dialog"]');
    // RED today: no role="dialog" element exists.
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog!.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe("First Token");
  });

  it("moves focus into the dialog when opened", async () => {
    const container = await mountLoadedProfile();
    await openBadge(container, "First Token");
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    // RED today: focus stays on the badge trigger behind the overlay.
    expect(dialog!.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and restores focus to the badge that opened it", async () => {
    const container = await mountLoadedProfile();
    const trigger = await openBadge(container, "First Token");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    await pressKey(document, "Escape");

    // RED today: Escape is ignored, the detail panel stays open.
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).not.toContain("profileHowToEarn");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes via the labelled Close control and restores focus", async () => {
    const container = await mountLoadedProfile();
    const trigger = await openBadge(container, "First Token");
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    const closeBtn = dialog!.querySelector('button[aria-label="close"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("traps Tab within the dialog (wraps last -> first)", async () => {
    const container = await mountLoadedProfile();
    await openBadge(container, "First Token");
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    const focusable = Array.from(dialog!.querySelectorAll<HTMLElement>("button"));
    expect(focusable.length).toBeGreaterThanOrEqual(2);
    focusable[focusable.length - 1].focus();
    await pressKey(focusable[focusable.length - 1], "Tab");
    expect(document.activeElement).toBe(focusable[0]);
    await act(async () => {
      focusable[0].dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it("provides the shared Modal boundary, backdrop and scroll lock", async () => {
    const container = await mountLoadedProfile();
    await openBadge(container, "First Token");
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // jsdom checks modal semantics/structure here, not native hit-testing or inertness.
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    const overlay = dialog!.parentElement as HTMLElement;
    expect(overlay.className).toContain("fixed");
    expect(overlay.className).toContain("inset-0");
    expect(overlay.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(dialog!.contains(badgeButton(container, "Second Badge"))).toBe(false);
    // Body scroll lock from shared Modal.
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does not open a dialog for the hidden locked badge (guard, should stay green)", async () => {
    const container = await mountLoadedProfile();
    const hidden = badgeButton(container, "???");
    expect(hidden.disabled).toBe(true);
    await act(async () => hidden.click());
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });
});
