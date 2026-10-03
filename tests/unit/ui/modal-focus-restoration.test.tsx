// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { default: Modal } = await import("../../../src/shared/components/Modal");

const cleanups: Array<() => void> = [];

function Harness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open details
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Details">
        Modal body
      </Modal>
    </>
  );
}

// Radix Dialog portals to document.body — the dialog is intentionally NOT
// inside the React container, so queries run against document.
const findDialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

function renderHarness() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Harness />));
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
    // Radix portals leave residue in body; clear between tests.
    document.body.innerHTML = "";
  });
  return container;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

describe("shared Modal focus restoration", () => {
  it("returns focus to the trigger after Escape closes the dialog", async () => {
    const container = renderHarness();
    const trigger = container.querySelector<HTMLButtonElement>("button")!;

    act(() => {
      trigger.focus();
      trigger.click();
    });

    const dialog = findDialog();
    expect(dialog).not.toBeNull();
    act(() => {
      dialog!.querySelector<HTMLButtonElement>("button")!.focus();
    });
    expect(document.activeElement).not.toBe(trigger);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    // Radix FocusScope restores focus on a macrotask after the portal unmounts.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(findDialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus after the close button dismisses the dialog", async () => {
    const container = renderHarness();
    const trigger = container.querySelector<HTMLButtonElement>("button")!;

    act(() => {
      trigger.focus();
      trigger.click();
    });

    const closeButton = findDialog()!.querySelector<HTMLButtonElement>(
      'button[aria-label="close"]'
    )!;
    act(() => {
      closeButton.focus();
      closeButton.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(findDialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("does not try to focus an opener that was removed while the dialog was open", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const focusSpy = vi.spyOn(trigger, "focus");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let isOpen = true;
    const renderModal = () => {
      act(() => {
        root.render(
          <Modal
            isOpen={isOpen}
            onClose={() => {
              isOpen = false;
              renderModal();
            }}
            title="Details"
          >
            Modal body
          </Modal>
        );
      });
    };

    renderModal();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    focusSpy.mockClear();
    trigger.remove();

    expect(() => {
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
    }).not.toThrow();

    expect(findDialog()).toBeNull();
    expect(focusSpy).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  });
});
