import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    // Generate unique ID fallback if not provided for accessibility bonding
    const generatedId = React.useId();
    const inputId = id || generatedId;

    let isLight = false;
    try {
      const { theme } = useTheme();
      isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
    } catch (e) {}

    return (
      <div className="flex flex-col space-y-1.5 w-full text-left">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-xs font-semibold tracking-wide select-none flex items-center justify-between text-foreground"
          >
            <span>{label}</span>
            {error && <span className="text-xs text-danger font-medium">{error}</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              "h-8 w-full rounded-[var(--radius-input,4px)] border text-[13px] focus:outline-none transition-all duration-150",
              "bg-surface border-border text-foreground placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent",
              leftIcon ? "pl-10" : "pl-3",
              rightIcon ? "pr-10" : "pr-3.5",
              error ? "border-danger focus:border-danger bg-danger/[0.02]" : "",
              disabled ? "opacity-50 cursor-not-allowed" : "",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {!error && helperText && (
          <p className="text-[0.8rem] text-gray-500 font-medium select-none pl-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AppInput.displayName = "AppInput";
