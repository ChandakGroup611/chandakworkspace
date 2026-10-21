import React from "react";
import { cn } from "@/lib/utils";

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Marks the label with a required asterisk (also sets `required`). */
  requiredMark?: boolean;
}

/*
 * Changes from v1
 * - Error is announced to screen readers (aria-invalid + aria-describedby) and shown
 *   under the field, not squeezed into the label row.
 * - Typed text is regular weight (v1 forced 600 via .theme-data-value).
 * - Placeholder uses muted text. In v1 dark themes, muted == near-white, so
 *   placeholders looked like real values.
 * - Height follows density.
 */
export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ className, label, helperText, error, leftIcon, rightIcon, id, disabled, requiredMark, required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helpId = `${inputId}-help`;
    const errId = `${inputId}-error`;
    const describedBy = [error ? errId : null, !error && helperText ? helpId : null, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex w-full flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-subtle">
            {label}
            {(requiredMark || required) && <span className="ml-0.5 text-danger-text" aria-hidden>*</span>}
          </label>
        )}

        <div className="relative flex w-full items-center">
          {leftIcon && <span className="pointer-events-none absolute left-3 flex items-center text-muted">{leftIcon}</span>}
          <input
            {...props}
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "theme-input-structural w-full h-[var(--control-h,36px)] text-[13.5px] placeholder:text-muted",
              leftIcon ? "pl-9" : "pl-3",
              rightIcon ? "pr-9" : "pr-3",
              className
            )}
          />
          {rightIcon && <span className="absolute right-3 flex items-center text-muted">{rightIcon}</span>}
        </div>

        {error ? (
          <p id={errId} role="alert" className="text-xs font-medium text-danger-text">{error}</p>
        ) : helperText ? (
          <p id={helpId} className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
AppInput.displayName = "AppInput";
