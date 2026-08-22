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
      "inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-btn-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

    const variants = {
      primary: "bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-sm",
      secondary: "bg-surface text-foreground hover:bg-surface-hover border border-border shadow-sm",
      ghost: "bg-transparent text-muted hover:bg-surface-hover hover:text-foreground",
      destructive: "bg-danger text-white hover:bg-danger/90 shadow-sm",
      outline: "bg-transparent border border-border text-foreground hover:bg-surface-hover shadow-sm",
    };

    const sizes = {
      sm: "min-h-[28px] py-1 px-2.5 text-[12px] gap-1.5",
      md: "min-h-[32px] py-1.5 px-3 text-[13px] gap-2",
      lg: "min-h-[40px] py-2.5 px-4 text-[14px] gap-2",
      icon: "h-8 w-8 px-0 gap-0 shrink-0",
      "icon-sm": "h-6 w-6 px-0 gap-0 shrink-0",
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

