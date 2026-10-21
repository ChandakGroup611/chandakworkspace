"use client";

/**
 * Accessible tabs without an extra dependency. Two looks:
 *  - "underline": page-level sections (Detail / Activity / Documents)
 *  - "segmented": view switches inside a card (All / Mine / Unassigned)
 * Arrow keys move between tabs (roving tabindex), Home/End jump. Counts are tabular.
 * Replaces the hand-made tab rows that each module styled differently.
 */
import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem { id: string; label: string; count?: number; disabled?: boolean }

export function AppTabs({
  items,
  value,
  onValueChange,
  variant = "underline",
  idPrefix,
  className,
  "aria-label": ariaLabel,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  variant?: "underline" | "segmented";
  /** Used to link tabs to <AppTabPanel id=…>. */
  idPrefix?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const auto = React.useId();
  const prefix = idPrefix ?? auto;
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.filter((i) => !i.disabled);

  const move = (delta: number | "home" | "end") => {
    const cur = enabled.findIndex((i) => i.id === value);
    const next = delta === "home" ? 0 : delta === "end" ? enabled.length - 1 : (cur + delta + enabled.length) % enabled.length;
    const target = enabled[next];
    if (!target) return;
    onValueChange(target.id);
    refs.current[items.indexOf(target)]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        variant === "underline" ? "flex gap-1 overflow-x-auto border-b border-border" : "inline-flex gap-0.5 rounded-lg border border-border bg-sunken p-0.5",
        className
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
        else if (e.key === "Home") { e.preventDefault(); move("home"); }
        else if (e.key === "End") { e.preventDefault(); move("end"); }
      }}
    >
      {items.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${t.id}`}
            aria-selected={on}
            aria-controls={`${prefix}-panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onValueChange(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              variant === "underline"
                ? cn("-mb-px border-b-2 px-3 py-2.5", on ? "border-primary font-semibold text-foreground" : "border-transparent font-medium text-muted hover:text-foreground")
                : cn("h-8 rounded-md px-3", on ? "bg-surface font-semibold text-foreground shadow-sm" : "font-medium text-muted hover:text-foreground")
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className={cn("rounded px-1.5 text-[11.5px] leading-[18px] tabular", on ? "bg-accent-soft text-accent-soft-text" : "bg-sunken text-muted")}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AppTabPanel({ idPrefix, id, active, children, className }: { idPrefix: string; id: string; active: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} hidden={!active} tabIndex={0} className={cn("outline-none", className)}>
      {active ? children : null}
    </div>
  );
}
