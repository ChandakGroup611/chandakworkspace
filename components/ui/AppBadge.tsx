import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "custom";
  customColor?: string | null;
  isOutline?: boolean;
  withPulse?: boolean;
}

export const AppBadge = React.forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ className, variant = "neutral", customColor, isOutline = false, withPulse = false, children, style, ...props }, ref) => {
    let theme = "glass-intelligence";
    try {
      const themeCtx = useTheme();
      theme = themeCtx.theme;
    } catch (e) {}
    const isLight = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

    const variants = {
      success: isOutline 
        ? "bg-transparent text-success border-success"
        : ("bg-success/10 text-success border-success/30"),
      warning: isOutline
        ? "bg-transparent text-theme-btn-secondary-text border-theme-btn-secondary-text"
        : ("bg-theme-btn-secondary/10 text-theme-btn-secondary-text border-theme-btn-secondary-text/30"),
      danger: isOutline
        ? "bg-transparent text-danger border-danger"
        : ("bg-danger/10 text-danger border-danger/30"),
      info: isOutline
        ? "bg-transparent text-theme-icon border-theme-btn-primary"
        : ("bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/30"),
      accent: isOutline
        ? "bg-transparent text-theme-icon border-theme-btn-primary"
        : "bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/20",
      neutral: isOutline
        ? "bg-transparent text-subtle border-border  dark:border-gray-500"
        : ("bg-elevated text-muted border-border"),
      custom: "" // Handled dynamically via style prop
    };

    const pulseColors = {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-theme-btn-primary",
      accent: "bg-theme-btn-primary",
      neutral: "bg-muted",
      custom: "bg-current"
    };

    const dynamicStyle = customColor ? {
      color: customColor,
      borderColor: customColor,
      backgroundColor: isOutline ? "transparent" : `${customColor}1A`
    } : {};

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wider uppercase select-none transition-all duration-200 whitespace-nowrap",
          customColor ? "bg-transparent" : variants[variant],
          className
        )}
        style={{ ...dynamicStyle, ...style }}
        {...props}
      >
        {withPulse && (
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", pulseColors[variant])} />
            <span className={cn("relative inline-flex rounded-full h-2 w-2", pulseColors[variant])} />
          </span>
        )}
        {children}
      </span>
    );
  }
);

AppBadge.displayName = "AppBadge";

