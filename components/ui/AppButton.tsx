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

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      onClick,
      type = "button",
      ...props
    },
    ref
  ) => {
    const [internalLoading, setInternalLoading] = React.useState(false);
    const showLoader = isLoading || internalLoading;

    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-[var(--radius-button)] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none [html:not([data-no-tactile])_&]:active:scale-[0.98]";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
      secondary: "bg-surface text-foreground border border-border-active hover:bg-surface-hover shadow-sm",
      ghost: "bg-transparent text-subtle hover:bg-surface-hover hover:text-foreground",
      destructive: "bg-danger-solid text-white hover:opacity-90 shadow-sm",
      outline: "bg-transparent border border-border text-foreground hover:bg-surface-hover hover:border-border-active shadow-sm",
      link: "bg-transparent text-primary hover:underline p-0 h-auto border-0 shadow-none [html:not([data-no-tactile])_&]:active:scale-100",
    };

    const sizes = {
      sm: "min-h-[var(--control-h-sm)] h-[var(--control-h-sm)] py-1 px-2.5 text-[12px] gap-1.5",
      md: "min-h-[var(--control-h)] h-[var(--control-h)] py-1.5 px-3 text-[13px] gap-2",
      lg: "min-h-[40px] h-[40px] py-2.5 px-4 text-[14px] gap-2",
      icon: "h-[var(--control-h)] w-[var(--control-h)] p-0 gap-0 shrink-0",
      "icon-sm": "h-[var(--control-h-sm)] w-[var(--control-h-sm)] p-0 gap-0 shrink-0",
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        const result = onClick(e) as any;
        if (result instanceof Promise) {
          setInternalLoading(true);
          result
            .catch((err) => {
              console.error("[AppButton] Async action error:", err);
            })
            .finally(() => {
              setInternalLoading(false);
            });
        }
      }
    };

    return (
      <button
        type={type}
        ref={ref}
        disabled={disabled || showLoader}
        aria-busy={showLoader}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        onClick={handleClick}
        {...props}
      >
        {showLoader && <Loader2 className="h-3.5 w-3.5 animate-spin text-current shrink-0" />}
        {!showLoader && leftIcon}
        {children}
        {!showLoader && rightIcon}
      </button>
    );
  }
);

AppButton.displayName = "AppButton";
