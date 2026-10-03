"use client";

/**
 * Notification Store — global notification API, sonner-backed.
 *
 * The public surface (addNotification / success / error / warning / info /
 * removeNotification / clearAll) is unchanged so all ~50 call sites keep
 * working; rendering is delegated to sonner's <Toaster /> via
 * NotificationToast. `notifications` is still populated for consumers and
 * tests that read store state — sonner owns the visual stack.
 *
 * @module store/notificationStore
 */

import { create } from "zustand";
import { toast } from "sonner";
import { toToastText } from "@/shared/components/NotificationToast";

let idCounter = 0;

type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  title?: string | null;
  duration: number;
  dismissible: boolean;
  createdAt: number;
  onClick?: () => void;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: {
    type?: NotificationType;
    message: string;
    title?: string;
    duration?: number;
    dismissible?: boolean;
    onClick?: () => void;
  }) => number;
  removeNotification: (id: number) => void;
  clearAll: () => void;
  success: (message: string, title?: string) => number;
  error: (message: string, title?: string) => number;
  warning: (message: string, title?: string) => number;
  info: (message: string, title?: string) => number;
}

/** Store id → sonner toast id, so removeNotification can dismiss it. */
const sonnerIds = new Map<number, string | number>();

function fireSonner(entry: Notification): string | number {
  const title = entry.title ? toToastText(entry.title) : toToastText(entry.message);
  const description = entry.title ? toToastText(entry.message) : undefined;
  const options = {
    description,
    duration: entry.duration,
    dismissible: entry.dismissible,
    // Sonner has no whole-toast click handler; map click-to-navigate style
    // notifications onto an action button instead.
    action: entry.onClick ? { label: "View", onClick: entry.onClick } : undefined,
  };
  return toast[entry.type](title, options);
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = ++idCounter;
    const entry: Notification = {
      id,
      type: notification.type || "info",
      message: notification.message,
      title: notification.title || null,
      duration: notification.duration ?? 5000,
      dismissible: notification.dismissible ?? true,
      createdAt: Date.now(),
      onClick: notification.onClick,
    };

    sonnerIds.set(id, fireSonner(entry));
    set((s) => ({
      notifications: [...s.notifications, entry],
    }));

    // Sonner auto-dismisses the visual toast; keep the store entry reaped on
    // the same clock so `notifications` stays bounded for state readers.
    if (entry.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, entry.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    const sonnerId = sonnerIds.get(id);
    if (sonnerId !== undefined) {
      sonnerIds.delete(id);
      toast.dismiss(sonnerId);
    }
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    sonnerIds.clear();
    toast.dismiss();
    set({ notifications: [] });
  },

  // ─── Convenience Methods ─────────────────

  success: (message, title) => get().addNotification({ type: "success", message, title }),

  error: (message, title) =>
    get().addNotification({ type: "error", message, title, duration: 8000 }),

  warning: (message, title) =>
    get().addNotification({ type: "warning", message, title, duration: 10000 }),

  info: (message, title) => get().addNotification({ type: "info", message, title }),
}));
