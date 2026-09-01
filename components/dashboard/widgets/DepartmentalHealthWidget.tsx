"use client";

import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import { Building2, TrendingUp, ShieldAlert, CheckCircle2, ArrowUpRight, BarChart3, Users } from "lucide-react";
import { AppBadge } from "@/components/ui/AppBadge";
import { DrillDownFilter } from "./MetricsListModal";

interface DepartmentalHealthWidgetProps {
  metrics?: any[];
  onDrillDown?: (filter: DrillDownFilter) => void;
}

export function DepartmentalHealthWidget({ metrics = [], onDrillDown }: DepartmentalHealthWidgetProps) {
  const departmentStats = useMemo(() => {
    const deptMap: Record<string, {
      name: string;
      total: number;
      active: number;
      resolved: number;
      escalated: number;
      breached: number;
      uniqueUsers: Set<string>;
    }> = {};

    metrics.forEach(m => {
      const dept = m.departmentName || "General / Unassigned";
      if (!deptMap[dept]) {
        deptMap[dept] = {
          name: dept,
          total: 0,
          active: 0,
          resolved: 0,
          escalated: 0,
          breached: 0,
          uniqueUsers: new Set()
        };
      }

      deptMap[dept].total++;
      if (m.user && m.user !== "Unassigned" && m.user !== "System") {
        deptMap[dept].uniqueUsers.add(m.user);
      }

      if (m.status === "Resolved") {
        deptMap[dept].resolved++;
      } else {
        deptMap[dept].active++;
        if (m.status === "Escalated") deptMap[dept].escalated++;
        if (m.isOverdue || m.slaBreached) deptMap[dept].breached++;
      }
    });

    const list = Object.values(deptMap).map(d => {
      const velocity = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
      const breachRate = d.active > 0 ? Math.round((d.breached / d.active) * 100) : 0;

      let health: "healthy" | "warning" | "critical" = "healthy";
      if (breachRate > 25 || d.breached >= 5) health = "critical";
      else if (breachRate > 10 || d.breached >= 2) health = "warning";

      return {
        ...d,
        userCount: d.uniqueUsers.size,
        velocity,
        breachRate,
        health
      };
    });

    // Sort by largest active workload first
    list.sort((a, b) => b.active - a.active);
    return list;
  }, [metrics]);

  return (
    <BaseWidget id="departmental-health" className="w-full theme-card-structural border border-border/80 rounded-2xl overflow-hidden p-0 relative shadow-sm">
      {/* Header */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-surface/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">Departmental & Cross-Functional Health</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-500">
                Org Matrix
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Comparative throughput, workload distribution, and SLA adherence by department</p>
          </div>
        </div>
      </div>

      {/* Grid of Department Cards */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-surface/5">
        {departmentStats.length > 0 ? (
          departmentStats.map((dept) => {
            const isClickable = !!onDrillDown;

            return (
              <div
                key={dept.name}
                onClick={() => {
                  if (isClickable) {
                    onDrillDown({
                      title: `${dept.name} Department Workload`,
                      description: `Active and resolved operational deliverables owned by ${dept.name}.`,
                      department: dept.name
                    });
                  }
                }}
                className={`p-4 rounded-xl border bg-surface/50 transition-all flex flex-col justify-between ${
                  dept.health === "critical"
                    ? "border-red-500/30 hover:border-red-500 hover:bg-danger/5"
                    : dept.health === "warning"
                    ? "border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5"
                    : "border-border/50 hover:border-primary/50 hover:bg-surface-hover/70"
                } ${isClickable ? "cursor-pointer group" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        dept.health === "critical" ? "bg-danger animate-ping" :
                        dept.health === "warning" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {dept.name}
                      </h3>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3" /> {dept.userCount} Member{dept.userCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-background/60 border border-border/40 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Active</div>
                      <div className="text-sm font-black text-foreground mt-0.5">{dept.active}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Done</div>
                      <div className="text-sm font-black text-emerald-500 mt-0.5">{dept.resolved}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Breached</div>
                      <div className={`text-sm font-black mt-0.5 ${dept.breached > 0 ? "text-danger" : "text-muted-foreground"}`}>
                        {dept.breached}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Throughput Progress */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground mb-1">
                      <span>Throughput Velocity</span>
                      <span>{dept.velocity}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                      <div
                        style={{ width: `${dept.velocity}%` }}
                        className={`h-full rounded-full transition-all ${
                          dept.velocity >= 70 ? "bg-emerald-500" : dept.velocity >= 40 ? "bg-blue-500" : "bg-amber-500"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {isClickable && (
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-primary">
                    <span>Inspect Department</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-3 p-8 text-center text-muted-foreground">
            <Building2 className="w-8 h-8 opacity-20 mx-auto mb-2" />
            <div className="text-xs font-semibold text-foreground">No departmental assignments found in scope</div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
