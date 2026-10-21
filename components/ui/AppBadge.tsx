import React from "react";
import { cn } from "@/lib/utils";

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "custom";
  customColor?: string | null;
  isOutline?: boolean;
  withPulse?: boolean;
  withDot?: boolean;
}

export const AppBadge = React.forwardRef<HTMLSpanElement, AppBadgeProps>(
  (
    {
      className,
      variant = "neutral",
      customColor,
      isOutline = false,
      withPulse = false,
      withDot = false,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const variants = {
      success: isOutline
        ? "bg-transparent text-success-text border-success-border"
        : "bg-success-soft text-success-text border-success-border",
      warning: isOutline
        ? "bg-transparent text-warning-text border-warning-border"
        : "bg-warning-soft text-warning-text border-warning-border",
      danger: isOutline
        ? "bg-transparent text-danger-text border-danger-border"
        : "bg-danger-soft text-danger-text border-danger-border",
      info: isOutline
        ? "bg-transparent text-info-text border-info-border"
        : "bg-info-soft text-info-text border-info-border",
      accent: isOutline
        ? "bg-transparent text-accent-soft-text border-border-active"
        : "bg-accent-soft text-accent-soft-text border-transparent",
      neutral: isOutline
        ? "bg-transparent text-subtle border-border"
        : "bg-sunken text-subtle border-border",
      custom: "",
    };

    const dotColors = {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      accent: "bg-accent",
      neutral: "bg-muted",
      custom: "bg-current",
    };

    const isValidHex = typeof customColor === "string" && /^#[0-9a-fA-F]{6}$/.test(customColor);
    const dynamicStyle: React.CSSProperties = isValidHex
      ? {
          color: customColor,
          borderColor: isOutline ? customColor : `color-mix(in srgb, ${customColor} 30%, var(--bg-surface))`,
          backgroundColor: isOutline ? "transparent" : `color-mix(in srgb, ${customColor} 12%, var(--bg-surface))`,
        }
      : {};

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-[6px] text-xs font-medium border select-none transition-colors whitespace-nowrap",
          isValidHex ? "" : variants[variant],
          className
        )}
        style={{ ...dynamicStyle, ...style }}
        {...props}
      >
        {withDot && !withPulse && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])}
            style={isValidHex ? { backgroundColor: customColor } : undefined}
          />
        )}
        {withPulse && (
          <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
            <span
              className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColors[variant])}
              style={isValidHex ? { backgroundColor: customColor } : undefined}
            />
            <span
              className={cn("relative inline-flex rounded-full h-2 w-2", dotColors[variant])}
              style={isValidHex ? { backgroundColor: customColor } : undefined}
            />
          </span>
        )}
        {children}
      </span>
    );
  }
);

AppBadge.displayName = "AppBadge";
