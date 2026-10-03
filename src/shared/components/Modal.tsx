"use client";

import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import Button, { type ButtonVariant } from "./Button";

// #6265 — preset for content-heavy modals: caps height on the OUTERMOST dialog
// wrapper only (single scroll owner) and keeps the inner body plain (no
// independent max-h/overflow), avoiding a double height cap that clips content.
export const TALL_MODAL_PROPS = {
  className: "max-h-[90vh] overflow-y-auto",
  bodyClassName: "p-6",
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  compactHeader?: boolean;
  maxWidth?: string;
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: React.ReactNode;
  message: React.ReactNode;
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
}

/**
 * Modal — Radix Dialog underneath the historical ModalProps API.
 *
 * Focus trap, Escape handling, scroll lock, focus restore,
 * `aria-modal`/`aria-labelledby` wiring, and overlay dismissal are all owned
 * by Radix primitives. Content renders inline (no Dialog.Portal) to preserve
 * the previous DOM shape — jsdom suites and callers query within their own
 * render container, not document.body.
 * This wrapper only preserves the OmniRoute layout (traffic-light header
 * dots, size presets, footer slot) and prop names.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  showCloseButton = true,
  className,
  bodyClassName,
  compactHeader = false,
  maxWidth,
}: ModalProps) {
  const t = useTranslations("common");
  // Radix's default focus-restore targets Dialog.Trigger, which this API
  // doesn't use (open is controlled externally) — capture the opener the
  // way the old hand-rolled version did and restore it on close.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;
  }, [isOpen]);

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  } as const;

  // maxWidth accepts either a size key ("lg", "xl") or a raw max-w-* class;
  // callers passed both shapes before this prop went live.
  const widthClass =
    maxWidth && maxWidth in sizes
      ? sizes[maxWidth as keyof typeof sizes]
      : maxWidth?.startsWith("max-")
        ? maxWidth
        : sizes[size];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <Dialog.Content
        aria-describedby={undefined}
        onInteractOutside={closeOnOverlay ? undefined : (e) => e.preventDefault()}
        onCloseAutoFocus={(event) => {
          // Prevent Radix's (null) triggerRef fallback, then restore the
          // captured opener. Disconnected elements are skipped — a removed
          // opener must not become a focus() no-op regression (#focus-restore).
          event.preventDefault();
          const previouslyFocused = previouslyFocusedRef.current;
          previouslyFocusedRef.current = null;
          if (previouslyFocused?.isConnected) previouslyFocused.focus();
        }}
        className={cn(
          "fixed inset-0 z-50 m-auto h-fit w-full bg-surface",
          "border border-black/10 dark:border-white/10",
          "rounded-card shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          widthClass,
          className
        )}
      >
        {/* Radix requires a Title for screen readers even when the caller
            renders no header — keep an sr-only fallback. */}
        {!title && <Dialog.Title className="sr-only">{t("details")}</Dialog.Title>}
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              "flex items-center justify-between border-b border-black/5 dark:border-white/5",
              compactHeader ? "px-4 py-2.5" : "p-6"
            )}
          >
            <div className="flex items-center min-w-0">
              <div
                className={cn(
                  "flex items-center gap-1.5 mr-3 shrink-0",
                  compactHeader ? "" : "gap-2 mr-4"
                )}
                aria-hidden="true"
              >
                <div
                  className={cn(
                    "rounded-full bg-[#FF5F56]",
                    compactHeader ? "w-2.5 h-2.5" : "w-3 h-3"
                  )}
                />
                <div
                  className={cn(
                    "rounded-full bg-[#FFBD2E]",
                    compactHeader ? "w-2.5 h-2.5" : "w-3 h-3"
                  )}
                />
                <div
                  className={cn(
                    "rounded-full bg-[#27C93F]",
                    compactHeader ? "w-2.5 h-2.5" : "w-3 h-3"
                  )}
                />
              </div>
              {title && (
                <Dialog.Title
                  className={cn(
                    "font-semibold text-text-main truncate min-w-0",
                    compactHeader ? "text-sm" : "text-lg"
                  )}
                >
                  {title}
                </Dialog.Title>
              )}
            </div>
            {showCloseButton && (
              <Dialog.Close
                aria-label={t("close")}
                className="p-1.5 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  close
                </span>
              </Dialog.Close>
            )}
          </div>
        )}

        {/* Body */}
        <div className={bodyClassName ?? "p-6 max-h-[calc(80vh-140px)] overflow-y-auto"}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-black/5 dark:border-white/5">
            {footer}
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

// Confirm Modal helper
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  const t = useTranslations("common");
  const resolvedTitle = title ?? t("confirmTitle");
  const resolvedConfirmText = confirmText ?? t("confirmAction");
  const resolvedCancelText = cancelText ?? t("cancel");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resolvedTitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {resolvedCancelText}
          </Button>
          <Button variant={variant} onClick={() => void onConfirm()} loading={loading}>
            {resolvedConfirmText}
          </Button>
        </>
      }
    >
      <p className="text-text-muted">{message}</p>
    </Modal>
  );
}
