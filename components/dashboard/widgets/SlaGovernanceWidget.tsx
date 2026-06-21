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
          <div className="bg-emerald-500 h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${healthyPct}%` }} title={`Healthy: ${slaStats.healthy}`} />
          <div className="bg-amber-500 h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${warningPct}%` }} title={`Warning: ${slaStats.warning}`} />
          <div className="bg-red-500 h-full transition-all duration-1000 ease-in-out hover:brightness-110" style={{ width: `${breachedPct}%` }} title={`Breached: ${slaStats.breached}`} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center flex flex-col items-center justify-center transition-colors hover:bg-emerald-500/10 cursor-default">
            <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2" />
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{slaStats.healthy}</div>
            <div className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mt-1">Healthy</div>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center flex flex-col items-center justify-center transition-colors hover:bg-amber-500/10 cursor-default">
            <AlertTriangle className="w-6 h-6 text-amber-500 mb-2" />
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 drop-shadow-sm">{slaStats.warning}</div>
            <div className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-widest mt-1">Warning</div>
          </div>
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center justify-center transition-colors hover:bg-red-500/10 cursor-default">
            <ShieldAlert className="w-6 h-6 text-red-500 mb-2" />
            <div className="text-3xl font-extrabold text-red-600 dark:text-red-400 drop-shadow-sm">{slaStats.breached}</div>
            <div className="text-[10px] font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-widest mt-1">Breached</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
