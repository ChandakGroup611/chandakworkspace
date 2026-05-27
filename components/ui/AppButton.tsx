"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
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
      ...props
    },
    ref
  ) => {
    let isLight = false;
    try {
      const { theme } = useTheme();
      isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
    } catch (e) {}

    const baseStyles = 
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

    const variants = {
      primary: 
        "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 border border-cyan-500/30 font-semibold tracking-wide tactile-lift",
      secondary: isLight
        ? "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 shadow-sm"
        : "bg-white/10 text-white hover:bg-white/15 border border-white/10 shadow-sm",
      ghost: isLight
        ? "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        : "bg-transparent text-gray-400 hover:bg-white/5 hover:text-white",
      destructive: 
        "bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-500/30 shadow-lg shadow-rose-600/20 tactile-lift",
      outline: isLight
        ? "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        : "bg-transparent border border-white/20 text-gray-300 hover:bg-white/5 hover:text-white hover:border-white/30",
    };

    const sizes = {
      sm: "h-9 px-3 text-[0.8rem] gap-1.5 rounded-lg",
      md: "h-11 px-4 text-xs gap-2 rounded-xl",
      lg: "h-12 px-6 text-sm gap-2.5 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

AppButton.displayName = "AppButton";

