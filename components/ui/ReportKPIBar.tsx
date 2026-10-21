"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ReportKPI {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function ReportKPIBar({
  kpis,
  className,
  variant = "default",
}: {
  kpis: ReportKPI[];
  className?: string;
  variant?: "default" | "compact";
}) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div
      className={cn(
        variant === "default"
          ? "flex items-center overflow-x-auto hide-scrollbar flex-nowrap sm:flex-wrap pb-1 sm:pb-0 max-w-full gap-3 sm:gap-4 mb-4"
          : "grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto",
        className
      )}
    >
      {kpis.map((kpi, idx) => {
        const isClickable = Boolean(kpi.onClick);
        const Component = isClickable ? "button" : "div";

        return (
          <Component
            key={idx}
            type={isClickable ? "button" : undefined}
            onClick={kpi.onClick}
            className={cn(
              "flex items-center text-left bg-surface border border-border shadow-xs transition-colors duration-150 select-none min-w-0 group",
              isClickable && "cursor-pointer hover:bg-surface-hover hover:border-border-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              kpi.isActive && "ring-2 ring-primary border-primary bg-accent-soft",
              variant === "default"
                ? "gap-3 px-3.5 py-2.5 rounded-xl min-w-[140px] sm:min-w-[170px] shrink-0"
                : "gap-2 px-2.5 py-1.5 rounded-lg sm:min-w-[85px] w-full sm:w-auto justify-start"
            )}
          >
            {kpi.icon && (
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg shrink-0",
                  variant === "default" ? "p-2 rounded-xl" : "p-1.5",
                  kpi.iconBgClass || "bg-accent-soft",
                  kpi.iconColorClass || "text-primary"
                )}
              >
                <div className={variant === "compact" ? "scale-75" : ""}>{kpi.icon}</div>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  "font-medium text-muted truncate transition-colors group-hover:text-foreground",
                  variant === "default" ? "text-xs" : "text-[11px] leading-tight"
                )}
              >
                {kpi.label}
              </span>
              <span
                className={cn(
                  "font-semibold text-foreground leading-tight truncate tabular-nums",
                  variant === "default" ? "text-xl sm:text-2xl" : "text-sm sm:text-base"
                )}
              >
                {kpi.value}
              </span>
            </div>
          </Component>
        );
      })}
    </div>
  );
}
export default ReportKPIBar;
