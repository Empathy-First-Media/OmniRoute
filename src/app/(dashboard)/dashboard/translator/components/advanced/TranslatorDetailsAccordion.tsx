"use client";

import { useId, useState, type ReactNode } from "react";

/** Controlled only here: details deep-links must open panels after their initial mount. */
export default function TranslatorDetailsAccordion({
  title,
  subtitle,
  icon,
  open,
  onOpenChange,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const [hasOpened, setHasOpened] = useState(open);
  // Remember the first opening without delaying content until an Effect.
  if (open && !hasOpened) setHasOpened(true);
  return (
    <div className={`rounded-lg border bg-surface ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      >
        <span className="material-symbols-outlined text-text-muted" aria-hidden="true">
          {open ? "expand_more" : "chevron_right"}
        </span>
        {icon && (
          <span className="material-symbols-outlined text-text-muted" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-main">{title}</span>
          {subtitle && <span className="block text-xs text-text-muted">{subtitle}</span>}
        </span>
      </button>
      <div id={id} hidden={!open} className="p-4">
        {(open || hasOpened) && children}
      </div>
    </div>
  );
}
