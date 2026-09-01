"use client";

import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import { Hourglass, AlertOctagon, Clock, ArrowUpRight, CheckCircle2, ChevronRight, Layers } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { DrillDownFilter } from "./MetricsListModal";

interface BottleneckRadarWidgetProps {
  metrics?: any[];
  onDrillDown?: (filter: DrillDownFilter) => void;
}

export function BottleneckRadarWidget({ metrics = [], onDrillDown }: BottleneckRadarWidgetProps) {
  const agingAnalysis = useMemo(() => {
    let freshCount = 0; // < 2d
    let attentionCount = 0; // 3-5d
    let staleCount = 0; // 6-10d
    let severeCount = 0; // > 10d

    let totalActiveDays = 0;
    let activeItemCount = 0;

    // Identify items stuck in review/pending approval
    const stuckApprovals: any[] = [];

    metrics.forEach(m => {
      if (m.status === "Resolved") return;
      activeItemCount++;

      const days = m.daysInStatus || 0;
      totalActiveDays += days;

      if (days < 2) freshCount++;
      else if (days <= 5) attentionCount++;
      else if (days <= 10) staleCount++;
      else severeCount++;

      const isReviewOrPending = m.status === "Review" || 
        String(m.rawStatus).toLowerCase().includes("approval") || 
        String(m.rawStatus).toLowerCase().includes("pending") ||
        String(m.rawStatus).toLowerCase().includes("qa");

      if (isReviewOrPending && days >= 3) {
        stuckApprovals.push(m);
      }
    });

    stuckApprovals.sort((a, b) => (b.daysInStatus || 0) - (a.daysInStatus || 0));

    const avgDaysInStatus = activeItemCount > 0 ? (totalActiveDays / activeItemCount).toFixed(1) : "0";

    return {
      freshCount,
      attentionCount,
      staleCount,
      severeCount,
      activeItemCount,
      avgDaysInStatus,
      stuckApprovals: stuckApprovals.slice(0, 5)
    };
  }, [metrics]);

  const total = agingAnalysis.activeItemCount || 1;
  const freshPct = Math.round((agingAnalysis.freshCount / total) * 100);
  const attentionPct = Math.round((agingAnalysis.attentionCount / total) * 100);
  const stalePct = Math.round((agingAnalysis.staleCount / total) * 100);
  const severePct = Math.round((agingAnalysis.severeCount / total) * 100);

  return (
    <BaseWidget id="bottleneck-radar" className="w-full theme-card-structural border border-border/80 rounded-2xl overflow-hidden p-0 relative shadow-sm">
      {/* Header */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-surface/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">Bottleneck & Aging Analysis</h2>
              {agingAnalysis.severeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-danger/15 text-danger border border-red-500/30">
                  {agingAnalysis.severeCount} Stalled &gt;10d
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Stage duration tracking and review/approval aging radar</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-background/80 px-3.5 py-1.5 rounded-xl border border-border/60 shrink-0">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div className="text-xs">
            <span className="text-muted-foreground">Avg Time in Status: </span>
            <strong className="text-foreground font-bold">{agingAnalysis.avgDaysInStatus} Days</strong>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5 bg-surface/5">
        
        {/* Visual Progress Bar Breakdown */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-2">
            <span className="text-muted-foreground">Time-in-Status Distribution</span>
            <span className="text-muted-foreground">{agingAnalysis.activeItemCount} Active Items</span>
          </div>

          <div className="h-3 w-full rounded-full bg-surface overflow-hidden flex border border-border/50">
            <div style={{ width: `${freshPct}%` }} className="bg-emerald-500 transition-all" title={`< 2 Days: ${agingAnalysis.freshCount} items (${freshPct}%)`} />
            <div style={{ width: `${attentionPct}%` }} className="bg-amber-400 transition-all" title={`3-5 Days: ${agingAnalysis.attentionCount} items (${attentionPct}%)`} />
            <div style={{ width: `${stalePct}%` }} className="bg-orange-500 transition-all" title={`6-10 Days: ${agingAnalysis.staleCount} items (${stalePct}%)`} />
            <div style={{ width: `${severePct}%` }} className="bg-danger transition-all" title={`> 10 Days: ${agingAnalysis.severeCount} items (${severePct}%)`} />
          </div>

          {/* Aging Brackets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div
              onClick={() => onDrillDown && onDrillDown({ title: "Fresh Flow (<2 Days)", description: "Items modified or progressing in the last 48 hours." })}
              className="p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-emerald-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                &lt; 2 Days
              </div>
              <div className="text-xl font-bold text-foreground mt-1 group-hover:text-emerald-500 transition-colors">{agingAnalysis.freshCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{freshPct}% of workload</div>
            </div>

            <div
              onClick={() => onDrillDown && onDrillDown({ title: "Needs Attention (3-5 Days)", description: "Items inactive for 3 to 5 days.", agingDaysMin: 3 })}
              className="p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-amber-400/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                3 - 5 Days
              </div>
              <div className="text-xl font-bold text-foreground mt-1 group-hover:text-amber-500 transition-colors">{agingAnalysis.attentionCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{attentionPct}% of workload</div>
            </div>

            <div
              onClick={() => onDrillDown && onDrillDown({ title: "Stale Items (6-10 Days)", description: "Items inactive for 6 to 10 days.", agingDaysMin: 6 })}
              className="p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-orange-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-500 uppercase">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                6 - 10 Days
              </div>
              <div className="text-xl font-bold text-foreground mt-1 group-hover:text-orange-500 transition-colors">{agingAnalysis.staleCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{stalePct}% of workload</div>
            </div>

            <div
              onClick={() => onDrillDown && onDrillDown({ title: "Severe Bottlenecks (>10 Days)", description: "Items stalled in their current status for over 10 days.", agingDaysMin: 10 })}
              className="p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-red-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-danger uppercase">
                <span className="w-2 h-2 rounded-full bg-danger animate-ping" />
                &gt; 10 Days
              </div>
              <div className="text-xl font-bold text-danger mt-1">{agingAnalysis.severeCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{severePct}% of workload</div>
            </div>
          </div>
        </div>

        {/* Stuck Approvals / Reviews Section */}
        {agingAnalysis.stuckApprovals.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Approval & Sign-Off Blockages (&gt;3 Days)</h3>
              </div>
              {onDrillDown && (
                <button
                  type="button"
                  onClick={() => onDrillDown({
                    title: "Stalled Approvals & Reviews",
                    description: "All requirements, tickets, and tasks pending approval or review for over 3 days.",
                    status: "Review",
                    agingDaysMin: 3
                  })}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View All ({agingAnalysis.stuckApprovals.length}) <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {agingAnalysis.stuckApprovals.map((item, i) => {
                const itemUrl = item.module === "Tickets" ? `/tickets/${item.id}` :
                                item.module === "Requirements" ? `/requirements/${item.id}` :
                                `/tasks/${item.id}`;

                return (
                  <a
                    key={`${item.id}-${i}`}
                    href={itemUrl}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border/40 hover:bg-surface-hover/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{item.code}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {item.module}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">{item.user}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-danger/10 text-danger border border-red-500/20">
                        {item.daysInStatus}d in {item.rawStatus || item.status}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </BaseWidget>
  );
}
