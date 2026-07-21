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

    const baseStyles = 
      "theme-button-structural inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

    const variants = {
      primary: "theme-btn-primary bg-accent text-white hover:opacity-90",
      secondary: "theme-btn-secondary bg-surface text-foreground hover:bg-elevated",
      ghost: "theme-btn-ghost bg-transparent text-muted hover:bg-surface hover:text-foreground",
      destructive: "theme-btn-destructive bg-danger text-white hover:opacity-90",
      outline: "theme-btn-outline bg-transparent border-2 border-border text-muted hover:bg-surface hover:text-foreground",
    };

    const sizes = {
      sm: "min-h-[32px] py-1.5 px-3.5 text-[12px] gap-1.5",
      md: "min-h-[40px] py-2 px-5 text-[14px] gap-2",
      lg: "min-h-[44px] py-2.5 px-6 text-[15px] gap-2",
      icon: "h-10 w-10 px-0 gap-0 shrink-0",
      "icon-sm": "h-8 w-8 px-0 gap-0 shrink-0",
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
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

AppButton.displayName = "AppButton";

