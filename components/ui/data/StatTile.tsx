import React from "react";
import { cn } from "@/lib/utils";
import { formatCount } from "./format";

/**
 * KPI tile that doubles as a quick filter (Total / Open / In progress / Completed).
 * v1: 10px ALL-CAPS labels, small numbers, four different icon colours, and the selected
 * tile marked only by a thick teal border hard-coded outside the theme.
 * Now: sentence-case label, 22px tabular number, one accent for "selected" (with
 * aria-pressed), status tones only where the number means something.
 */
export type StatTone = "neutral" | "info" | "accent" | "warning" | "success" | "danger";

const ICON_TONE: Record<StatTone, string> = {
  neutral: "bg-sunken text-subtle",
  info: "bg-info-soft text-info-text",
  accent: "bg-accent-soft text-accent-soft-text",
  warning: "bg-warning-soft text-warning-text",
  success: "bg-success-soft text-success-text",
  danger: "bg-danger-soft text-danger-text",
};

export interface StatTileProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  tone?: StatTone;
  hint?: React.ReactNode;
  /** When provided the tile becomes a toggle button (quick filter). */
  onSelect?: () => void;
  selected?: boolean;
  className?: string;
}

export function StatTile({ label, value, icon, tone = "neutral", hint, onSelect, selected, className }: StatTileProps) {
  const body = (
    <>
      {icon && <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-[18px] [&_svg]:w-[18px]", ICON_TONE[tone])} aria-hidden>{icon}</span>}
      <span className="min-w-0 text-left">
        <span className="block text-[12.5px] text-muted">{label}</span>
        <span className="block text-[22px] font-semibold leading-tight tracking-[-0.01em] text-heading tabular">
          {typeof value === "number" ? formatCount(value) : value}
        </span>
        {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      </span>
    </>
  );

  const base = "flex min-w-[148px] items-center gap-3 rounded-[10px] border bg-surface px-3.5 py-3 shadow-sm";
  if (!onSelect) return <div className={cn(base, "border-border", className)}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={!!selected}
      className={cn(
        base,
        "transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-active",
        className
      )}
    >
      {body}
    </button>
  );
}

/** Row of tiles that wraps on small screens instead of overflowing the header. */
export function StatTileRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:flex sm:flex-wrap", className)}>{children}</div>;
}
