import React from "react";
import { cn } from "@/lib/utils";

/**
 * Priority is a scale, not an alarm. v1 drew every priority as a red outlined ALL-CAPS
 * pill, so a page full of "HIGH" looked like a page full of errors and red lost its
 * meaning for real problems (overdue, breached).
 * Now: a small coloured bar + plain text. Only Critical/Urgent uses danger red.
 */
const LEVELS: Record<string, { rank: number; label: string; cls: string }> = {
  critical: { rank: 4, label: "Critical", cls: "bg-danger" },
  urgent:   { rank: 4, label: "Urgent",   cls: "bg-danger" },
  p0:       { rank: 4, label: "P0",       cls: "bg-danger" },
  high:     { rank: 3, label: "High",     cls: "bg-warning" },
  p1:       { rank: 3, label: "P1",       cls: "bg-warning" },
  medium:   { rank: 2, label: "Medium",   cls: "bg-info" },
  normal:   { rank: 2, label: "Normal",   cls: "bg-info" },
  p2:       { rank: 2, label: "P2",       cls: "bg-info" },
  low:      { rank: 1, label: "Low",      cls: "bg-muted" },
  p3:       { rank: 1, label: "P3",       cls: "bg-muted" },
};

export function priorityRank(p?: string | null) {
  return p ? LEVELS[p.trim().toLowerCase()]?.rank ?? 0 : 0;
}

export function PriorityIndicator({ priority, className }: { priority?: string | null; className?: string }) {
  if (!priority) return <span className="text-muted">—</span>;
  const lvl = LEVELS[priority.trim().toLowerCase()];
  const label = lvl?.label ?? priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  const rank = lvl?.rank ?? 0;
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-foreground", className)}>
      {/* 3 stacked bars: filled up to the rank, so priority is readable without colour too */}
      <span className="inline-flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-[1px]", i === 1 ? "h-[6px]" : i === 2 ? "h-[9px]" : "h-[12px]", lvl && rank >= i ? lvl.cls : "bg-border-active")}
          />
        ))}
      </span>
      <span className={cn(rank === 4 && "font-semibold text-danger-text")}>{label}</span>
    </span>
  );
}
