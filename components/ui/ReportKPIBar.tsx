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

export function ReportKPIBar({ kpis, className, variant = "default" }: { kpis: ReportKPI[], className?: string, variant?: "default" | "compact" }) {
  if (!kpis || kpis.length === 0) return null;
  return (
    <div className={cn("flex items-center overflow-x-auto hide-scrollbar flex-nowrap sm:flex-wrap pb-1 sm:pb-0 max-w-full", variant === "default" ? "gap-3 sm:gap-4 mb-4" : "gap-2", className)}>
      {kpis.map((kpi, idx) => {
        return (
          <div 
            key={idx} 
            onClick={kpi.onClick}
            className={cn(
              "flex items-center bg-surface border border-border shadow-xs transition-all shrink-0 select-none",
              kpi.onClick && "cursor-pointer hover:shadow-md hover:border-theme-btn-primary/50",
              kpi.isActive && "ring-2 ring-theme-btn-primary border-theme-btn-primary bg-theme-btn-primary/5",
              variant === "default" 
                ? "gap-3 px-3.5 py-2.5 rounded-xl min-w-[140px] sm:min-w-[170px]" 
                : "gap-2 px-2 py-1 rounded-md min-w-[80px]"
            )}
            role={kpi.onClick ? "button" : undefined}
          >
            {kpi.icon && (
              <div className={cn("flex items-center justify-center rounded-lg shrink-0", variant === "default" ? "p-2 rounded-xl" : "p-1", kpi.iconBgClass || "bg-theme-btn-primary/10", kpi.iconColorClass || "text-theme-icon")}>
                <div className={variant === "compact" ? "scale-50" : ""}>{kpi.icon}</div>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className={cn("font-bold text-muted uppercase tracking-wider truncate", variant === "default" ? "text-[10px] gap-1" : "text-[8px] leading-tight")}>{kpi.label}</span>
              <span className={cn("font-extrabold text-theme-icon leading-none truncate", variant === "default" ? "text-xl sm:text-2xl" : "text-[13px]")}>{kpi.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
