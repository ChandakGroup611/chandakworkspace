"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  Flame,
  ArrowUpRight
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { PortfolioItem, PortfolioUser } from "@/lib/actions/portfolioMetrics";
import { cn } from "@/lib/utils";

interface UserComparisonMatrixProps {
  items: PortfolioItem[];
  users: PortfolioUser[];
  selectedUserIds: string[];
  startDate?: string | null;
  endDate?: string | null;
}

export function UserComparisonMatrix({
  items = [],
  users = [],
  selectedUserIds = [],
  startDate,
  endDate
}: UserComparisonMatrixProps) {
  // Resolve selected users
  const activeUsers = useMemo(() => {
    if (selectedUserIds.length === 0) return users.slice(0, 4); // Default to top 4 users
    return users.filter(u => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  // Aggregate comparative metrics per user
  const userStats = useMemo(() => {
    const sTime = startDate ? new Date(startDate).getTime() : 0;
    const eTime = endDate ? new Date(endDate).getTime() : Number.MAX_SAFE_INTEGER;

    return activeUsers.map(user => {
      const userItems = items.filter(
        item => item.userId === user.id || (item.userName && item.userName.toLowerCase() === user.fullName.toLowerCase())
      );

      let createdInPeriod = 0;
      let closedInPeriod = 0;
      let overdueCount = 0;
      let dueNotCompletedInPeriod = 0;
      let activeCount = 0;
      let onTimeCompleted = 0;
      let criticalCount = 0;

      userItems.forEach(item => {
        const cTime = new Date(item.createdAt).getTime();
        if (cTime >= sTime && cTime <= eTime) {
          createdInPeriod++;
        }

        const isResolved = item.status === "Resolved";
        const uTime = new Date(item.updatedAt).getTime();

        if (isResolved) {
          if (uTime >= sTime && uTime <= eTime) {
            closedInPeriod++;
            if (item.isOnTime) onTimeCompleted++;
          }
        } else {
          activeCount++;
        }

        if (item.isOverdue) {
          overdueCount++;
        }

        if (item.dueDate) {
          const dueTime = new Date(item.dueDate).getTime();
          if (dueTime >= sTime && dueTime <= eTime) {
            if (!isResolved || (item.completedAt && new Date(item.completedAt).getTime() > dueTime)) {
              dueNotCompletedInPeriod++;
            }
          }
        }

        if (item.priority === "Critical" || item.priority === "High") {
          criticalCount++;
        }
      });

      const totalHandled = userItems.length;
      const completionRate = totalHandled > 0 ? Math.max(0, Math.min(100, Math.round((closedInPeriod / Math.max(1, createdInPeriod || totalHandled)) * 100))) : 0;
      const onTimeRate = closedInPeriod > 0 ? Math.max(0, Math.min(100, Math.round((onTimeCompleted / closedInPeriod) * 100))) : (totalHandled > 0 && overdueCount === 0 ? 100 : 0);

      // Performance index computation
      let rating: "Exceptional" | "High Performer" | "Standard" | "Needs Attention" = "Standard";
      if (completionRate >= 80 && onTimeRate >= 85 && overdueCount === 0) rating = "Exceptional";
      else if (completionRate >= 65 && overdueCount <= 1) rating = "High Performer";
      else if (overdueCount > 3 || (completionRate < 40 && totalHandled > 5)) rating = "Needs Attention";

      return {
        user,
        totalHandled,
        createdInPeriod,
        closedInPeriod,
        overdueCount,
        dueNotCompletedInPeriod,
        activeCount,
        onTimeRate,
        completionRate,
        criticalCount,
        rating
      };
    });
  }, [activeUsers, items, startDate, endDate]);

  // Chart data for Output comparison (Created vs Closed)
  const outputChartData = useMemo(() => {
    return userStats.map(s => ({
      name: s.user.fullName.split(" ")[0],
      fullName: s.user.fullName,
      Created: s.createdInPeriod,
      Closed: s.closedInPeriod,
      Active: s.activeCount
    }));
  }, [userStats]);

  // Chart data for Risk & Overdue comparison
  const riskChartData = useMemo(() => {
    return userStats.map(s => ({
      name: s.user.fullName.split(" ")[0],
      fullName: s.user.fullName,
      Overdue: s.overdueCount,
      "Due Not Done": s.dueNotCompletedInPeriod,
      "Critical / High": s.criticalCount
    }));
  }, [userStats]);

  if (activeUsers.length === 0) {
    return (
      <AppCard className="p-8 text-center border border-border theme-card-structural my-6">
        <Users className="h-10 w-10 mx-auto text-muted mb-3 opacity-40" />
        <h4 className="text-base font-semibold text-foreground">No users selected for comparison</h4>
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
          Please select two or more users from the top filter bar to view side-by-side performance analytics.
        </p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6 my-6 animate-in fade-in duration-500">
      
      {/* COMPARISON HEADER BANNER */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-theme-btn-primary/15 via-theme-btn-primary/5 to-transparent border border-border-active flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground shadow-md">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">Side-by-side user comparison matrix</h3>
            <p className="text-xs text-muted">Comparative workload, output velocity, overdue risk & on-time compliance for {activeUsers.length} selected team members</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-soft text-accent-soft-text border border-border-active">
            {activeUsers.length} Users in scope
          </span>
        </div>
      </div>

      {/* USER COMPARATIVE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userStats.map(({ user, createdInPeriod, closedInPeriod, overdueCount, dueNotCompletedInPeriod, activeCount, onTimeRate, completionRate, rating }) => {
          return (
            <AppCard key={user.id} className="p-5 relative overflow-hidden border border-border shadow-sm theme-card-structural flex flex-col justify-between">
              
              {/* Card Top User Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-accent-soft text-accent-soft-text font-semibold flex items-center justify-center text-xs ring-2 ring-border">
                        {user.fullName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-tight truncate max-w-[130px]">{user.fullName}</h4>
                      <p className="text-[11px] text-muted truncate max-w-[130px]">{user.role} · {user.department}</p>
                    </div>
                  </div>

                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                    rating === "Exceptional" && "bg-success-soft text-success-text border border-success-border",
                    rating === "High Performer" && "bg-info-soft text-info-text border border-info-border",
                    rating === "Standard" && "bg-surface text-muted border border-border",
                    rating === "Needs Attention" && "bg-danger-soft text-danger-text border border-danger-border"
                  )}>
                    {rating}
                  </span>
                </div>

                <div className="h-px bg-border/50 my-3" />

                {/* Scorecards in Card */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-background/50 border border-border/40">
                    <span className="text-[11px] text-muted font-semibold">Created</span>
                    <p className="text-lg font-semibold text-foreground mt-0.5">{createdInPeriod}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-success-soft border border-success-border">
                    <span className="text-[11px] text-success-text font-semibold">Closed</span>
                    <p className="text-lg font-semibold text-success-text mt-0.5">{closedInPeriod}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-danger-soft border border-danger-border">
                    <span className="text-[11px] text-danger-text font-semibold">Overdue</span>
                    <p className="text-lg font-semibold text-danger-text mt-0.5">{overdueCount}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-warning-soft border border-warning-border">
                    <span className="text-[11px] text-warning-text font-semibold">Due not done</span>
                    <p className="text-lg font-semibold text-warning-text mt-0.5">{dueNotCompletedInPeriod}</p>
                  </div>
                </div>
              </div>

              {/* Progress Gauges */}
              <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-success-text" /> On-time delivery
                  </span>
                  <span className="font-semibold text-foreground">{onTimeRate}%</span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      onTimeRate >= 80 ? "bg-success" : onTimeRate >= 50 ? "bg-warning" : "bg-danger"
                    )}
                    style={{ width: `${Math.min(100, onTimeRate)}%` }}
                  />
                </div>
              </div>

            </AppCard>
          );
        })}
      </div>

      {/* COMPARATIVE CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: OUTPUT COMPARISON (CREATED VS CLOSED) */}
        <AppCard className="p-5 border border-border shadow-sm theme-card-structural">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Output velocity comparison</h4>
              </div>
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent-soft-text">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          <div className="pt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outputChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--bg-hover)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const userEntry = outputChartData.find(d => d.name === label);
                      return (
                        <div className="p-3 rounded-lg border border-border bg-surface shadow-lg text-xs space-y-1.5">
                          <p className="font-semibold text-foreground border-b border-border pb-1">{userEntry?.fullName || label}</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                <span className="text-muted">{entry.name}:</span>
                              </span>
                              <span className="font-semibold text-foreground">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconSize={8} formatter={(val) => <span className="text-[11px] text-muted font-medium">{val}</span>} />
                <Bar dataKey="Created" fill="var(--accent, #6366f1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Closed" fill="var(--emerald, #10b981)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Active" fill="var(--amber, #f59e0b)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppCard>

        {/* CHART 2: RISK & OVERDUE COMPARISON */}
        <AppCard className="p-5 border border-border shadow-sm theme-card-structural">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Risk & deadline breaches comparison</h4>
              </div>
            <div className="p-1.5 rounded-lg bg-danger-soft text-danger-text">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          <div className="pt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--bg-hover)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const userEntry = riskChartData.find(d => d.name === label);
                      return (
                        <div className="p-3 rounded-lg border border-border bg-surface shadow-lg text-xs space-y-1.5">
                          <p className="font-semibold text-foreground border-b border-border pb-1">{userEntry?.fullName || label}</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                <span className="text-muted">{entry.name}:</span>
                              </span>
                              <span className="font-semibold text-foreground">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconSize={8} formatter={(val) => <span className="text-[11px] text-muted font-medium">{val}</span>} />
                <Bar dataKey="Overdue" fill="var(--red, #ef4444)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Due Not Done" fill="var(--amber, #f59e0b)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Critical / High" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppCard>

      </div>

    </div>
  );
}
