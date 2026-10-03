"use client";

import { useState, type ReactNode } from "react";
import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { cn } from "@/shared/utils/cn";

interface CollapsibleProps {
  /** Header content (always visible, click-to-toggle). */
  title: ReactNode;
  /** Optional secondary line under the title. */
  subtitle?: ReactNode;
  /** Material symbol name shown left of the title. */
  icon?: string;
  /** Trailing element rendered next to the chevron (badges, op counts, etc). */
  trailing?: ReactNode;
  /** Whether the section is open on first render. Defaults to false. */
  defaultOpen?: boolean;
  /** Visual variant. `default` for top-level sections; `inline` for nested rows. */
  variant?: "default" | "inline";
  /** Custom class for the wrapper. */
  className?: string;
  /** Content rendered when expanded. */
  children: ReactNode;
}

/**
 * Minimal click-to-expand section. Stateless from the caller's perspective
 * (open/closed lives in local state — does NOT survive page refresh, per the
 * UX brief). Radix Collapsible owns the trigger/content ARIA wiring
 * (aria-controls, keyboard semantics); this wrapper keeps the OmniRoute
 * layout and prop names. Uses material-symbols-outlined chevrons to match
 * the rest of the UI.
 */
export default function Collapsible({
  title,
  subtitle,
  icon,
  trailing,
  defaultOpen = false,
  variant = "default",
  className,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  const wrapperClasses = cn(
    variant === "default"
      ? "rounded-lg border border-black/5 dark:border-white/5 bg-surface"
      : "rounded-md border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]",
    className
  );

  const headerRowClasses = cn(
    "flex items-center gap-3",
    variant === "default" ? "p-4" : "p-3",
    "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors",
    open && "border-b border-black/5 dark:border-white/5"
  );

  // The chevron + title region is the click target. Trailing interactive
  // controls (Toggle, Button) live OUTSIDE the trigger so we never nest
  // <button> inside <button> (invalid HTML; breaks keyboard nav + ARIA).
  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen} className={wrapperClasses}>
      <div className={headerRowClasses}>
        <RadixCollapsible.Trigger className="flex items-center gap-3 flex-1 min-w-0 text-left -m-1 p-1 rounded">
          <span
            className="material-symbols-outlined text-text-muted text-[20px] shrink-0"
            aria-hidden="true"
          >
            {open ? "expand_more" : "chevron_right"}
          </span>
          {icon && (
            <span
              className="material-symbols-outlined text-text-muted text-[18px] shrink-0"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-main truncate">{title}</div>
            {subtitle && <div className="text-xs text-text-muted truncate">{subtitle}</div>}
          </div>
        </RadixCollapsible.Trigger>
        {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
      </div>
      {/* Radix Content unmounts when closed (same as the old {open && ...}),
          and emits the data-state hooks consumers/tests may key on. */}
      <RadixCollapsible.Content className={variant === "default" ? "p-4" : "p-3"}>
        {children}
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  );
}
