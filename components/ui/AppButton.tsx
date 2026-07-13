"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
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
      ...props
    },
    ref
  ) => {
    let isLight = false;
    try {
      const { theme } = useTheme();
      isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
    } catch (e) {}

    const baseStyles = 
      "inline-flex items-center justify-center font-medium rounded-[var(--radius-button,6px)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

    const variants = {
      primary: 
        "bg-accent text-white hover:opacity-90 shadow-sm border border-black/10 dark:border-white/10",
      secondary: "bg-white border border-border text-foreground hover:bg-elevated shadow-sm",
      ghost: "bg-transparent border border-border text-muted hover:bg-elevated hover:text-foreground",
      destructive: 
        "bg-rose-600 text-white hover:bg-rose-700 border border-rose-500/30",
      outline: "bg-transparent border border-border text-muted hover:bg-elevated hover:text-foreground",
    };

    const sizes = {
      sm: "h-8 px-3.5 text-[12px] gap-1.5",
      md: "h-10 px-5 text-[14px] gap-2",
      lg: "h-11 px-6 text-[15px] gap-2",
      icon: "h-10 w-10 px-0 gap-0",
      "icon-sm": "h-8 w-8 px-0 gap-0",
    };

    return (
      <button
        type={props.type || "button"}
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

