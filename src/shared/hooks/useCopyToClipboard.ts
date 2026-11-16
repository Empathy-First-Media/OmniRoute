"use client";

import { useState, useCallback, useRef } from "react";
import { copyToClipboard, type CopyToClipboardOptions } from "@/shared/utils/clipboard";

/**
 * Hook for copy to clipboard with feedback.
 * Uses the shared HTTP/HTTPS utility; sensitive copies can disable its DOM fallback.
 * @param {number} resetDelay - Time in ms before resetting copied state (default: 2000)
 * @returns Copied identity and an async copy function with optional fallback policy.
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, id = "default", options?: CopyToClipboardOptions): Promise<boolean> => {
      const success = await copyToClipboard(text, options);

      if (success) {
        setCopied(id);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setCopied(null);
        }, resetDelay);
      }

      return success;
    },
    [resetDelay]
  );

  return { copied, copy };
}
