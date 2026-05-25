"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

export function SlaGovernanceView({ slaStats }: { slaStats: any }) {
  const total = slaStats.healthy + slaStats.warning + slaStats.breached;
  const healthyPct = total > 0 ? (slaStats.healthy / total) * 100 : 0;
  const warningPct = total > 0 ? (slaStats.warning / total) * 100 : 0;
  const breachedPct = total > 0 ? (slaStats.breached / total) * 100 : 0;

  return (
    <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold tracking-tight">SLA Governance Heatmap</h3>
          <p className="text-xs text-muted-foreground mt-1">Operational service level distribution</p>
        </div>
      </div>

      {/* Heatmap Bar */}
      <div className="w-full h-8 flex rounded-xl overflow-hidden mb-8 shadow-inner">
        <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${healthyPct}%` }} title="Healthy" />
        <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${warningPct}%` }} title="Warning" />
        <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${breachedPct}%` }} title="Breached" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
          <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{slaStats.healthy}</div>
          <div className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mt-1">Healthy</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{slaStats.warning}</div>
          <div className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-widest mt-1">Warning</div>
        </div>
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
          <ShieldAlert className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">{slaStats.breached}</div>
          <div className="text-[10px] font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-widest mt-1">Breached</div>
        </div>
      </div>
    </div>
  );
}
