import React from "react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../data/format";
import type { StatusTone } from "../data/StatusBadge";

/** Audit trail / comments / approvals history, newest first. */
export interface ActivityItem {
  id: string | number;
  who?: string | null;
  action: React.ReactNode; // "changed status to Approved"
  at: unknown;             // any date format format.ts understands
  note?: React.ReactNode;  // comment body / remarks
  tone?: StatusTone;
}

const DOT: Record<StatusTone, string> = {
  neutral: "bg-muted", info: "bg-info", accent: "bg-primary", warning: "bg-warning", success: "bg-success", danger: "bg-danger",
};

export function ActivityTimeline({ items, className, emptyLabel = "No activity yet." }: { items: ActivityItem[]; className?: string; emptyLabel?: string }) {
  if (!items.length) return <p className="text-[13px] text-muted">{emptyLabel}</p>;
  return (
    <ol className={cn("relative space-y-4 border-l border-border pl-5", className)}>
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className={cn("absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface", DOT[it.tone ?? "neutral"])} aria-hidden />
          <p className="text-[13px] text-foreground">
            {it.who && <span className="font-semibold">{it.who} </span>}
            {it.action}
          </p>
          <p className="text-[12px] text-muted">{formatDateTime(it.at)}</p>
          {it.note && <div className="mt-1.5 rounded-md border border-border bg-sunken px-3 py-2 text-[13px] text-subtle">{it.note}</div>}
        </li>
      ))}
    </ol>
  );
}
