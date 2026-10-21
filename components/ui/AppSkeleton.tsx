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
