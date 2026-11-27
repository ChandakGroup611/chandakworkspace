"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  fetchDrawingCoordinationDetailAction,
  fetchDrawingRevisionHistoryForMatrixAction,
  fetchLiveTenderMatrixAction,
  type DrawingAuditTimelineRow,
  type LiveMatrixDrawingRow,
  type LiveTenderMatrixData,
} from "@/lib/actions/drawing-coordination";

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

const SLA_BADGE: Record<string, string> = {
  WITHIN_SLA: "bg-success-soft text-success-text border-success-border",
  DUE_SOON: "bg-warning-soft text-warning-text border-warning-border",
  OVERDUE: "bg-warning-soft text-warning-text border-warning-border",
  SLA_BREACHED: "bg-danger-soft text-danger-text border-danger-border",
  RESOLVED: "bg-sunken text-muted-foreground border-border",
};

const REGISTER_STATUS_BADGE: Record<string, string> = {
  Approved: "bg-success-soft text-success-text border-success-border",
  "Approved (GFC)": "bg-success-soft text-success-text border-success-border",
  "Site Handed Over": "bg-success-soft text-success-text border-success-border",
  "Under Review": "bg-info-soft text-info-text border-info-border",
  "Revision Requested": "bg-danger-soft text-danger-text border-danger-border",
  "Not Submitted": "bg-sunken text-muted-foreground border-border",
};

