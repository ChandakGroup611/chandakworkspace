"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { BarChart3, PieChart as PieChartIcon, Activity, Flame, ShieldAlert, Clock, Layers } from "lucide-react";
import { PortfolioItem } from "@/lib/actions/portfolioMetrics";

interface PortfolioChartsProps {
  items: PortfolioItem[];
}

const STATUS_COLORS: Record<string, string> = {
  Active: "var(--accent, #6366f1)",
  Review: "var(--amber, #f59e0b)",
  Escalated: "var(--red, #ef4444)",
  Resolved: "var(--emerald, #10b981)",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#3b82f6",
  Standard: "#8b5cf6",
  "N/A": "#64748b"
};

const STATE_COLORS: Record<string, string> = {
  Open: "var(--accent, #6366f1)",
  Overdue: "var(--red, #ef4444)",
  Upcoming: "var(--amber, #f59e0b)",
  Resolved: "var(--emerald, #10b981)"
};

export function PortfolioCharts({ items = [] }: PortfolioChartsProps) {
  const [statusChartType, setStatusChartType] = useState<"bar" | "pie">("bar");
  const [priorityChartType, setPriorityChartType] = useState<"bar" | "pie">("bar");

  // 1. Status-wise distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { Active: 0, Review: 0, Escalated: 0, Resolved: 0 };
    items.forEach((item) => {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      } else {
        counts.Active++;
      }
    });

    return [
      { name: "Active", value: counts.Active, fill: STATUS_COLORS.Active },
      { name: "In Review", value: counts.Review, fill: STATUS_COLORS.Review },
      { name: "Escalated", value: counts.Escalated, fill: STATUS_COLORS.Escalated },
      { name: "Resolved", value: counts.Resolved, fill: STATUS_COLORS.Resolved }
    ].filter(d => d.value > 0 || statusChartType === "bar");
  }, [items, statusChartType]);

  // 2. Priority-wise breakdown into: Open, Overdue, and Upcoming
  const priorityData = useMemo(() => {
    const priorities = ["Critical", "High", "Medium", "Low", "Standard"];
    const matrix: Record<string, { priority: string; open: number; overdue: number; upcoming: number; total: number }> = {};

    priorities.forEach((p) => {
      matrix[p] = { priority: p, open: 0, overdue: 0, upcoming: 0, total: 0 };
    });

    const now = Date.now();
    const threeDaysMs = 3 * 24 * 3600 * 1000;

    items.forEach((item) => {
      const pKey = priorities.includes(item.priority) ? item.priority : "Standard";
      const isResolved = item.status === "Resolved";
      matrix[pKey].total++;

      if (item.isOverdue) {
        matrix[pKey].overdue++;
      } else if (!isResolved) {
        const dueTime = item.dueDate ? new Date(item.dueDate).getTime() : null;
        if (dueTime && dueTime >= now && dueTime <= now + threeDaysMs) {
          matrix[pKey].upcoming++;
        } else {
          matrix[pKey].open++;
        }
      }
    });

    return priorities.map((p) => matrix[p]).filter(row => row.total > 0 || priorityChartType === "bar");
  }, [items, priorityChartType]);

  // Priority Pie aggregate
  const priorityPieData = useMemo(() => {
    return priorityData.map((d) => ({
      name: d.priority,
      value: d.total,
      fill: PRIORITY_COLORS[d.priority] || "#64748b"
    })).filter(d => d.value > 0);
  }, [priorityData]);

  const totalItems = items.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      
      {/* CHART 1: STATUS-WISE CREATED & ACTIVE DISTRIBUTION */}
      <AppCard className="p-5 relative overflow-hidden border border-border/70 shadow-sm theme-card-structural">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-theme-btn-primary/10 text-theme-icon">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Status-wise Workload Distribution</h3>
            </div>
            <p className="text-xs text-muted mt-1">Live breakdown of active, in review, escalated & resolved tasks</p>
          </div>

          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border/40">
            <AppButton
              variant={statusChartType === "bar" ? "primary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setStatusChartType("bar")}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Bar
            </AppButton>
            <AppButton
              variant={statusChartType === "pie" ? "primary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setStatusChartType("pie")}
            >
              <PieChartIcon className="h-3.5 w-3.5 mr-1" /> Donut
            </AppButton>
          </div>
        </div>

        <div className="pt-4 h-64 w-full">
          {totalItems === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted text-xs">
              <Layers className="h-8 w-8 mb-2 opacity-30" />
              <span>No items found matching the selected filters.</span>
            </div>
          ) : statusChartType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const pct = totalItems > 0 ? ((Number(data.value) / totalItems) * 100).toFixed(1) : "0";
                      return (
                        <div className="p-2.5 rounded-lg border border-border bg-surface shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.payload.name}</p>
                          <p className="text-theme-icon font-medium">Count: <span className="font-bold">{data.value}</span> ({pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-donut-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const pct = totalItems > 0 ? ((Number(data.value) / totalItems) * 100).toFixed(1) : "0";
                      return (
                        <div className="p-2.5 rounded-lg border border-border bg-surface shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.name}</p>
                          <p className="text-theme-icon font-medium">Total: <span className="font-bold">{data.value}</span> ({pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-xs text-foreground font-medium">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </AppCard>

      {/* CHART 2: PRIORITY-WISE BREAKDOWN (OPEN, OVERDUE, UPCOMING) */}
      <AppCard className="p-5 relative overflow-hidden border border-border/70 shadow-sm theme-card-structural">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-danger/10 text-danger">
                <Flame className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Priority & Risk Breakdown</h3>
            </div>
            <p className="text-xs text-muted mt-1">Open, Overdue & Upcoming due tasks grouped by urgency tier</p>
          </div>

          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border/40">
            <AppButton
              variant={priorityChartType === "bar" ? "primary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPriorityChartType("bar")}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Stacked
            </AppButton>
            <AppButton
              variant={priorityChartType === "pie" ? "primary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPriorityChartType("pie")}
            >
              <PieChartIcon className="h-3.5 w-3.5 mr-1" /> Share
            </AppButton>
          </div>
        </div>

        <div className="pt-4 h-64 w-full">
          {totalItems === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted text-xs">
              <Layers className="h-8 w-8 mb-2 opacity-30" />
              <span>No items found matching the selected filters.</span>
            </div>
          ) : priorityChartType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-3 rounded-lg border border-border bg-surface shadow-xl text-xs space-y-1.5 min-w-[130px]">
                          <p className="font-bold text-foreground border-b border-border/50 pb-1">{label} Priority</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between items-center gap-3">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                <span className="text-muted">{entry.name}:</span>
                              </span>
                              <span className="font-bold text-foreground">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconSize={8}
                  formatter={(val) => <span className="text-[11px] text-muted font-medium">{val}</span>}
                />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill={STATE_COLORS.Overdue} radius={[0, 0, 0, 0]} />
                <Bar dataKey="upcoming" name="Upcoming (≤3d)" stackId="a" fill={STATE_COLORS.Upcoming} radius={[0, 0, 0, 0]} />
                <Bar dataKey="open" name="Open/In Progress" stackId="a" fill={STATE_COLORS.Open} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityPieData.map((entry, index) => (
                    <Cell key={`cell-priority-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const pct = totalItems > 0 ? ((Number(data.value) / totalItems) * 100).toFixed(1) : "0";
                      return (
                        <div className="p-2.5 rounded-lg border border-border bg-surface shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.name} Priority</p>
                          <p className="text-theme-icon font-medium">Total: <span className="font-bold">{data.value}</span> ({pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-xs text-foreground font-medium">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </AppCard>

    </div>
  );
}
