import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "custom";
  customColor?: string | null;
  isOutline?: boolean;
}

export const AppBadge = React.forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ className, variant = "neutral", customColor, isOutline = false, children, style, ...props }, ref) => {
    let theme = "glass-intelligence";
    try {
      const themeCtx = useTheme();
      theme = themeCtx.theme;
    } catch (e) {}
    const isLight = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

    const variants = {
      success: isOutline 
        ? "bg-transparent text-success border-success"
        : ("bg-success/10 text-success border-success/30"),
      warning: isOutline
        ? "bg-transparent text-warning border-warning"
        : ("bg-warning/10 text-warning border-warning/30"),
      danger: isOutline
        ? "bg-transparent text-danger border-danger"
        : ("bg-danger/10 text-danger border-danger/30"),
      info: isOutline
        ? "bg-transparent text-accent border-accent"
        : ("bg-accent/10 text-accent border-accent/30"),
      accent: isOutline
        ? "bg-transparent text-accent border-accent"
        : "bg-accent/10 text-accent border-accent/20",
      neutral: isOutline
        ? "bg-transparent text-gray-600 border-gray-400 dark:text-gray-300 dark:border-gray-500"
        : ("bg-elevated text-muted border-border"),
      custom: "" // Handled dynamically via style prop
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
          "theme-badge-structural inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase select-none transition-colors whitespace-nowrap",
          customColor ? "bg-transparent" : variants[variant],
          className
        )}
        style={{ ...dynamicStyle, ...style }}
        {...props}
      >
        {children}
      </span>
    );
  }
);

AppBadge.displayName = "AppBadge";

