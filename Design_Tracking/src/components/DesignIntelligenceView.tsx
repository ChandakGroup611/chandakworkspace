"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, ExternalLink, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import {
  fetchDesignIntelligenceAction,
  exportDesignRegisterCsvAction,
  type DesignIntelligencePayload,
} from "@/lib/actions/design-intelligence";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/feedback/States";

const SEV_CLASS = {
  CRITICAL: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  HIGH: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  MEDIUM: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

export function DesignIntelligenceView() {
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [data, setData] = useState<DesignIntelligencePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchDesignIntelligenceAction(projectFilter || undefined);
    if (!res.success || !res.data) {
      setError(res.error || "Failed to load design intelligence");
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [projectFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExportCsv = async () => {
    const res = await exportDesignRegisterCsvAction(projectFilter || undefined);
    if (!res.success || !res.csv) {
      setError(res.error || "CSV export failed");
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename || "design-register.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
        >
          <option value="">All Projects</option>
          {(data?.projects || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
          >
            <Download className="w-4 h-4" />
            Export Register CSV
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading || !data ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Analyzing portfolio design intelligence...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AppCard>
              <AppCardContent className="pt-4">
                <p className="text-xs text-muted-foreground">GFC Readiness Index</p>
                <p className="text-2xl font-semibold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
                  {data.gfcReadinessPct}%
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data.gfcApprovedCount} / {data.totalDrawings} drawings ready
                </p>
              </AppCardContent>
            </AppCard>
            <AppCard>
              <AppCardContent className="pt-4">
                <p className="text-xs text-muted-foreground">High Revision Churn</p>
                <p className="text-2xl font-semibold tabular-nums mt-1 text-amber-600 dark:text-amber-400">
                  {data.highChurnCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Drawings with 2+ revisions</p>
              </AppCardContent>
            </AppCard>
            <AppCard>
              <AppCardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Stalled Trackers</p>
                <p className="text-2xl font-semibold tabular-nums mt-1 text-sky-600 dark:text-sky-400">
                  {data.stalledCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Idle 7+ days</p>
              </AppCardContent>
            </AppCard>
            <AppCard>
              <AppCardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Overdue Expected</p>
                <p className="text-2xl font-semibold tabular-nums mt-1 text-rose-600 dark:text-rose-400">
                  {data.overdueExpectedCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Unmatched past due date</p>
              </AppCardContent>
            </AppCard>
          </div>

          <AppCard>
            <AppCardHeader>
              <AppCardTitle className="text-base">30-Day Deliverables Forecast</AppCardTitle>
            </AppCardHeader>
            <AppCardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.forecastBuckets.map((b) => (
                  <div key={b.label} className="rounded-md border border-border p-3 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">{b.label}</div>
                    <div className="text-xl font-semibold tabular-nums">{b.expectedCount} expected</div>
                    <div className="text-xs text-muted-foreground">
                      {b.matchedCount} matched · {b.overdueCount} overdue
                    </div>
                  </div>
                ))}
              </div>
            </AppCardContent>
          </AppCard>

          <AppCard>
            <AppCardHeader>
              <AppCardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Detected Risk & Bottleneck Anomalies ({data.anomalies.length})
              </AppCardTitle>
            </AppCardHeader>
            <AppCardContent>
              {data.anomalies.length === 0 ? (
                <EmptyState
                  kind="empty"
                  title="No anomalies detected"
                  description="All active drawings, trackers, and deliverables are progressing normally."
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.anomalies.map((a) => (
                    <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${SEV_CLASS[a.severity]}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {a.severity}
                          </span>
                          <span className="text-sm font-medium">{a.title}</span>
                          <span className="text-xs text-muted-foreground">({a.projectName})</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{a.detail}</p>
                      </div>
                      <Link
                        href={a.linkUrl}
                        className="inline-flex items-center gap-1 px-3 py-1.5 min-h-9 rounded border border-border text-xs hover:bg-elevated shrink-0"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </AppCardContent>
          </AppCard>
        </>
      )}
    </div>
  );
}
