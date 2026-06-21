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
    const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

    const variants = {
      success: isOutline 
        ? "bg-transparent text-emerald-600 border-emerald-600 dark:text-emerald-400 dark:border-emerald-500"
        : (isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),
      warning: isOutline
        ? "bg-transparent text-amber-600 border-amber-600 dark:text-amber-400 dark:border-amber-500"
        : (isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/10 text-amber-400 border-amber-500/20"),
      danger: isOutline
        ? "bg-transparent text-rose-600 border-rose-600 dark:text-rose-400 dark:border-rose-500"
        : (isLight ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-rose-500/10 text-rose-400 border-rose-500/20"),
      info: isOutline
        ? "bg-transparent text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-500"
        : (isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20"),
      accent: isOutline
        ? "bg-transparent text-accent border-accent"
        : "bg-accent/10 text-accent border-accent/20",
      neutral: isOutline
        ? "bg-transparent text-gray-600 border-gray-400 dark:text-gray-300 dark:border-gray-500"
        : (isLight ? "bg-gray-50 text-gray-700 border-gray-200" : "bg-white/5 text-gray-300 border-white/10"),
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
          "inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase select-none transition-colors",
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
