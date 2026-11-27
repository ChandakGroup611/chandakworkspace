"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { fetchDesignCockpitAction, type DesignCockpitData } from "@/lib/actions/design-cockpit";

export const DesignCockpitView: React.FC = () => {
  const [data, setData] = useState<DesignCockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState("ALL");
  const [packageId, setPackageId] = useState("ALL");
  const [subPackageName, setSubPackageName] = useState("ALL");
  const [consultantName, setConsultantName] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchDesignCockpitAction({
      projectId,
      packageId,
      subPackageName,
      consultantName,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setLoading(false);
    if (res.success && res.data) setData(res.data);
  }, [projectId, packageId, subPackageName, consultantName, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 text-xs">
      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" aria-label="Project">
            <option value="ALL">All Projects</option>
            {(data?.masters.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" aria-label="Package">
            <option value="ALL">All Packages</option>
            {(data?.masters.packages || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={subPackageName} onChange={(e) => setSubPackageName(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" aria-label="Sub-package">
            <option value="ALL">All Sub-packages</option>
            {Array.from(new Set((data?.masters.subPackages || []).map((s) => s.name))).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={consultantName} onChange={(e) => setConsultantName(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" aria-label="Consultant">
            <option value="ALL">All Consultants</option>
            {(data?.masters.consultants || []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="From date" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="To date" />
        </div>
        <button type="button" onClick={() => load()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 10 Management KPIs */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            ["Expected Drawings", data.kpis.totalExpected, "text-foreground"],
            ["Submitted Drawings", data.kpis.totalSubmitted, "text-primary"],
            ["Pending Submissions", data.kpis.pendingSubmissions, "text-warning-text"],
            ["Approved Drawings", data.kpis.approvedDrawings, "text-success-text"],
            ["Under Coordination", data.kpis.underCoordination, "text-info-text"],
            ["Returned for Revision", data.kpis.returnedForRevision, "text-danger-text"],
            ["Completed Coordination", data.kpis.completedCoordination, "text-success-text"],
            ["Overdue Drawings", data.kpis.overdueDrawings, "text-danger-text"],
            ["SLA Breaches", data.kpis.slaBreaches, "text-danger-text"],
            ["Upcoming (7d)", data.kpis.upcomingSubmissions, "text-primary"],
          ].map(([label, val, cls]) => (
            <div key={String(label)} className="bg-surface border border-border rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
              <div className={`text-xl font-bold ${cls}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {loading && !data ? (
        <p className="py-10 text-center text-muted-foreground">Loading Design Management Cockpit…</p>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. Expected vs Actual & 2. Package Progress */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
            <div className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Expected vs Actual &amp; Package Progress</div>
            {data.charts.expectedVsActual.length === 0 ? <p className="text-muted-foreground">No package data.</p> : (
              <div className="space-y-2">
                {data.charts.expectedVsActual.map((p) => {
                  const pct = Math.min(100, Math.round((p.submitted / Math.max(1, p.expected || p.submitted)) * 100));
                  return (
                    <div key={p.label} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-muted-foreground">Exp {p.expected} • Sub {p.submitted} • App {p.approved}</span>
                      </div>
                      <div className="h-2 rounded-full bg-sunken overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Sub-package Progress */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
            <div className="font-semibold text-sm">Sub-package Progress</div>
            <div className="max-h-52 overflow-y-auto divide-y divide-border">
              {data.charts.subPackageProgress.slice(0, 12).map((s) => (
                <div key={`${s.packageName}-${s.subPackageName}`} className="py-1.5 flex justify-between">
                  <span>{s.subPackageName} <span className="text-muted-foreground">({s.packageName})</span></span>
                  <span className="font-mono font-semibold">{s.submitted}/{s.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Consultant Submission Performance */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
            <div className="font-semibold text-sm">Consultant Submission Performance</div>
            <div className="max-h-52 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] text-muted-foreground uppercase border-b border-border">
                  <tr><th className="py-1.5">Consultant</th><th className="py-1.5 text-right">Exp</th><th className="py-1.5 text-right">Sub</th><th className="py-1.5 text-right">App</th><th className="py-1.5 text-right">Ret</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.charts.consultantPerformance.map((c) => (
                    <tr key={c.consultantName}>
                      <td className="py-1.5 font-medium">{c.consultantName}</td>
                      <td className="py-1.5 text-right">{c.expected}</td>
                      <td className="py-1.5 text-right">{c.submitted}</td>
                      <td className="py-1.5 text-right text-success-text">{c.approved}</td>
                      <td className="py-1.5 text-right text-danger-text">{c.returned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Approval Turnaround & 6. Revision Frequency */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="font-semibold text-sm">Approval Turnaround &amp; Revision Frequency</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground">Avg Approval Days</div>
                {data.charts.approvalTurnaround.map((a) => (
                  <div key={a.packageName} className="flex justify-between">
                    <span>{a.packageName}</span>
                    <span className="font-mono font-semibold">{a.avgDays}d ({a.count})</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground">Revision Distribution</div>
                {data.charts.revisionFrequency.map((r) => (
                  <div key={r.revision} className="flex justify-between">
                    <span className="font-mono">{r.revision}</span>
                    <span className="font-mono font-semibold">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7. Pending by Responsible Dept & 8. SLA Breach Trends */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="font-semibold text-sm">Pending by Department &amp; SLA Trends</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground">Pending Workload</div>
                {data.charts.pendingByDepartment.length === 0 ? <span className="text-muted-foreground">None</span> : data.charts.pendingByDepartment.map((d) => (
                  <div key={d.departmentName} className="flex justify-between"><span>{d.departmentName}</span><span className="font-semibold">{d.count}</span></div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground">SLA Breach Trends</div>
                {data.charts.slaBreachTrends.length === 0 ? <span className="text-muted-foreground">No breaches</span> : data.charts.slaBreachTrends.map((s) => (
                  <div key={s.month} className="flex justify-between"><span className="font-mono">{s.month}</span><span className="text-danger-text font-semibold">{s.breached} breached</span></div>
                ))}
              </div>
            </div>
          </div>

          {/* 9. Upcoming Deadlines & 10. Monthly Trends */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="font-semibold text-sm">Upcoming Deadlines &amp; Monthly Trends</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground">Upcoming Expected</div>
                {data.charts.upcomingDeadlines.length === 0 ? <span className="text-muted-foreground">None</span> : data.charts.upcomingDeadlines.slice(0, 5).map((u, idx) => (
                  <div key={idx} className="truncate">{u.plannedDate} • {u.drawingTitle}</div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground">Monthly Submissions</div>
                {data.charts.monthlyTrends.map((m) => (
                  <div key={m.month} className="flex justify-between"><span className="font-mono">{m.month}</span><span>Sub {m.submitted} / App {m.approved}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
