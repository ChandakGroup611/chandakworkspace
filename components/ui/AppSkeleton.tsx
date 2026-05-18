import React from "react";
import { cn } from "@/lib/utils";

export interface AppSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AppSkeleton = React.forwardRef<HTMLDivElement, AppSkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-xl bg-white/[0.04] transition-opacity duration-300",
          className
        )}
        {...props}
      />
    );
  }
);
AppSkeleton.displayName = "AppSkeleton";

// Intelligent compound skeleton template for enterprise table rows
export function AppTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2">
      <div className="h-8 w-full rounded-lg bg-white/[0.02] border border-white/5 animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.01] border border-white/5">
          <AppSkeleton className="h-4 w-12 rounded-md" />
          <AppSkeleton className="h-4 flex-1 rounded-md" />
          <AppSkeleton className="h-4 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// Intelligent compound skeleton template for Bento KPI metrics
export function AppCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4 w-full">
      <div className="flex items-center justify-between">
        <AppSkeleton className="h-3 w-24 rounded" />
        <AppSkeleton className="h-8 w-8 rounded-xl" />
      </div>
      <div className="space-y-2 pt-2">
        <AppSkeleton className="h-6 w-16 rounded" />
        <AppSkeleton className="h-2 w-full rounded" />
      </div>
    </div>
  );
}
