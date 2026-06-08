import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "custom";
  customColor?: string | null;
}

export const AppBadge = React.forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ className, variant = "neutral", customColor, children, style, ...props }, ref) => {
    let theme = "glass-intelligence";
    try {
      const themeCtx = useTheme();
      theme = themeCtx.theme;
    } catch (e) {}
    const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);

    const variants = {
      success: isLight 
        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      warning: isLight 
        ? "bg-amber-50 text-amber-700 border-amber-200" 
        : "bg-amber-500/10 text-amber-400 border-amber-500/20",
      danger: isLight 
        ? "bg-rose-50 text-rose-700 border-rose-200" 
        : "bg-rose-500/10 text-rose-400 border-rose-500/20",
      info: isLight 
        ? "bg-blue-50 text-blue-700 border-blue-200" 
        : "bg-blue-500/10 text-blue-400 border-blue-500/20",
      neutral: isLight 
        ? "bg-gray-50 text-gray-700 border-gray-200" 
        : "bg-white/5 text-gray-300 border-white/10",
      custom: "" // Handled dynamically via style prop
    };

    const dynamicStyle = customColor ? {
      color: customColor,
      borderColor: customColor,
      backgroundColor: `${customColor}1A` // ~10% opacity
    } : {};

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold border tracking-wide uppercase select-none transition-colors",
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
