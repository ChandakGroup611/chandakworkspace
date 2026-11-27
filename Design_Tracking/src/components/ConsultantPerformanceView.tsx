"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Award, RefreshCw, Search } from "lucide-react";
import {
  fetchConsultantPerformanceAction,
  type ConsultantScorecardRow,
} from "@/lib/actions/design-operations";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/feedback/States";

const TIER_BADGE: Record<ConsultantScorecardRow["tier"], string> = {
  EXEMPLARY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ON_TRACK: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  NEEDS_ATTENTION: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CRITICAL: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function ConsultantPerformanceView() {
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [scorecards, setScorecards] = useState<ConsultantScorecardRow[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState({
    totalConsultants: 0,
    avgScore: 0,
    exemplaryCount: 0,
    atRiskCount: 0,
    avgFirstTimeApprovalPct: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchConsultantPerformanceAction(projectFilter || undefined);
    if (!res.success) {
      setError(res.error || "Failed to load consultant analytics");
    } else {
      setScorecards(res.scorecards);
      setProjects(res.projects);
      setSummary(res.summary);
    }
    setLoading(false);
  }, [projectFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scorecards
      .filter((s) => !q || s.consultantName.toLowerCase().includes(q) || (s.specialty || "").toLowerCase().includes(q))
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }, [scorecards, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search consultant or specialty..."
              className="pl-9 pr-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm w-64 max-w-full"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Consultants</p><p className="text-xl font-semibold tabular-nums mt-1">{summary.totalConsultants}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Average Score</p><p className="text-xl font-semibold tabular-nums mt-1">{summary.avgScore}/100</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Exemplary</p><p className="text-xl font-semibold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{summary.exemplaryCount}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">At Risk</p><p className="text-xl font-semibold tabular-nums mt-1 text-rose-600 dark:text-rose-400">{summary.atRiskCount}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg First-Time Approval</p><p className="text-xl font-semibold tabular-nums mt-1">{summary.avgFirstTimeApprovalPct}%</p></AppCardContent></AppCard>
      </div>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="text-base">Consultant Performance Scorecards</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Calculating consultant performance...</p>
          ) : filtered.length === 0 ? (
            <EmptyState kind="empty" title="No consultant records" description="Consultant performance metrics appear as packages and drawings are tracked." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-3">Consultant</th>
                    <th className="py-2.5 pr-3 text-right">Expected</th>
                    <th className="py-2.5 pr-3 text-right">Submitted</th>
                    <th className="py-2.5 pr-3 text-right">On-Time %</th>
                    <th className="py-2.5 pr-3 text-right">1st-Time Approval</th>
                    <th className="py-2.5 pr-3 text-right">Avg Revs</th>
                    <th className="py-2.5 pr-3 text-right">Avg Turnaround</th>
                    <th className="py-2.5 pr-3 text-right">SLA Breaches</th>
                    <th className="py-2.5 pr-3 text-right">Open RFIs</th>
                    <th className="py-2.5 pr-3 text-right">Score</th>
                    <th className="py-2.5">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.consultantId} className="hover:bg-elevated/50">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{c.consultantName}</div>
                        <div className="text-xs text-muted-foreground">{c.specialty || c.email || "—"}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.expectedCount}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.submittedCount}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.onTimeRatePct}%</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.firstTimeApprovalPct}%</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.avgRevisionsPerDrawing}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.avgTurnaroundDays}d</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-rose-600 dark:text-rose-400">{c.slaBreachedCount}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.openRfisCount}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{c.performanceScore}</td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[c.tier]}`}>
                          {c.tier.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCardContent>
      </AppCard>
    </div>
  );
}
