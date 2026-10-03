"use client";

import Collapsible from "@/shared/components/Collapsible";
import MarkdownMessage from "@/app/(dashboard)/dashboard/playground/components/MarkdownMessage";
import { cn } from "@/shared/utils/cn";

interface ReasoningProps {
  /** Reasoning/thinking text emitted by the model. */
  text: string;
  /** Section label — callers pass the translated string. */
  label: string;
  /** Open on first render (e.g. while still streaming). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Vendored AI-Elements-style reasoning disclosure: a collapsible "thinking"
 * panel rendered above the assistant's answer. Built on the shared
 * Collapsible + MarkdownMessage primitives and the OmniRoute token palette.
 */
export function Reasoning({ text, label, defaultOpen = false, className }: ReasoningProps) {
  if (!text) return null;
  return (
    <Collapsible
      title={<span className="text-text-muted">{label}</span>}
      icon="psychology"
      defaultOpen={defaultOpen}
      variant="inline"
      className={cn("opacity-80", className)}
    >
      <MarkdownMessage content={text} className="text-xs text-text-muted italic" />
    </Collapsible>
  );
}

export default Reasoning;
