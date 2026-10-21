"use client";

/**
 * Shared base for EnterpriseModalShell, EnterpriseDrawerShell, EnterpriseWizardShell
 * and SidePeekDrawer. Built on Radix Dialog, so every overlay now gets:
 *   - Esc to close, click-outside to close
 *   - focus trapped inside and returned to the trigger on close
 *   - role="dialog", aria-modal, labelled by its title
 *   - nested-safe scroll lock (v1 set body.style.overflow = "unset" on unmount, which
 *     re-enabled page scroll while a parent modal was still open)
 *   - one z-index scale: popovers/selects opened inside appear ABOVE the overlay
 *     (v1 drawer was z-999999 and popovers z-100, so dropdowns inside drawers were hidden)
 */
import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OverlayShellProps {
  open?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra header content on the right (status badge, actions) */
  headerExtra?: React.ReactNode;
  variant: "modal" | "drawer";
  widthClass: string;
  className?: string;
  bodyClassName?: string;
  footerAlign?: "end" | "between";
  hideCloseButton?: boolean;
  /** Prevent closing by outside click (e.g. dirty forms) */
  dismissOnOutsideClick?: boolean;
}

export function OverlayShell({
  open = true,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerExtra,
  variant,
  widthClass,
  className,
  bodyClassName,
  footerAlign = "end",
  hideCloseButton = false,
  dismissOnOutsideClick = true,
}: OverlayShellProps) {
  const isDrawer = variant === "drawer";
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        />
        <Dialog.Content
          onPointerDownOutside={(e) => { if (!dismissOnOutsideClick) e.preventDefault(); }}
          className={cn(
            "fixed z-[var(--z-modal)] flex flex-col bg-elevated text-foreground shadow-lg outline-none",
            isDrawer
              ? "inset-y-0 right-0 h-full w-full border-l border-border data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-200"
              : "left-1/2 top-1/2 max-h-[calc(100dvh-48px)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-modal)] border border-border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] duration-150",
            widthClass,
            className
          )}
        >
          {(title || subtitle || !hideCloseButton) && (
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0">
                {title ? (
                  <Dialog.Title className="truncate text-[16px] font-semibold leading-tight text-heading">{title}</Dialog.Title>
                ) : (
                  <Dialog.Title className="sr-only">Dialog</Dialog.Title>
                )}
                {subtitle ? (
                  <Dialog.Description className="mt-1 text-[13px] text-muted">{subtitle}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</Dialog.Description>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerExtra}
                {!hideCloseButton && (
                  <Dialog.Close
                    aria-label="Close"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Dialog.Close>
                )}
              </div>
            </header>
          )}

          <div className={cn("min-h-0 flex-1 overflow-y-auto bg-surface px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>

          {footer && (
            <footer
              className={cn(
                "flex shrink-0 items-center gap-2 border-t border-border bg-elevated px-5 py-3 sm:px-6",
                footerAlign === "between" ? "justify-between" : "justify-end"
              )}
            >
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
