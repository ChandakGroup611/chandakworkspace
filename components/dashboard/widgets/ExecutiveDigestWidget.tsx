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
    let healthColor = "text-success-text bg-success-soft border-success-border";
    if (healthScore < 60) {
      healthLabel = "Critical Attention Required";
      healthColor = "text-danger-text bg-danger-soft border-danger-border";
    } else if (healthScore < 85) {
      healthLabel = "Moderate Workload Friction";
      healthColor = "text-warning-text bg-warning-soft border-warning-border";
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
          title: "SLA breached items",
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
          title: "Expiring today (next 8 hours)",
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
          title: "Unassigned active items",
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
          title: "Resolved items",
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
    <BaseWidget 
      id="executive-digest" 
      title="Executive smart digest"
      subtitle="Automated cross-functional briefing from live system activity"
      icon={<Sparkles className="w-5 h-5 animate-pulse text-primary" />}
      badge={
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/20 shrink-0">
          AI live briefing
        </span>
      }
      collapsible={true}
      headerRight={
        <div className="flex items-center gap-2.5 bg-surface/80 px-3 py-1 rounded-lg border border-border shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-semibold text-muted-foreground">Health score</div>
            <div className="text-[11px] font-semibold text-foreground truncate max-w-[140px]">{digest.healthLabel}</div>
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg border font-semibold text-xs ${
            digest.healthScore >= 85 ? 'text-success-text border-success-border bg-success-soft' :
            digest.healthScore >= 60 ? 'text-warning-text border-warning-border bg-warning-soft' :
            'text-danger-text border-danger-border bg-danger-soft'
          }`}>
            {digest.healthScore}%
          </div>
        </div>
      }
      noPadding
    >
      {/* Bullets Grid (3x1 layout) */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface/5">
        {digest.bullets.map((b) => {
          const Icon = b.icon;
          const isClickable = !!b.filter && !!onDrillDown;

          return (
            <div
              key={b.id}
              onClick={() => {
                if (isClickable && b.filter) onDrillDown(b.filter);
              }}
              className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all ${
                b.type === "danger"
                  ? "bg-danger-soft border-danger-border text-danger-foreground hover:bg-danger-soft"
                  : b.type === "warning"
                  ? "bg-warning-soft border-warning-border text-foreground hover:bg-warning-soft"
                  : b.type === "info"
                  ? "bg-info-soft border-info-border text-foreground hover:bg-info-soft"
                  : "bg-success-soft border-success-border text-foreground hover:bg-success-soft"
              } ${isClickable ? "cursor-pointer group" : ""}`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                b.type === "danger" ? "bg-danger-soft text-danger-text" :
                b.type === "warning" ? "bg-warning-soft text-warning-text" :
                b.type === "info" ? "bg-info-soft text-info-text" :
                "bg-success-soft text-success-text"
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-relaxed text-foreground/90">
                  {b.text}
                </p>
                {isClickable && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary mt-1 group-hover:underline">
                    View items <ArrowUpRight className="w-3 h-3 transition-transform" />
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
