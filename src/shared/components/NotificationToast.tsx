"use client";

/**
 * NotificationToast — sonner-backed toast surface.
 *
 * Renders sonner's <Toaster /> in the top-right corner; notifications are
 * fired by the notificationStore (addNotification/success/error/warning/
 * info), which delegates rendering to sonner while keeping its public API.
 *
 * Usage: <NotificationToast /> is mounted once in DashboardLayout.
 */

import { Toaster } from "sonner";

/**
 * Coerce a toast title/message to a string. `message`/`title` are typed as
 * `string`, but callers occasionally pass a raw API error body (an object) —
 * rendering that object directly throws React #31 ("Objects are not valid as a
 * React child"). This keeps the toast resilient no matter what a caller hands it.
 */
export function toToastText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export default function NotificationToast() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border shadow-xl",
        },
      }}
    />
  );
}
