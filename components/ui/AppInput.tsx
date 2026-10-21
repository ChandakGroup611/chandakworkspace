import React from "react";
import { cn } from "@/lib/utils";

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
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex flex-col space-y-1.5 w-full text-left">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-[13px] font-medium select-none flex items-center text-subtle"
          >
            <span>{label}</span>
            {required && <span className="text-danger-solid ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 z-10 flex items-center text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            suppressHydrationWarning={true}
            className={cn(
              "theme-input-structural",
              "h-[var(--control-h)] min-h-[var(--control-h)] w-full rounded-[var(--radius-input)] font-normal text-sm focus:outline-none transition-colors",
              "bg-surface text-foreground placeholder:text-muted",
              "border border-input focus:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              leftIcon ? "pl-9" : "pl-3",
              rightIcon ? "pr-9" : "pr-3",
              error ? "border-danger focus:border-danger focus-visible:ring-danger" : "",
              disabled ? "opacity-55 cursor-not-allowed bg-sunken" : "",
              className
            )}
            style={props.style}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-xs text-danger-text font-medium select-none pl-0.5">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-muted select-none pl-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

AppInput.displayName = "AppInput";
