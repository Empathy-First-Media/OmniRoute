"use client";

/**
 * Maintenance Banner — Phase 8.4
 *
 * Shows a warning banner at the top of the dashboard when the server
 * is restarting or in maintenance mode. Auto-dismisses when the server
 * comes back online.
 *
 * TanStack Query owns the poll loop, abort signal, and the consecutive-
 * failure counter (failureCount resets on the first success).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export default function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [wasUnreachable, setWasUnreachable] = useState(false);
  // Failure flavor for the banner copy — set inside the queryFn promise
  // callback (async context), never during render.
  const [failureKind, setFailureKind] = useState<"http" | "network">("network");
  const t = useTranslations("common");

  const { isSuccess, failureCount } = useQuery({
    queryKey: ["health", "ping"],
    retry: 0,
    refetchInterval: 10_000,
    queryFn: async ({ signal }) => {
      // Use lightweight liveness probe (single SELECT 1) instead of the
      // heavy /api/monitoring/health observability endpoint. The heavy
      // endpoint can exceed the 8s client timeout under normal load
      // (e.g. Logs page 3s polling), causing false-positive banners.
      let res: Response;
      try {
        res = await fetch("/api/health/ping", {
          // Merge React Query's lifecycle signal with the 8s health timeout.
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
          cache: "no-store",
        });
      } catch (error) {
        setFailureKind("network");
        throw error;
      }
      if (!res.ok) {
        setFailureKind("http");
        throw new Error("health ping not ok");
      }
      return res.json();
    },
  });

  // Require at least 2 failed checks to avoid transient false positives.
  const unreachable = !isSuccess && failureCount >= 2;

  // Reset the dismiss latch when the server recovers — adjusting state
  // during render is the sanctioned alternative to setState-in-effect.
  if (unreachable !== wasUnreachable) {
    setWasUnreachable(unreachable);
    if (!unreachable) setDismissed(false);
  }

  const show = unreachable && !dismissed;
  if (!show) return null;

  const message =
    failureKind === "http" ? t("maintenanceServerIssues") : t("maintenanceServerUnreachable");

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-amber-500 text-[18px] animate-pulse">
          warning
        </span>
        <span className="text-sm text-amber-200">{message}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-main transition-colors"
        aria-label={t("close")}
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}