export const LiveTenderMatrixView: React.FC = () => {
  const [data, setData] = useState<LiveTenderMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [towerFilter, setTowerFilter] = useState("ALL");
  const [packageFilter, setPackageFilter] = useState("ALL");
  const [subPackageFilter, setSubPackageFilter] = useState("ALL");
  const [consultantFilter, setConsultantFilter] = useState("ALL");
  const [drawingStatusFilter, setDrawingStatusFilter] = useState("ALL");
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL");
  const [slaFilter, setSlaFilter] = useState("ALL");

  // Expandable rows & drill-down
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drilldownCell, setDrilldownCell] = useState<{
    packageName: string;
    subPackageName: string;
    consultantName: string;
    drawings: LiveMatrixDrawingRow[];
  } | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<LiveMatrixDrawingRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<DrawingAuditTimelineRow[]>([]);
  const [revisions, setRevisions] = useState<
    { id: string; revNo: number; submittedByName: string; submittedAt: string; changeSummary: string | null; isGfc: boolean; files: { id: string; fileName: string; fileRole: string; fileSizeBytes: number; storageKey: string }[] }[]
  >([]);
  const [expectedDeliverable, setExpectedDeliverable] = useState<{
    id: string; expectedDrawingRef: string | null; title: string; plannedSubmissionDate: string | null; milestoneName: string | null; priority: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchLiveTenderMatrixAction();
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error || "Could not load Live Tender Design Matrix.");
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDrawingDetail = async (d: LiveMatrixDrawingRow) => {
    setSelectedDrawing(d);
    const [detailRes, revRes] = await Promise.all([
      d.trackerId ? fetchDrawingCoordinationDetailAction(d.trackerId) : Promise.resolve({ success: true, auditLogs: [] }),
      fetchDrawingRevisionHistoryForMatrixAction(d.drawingId),
    ]);
    setAuditLogs(detailRes.success ? detailRes.auditLogs || [] : []);
    if (revRes.success) {
      setRevisions(revRes.revisions || []);
      setExpectedDeliverable(revRes.expectedDeliverable || null);
    } else {
      setRevisions([]);
      setExpectedDeliverable(null);
    }
  };

  // Filtered drawings
  const filteredDrawings = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.drawings.filter((d) => {
      if (projectFilter !== "ALL" && d.projectId !== projectFilter) return false;
      if (towerFilter !== "ALL" && (d.towerName || "") !== towerFilter) return false;
      if (packageFilter !== "ALL" && d.packageId !== packageFilter && d.packageName !== packageFilter) return false;
      if (subPackageFilter !== "ALL" && (d.subPackageName || "") !== subPackageFilter) return false;
      if (consultantFilter !== "ALL" && (d.consultantName || "") !== consultantFilter) return false;
      if (drawingStatusFilter !== "ALL" && d.drawingRegisterStatus !== drawingStatusFilter) return false;
      if (taskStatusFilter !== "ALL" && (d.taskStatusName || "") !== taskStatusFilter) return false;
      if (slaFilter !== "ALL" && (d.slaStatusCode || "") !== slaFilter) return false;
      if (
        q &&
        !d.drawingNumber.toLowerCase().includes(q) &&
        !(d.referenceNumber || "").toLowerCase().includes(q) &&
        !d.title.toLowerCase().includes(q) &&
        !d.packageName.toLowerCase().includes(q) &&
        !(d.subPackageName || "").toLowerCase().includes(q) &&
        !(d.consultantName || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    data,
    searchQuery,
    projectFilter,
    towerFilter,
    packageFilter,
    subPackageFilter,
    consultantFilter,
    drawingStatusFilter,
    taskStatusFilter,
    slaFilter,
  ]);

  // Scoped consultant columns from existing Consultant master & project/package scope
  const scopedConsultants = useMemo(() => {
    if (!data) return [];
    const activeProject = data.projects.find((p) => p.id === projectFilter);
    const activePkg = data.packages.find((p) => p.id === packageFilter);

    const list = data.consultants.filter((c) => {
      if (consultantFilter !== "ALL" && c.firmName !== consultantFilter) return false;
      if (projectFilter !== "ALL") {
        const inActiveProjects = c.activeProjects.includes(projectFilter);
        const inProjectTagged = activeProject?.taggedConsultants.includes(c.id) || activeProject?.taggedConsultants.includes(c.firmName);
        if (c.activeProjects.length > 0 && !inActiveProjects && !inProjectTagged) return false;
      }
      if (packageFilter !== "ALL" && activePkg) {
        const pkgName = activePkg.name.toLowerCase();
        const matchesPkg =
          c.discipline.toLowerCase().includes(pkgName) ||
          c.categories.some((x) => x.toLowerCase().includes(pkgName)) ||
          c.packages.some((x) => x.toLowerCase().includes(pkgName));
        if (!matchesPkg) return false;
      }
      return true;
    });

    // Also include any consultant_name present on filtered drawings so nothing is hidden
    const names = new Set(list.map((c) => c.firmName));
    for (const d of filteredDrawings) {
      if (d.consultantName && !names.has(d.consultantName) && (consultantFilter === "ALL" || consultantFilter === d.consultantName)) {
        names.add(d.consultantName);
        list.push({
          id: `drw-${d.consultantName}`,
          firmName: d.consultantName,
          discipline: d.packageName,
          categories: [],
          packages: [],
          subPackages: [],
          activeProjects: [],
        });
      }
    }
    return list;
  }, [data, projectFilter, packageFilter, consultantFilter, filteredDrawings]);

  // Package -> Sub-package hierarchy rows from existing masters + drawings
  const matrixRows = useMemo(() => {
    if (!data) return [];
    const rows: {
      key: string;
      packageId: string;
      packageName: string;
      subPackageName: string;
      defaultConsultant: string | null;
      drawings: LiveMatrixDrawingRow[];
    }[] = [];
    const seen = new Set<string>();

    for (const sp of data.subPackages) {
      if (packageFilter !== "ALL" && sp.disciplineId !== packageFilter && sp.disciplineName !== packageFilter) continue;
      if (subPackageFilter !== "ALL" && sp.subPackageName !== subPackageFilter) continue;
      const key = `${sp.disciplineName}__${sp.subPackageName}`;
      seen.add(key);
      const matching = filteredDrawings.filter(
        (d) =>
          (d.packageId === sp.disciplineId || d.packageName.toLowerCase() === sp.disciplineName.toLowerCase()) &&
          (d.subPackageName || "").toLowerCase() === sp.subPackageName.toLowerCase()
      );
      if (searchQuery.trim() && matching.length === 0 && !sp.subPackageName.toLowerCase().includes(searchQuery.toLowerCase()) && !sp.disciplineName.toLowerCase().includes(searchQuery.toLowerCase())) {
        continue;
      }
      rows.push({
        key,
        packageId: sp.disciplineId,
        packageName: sp.disciplineName,
        subPackageName: sp.subPackageName,
        defaultConsultant: sp.defaultConsultant,
        drawings: matching,
      });
    }

    // Include drawings whose sub-package isn't in design_sub_packages
    for (const d of filteredDrawings) {
      const spName = d.subPackageName || "General Deliverables";
      const key = `${d.packageName}__${spName}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          key,
          packageId: d.packageId || d.packageName,
          packageName: d.packageName,
          subPackageName: spName,
          defaultConsultant: d.consultantName,
          drawings: filteredDrawings.filter(
            (x) => x.packageName === d.packageName && (x.subPackageName || "General Deliverables") === spName
          ),
        });
      }
    }

    return rows.sort((a, b) => a.packageName.localeCompare(b.packageName) || a.subPackageName.localeCompare(b.subPackageName));
  }, [data, packageFilter, subPackageFilter, filteredDrawings, searchQuery]);

  const drawingStatuses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.drawings.map((d) => d.drawingRegisterStatus))).sort();
  }, [data]);

  const taskStatuses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.drawings.map((d) => d.taskStatusName).filter(Boolean) as string[])).sort();
  }, [data]);

  const exportCsv = () => {
    const headers = ["Package", "Sub-Package", "Drawing No", "Reference No", "Title", "Consultant", "Rev", "Drawing Status", "Task Status", "SLA Status"];
    const lines = filteredDrawings.map((d) =>
      [
        d.packageName,
        d.subPackageName || "—",
        d.drawingNumber,
        d.referenceNumber || "—",
        d.title,
        d.consultantName || "—",
        `R${d.revNo}`,
        d.drawingRegisterStatus,
        d.taskStatusName || "—",
        d.slaStatusName || "—",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...lines].join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `Live_Tender_Design_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (selectedDrawing) {
    return (
      <div className="space-y-4 text-xs">
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-sm text-foreground">{selectedDrawing.drawingNumber}</span>
              <span className="px-2 py-0.5 rounded bg-accent-soft text-primary font-mono font-semibold">
                R{selectedDrawing.revNo}
              </span>
              <span className={`px-2 py-0.5 rounded-full border font-semibold ${REGISTER_STATUS_BADGE[selectedDrawing.drawingRegisterStatus] || REGISTER_STATUS_BADGE["Not Submitted"]}`}>
                {selectedDrawing.drawingRegisterStatus}
              </span>
              {selectedDrawing.slaStatusName && (
                <span className={`px-2 py-0.5 rounded-full border font-semibold ${SLA_BADGE[selectedDrawing.slaStatusCode || "WITHIN_SLA"] || SLA_BADGE.WITHIN_SLA}`}>
                  SLA: {selectedDrawing.slaStatusName}
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-1">
              {selectedDrawing.title} &bull; {selectedDrawing.projectName} ({selectedDrawing.packageName}
              {selectedDrawing.subPackageName ? ` / ${selectedDrawing.subPackageName}` : ""})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/design/tracker"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold"
            >
              <span>Open in Drawing Tracker</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setSelectedDrawing(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Matrix</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Reference Number</div>
              <div className="font-mono font-semibold">{selectedDrawing.referenceNumber || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Consultant</div>
              <div className="font-semibold">{selectedDrawing.consultantName || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Drawing Register Status</div>
              <div className="font-semibold">{selectedDrawing.drawingRegisterStatus}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Task Code / Status</div>
              <div className="font-semibold">
                {selectedDrawing.taskCode || "—"} {selectedDrawing.taskStatusName ? `(${selectedDrawing.taskStatusName})` : ""}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Responsible Dept</div>
              <div className="font-semibold">{selectedDrawing.responsibleDepartmentName || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Responsible User</div>
              <div className="font-semibold">{selectedDrawing.responsibleUserName || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Next Check Date</div>
              <div>{fmtDate(selectedDrawing.nextCheckAt)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Next Creation Date</div>
              <div>{fmtDate(selectedDrawing.nextCreationAt)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Coordination Status</div>
              <div>{selectedDrawing.coordinationStatusName || "—"}</div>
            </div>
            {selectedDrawing.lastReturnReason && (
              <div className="col-span-full p-2.5 rounded-lg border border-danger-border bg-danger-soft/50 text-danger-text">
                <strong>Latest Return Reason:</strong> {selectedDrawing.lastReturnReason}
              </div>
            )}
            {expectedDeliverable && (
              <div className="col-span-full p-2.5 rounded-lg border border-border bg-sunken/40 space-y-1">
                <div className="font-semibold text-foreground">Matched Expected Deliverable</div>
                <div className="text-[11px] text-muted-foreground">
                  {expectedDeliverable.expectedDrawingRef ? `[${expectedDeliverable.expectedDrawingRef}] ` : ""}
                  {expectedDeliverable.title} &bull; Planned: {expectedDeliverable.plannedSubmissionDate || "—"} &bull; Priority: {expectedDeliverable.priority}
                </div>
              </div>
            )}
            <div className="col-span-full space-y-2 pt-2 border-t border-border">
              <div className="font-semibold text-foreground">Drawing Revisions &amp; Files ({revisions.length})</div>
              {revisions.length === 0 ? (
                <p className="text-muted-foreground">No revisions submitted yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {revisions.map((rv) => (
                    <div key={rv.id} className="p-2 rounded border border-border bg-sunken/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">R{rv.revNo} {rv.isGfc ? "• GFC" : ""}</span>
                        <span className="text-[10px] text-muted-foreground">{rv.submittedByName} • {fmtDate(rv.submittedAt)}</span>
                      </div>
                      {rv.changeSummary && <div className="text-[11px] text-muted-foreground">{rv.changeSummary}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {rv.files.map((f) => (
                          <span key={f.id} className="px-2 py-0.5 rounded bg-surface border border-border font-mono text-[10px]">
                            {f.fileName} ({f.fileRole})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-4 space-y-2.5">
            <div className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Audit Timeline</span>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No coordination audit events yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.map((a) => (
                  <div key={a.id} className="p-2 rounded-lg border border-border bg-sunken/40 space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span>{a.action.replace(/_/g, " ")}</span>
                      <span className="font-mono text-[10px]">R{a.revNo}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {a.actorEmail || "System"} &bull; {fmtDate(a.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Management Summary Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            ["Deliverables", data.summary.totalDeliverables, "text-foreground"],
            ["Submitted", data.summary.submitted, "text-primary"],
            ["Approved", data.summary.approved, "text-success-text"],
            ["Received", data.summary.received, "text-info-text"],
            ["Under Review", data.summary.underReview, "text-info-text"],
            ["Returned", data.summary.returnedForRevision, "text-danger-text"],
            ["Completed", data.summary.completed, "text-success-text"],
            ["SLA Breached", data.summary.slaBreached, "text-danger-text"],
          ].map(([label, val, cls]) => (
            <div key={String(label)} className="bg-surface border border-border rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
              <div className={`text-lg font-bold ${cls}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-3 space-y-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search package, sub-package, drawing no, ref, consultant…"
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Project">
            <option value="ALL">All Projects</option>
            {(data?.projects || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={towerFilter} onChange={(e) => setTowerFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Sub-project">
            <option value="ALL">All Sub-projects</option>
            {(data?.towers || [])
              .filter((t) => projectFilter === "ALL" || t.projectId === projectFilter)
              .map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
          </select>
          <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Package">
            <option value="ALL">All Packages</option>
            {(data?.packages || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={subPackageFilter} onChange={(e) => setSubPackageFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Sub-package">
            <option value="ALL">All Sub-packages</option>
            {(data?.subPackages || []).map((sp) => (
              <option key={sp.id} value={sp.subPackageName}>{sp.subPackageName}</option>
            ))}
          </select>
          <select value={consultantFilter} onChange={(e) => setConsultantFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Consultant">
            <option value="ALL">All Consultants</option>
            {(data?.consultants || []).map((c) => (
              <option key={c.id} value={c.firmName}>{c.firmName}</option>
            ))}
          </select>
          <select value={drawingStatusFilter} onChange={(e) => setDrawingStatusFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Drawing Status">
            <option value="ALL">All Drawing Statuses</option>
            {drawingStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="Task Status">
            <option value="ALL">All Task Statuses</option>
            {taskStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" aria-label="SLA Status">
            <option value="ALL">All SLA Statuses</option>
            <option value="WITHIN_SLA">Within SLA</option>
            <option value="DUE_SOON">Due Soon</option>
            <option value="OVERDUE">Overdue</option>
            <option value="SLA_BREACHED">SLA Breached</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {error && <p className="p-3 rounded-lg border border-danger-border bg-danger-soft text-danger-text">{error}</p>}

      {drilldownCell && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">
              {drilldownCell.packageName} / {drilldownCell.subPackageName} &bull; {drilldownCell.consultantName} ({drilldownCell.drawings.length} drawings)
            </div>
            <button type="button" onClick={() => setDrilldownCell(null)} className="px-2.5 py-1 rounded border border-border cursor-pointer">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {drilldownCell.drawings.map((d) => (
              <button
                key={d.drawingId}
                type="button"
                onClick={() => openDrawingDetail(d)}
                className="text-left p-2.5 rounded-lg border border-border hover:bg-sunken space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{d.drawingNumber} (R{d.revNo})</span>
                  <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${REGISTER_STATUS_BADGE[d.drawingRegisterStatus] || REGISTER_STATUS_BADGE["Not Submitted"]}`}>
                    {d.drawingRegisterStatus}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">{d.title}</div>
                {d.slaStatusName && (
                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${SLA_BADGE[d.slaStatusCode || "WITHIN_SLA"] || SLA_BADGE.WITHIN_SLA}`}>
                    SLA: {d.slaStatusName}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sunken border-b border-border text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3 min-w-56 sticky left-0 bg-sunken z-10">Package / Sub-Package</th>
                {scopedConsultants.map((c) => (
                  <th key={c.id} className="py-2.5 px-3 min-w-44">
                    <div className="font-semibold text-foreground">{c.firmName}</div>
                    {c.discipline && <div className="text-[10px] font-normal">{c.discipline}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={Math.max(2, scopedConsultants.length + 1)} className="py-10 text-center text-muted-foreground">
                    Loading Live Tender Design Matrix…
                  </td>
                </tr>
              ) : matrixRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(2, scopedConsultants.length + 1)} className="py-10 text-center text-muted-foreground">
                    No matching packages or drawing deliverables found.
                  </td>
                </tr>
              ) : (
                matrixRows.map((row) => {
                  const isOpen = expandedRows.has(row.key);
                  return (
                    <React.Fragment key={row.key}>
                      <tr className="hover:bg-sunken/30">
                        <td className="py-2.5 px-3 sticky left-0 bg-surface z-10 border-r border-border">
                          <div className="flex items-start gap-1.5">
                            {row.drawings.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRows((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(row.key)) next.delete(row.key);
                                    else next.add(row.key);
                                    return next;
                                  })
                                }
                                className="mt-0.5 p-0.5 rounded hover:bg-sunken cursor-pointer"
                                aria-label="Toggle drawings"
                              >
                                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded bg-accent-soft text-primary text-[10px] font-semibold">
                                {row.packageName}
                              </span>
                              <div className="font-semibold text-foreground mt-0.5">{row.subPackageName}</div>
                              <div className="text-[10px] text-muted-foreground">{row.drawings.length} drawing(s)</div>
                            </div>
                          </div>
                        </td>
                        {scopedConsultants.map((c) => {
                          const cellDrawings = row.drawings.filter(
                            (d) => (d.consultantName || row.defaultConsultant || "").toLowerCase() === c.firmName.toLowerCase()
                          );
                          const isScoped =
                            !c.discipline ||
                            c.discipline.toLowerCase().includes(row.packageName.toLowerCase()) ||
                            row.packageName.toLowerCase().includes(c.discipline.toLowerCase()) ||
                            c.categories.some((x) => x.toLowerCase().includes(row.packageName.toLowerCase())) ||
                            c.packages.some((x) => x.toLowerCase().includes(row.packageName.toLowerCase())) ||
                            cellDrawings.length > 0;

                          if (!isScoped) {
                            return <td key={c.id} className="py-2.5 px-3 text-muted-foreground/40 text-center">—</td>;
                          }
                          if (cellDrawings.length === 0) {
                            return (
                              <td key={c.id} className="py-2.5 px-3 text-[11px] text-muted-foreground">
                                Not Submitted
                              </td>
                            );
                          }
                          const first = cellDrawings[0];
                          const breachedCount = cellDrawings.filter((d) => d.slaStatusCode === "SLA_BREACHED").length;
                          return (
                            <td key={c.id} className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() =>
                                  cellDrawings.length === 1
                                    ? openDrawingDetail(first)
                                    : setDrilldownCell({
                                        packageName: row.packageName,
                                        subPackageName: row.subPackageName,
                                        consultantName: c.firmName,
                                        drawings: cellDrawings,
                                      })
                                }
                                className="w-full text-left p-2 rounded-lg border border-border hover:bg-sunken space-y-1 cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${REGISTER_STATUS_BADGE[first.drawingRegisterStatus] || REGISTER_STATUS_BADGE["Not Submitted"]}`}>
                                    {first.drawingRegisterStatus}
                                  </span>
                                  {cellDrawings.length > 1 && (
                                    <span className="text-[10px] font-mono text-muted-foreground">{cellDrawings.length} docs</span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground truncate">
                                  {first.drawingNumber} (R{first.revNo})
                                </div>
                                {first.slaStatusName && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${SLA_BADGE[first.slaStatusCode || "WITHIN_SLA"] || SLA_BADGE.WITHIN_SLA}`}>
                                    {breachedCount > 0 ? `${breachedCount} SLA Breached` : `SLA: ${first.slaStatusName}`}
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                      {isOpen &&
                        row.drawings.map((d) => (
                          <tr key={d.drawingId} className="bg-sunken/20 hover:bg-sunken/40">
                            <td colSpan={Math.max(2, scopedConsultants.length + 1)} className="py-2 px-8">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-semibold">{d.drawingNumber}</span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border">
                                    R{d.revNo}
                                  </span>
                                  <span>{d.title}</span>
                                  {d.consultantName && <span className="text-muted-foreground">• {d.consultantName}</span>}
                                  <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${REGISTER_STATUS_BADGE[d.drawingRegisterStatus] || REGISTER_STATUS_BADGE["Not Submitted"]}`}>
                                    {d.drawingRegisterStatus}
                                  </span>
                                  {d.slaStatusName && (
                                    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${SLA_BADGE[d.slaStatusCode || "WITHIN_SLA"] || SLA_BADGE.WITHIN_SLA}`}>
                                      SLA: {d.slaStatusName}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openDrawingDetail(d)}
                                  className="px-2.5 py-1 rounded border border-border bg-surface hover:bg-sunken text-[11px] font-semibold cursor-pointer"
                                >
                                  View Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
