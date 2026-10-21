"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline" | "link";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/*
 * Changes from v1
 * - No hover lift / translate: buttons in toolbars and table rows no longer jump.
 * - Hover colours use real tokens (v1 used `hover:bg-surface-hover`, which did not exist,
 *   so ghost/secondary/outline buttons had no hover state at all).
 * - Destructive uses --danger-solid (white text passes AA in every theme; v1's light
 *   theme had white on #fb7185 = 2.7:1).
 * - Heights follow density (--control-h); aria-busy while loading.
 */
const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "rounded-[var(--radius-button)] transition-[background-color,border-color,color,box-shadow] duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
  "disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98] disabled:active:scale-100 " +
  "[[data-no-tactile]_&]:active:scale-100";

const variants: Record<NonNullable<AppButtonProps["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secondary: "bg-surface text-foreground border border-border-active shadow-sm hover:bg-surface-hover",
  outline: "bg-transparent text-foreground border border-border-active hover:bg-surface-hover",
  ghost: "bg-transparent text-subtle hover:bg-surface-hover hover:text-foreground",
  destructive: "bg-danger-solid text-white shadow-sm hover:brightness-95",
  link: "bg-transparent text-accent-soft-text underline-offset-4 hover:underline px-0 h-auto min-h-0",
};

const sizes: Record<NonNullable<AppButtonProps["size"]>, string> = {
  sm: "h-[var(--control-h-sm,30px)] px-2.5 text-[12.5px]",
  md: "h-[var(--control-h,36px)] px-3.5 text-[13.5px]",
  lg: "h-10 px-4 text-[14px]",
  icon: "h-[var(--control-h,36px)] w-[var(--control-h,36px)] p-0",
  "icon-sm": "h-7 w-7 p-0",
};

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, leftIcon, rightIcon, children, disabled, onClick, type, ...props }, ref) => {
    const [internalLoading, setInternalLoading] = React.useState(false);
    const busy = isLoading || internalLoading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick) return;
      const result = onClick(e) as unknown;
      if (result instanceof Promise) {
        setInternalLoading(true);
        result
          .catch((err) => console.error("[AppButton] async action failed:", err))
          .finally(() => setInternalLoading(false));
      }
    };

    return (
      <button
        {...props}
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className={cn(base, variants[variant], sizes[size], className)}
        onClick={handleClick}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : leftIcon}
        {children}
        {!busy && rightIcon}
      </button>
    );
  }
);
AppButton.displayName = "AppButton";
