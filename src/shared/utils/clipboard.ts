/**
 * Clipboard utility with HTTP/HTTPS fallback.
 * navigator.clipboard.writeText() requires HTTPS (secure context).
 * For HTTP deployments, falls back to execCommand('copy') by default.
 * Sensitive copies can opt out of the temporary DOM fallback.
 */

export interface CopyToClipboardOptions {
  /** Disable for credentials that must never enter a temporary textarea. */
  allowFallback?: boolean;
}

/**
 * Copy text to clipboard with optional HTTPS/HTTP fallback.
 * Works in both secure (HTTPS) and non-secure (HTTP) contexts.
 * @param text - Text to copy to clipboard
 * @param options - Set allowFallback to false for Clipboard-API-only sensitive copies
 * @returns true if copy succeeded, false otherwise
 */
export async function copyToClipboard(
  text: string,
  { allowFallback = true }: CopyToClipboardOptions = {}
): Promise<boolean> {
  // Method 1: Clipboard API
  // Works on HTTPS, localhost (treated as secure context), and some browsers
  // even on HTTP. Try unconditionally — the catch handles failures.
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  if (!allowFallback) return false;

  // Method 2: Legacy execCommand fallback (works on HTTP)
  if (typeof document !== "undefined" && document.body) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none;";
    let appended = false;

    try {
      document.body.appendChild(textArea);
      appended = true;
      textArea.focus();
      textArea.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      if (appended && document.body.contains(textArea)) {
        document.body.removeChild(textArea);
      }
    }
  }

  return false;
}
