"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OverlayShellProps {
  open?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "modal" | "drawer" | "wizard" | "side-peek";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  hideCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  steps?: string[];
  currentStep?: number;
}

const MODAL_SIZES = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-[1400px]",
  full: "max-w-7xl",
};

const DRAWER_SIZES = {
  sm: "w-full sm:max-w-md",
  md: "w-full sm:max-w-2xl",
  lg: "w-full sm:max-w-4xl",
  xl: "w-full sm:max-w-6xl",
  full: "w-full",
};

export function OverlayShell({
  open = true,
  onClose,
  title,
  subtitle,
  headerExtra,
  children,
  footer,
  variant = "modal",
  size = "md",
  className,
  hideCloseButton = false,
  closeOnOutsideClick = true,
  steps,
  currentStep = 0,
}: OverlayShellProps) {
  const isDrawer = variant === "drawer" || variant === "side-peek";
  const isWizard = variant === "wizard";

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)] transition-opacity animate-in fade-in-0 duration-200"
        />

        <div
          className={cn(
            "fixed inset-0 z-[var(--z-modal)] flex overflow-hidden",
            isDrawer ? "justify-end" : "items-center justify-center p-4 sm:p-6"
          )}
        >
          <DialogPrimitive.Content
            aria-describedby={subtitle ? "overlay-subtitle" : undefined}
            onPointerDownOutside={(e) => {
              if (isWizard || !closeOnOutsideClick) {
                e.preventDefault();
              }
            }}
            onInteractOutside={(e) => {
              if (isWizard || !closeOnOutsideClick) {
                e.preventDefault();
              }
            }}
            className={cn(
              "relative flex flex-col bg-surface text-foreground border border-border shadow-2xl focus:outline-none overflow-hidden",
              isDrawer
                ? cn(
                    "h-full border-l animate-in slide-in-from-right duration-250 ease-out",
                    DRAWER_SIZES[size]
                  )
                : cn(
                    "w-full rounded-[var(--radius-modal)] animate-in zoom-in-95 fade-in-0 duration-200",
                    MODAL_SIZES[size]
                  ),
              className
            )}
            style={!isDrawer ? { maxHeight: "calc(100vh - 48px)" } : undefined}
          >
            {/* Header */}
            {(title || subtitle || headerExtra || !hideCloseButton) && (
              <div className="shrink-0 px-6 py-4 border-b border-border bg-elevated flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {title && (
                      <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-heading truncate">
                        {title}
                      </DialogPrimitive.Title>
                    )}
                    {subtitle && (
                      <DialogPrimitive.Description
                        id="overlay-subtitle"
                        className="text-xs text-muted mt-0.5"
                      >
                        {subtitle}
                      </DialogPrimitive.Description>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {headerExtra}
                    {!hideCloseButton && (
                      <DialogPrimitive.Close
                        type="button"
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogPrimitive.Close>
                    )}
                  </div>
                </div>

                {/* Optional Step Indicator for Wizards */}
                {steps && steps.length > 0 && (
                  <nav aria-label="Progress" className="pt-2 border-t border-border/60">
                    <ol className="flex items-center gap-2 overflow-x-auto">
                      {steps.map((step, idx) => {
                        const isDone = idx < currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <li key={idx} className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold",
                                isDone
                                  ? "bg-primary text-primary-foreground"
                                  : isCurrent
                                  ? "bg-selected text-primary border border-primary font-bold"
                                  : "bg-sunken text-muted"
                              )}
                            >
                              {isDone ? <Check className="h-3 w-3" /> : idx + 1}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isCurrent ? "text-foreground font-semibold" : "text-muted"
                              )}
                            >
                              {step}
                            </span>
                            {idx < steps.length - 1 && (
                              <span className="h-px w-4 bg-border shrink-0" />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="shrink-0 px-6 py-3.5 border-t border-border bg-sunken flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
