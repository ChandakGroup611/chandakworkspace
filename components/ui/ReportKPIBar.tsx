import React from "react";
import { cn } from "@/lib/utils";

export interface ReportKPI {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
}

export function ReportKPIBar({ kpis, className, variant = "default" }: { kpis: ReportKPI[], className?: string, variant?: "default" | "compact" }) {
  if (!kpis || kpis.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center", variant === "default" ? "gap-4 mb-4" : "gap-2", className)}>
      {kpis.map((kpi, idx) => {
        return (
          <div 
            key={idx} 
            className={cn(
              "flex items-center bg-surface border border-border shadow-sm",
              variant === "default" 
                ? "gap-4 px-4 py-3 rounded-xl min-w-[180px]" 
                : "gap-2 px-2 py-1 rounded-md min-w-[80px]"
            )}
          >
            {kpi.icon && (
              <div className={cn("flex items-center justify-center rounded-lg", variant === "default" ? "p-2.5 rounded-xl" : "p-1", kpi.iconBgClass || "bg-accent/10", kpi.iconColorClass || "text-accent")}>
                <div className={variant === "compact" ? "scale-50" : ""}>{kpi.icon}</div>
              </div>
            )}
            <div className="flex flex-col">
              <span className={cn("font-bold text-muted uppercase tracking-wider", variant === "default" ? "text-[10px] gap-1" : "text-[8px] leading-tight")}>{kpi.label}</span>
              <span className={cn("font-extrabold text-accent leading-none", variant === "default" ? "text-2xl" : "text-[13px]")}>{kpi.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
