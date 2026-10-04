"use client";

/**
 * Tooltip — hover/focus tooltip built on Radix Tooltip primitives.
 *
 * Radix owns the hard parts the old hand-rolled version reimplemented:
 * delayed reveal (delayDuration), aria-describedby wiring, Escape dismissal,
 * focus/blur triggers, portal rendering, and Popper-based positioning with
 * viewport collision detection (the same "clamp to screen edge" behavior
 * the manual getBoundingClientRect math approximated).
 *
 * Public API is unchanged: `content`, `position`, `delayMs`, `multiline`,
 * `className` (trigger wrapper), `tooltipClassName` (bubble).
 *
 * @module shared/components/Tooltip
 */

import { isValidElement, type ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/shared/utils/cn";

interface TooltipProps {
  children: ReactNode;
  content?: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  tooltipClassName?: string;
  delayMs?: number;
  /**
   * Issue #2352: tooltips render in a portal so they escape ancestors with
   * `overflow:hidden` (modals, scroll containers). Defaults to `true`; pass
   * `false` to render inline (Radix `Tooltip.Content` without `Portal`).
   */
  usePortal?: boolean;
  /** Allow the tooltip text to wrap instead of forcing one line. */
  multiline?: boolean;
}

export default function Tooltip({
  children,
  content,
  position = "top",
  className = "",
  tooltipClassName = "",
  delayMs = 200,
  usePortal = true,
  multiline = false,
}: TooltipProps) {
  if (!content) {
    return <span className={`relative inline-flex ${className}`}>{children}</span>;
  }

  // Enabled DOM children become the trigger itself so aria-describedby lands
  // on the element that actually receives focus. Disabled elements swallow
  // pointer events, so they keep Radix's documented focusable-wrapper
  // pattern; strings/fragments get the same inert wrapper without a tab stop.
  const childIsDomElement = isValidElement(children) && typeof children.type === "string";
  const childDisabled = childIsDomElement && Boolean(children.props.disabled);

  const bubble = (
    <RadixTooltip.Content
      side={position}
      sideOffset={8}
      collisionPadding={8}
      className={cn(
        "z-50 px-3 py-2 text-xs font-medium text-white bg-[#10141e]/95 rounded-lg",
        "shadow-xl pointer-events-none border border-white/10 backdrop-blur-sm",
        "animate-in fade-in duration-150 motion-reduce:transition-none",
        multiline ? "max-w-xs whitespace-normal break-words" : "whitespace-nowrap",
        tooltipClassName
      )}
    >
      {content}
    </RadixTooltip.Content>
  );

  return (
    <RadixTooltip.Provider delayDuration={delayMs} skipDelayDuration={0}>
      <RadixTooltip.Root>
        {childIsDomElement && !childDisabled ? (
          <RadixTooltip.Trigger asChild className={className}>
            {children}
          </RadixTooltip.Trigger>
        ) : (
          <RadixTooltip.Trigger asChild>
            <span
              className={`relative inline-flex ${className}`}
              tabIndex={childDisabled ? 0 : undefined}
            >
              {children}
            </span>
          </RadixTooltip.Trigger>
        )}
        {usePortal ? <RadixTooltip.Portal>{bubble}</RadixTooltip.Portal> : bubble}
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
