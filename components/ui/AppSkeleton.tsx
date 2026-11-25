import React from "react";
import { cn } from "@/lib/utils";

/* v1 used hard-coded slate-200 / slate-800, which looked wrong on warm and tinted themes. */
export const AppSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} aria-hidden className={cn("animate-pulse rounded-md bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]", className)} {...props} />
));
AppSkeleton.displayName = "AppSkeleton";

export function AppTableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="theme-table-structural w-full" role="status" aria-label="Loading">
      <div className="flex gap-4 border-b border-border bg-sunken px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => <AppSkeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-4 h-[var(--row-h,44px)] last:border-0">
          {Array.from({ length: cols }).map((_, c) => <AppSkeleton key={c} className={cn("h-3", c === 0 ? "w-16" : "flex-1")} />)}
        </div>
      ))}
    </div>
  );
}

export function AppCardSkeleton() {
  return (
    <div className="theme-card-structural w-full space-y-3 p-4" role="status" aria-label="Loading">
      <div className="flex items-center justify-between">
        <AppSkeleton className="h-3 w-24" />
        <AppSkeleton className="h-7 w-7 rounded-md" />
      </div>
      <AppSkeleton className="h-6 w-20" />
      <AppSkeleton className="h-2 w-full" />
    </div>
  );
}

/**
 * Page-shaped placeholder for list pages while data loads: title, a row of stat boxes,
 * a filter bar and table rows. Keeps the page's shape on screen instead of a spinner.
 */
export function ListPageSkeleton({ stats = 4, rows = 8, label = "Loading" }: { stats?: number; rows?: number; label?: string }) {
  return (
    <div className="w-full space-y-5 p-1" role="status" aria-live="polite" aria-label={label}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <AppSkeleton className="h-3 w-32" />
          <AppSkeleton className="h-6 w-56" />
        </div>
        <AppSkeleton className="h-9 w-28 rounded-[var(--radius-button)]" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="theme-card-structural space-y-2 p-4">
              <AppSkeleton className="h-3 w-20" />
              <AppSkeleton className="h-7 w-14" />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <AppSkeleton className="h-9 w-64" />
        <AppSkeleton className="h-9 w-28" />
        <AppSkeleton className="h-9 w-28" />
      </div>
      <AppTableSkeleton rows={rows} cols={6} />
      <span className="sr-only">{label}…</span>
    </div>
  );
}
