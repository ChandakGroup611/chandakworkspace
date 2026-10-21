import React from "react";
import { cn } from "@/lib/utils";

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "custom";
  customColor?: string | null;
  isOutline?: boolean;
  /** Small status dot before the label. */
  withDot?: boolean;
  /** Animated dot — reserve for genuinely live states (e.g. "Live", "On trip"). */
  withPulse?: boolean;
  size?: "sm" | "md";
}

/*
 * Changes from v1
 * - `warning` used the secondary-button colour (emerald in dark themes, slate in light),
 *   so warnings looked like success. It now uses the warning tokens.
 * - `info` used the brand primary (plum). It now uses the info tokens.
 * - Text uses the *-text tokens, which pass 4.5:1 on the tinted background in every theme.
 * - Sentence case, medium weight, 6px radius: calmer than ALL-CAPS bold pills.
 * - No more useTheme() inside every badge.
 */
const solid: Record<string, string> = {
  success: "bg-success-soft text-success-text border-success-border",
  warning: "bg-warning-soft text-warning-text border-warning-border",
  danger: "bg-danger-soft text-danger-text border-danger-border",
  info: "bg-info-soft text-info-text border-info-border",
  accent: "bg-accent-soft text-accent-soft-text border-transparent",
  neutral: "bg-sunken text-subtle border-border",
  custom: "",
};
const outline: Record<string, string> = {
  success: "bg-transparent text-success-text border-success",
  warning: "bg-transparent text-warning-text border-warning",
  danger: "bg-transparent text-danger-text border-danger",
  info: "bg-transparent text-info-text border-info",
  accent: "bg-transparent text-accent-soft-text border-accent",
  neutral: "bg-transparent text-subtle border-border-active",
  custom: "",
};
const dot: Record<string, string> = {
  success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info",
  accent: "bg-accent", neutral: "bg-muted", custom: "bg-current",
};

const isHex = (c?: string | null): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c);

export const AppBadge = React.forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ className, variant = "neutral", customColor, isOutline = false, withDot = false, withPulse = false, size = "md", children, style, ...props }, ref) => {
    const custom = isHex(customColor)
      ? {
          color: `color-mix(in srgb, ${customColor} 80%, var(--text-primary))`,
          borderColor: `color-mix(in srgb, ${customColor} 40%, transparent)`,
          backgroundColor: isOutline ? "transparent" : `color-mix(in srgb, ${customColor} 12%, var(--bg-surface))`,
        }
      : undefined;
    const v = custom ? "custom" : variant;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium tabular",
          size === "sm" ? "px-1.5 py-0 text-[11px] leading-[18px]" : "px-2 py-0.5 text-xs leading-[18px]",
          isOutline ? outline[v] : solid[v],
          className
        )}
        style={{ ...custom, ...style }}
        {...props}
      >
        {(withDot || withPulse) && (
          <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
            {withPulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dot[v])} />}
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dot[v])} />
          </span>
        )}
        {children}
      </span>
    );
  }
);
AppBadge.displayName = "AppBadge";
