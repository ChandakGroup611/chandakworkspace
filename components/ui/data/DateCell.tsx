import React from "react";
import { cn } from "@/lib/utils";
import { formatDate, toIsoDate, dueState, dueHint } from "./format";

/** Plain date: "16 Oct 2026". Same format in every column. */
export function DateCell({ value, className }: { value: unknown; className?: string }) {
  const iso = toIsoDate(value);
  if (!iso) return <span className="text-muted">—</span>;
  return (
    <time dateTime={iso} className={cn("whitespace-nowrap tabular text-foreground", className)}>
      {formatDate(value)}
    </time>
  );
}

/**
 * Due date with state: overdue in danger text, due today/soon in warning text, plus a short
 * hint ("Overdue 3d", "In 2d"). Pass `done` for completed/closed rows so they never show overdue.
 */
export function DueDateCell({ value, done, soonDays = 3, className }: { value: unknown; done?: boolean; soonDays?: number; className?: string }) {
  const iso = toIsoDate(value);
  if (!iso) return <span className="text-muted">—</span>;
  const state = dueState(value, { done, soonDays });
  const hint = dueHint(value, { done });
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <time
        dateTime={iso}
        className={cn(
          "whitespace-nowrap tabular",
          state === "overdue" ? "font-medium text-danger-text" : state === "today" || state === "soon" ? "text-warning-text" : "text-foreground",
          done && "text-muted"
        )}
      >
        {formatDate(value)}
      </time>
      {hint && (state === "overdue" || state === "today" || state === "soon") && (
        <span className={cn("text-[11.5px]", state === "overdue" ? "text-danger-text" : "text-warning-text")}>{hint}</span>
      )}
    </span>
  );
}
