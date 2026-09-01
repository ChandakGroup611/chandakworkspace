"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import { Clock, AlertTriangle, ShieldAlert, ArrowRight, ExternalLink, CheckCircle, Flame, Filter } from "lucide-react";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { DrillDownFilter } from "./MetricsListModal";

interface SlaCountdownWidgetProps {
  metrics?: any[];
  onDrillDown?: (filter: DrillDownFilter) => void;
}

export function SlaCountdownWidget({ metrics = [], onDrillDown }: SlaCountdownWidgetProps) {
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [activeTab, setActiveTab] = useState<"all" | "critical" | "urgent" | "warning" | "breached">("all");

  // Keep a live 1-second interval to update remaining timers in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const categorizedItems = useMemo(() => {
    const critical: any[] = [];
    const urgent: any[] = [];
    const warning: any[] = [];
    const breached: any[] = [];

    metrics.forEach(m => {
      if (m.status === "Resolved" || !m.dueDate) return;

      const dueMs = new Date(m.dueDate).getTime();
      const diffMs = dueMs - currentTime;

      if (diffMs <= 0 || m.isOverdue || m.slaBreached) {
        breached.push({ ...m, diffMs });
      } else if (diffMs <= 2 * 3600 * 1000) {
        critical.push({ ...m, diffMs });
      } else if (diffMs <= 8 * 3600 * 1000) {
        urgent.push({ ...m, diffMs });
      } else if (diffMs <= 24 * 3600 * 1000) {
        warning.push({ ...m, diffMs });
      }
    });

    // Sort by most urgent first
    critical.sort((a, b) => a.diffMs - b.diffMs);
    urgent.sort((a, b) => a.diffMs - b.diffMs);
    warning.sort((a, b) => a.diffMs - b.diffMs);
    breached.sort((a, b) => a.diffMs - b.diffMs);

    return { critical, urgent, warning, breached };
  }, [metrics, currentTime]);

  const activeList = useMemo(() => {
    if (activeTab === "critical") return categorizedItems.critical;
    if (activeTab === "urgent") return categorizedItems.urgent;
    if (activeTab === "warning") return categorizedItems.warning;
    if (activeTab === "breached") return categorizedItems.breached;
    return [
      ...categorizedItems.critical,
      ...categorizedItems.urgent,
      ...categorizedItems.warning,
      ...categorizedItems.breached
    ].slice(0, 10);
  }, [categorizedItems, activeTab]);

  const formatCountdown = (diffMs: number) => {
    if (diffMs <= 0) {
      const overdueMs = Math.abs(diffMs);
      const hours = Math.floor(overdueMs / (1000 * 3600));
      const mins = Math.floor((overdueMs % (1000 * 3600)) / (1000 * 60));
      return `Breached by ${hours}h ${mins}m`;
    }

    const hours = Math.floor(diffMs / (1000 * 3600));
    const mins = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const totalUrgent = categorizedItems.critical.length + categorizedItems.urgent.length + categorizedItems.warning.length + categorizedItems.breached.length;

  return (
    <BaseWidget id="sla-countdown-radar" className="w-full theme-card-structural border border-border/80 rounded-2xl overflow-hidden p-0 relative shadow-sm">
      {/* Header */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-surface/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-danger/10 text-danger border border-red-500/20 shrink-0">
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">SLA Early Warning & Breach Ticker</h2>
              {categorizedItems.critical.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-danger/15 text-danger animate-pulse border border-red-500/30">
                  {categorizedItems.critical.length} Critical Alert{categorizedItems.critical.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time resolution countdown for high-urgency active items</p>
          </div>
        </div>

        {/* Action Button */}
        {onDrillDown && totalUrgent > 0 && (
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => onDrillDown({
              title: "SLA Urgent & Expiring Items",
              description: "Items approaching or exceeding their service level deadlines.",
              urgency: "urgent"
            })}
            leftIcon={<Filter className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            View All ({totalUrgent})
          </AppButton>
        )}
      </div>

      {/* Urgency Tabs */}
      <div className="px-5 py-2.5 bg-surface/20 border-b border-border/40 flex items-center gap-2 overflow-x-auto text-xs custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-surface"
          }`}
        >
          All Urgencies ({totalUrgent})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("critical")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "critical"
              ? "bg-danger text-white shadow-sm"
              : "text-danger hover:bg-danger/10"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-danger animate-ping" />
          Critical &lt; 2h ({categorizedItems.critical.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("urgent")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "urgent"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-amber-500 hover:bg-amber-500/10"
          }`}
        >
          Expiring Today &lt; 8h ({categorizedItems.urgent.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("warning")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "warning"
              ? "bg-yellow-500 text-black shadow-sm"
              : "text-yellow-500 hover:bg-yellow-500/10"
          }`}
        >
          Next 24h ({categorizedItems.warning.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("breached")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "breached"
              ? "bg-red-700 text-white shadow-sm"
              : "text-red-700 hover:bg-red-700/10"
          }`}
        >
          Breached ({categorizedItems.breached.length})
        </button>
      </div>

      {/* Items List */}
      <div className="divide-y divide-border/40 max-h-[360px] overflow-y-auto custom-scrollbar bg-surface/5">
        {activeList.length > 0 ? (
          activeList.map((item, idx) => {
            const isBreached = item.diffMs <= 0;
            const isCritical = item.diffMs > 0 && item.diffMs <= 2 * 3600 * 1000;
            const isUrgent = item.diffMs > 2 * 3600 * 1000 && item.diffMs <= 8 * 3600 * 1000;

            const itemUrl = item.module === "Tickets" ? `/tickets/${item.id}` :
                            item.module === "Requirements" ? `/requirements/${item.id}` :
                            item.module === "Workspaces" || item.module === "Sub Workspaces" ? `/workspaces?workspace=${item.id}` :
                            `/tasks/${item.id}`;

            return (
              <div key={`${item.id}-${idx}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/50 transition-colors group">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isBreached ? 'bg-danger/15 text-danger border border-red-500/20' :
                    isCritical ? 'bg-danger/10 text-danger border border-red-500/30 animate-pulse' :
                    isUrgent ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                  }`}>
                    {isBreached ? <ShieldAlert className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{item.code}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-surface border border-border/50 text-foreground">
                        {item.module}
                      </span>
                      <span className="text-[10px] text-muted-foreground">• Assigned to: <strong className="text-foreground">{item.user}</strong> ({item.departmentName || "General"})</span>
                    </div>

                    <a href={itemUrl} className="text-xs font-bold text-foreground hover:text-primary transition-colors line-clamp-1 block" title={item.title}>
                      {item.title}
                    </a>
                  </div>
                </div>

                {/* Countdown pill & Jump button */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                    isBreached ? 'bg-danger/10 text-danger border-red-500/30' :
                    isCritical ? 'bg-danger/10 text-danger border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
                    isUrgent ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isBreached || isCritical ? 'bg-danger animate-ping' : 'bg-amber-500'}`} />
                    {formatCountdown(item.diffMs)}
                  </div>

                  <a
                    href={itemUrl}
                    className="p-1.5 rounded-lg bg-surface border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                    title="Jump to Deliverable"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <div className="text-xs font-semibold text-foreground">No SLA Breaches or Critical Deadlines in this tier</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">All active deliverables are running on schedule.</div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
