"use client";

import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import { Sparkles, AlertCircle, CheckCircle2, Clock, Users, ArrowUpRight, TrendingUp, ShieldAlert } from "lucide-react";
import { AppBadge } from "@/components/ui/AppBadge";
import { DrillDownFilter } from "./MetricsListModal";

interface ExecutiveDigestWidgetProps {
  metrics?: any[];
  kpis?: any;
  onDrillDown?: (filter: DrillDownFilter) => void;
}

export function ExecutiveDigestWidget({ metrics = [], kpis, onDrillDown }: ExecutiveDigestWidgetProps) {
  const digest = useMemo(() => {
    const total = metrics.length;
    if (total === 0) {
      return {
        healthScore: 100,
        healthLabel: "All Systems Operational",
        bullets: [
          { id: "all_clear", type: "success", icon: CheckCircle2, text: "No active bottlenecks or escalated items found across your current scope.", filter: null }
        ]
      };
    }

    const breachedItems = metrics.filter(m => m.isOverdue || m.slaBreached);
    const criticalDueSoon = metrics.filter(m => m.slaRemainingMs && m.slaRemainingMs > 0 && m.slaRemainingMs <= 8 * 3600 * 1000 && m.status !== "Resolved");
    const unassignedItems = metrics.filter(m => (!m.user || m.user === "Unassigned") && m.status !== "Resolved");
    const staleApprovals = metrics.filter(m => (m.status === "Review" || String(m.rawStatus).toLowerCase().includes("approval") || String(m.rawStatus).toLowerCase().includes("pending")) && (m.daysInStatus || 0) >= 3);
    const highPriorityActive = metrics.filter(m => (String(m.priority).toLowerCase().includes("critical") || String(m.priority).toLowerCase().includes("high")) && m.status !== "Resolved");
    const resolvedItems = metrics.filter(m => m.status === "Resolved");

    // Health Score calculation (100 base, penalized by breached, critical due, and stale items)
    let penalties = (breachedItems.length * 8) + (criticalDueSoon.length * 4) + (staleApprovals.length * 3) + (unassignedItems.length * 2);
    const healthScore = Math.max(20, Math.min(100, 100 - Math.round((penalties / Math.max(1, total)) * 50)));

    let healthLabel = "Excellent Operational Flow";
    let healthColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (healthScore < 60) {
      healthLabel = "Critical Attention Required";
      healthColor = "text-danger bg-danger/10 border-red-500/20";
    } else if (healthScore < 85) {
      healthLabel = "Moderate Workload Friction";
      healthColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }

    const bullets: Array<{ id: string; type: "danger" | "warning" | "info" | "success"; icon: any; text: string; filter: DrillDownFilter | null }> = [];

    // 1. Breached Items Bullet
    if (breachedItems.length > 0) {
      bullets.push({
        id: "breaches",
        type: "danger",
        icon: ShieldAlert,
        text: `${breachedItems.length} operational item${breachedItems.length > 1 ? "s" : ""} have breached SLA or due dates and require immediate escalation.`,
        filter: {
          title: "SLA Breached Items",
          description: "All tickets, tasks, and requirements currently exceeding target resolution deadlines.",
          urgency: "breached"
        }
      });
    }

    // 2. Critical Due Soon Bullet
    if (criticalDueSoon.length > 0) {
      bullets.push({
        id: "due_today",
        type: "warning",
        icon: Clock,
        text: `${criticalDueSoon.length} high-priority deadline${criticalDueSoon.length > 1 ? "s" : ""} expire within the next 8 hours.`,
        filter: {
          title: "Expiring Today (Next 8 Hours)",
          description: "Items approaching their SLA expiration deadlines today.",
          urgency: "urgent"
        }
      });
    }

    // 3. Stale Approvals / Reviews
    if (staleApprovals.length > 0) {
      bullets.push({
        id: "stale_reviews",
        type: "warning",
        icon: AlertCircle,
        text: `${staleApprovals.length} item${staleApprovals.length > 1 ? "s" : ""} (including requirements & tickets) are awaiting review/sign-off for over 3 days.`,
        filter: {
          title: "Aging Approvals & Reviews (>3 Days)",
          description: "Items stalled in review or pending approval states.",
          status: "Review",
          agingDaysMin: 3
        }
      });
    }

    // 4. Unassigned Tasks
    if (unassignedItems.length > 0) {
      bullets.push({
        id: "unassigned",
        type: "info",
        icon: Users,
        text: `${unassignedItems.length} active item${unassignedItems.length > 1 ? "s" : ""} remain unassigned in workspaces.`,
        filter: {
          title: "Unassigned Active Items",
          description: "Tasks and tickets that have no designated assignee.",
          userId: "Unassigned"
        }
      });
    }

    // 5. Success / Velocity Highlight
    if (resolvedItems.length > 0) {
      bullets.push({
        id: "throughput",
        type: "success",
        icon: CheckCircle2,
        text: `${resolvedItems.length} item${resolvedItems.length > 1 ? "s" : ""} successfully resolved (${Math.round((resolvedItems.length / total) * 100)}% resolution throughput).`,
        filter: {
          title: "Resolved Items",
          description: "Completed deliverables and tickets.",
          status: "Resolved"
        }
      });
    }

    return {
      healthScore,
      healthLabel,
      bullets: bullets.slice(0, 3)
    };
  }, [metrics]);

  return (
    <BaseWidget id="executive-digest" className="w-full theme-card-structural border border-border/80 rounded-2xl overflow-hidden p-0 relative shadow-sm">
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 bg-surface/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">Executive Smart Digest</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/15 text-primary">
                AI Live Briefing
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Automated cross-functional briefing generated from live system activity</p>
          </div>
        </div>

        {/* Health Score Badge */}
        <div className="flex items-center gap-3 bg-background/80 px-4 py-2 rounded-xl border border-border/60 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System Health Score</div>
            <div className="text-xs font-semibold text-foreground">{digest.healthLabel}</div>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border font-black text-lg ${
            digest.healthScore >= 85 ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' :
            digest.healthScore >= 60 ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' :
            'text-danger border-red-500/30 bg-danger/10'
          }`}>
            {digest.healthScore}%
          </div>
        </div>
      </div>

      {/* Bullets Grid (3x1 layout) */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface/10">
        {digest.bullets.map((b) => {
          const Icon = b.icon;
          const isClickable = !!b.filter && !!onDrillDown;

          return (
            <div
              key={b.id}
              onClick={() => {
                if (isClickable && b.filter) onDrillDown(b.filter);
              }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                b.type === "danger"
                  ? "bg-danger/5 border-red-500/20 text-danger-foreground hover:bg-danger/10"
                  : b.type === "warning"
                  ? "bg-amber-500/5 border-amber-500/20 text-foreground hover:bg-amber-500/10"
                  : b.type === "info"
                  ? "bg-blue-500/5 border-blue-500/20 text-foreground hover:bg-blue-500/10"
                  : "bg-emerald-500/5 border-emerald-500/20 text-foreground hover:bg-emerald-500/10"
              } ${isClickable ? "cursor-pointer group" : ""}`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                b.type === "danger" ? "bg-danger/15 text-danger" :
                b.type === "warning" ? "bg-amber-500/15 text-amber-500" :
                b.type === "info" ? "bg-blue-500/15 text-blue-500" :
                "bg-emerald-500/15 text-emerald-500"
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-relaxed text-foreground/90">
                  {b.text}
                </p>
                {isClickable && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary mt-1 group-hover:underline">
                    View Items <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BaseWidget>
  );
}
