"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

export function SlaGovernanceView({ slaStats }: { slaStats: any }) {
  const total = slaStats.healthy + slaStats.warning + slaStats.breached;
  const healthyPct = total > 0 ? (slaStats.healthy / total) * 100 : 0;
  const warningPct = total > 0 ? (slaStats.warning / total) * 100 : 0;
  const breachedPct = total > 0 ? (slaStats.breached / total) * 100 : 0;

  return (
    <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">SLA governance heatmap</h3>
          
        </div>
      </div>

      {/* Heatmap Bar */}
      <div className="w-full h-8 flex rounded-lg overflow-hidden mb-8 shadow-inner">
        <div className="bg-success h-full transition-all duration-1000" style={{ width: `${healthyPct}%` }} title="Healthy" />
        <div className="bg-warning h-full transition-all duration-1000" style={{ width: `${warningPct}%` }} title="Warning" />
        <div className="bg-danger h-full transition-all duration-1000" style={{ width: `${breachedPct}%` }} title="Breached" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-success-border bg-success-soft text-center">
          <ShieldCheck className="w-6 h-6 text-success-text mx-auto mb-2" />
          <div className="text-2xl font-semibold text-success-text dark:text-success-text">{slaStats.healthy}</div>
          <div className="text-xs font-semibold text-success/70 dark:text-success/70 mt-1">Healthy</div>
        </div>
        <div className="p-4 rounded-lg border border-warning-border bg-warning-soft text-center">
          <AlertTriangle className="w-6 h-6 text-warning-text mx-auto mb-2" />
          <div className="text-2xl font-semibold text-warning-text dark:text-warning-text">{slaStats.warning}</div>
          <div className="text-xs font-semibold text-warning/70 dark:text-warning/70 mt-1">Warning</div>
        </div>
        <div className="p-4 rounded-lg border border-danger-border bg-danger-soft text-center">
          <ShieldAlert className="w-6 h-6 text-danger-text mx-auto mb-2" />
          <div className="text-2xl font-semibold text-danger-text dark:text-danger-text">{slaStats.breached}</div>
          <div className="text-xs font-semibold text-danger/70 dark:text-danger/70 mt-1">Breached</div>
        </div>
      </div>
    </div>
  );
}
