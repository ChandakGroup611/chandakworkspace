"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { DrillDownFilter } from "./MetricsListModal";

interface SlaGovernanceWidgetProps {
  analytics?: any;
  kpis?: any;
  onDrillDown?: (filter: DrillDownFilter) => void;
}

export function SlaGovernanceWidget({ analytics, kpis: globalKpis, onDrillDown }: SlaGovernanceWidgetProps) {
  const kpis = globalKpis || analytics?.kpis || analytics || {};
  const slaStats = kpis.sla || { healthy: 0, warning: 0, breached: 0 };
  
  const total = slaStats.healthy + slaStats.warning + slaStats.breached;
  const healthyPct = total > 0 ? (slaStats.healthy / total) * 100 : 0;
  const warningPct = total > 0 ? (slaStats.warning / total) * 100 : 0;
  const breachedPct = total > 0 ? (slaStats.breached / total) * 100 : 0;

  return (
    <BaseWidget
      id="sla-governance"
      title="SLA governance heatmap"
      subtitle="Health distribution across target SLAs"
      icon={<Activity className="w-5 h-5 text-success-text" />}
      badge={
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-soft text-success-text border border-success-border shrink-0">
          {total} Evaluated
        </span>
      }
      collapsible={true}
      headerRight={<span className="text-[11px] font-semibold text-muted-foreground">Distribution</span>}
    >
      <div className="flex flex-col h-full justify-center">
        {/* Heatmap Bar */}
        <div className="w-full h-10 flex rounded-lg overflow-hidden mb-8 shadow-inner border border-border">
          <div className="bg-success h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${healthyPct}%` }} title={`Healthy: ${slaStats.healthy}`} />
          <div className="bg-warning h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${warningPct}%` }} title={`Warning: ${slaStats.warning}`} />
          <div className="bg-danger h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${breachedPct}%` }} title={`Breached: ${slaStats.breached}`} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div 
            onClick={() => onDrillDown && onDrillDown({ title: "Healthy SLA deliverables", description: "Deliverables progressing within target SLA windows." })}
            className={`p-4 rounded-lg border border-success-border bg-success-soft text-center flex flex-col items-center justify-center transition-colors hover:bg-success-soft ${onDrillDown ? "cursor-pointer group" : ""}`}
          >
            <ShieldCheck className="w-6 h-6 text-success-text mb-2" />
            <div className="text-3xl font-semibold text-success-text dark:text-success-text drop-shadow-sm">{slaStats.healthy}</div>
            <div className="text-[11px] font-semibold text-success/70 dark:text-success/70 mt-1">Healthy</div>
          </div>
          <div 
            onClick={() => onDrillDown && onDrillDown({ title: "Warning SLA deliverables", description: "Deliverables nearing their deadline (<24 hours).", urgency: "warning" })}
            className={`p-4 rounded-lg border border-warning-border bg-warning-soft text-center flex flex-col items-center justify-center transition-colors hover:bg-warning-soft ${onDrillDown ? "cursor-pointer group" : ""}`}
          >
            <AlertTriangle className="w-6 h-6 text-warning-text mb-2" />
            <div className="text-3xl font-semibold text-warning-text dark:text-warning-text drop-shadow-sm">{slaStats.warning}</div>
            <div className="text-[11px] font-semibold text-warning/70 dark:text-warning/70 mt-1">Warning</div>
          </div>
          <div 
            onClick={() => onDrillDown && onDrillDown({ title: "Breached SLA deliverables", description: "All deliverables that exceeded resolution deadlines.", urgency: "breached" })}
            className={`p-4 rounded-lg border border-danger-border bg-danger-soft text-center flex flex-col items-center justify-center transition-colors hover:bg-danger-soft ${onDrillDown ? "cursor-pointer group" : ""}`}
          >
            <ShieldAlert className="w-6 h-6 text-danger-text mb-2" />
            <div className="text-3xl font-semibold text-danger-text dark:text-danger-text drop-shadow-sm">{slaStats.breached}</div>
            <div className="text-[11px] font-semibold text-danger/70 dark:text-danger/70 mt-1">Breached</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
