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
        <div className="bg-success h-full transition-all duration-1000" style={{ width: `${healthyPct}%` }} title="Healthy" />
        <div className="bg-warning h-full transition-all duration-1000" style={{ width: `${warningPct}%` }} title="Warning" />
        <div className="bg-danger h-full transition-all duration-1000" style={{ width: `${breachedPct}%` }} title="Breached" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-success/5 text-center">
          <ShieldCheck className="w-6 h-6 text-success mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-success dark:text-success">{slaStats.healthy}</div>
          <div className="text-xs font-bold text-success/70 dark:text-success/70 uppercase tracking-widest mt-1">Healthy</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-warning/5 text-center">
          <AlertTriangle className="w-6 h-6 text-warning mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-warning dark:text-warning">{slaStats.warning}</div>
          <div className="text-xs font-bold text-warning/70 dark:text-warning/70 uppercase tracking-widest mt-1">Warning</div>
        </div>
        <div className="p-4 rounded-xl border border-red-500/20 bg-danger/5 text-center">
          <ShieldAlert className="w-6 h-6 text-danger mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-danger dark:text-danger">{slaStats.breached}</div>
          <div className="text-xs font-bold text-danger/70 dark:text-danger/70 uppercase tracking-widest mt-1">Breached</div>
        </div>
      </div>
    </div>
  );
}
