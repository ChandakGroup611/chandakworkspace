"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DesignMasterStore, MasterStoreState } from "../services/designMasterStore";
import { WorkPackageMaster, TowerMaster, ProjectMaster } from "../types/masterTypes";
import { 
  Search, 
  Download, 
  Layers, 
  Building, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info,
  X,
  Edit2,
  Calendar,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Check,
  FileSpreadsheet
} from "lucide-react";

interface MatrixColumn {
  colKey: string;
  projectId: string;
  projectName: string;
  towerId: string;
  towerName: string;
  towerType: string;
}

export const TenderDesignMatrix: React.FC = () => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCell, setActiveCell] = useState<{
    pkg: WorkPackageMaster;
    col: MatrixColumn;
    currentVal: string;
  } | null>(null);

  // Status edit draft
  const [cellEditDraft, setCellEditDraft] = useState<string>("");

  // Subscribe to real-time master store updates
  useEffect(() => {
    const unsub = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
    });
    return () => unsub();
  }, []);

  // Compute dynamic project tower columns
  const visibleColumns = useMemo<MatrixColumn[]>(() => {
    const projectMap = new Map(storeState.projects.map(p => [p.id, p.name]));
    let towers = storeState.towers;
    if (selectedProject !== "ALL") {
      towers = towers.filter(t => t.projectId === selectedProject);
    }

    return towers.map(t => ({
      colKey: t.id,
      projectId: t.projectId,
      projectName: projectMap.get(t.projectId) || "Development",
      towerId: t.id,
      towerName: t.towerName,
      towerType: t.towerType
    }));
  }, [storeState.projects, storeState.towers, selectedProject]);

  // Unique disciplines
  const categories = useMemo(() => {
    const set = new Set(storeState.packages.map(p => p.disciplineName).filter(Boolean));
    return Array.from(set);
  }, [storeState.packages]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return storeState.packages.filter(pkg => {
      if (categoryFilter !== "ALL" && pkg.disciplineName !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = pkg.packageName.toLowerCase().includes(q) || pkg.disciplineName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (statusFilter !== "ALL") {
        const hasMatchingStatus = visibleColumns.some(col => {
          const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
          const val = (entry ? (entry.targetDate || entry.status) : "NA").toLowerCase();
          if (statusFilter === "RECEIVED" && val.includes("received")) return true;
          if (statusFilter === "PENDING" && (val.includes("pending") || val.includes("not onboard"))) return true;
          if (statusFilter === "IN_PROGRESS" && (val.includes("progress") || val.includes("onboard"))) return true;
          if (statusFilter === "TARGET_DATE" && !val.includes("received") && !val.includes("pending") && !val.includes("na") && val.trim().length > 0 && val !== "-") return true;
          return false;
        });
        if (!hasMatchingStatus) return false;
      }

      return true;
    });
  }, [storeState.packages, storeState.packageStatuses, categoryFilter, searchQuery, statusFilter, visibleColumns]);

  // Live statistical calculation across current visible view
  const matrixStats = useMemo(() => {
    let received = 0;
    let inProgress = 0;
    let pending = 0;
    let targetDates = 0;
    let totalCells = 0;

    for (const pkg of filteredPackages) {
      for (const col of visibleColumns) {
        const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
        const val = (entry ? (entry.targetDate || entry.status) : "NA").toLowerCase();
        if (val === "na" || val === "-") continue;
        totalCells++;
        if (val.includes("received")) received++;
        else if (val.includes("pending") || val.includes("not onboard")) pending++;
        else if (val.includes("progress") || val.includes("onboard") || val.includes("track")) inProgress++;
        else targetDates++;
      }
    }

    const rate = totalCells > 0 ? Math.round((received / totalCells) * 100) : 0;
    return { received, inProgress, pending, targetDates, totalCells, rate };
  }, [filteredPackages, visibleColumns, storeState.packageStatuses]);

  // Helper for cell badge styling
  const renderCellBadge = (rawVal: string) => {
    const val = (rawVal || "NA").trim();
    const lower = val.toLowerCase();

    if (lower === "na" || lower === "not applicable" || lower === "-") {
      return (
        <span className="text-[11px] font-mono text-muted-foreground/30 select-none">
          —
        </span>
      );
    }

    if (lower.includes("received")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[110px]" title={val}>{val}</span>
        </span>
      );
    }

    if (lower.includes("pending") || lower.includes("not onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="truncate max-w-[110px]" title={val}>{val}</span>
        </span>
      );
    }

    if (lower.includes("progress") || lower.includes("onboard") || lower.includes("track")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="truncate max-w-[110px]" title={val}>{val}</span>
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 inline-flex items-center gap-1 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        <span className="truncate max-w-[110px]" title={val}>{val}</span>
      </span>
    );
  };

  // Open inspector
  const handleOpenInspector = (pkg: WorkPackageMaster, col: MatrixColumn, currentVal: string) => {
    setActiveCell({ pkg, col, currentVal });
    setCellEditDraft(currentVal);
  };

  // Apply cell update into dynamic store
  const handleSaveCell = (newVal: string) => {
    if (!activeCell) return;
    const { pkg, col } = activeCell;

    let status: any = "NA";
    let targetDate: string | undefined = undefined;
    const lower = newVal.toLowerCase();

    if (lower.includes("received")) status = "Received";
    else if (lower.includes("pending")) status = "Pending";
    else if (lower.includes("progress")) status = "In progress";
    else if (newVal !== "NA" && newVal.trim().length > 0) {
      status = "Target Date";
      targetDate = newVal;
    }

    DesignMasterStore.recordPackageStatus(
      col.projectId,
      col.towerId,
      pkg.id,
      status,
      targetDate,
      undefined,
      newVal
    );

    setActiveCell(null);
  };

  // Real CSV export
  const handleExportCsv = () => {
    const headers = ["Discipline Category", "Work Package Name", ...visibleColumns.map(c => `${c.projectName} - ${c.towerName}`)];
    const rows = filteredPackages.map(pkg => {
      const rowVals = visibleColumns.map(col => {
        const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
        return `"${(entry ? (entry.targetDate || entry.status) : "NA").replace(/"/g, '""')}"`;
      });
      return [`"${pkg.disciplineName}"`, `"${pkg.packageName.replace(/"/g, '""')}"`, ...rowVals].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Tender_Design_Matrix_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Control Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        {/* Row 1: Header title, live search, and CSV export */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30 shadow-inner">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground tracking-tight">
                  Tender Design Package Master Matrix
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  {filteredPackages.length} Packages Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic master matrix rendered across {storeState.projects.length} development projects and {visibleColumns.length} individual tower wings
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search package (e.g. Civil, MEP, Lift)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">🏢 All {storeState.projects.length} Projects ({visibleColumns.length} Wings)</option>
              {storeState.projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Download filtered matrix as Excel CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Row 2: Discipline Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Discipline:</span>
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              categoryFilter === "ALL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Disciplines ({categories.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Row 3: Status Pills & Live Progress Summary Bar */}
        <div className="pt-3 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">Status Filter:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px] ${
                statusFilter === "ALL" ? "bg-foreground text-background font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({filteredPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("RECEIVED")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                statusFilter === "RECEIVED" ? "bg-emerald-500 text-white font-bold" : "text-emerald-600 dark:text-emerald-400 hover:underline"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Received ({matrixStats.received})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("IN_PROGRESS")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                statusFilter === "IN_PROGRESS" ? "bg-amber-500 text-white font-bold" : "text-amber-600 dark:text-amber-400 hover:underline"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>In Progress ({matrixStats.inProgress})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                statusFilter === "PENDING" ? "bg-rose-500 text-white font-bold" : "text-rose-600 dark:text-rose-400 hover:underline"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Pending ({matrixStats.pending})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("TARGET_DATE")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                statusFilter === "TARGET_DATE" ? "bg-sky-500 text-white font-bold" : "text-sky-600 dark:text-sky-400 hover:underline"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              <span>Target Dates ({matrixStats.targetDates})</span>
            </button>
          </div>

          {/* Mini Health Strip */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Compliance Rate:</span>
              <span className="text-xs font-black text-emerald-500 font-mono">{matrixStats.rate}%</span>
            </div>
            <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${matrixStats.rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Matrix Table with Frozen Header & First Column */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border shadow-xs">
              {/* Row 1: Project Names & Tower Headers */}
              <tr>
                <th 
                  className="p-3.5 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border min-w-[260px] max-w-[300px] font-black text-foreground uppercase tracking-wider text-[11px] shadow-sm"
                >
                  Work Package & Discipline
                </th>
                {visibleColumns.map((col, idx) => (
                  <th
                    key={idx}
                    className="p-2.5 text-center font-bold text-foreground border-r border-border/40 text-[10px] uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 min-w-[130px]"
                  >
                    <div className="truncate font-black text-foreground">{col.projectName}</div>
                    <div className="text-muted-foreground font-mono font-semibold text-[9px] mt-0.5 px-1 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 inline-block">
                      {col.towerName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-16 text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Info className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                      <p className="font-semibold text-foreground">No matching packages found</p>
                      <p className="text-xs">Add new packages in the Masters Setup or adjust filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    {/* Frozen Package Name Column */}
                    <td className="p-3.5 sticky left-0 z-10 bg-surface group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-border font-medium text-foreground shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {pkg.disciplineName}
                        </span>
                      </div>
                      <div className="font-bold text-foreground text-xs leading-snug">
                        {pkg.packageName}
                      </div>
                    </td>

                    {/* Status Cells */}
                    {visibleColumns.map((col, colIdx) => {
                      const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
                      const val = entry ? (entry.targetDate || entry.status) : "NA";
                      return (
                        <td
                          key={colIdx}
                          onClick={() => handleOpenInspector(pkg, col, val)}
                          className="p-2 border-r border-border/30 text-center cursor-pointer hover:bg-emerald-500/5 transition-colors group/cell"
                          title={`Click to update: ${pkg.packageName} • ${col.projectName} (${col.towerName})`}
                        >
                          <div className="flex items-center justify-center">
                            {renderCellBadge(val)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Cell Status Inspector & Update Drawer Modal */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                  <Edit2 className="h-3 w-3" />
                  <span>Package Status Inspector</span>
                </span>
                <h4 className="text-base font-bold text-foreground">
                  {activeCell.pkg.packageName}
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-semibold text-foreground">{activeCell.col.projectName}</span>
                  <span>•</span>
                  <span>Wing: <strong>{activeCell.col.towerName}</strong></span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Details Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Discipline Category:</span>
                <strong className="text-foreground">{activeCell.pkg.disciplineName}</strong>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Current Recorded Status:</span>
                <div className="font-bold">{renderCellBadge(activeCell.currentVal)}</div>
              </div>
            </div>

            {/* Quick Status Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Quick Update Status:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCell("Received")}
                  className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Mark Received</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCell("In progress")}
                  className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Mark In Progress</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCell("Pending")}
                  className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span>Mark Pending</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCell("NA")}
                  className="p-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Mark Not Applicable (NA)</span>
                </button>
              </div>
            </div>

            {/* Custom Target Date or Text Input */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-bold text-foreground block">
                Custom Target Date / Consultant Remark:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cellEditDraft}
                  onChange={e => setCellEditDraft(e.target.value)}
                  placeholder="e.g. 30-Aug, Onboarded, Delayed by BMC"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveCell(cellEditDraft || "NA")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="px-4 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

