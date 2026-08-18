"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

interface SlaGovernanceWidgetProps {
  analytics?: any;
  kpis?: any;
}

export function SlaGovernanceWidget({ analytics, kpis: globalKpis }: SlaGovernanceWidgetProps) {
  const kpis = globalKpis || analytics?.kpis || analytics || {};
  const slaStats = kpis.sla || { healthy: 0, warning: 0, breached: 0 };
  
  const total = slaStats.healthy + slaStats.warning + slaStats.breached;
  const healthyPct = total > 0 ? (slaStats.healthy / total) * 100 : 0;
  const warningPct = total > 0 ? (slaStats.warning / total) * 100 : 0;
  const breachedPct = total > 0 ? (slaStats.breached / total) * 100 : 0;

  return (
    <BaseWidget
      id="sla-governance"
      title="SLA Governance Heatmap"
      icon={<Activity className="w-5 h-5" />}
      headerRight={<span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Distribution</span>}
    >
      <div className="flex flex-col h-full justify-center">
        {/* Heatmap Bar */}
        <div className="w-full h-10 flex rounded-xl overflow-hidden mb-8 shadow-inner border border-border/50">
          <div className="bg-success h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${healthyPct}%` }} title={`Healthy: ${slaStats.healthy}`} />
          <div className="bg-warning h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${warningPct}%` }} title={`Warning: ${slaStats.warning}`} />
          <div className="bg-danger h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${breachedPct}%` }} title={`Breached: ${slaStats.breached}`} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-success/5 text-center flex flex-col items-center justify-center transition-colors hover:bg-success/10 cursor-default">
            <ShieldCheck className="w-6 h-6 text-success mb-2" />
            <div className="text-3xl font-extrabold text-success dark:text-success drop-shadow-sm">{slaStats.healthy}</div>
            <div className="text-[10px] font-bold text-success/70 dark:text-success/70 uppercase tracking-widest mt-1">Healthy</div>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/20 bg-warning/5 text-center flex flex-col items-center justify-center transition-colors hover:bg-warning/10 cursor-default">
            <AlertTriangle className="w-6 h-6 text-warning mb-2" />
            <div className="text-3xl font-extrabold text-warning dark:text-warning drop-shadow-sm">{slaStats.warning}</div>
            <div className="text-[10px] font-bold text-warning/70 dark:text-warning/70 uppercase tracking-widest mt-1">Warning</div>
          </div>
          <div className="p-4 rounded-xl border border-red-500/20 bg-danger/5 text-center flex flex-col items-center justify-center transition-colors hover:bg-danger/10 cursor-default">
            <ShieldAlert className="w-6 h-6 text-danger mb-2" />
            <div className="text-3xl font-extrabold text-danger dark:text-danger drop-shadow-sm">{slaStats.breached}</div>
            <div className="text-[10px] font-bold text-danger/70 dark:text-danger/70 uppercase tracking-widest mt-1">Breached</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
