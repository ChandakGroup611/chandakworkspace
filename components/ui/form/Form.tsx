import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Form building blocks for every create/edit screen (Register Vehicle, New Requirement,
 * Drawing upload, Masters, Settings…). One label style, one error style, one grid.
 * Labels are sentence case (no global uppercase), errors sit under the field and are
 * announced, required fields get an asterisk, help text is muted.
 */

/** Titled group of fields. Use several per long form instead of one endless column. */
export function FormSection({ title, description, children, actions, className }: { title: string; description?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("theme-card-structural p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-heading">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Responsive field grid: 1 column on phones, `cols` from md up. */
export function FormGrid({ cols = 2, children, className }: { cols?: 1 | 2 | 3 | 4; children: React.ReactNode; className?: string }) {
  const map = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" } as const;
  return <div className={cn("grid grid-cols-1 gap-x-5 gap-y-4", map[cols], className)}>{children}</div>;
}

export interface FormFieldProps {
  label: string;
  /** id of the control inside; generated if omitted and passed to a single child via `id`. */
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  /** Span full grid width (textareas, address, remarks). */
  full?: boolean;
  className?: string;
  children: React.ReactElement;
}

/**
 * Wraps ANY control (native input/select/textarea, FormMultiSelect, date picker…) with the
 * standard label / hint / error and wires aria-invalid + aria-describedby onto the child.
 */
export function FormField({ label, htmlFor, required, hint, error, full, className, children }: FormFieldProps) {
  const auto = React.useId();
  const childProps = children.props as Record<string, unknown>;
  const id = htmlFor ?? (childProps.id as string | undefined) ?? auto;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [error ? errId : null, hint && !error ? hintId : null, childProps["aria-describedby"] as string | undefined].filter(Boolean).join(" ") || undefined;

  const control = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : childProps["aria-invalid"],
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  } as Record<string, unknown>);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", full && "md:col-span-full", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-subtle">
        {label}
        {required && <span className="ml-0.5 text-danger-text" aria-hidden>*</span>}
      </label>
      {control}
      {error ? (
        <p id={errId} role="alert" className="text-xs font-medium text-danger-text">{error}</p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const control = "theme-input-structural w-full text-[13.5px]";

export const AppSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string }>(
  ({ className, children, placeholder, ...props }, ref) => (
    <div className="relative w-full">
      <select ref={ref} className={cn(control, "h-[var(--control-h,36px)] appearance-none pl-3 pr-9", className)} {...props}>
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  )
);
AppSelect.displayName = "AppSelect";

export const AppTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { showCount?: boolean }>(
  ({ className, showCount, maxLength, value, ...props }, ref) => (
    <div className="relative w-full">
      <textarea ref={ref} maxLength={maxLength} value={value} className={cn(control, "min-h-[88px] resize-y px-3 py-2 leading-relaxed", className)} {...props} />
      {showCount && maxLength && (
        <span className="pointer-events-none absolute bottom-1.5 right-2.5 text-[11px] text-muted tabular">
          {String(value ?? "").length}/{maxLength}
        </span>
      )}
    </div>
  )
);
AppTextarea.displayName = "AppTextarea";

/** Checkbox / radio row with label + optional description. */
export function ChoiceRow({ type = "checkbox", label, description, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = React.useId();
  return (
    <label htmlFor={props.id ?? id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-md py-1", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <input id={props.id ?? id} type={type} className="mt-0.5 h-4 w-4 shrink-0" {...props} />
      <span>
        <span className="block text-[13.5px] text-foreground">{label}</span>
        {description && <span className="block text-[12.5px] text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** On/off switch (settings pages). */
export function AppSwitch({ checked, onCheckedChange, label, description, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <label htmlFor={id} className="block text-[13.5px] font-medium text-foreground">{label}</label>
        {description && <p className="text-[12.5px] text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-border-active"
        )}
      >
        {/* ui-audit-ignore-next-line switch knob is white on every theme */}
        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

/** Sticky footer for long forms: secondary left, primary right, always visible. */
export function FormActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-0 z-[var(--z-sticky)] -mx-1 mt-2 flex items-center justify-end gap-2 border-t border-border bg-background px-1 py-3", className)}>
      {children}
    </div>
  );
}
