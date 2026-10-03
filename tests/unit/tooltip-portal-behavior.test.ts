/**
 * Issue #2352 — Tooltip must render in a React portal by default so it can
 * escape ancestor stacking contexts (modal `overflow:hidden`). Without the
 * portal, tooltips in the combo edit modal were clipped.
 *
 * The component now delegates portal + collision handling to Radix Tooltip
 * (Popper), which portals into document.body and clamps to the viewport via
 * `collisionPadding` — a strictly stronger version of the old manual
 * getBoundingClientRect clamp. These source-level assertions pin that
 * contract so the guarantees can't regress silently.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLTIP_SRC = path.resolve(__dirname, "../../src/shared/components/Tooltip.tsx");

const src = fs.readFileSync(TOOLTIP_SRC, "utf8");

test("#2352 Tooltip renders the bubble through Radix Tooltip", () => {
  assert.ok(
    /import \* as RadixTooltip from "@radix-ui\/react-tooltip"/.test(src),
    "Tooltip must be built on @radix-ui/react-tooltip primitives"
  );
  assert.ok(
    /RadixTooltip\.Content/.test(src),
    "RadixTooltip.Content provides fixed Popper positioning inside the portal"
  );
});

test("#2352 Tooltip exposes usePortal prop defaulted to true", () => {
  const propDecl = /usePortal\s*\?:\s*boolean/;
  const propTrue = /usePortal\s*=\s*true/;
  assert.ok(propDecl.test(src), "TooltipProps must declare optional usePortal prop");
  assert.ok(
    propTrue.test(src),
    "usePortal must default to true (the unsafe-by-default was the bug)"
  );
});

test("#2352 Tooltip portals to document.body by default", () => {
  // RadixTooltip.Portal mounts into document.body, which is exactly where the
  // old createPortal(tooltipEl, document.body) call rendered — the clipping fix.
  assert.ok(
    /usePortal\s*\?\s*<RadixTooltip\.Portal>/.test(src),
    "Portal rendering must remain the default escape hatch for overflow:hidden ancestors"
  );
});

test("#2352 multiline prop swaps whitespace-nowrap for wrap-friendly classes", () => {
  assert.ok(
    /multiline\s*\?\s*"max-w-xs whitespace-normal break-words"\s*:\s*"whitespace-nowrap"/.test(src),
    "multiline=true must enable wrapping; default keeps the legacy single-line layout"
  );
});

test("#2352 portal tooltip clamps to viewport bounds (collision-aware)", () => {
  // Popper's collision engine (collisionPadding + side) replaces the old manual
  // maxLeft/minLeft clamp — it flips/shifts the bubble to stay on screen.
  assert.ok(
    /collisionPadding/.test(src),
    "Tooltip.Content must set collisionPadding so the bubble stays inside the viewport"
  );
  assert.ok(
    /side=\{position\}/.test(src),
    "side must map the public `position` prop so the anchor direction is preserved"
  );
});
