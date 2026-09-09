"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
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
      onClick,
      ...props
    },
    ref
  ) => {
    const [internalLoading, setInternalLoading] = React.useState(false);

    const baseStyles = 
      "inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-btn-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

    const variants = {
      primary: "bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 hover:shadow-md active:shadow-xs shadow-xs",
      secondary: "bg-surface text-foreground hover:bg-surface-hover hover:border-border-active border border-border shadow-2xs",
      ghost: "bg-transparent text-muted hover:bg-surface-hover hover:text-foreground",
      destructive: "bg-danger text-white hover:bg-danger/90 hover:shadow-md shadow-xs",
      outline: "bg-transparent border border-border text-foreground hover:bg-surface-hover hover:border-border-active shadow-2xs",
    };

    const sizes = {
      sm: "min-h-[28px] py-1 px-2.5 text-[12px] gap-1.5",
      md: "min-h-[32px] py-1.5 px-3 text-[13px] gap-2",
      lg: "min-h-[40px] py-2.5 px-4 text-[14px] gap-2",
      icon: "h-8 w-8 px-0 gap-0 shrink-0",
      "icon-sm": "h-6 w-6 px-0 gap-0 shrink-0",
    };

    const showLoader = isLoading || internalLoading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        const text = (e.currentTarget?.textContent || "").toLowerCase();
        const result = onClick(e) as any;
        if (result instanceof Promise) {
          setInternalLoading(true);
          result
            .then(() => {
              if (text.includes('delete') || text.includes('remove')) {
                toast.success('Record Deleted Successfully');
              } else if (text.includes('update') || text.includes('save')) {
                toast.success('Record Saved Successfully');
              } else if (text.includes('create') || text.includes('add') || text.includes('new')) {
                toast.success('Record Created Successfully');
              } else if (text.includes('approve') || text.includes('accept')) {
                toast.success('Approved Successfully');
              } else if (text.includes('reject')) {
                toast.success('Rejected Successfully');
              } else if (text.includes('sign off')) {
                toast.success('Signed Off Successfully');
              }
            })
            .catch((err) => {
              console.error("[AppButton] Async action error:", err);
            })
            .finally(() => {
              setInternalLoading(false);
            });
        }
      }
    };

    return (
      <button
        type={props.type || "button"}
        ref={ref}
        disabled={disabled || showLoader}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        onClick={handleClick}
        {...props}
      >
        {showLoader && <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />}
        {!showLoader && leftIcon}
        {children}
        {!showLoader && rightIcon}
      </button>
    );
  }
);

AppButton.displayName = "AppButton";

