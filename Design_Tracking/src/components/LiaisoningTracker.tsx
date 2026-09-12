"use client";

import React, { useState, useMemo } from "react";
import { 
  EY_LIAISON_CONSULTANTS, 
  EY_PROJECT_COLUMNS, 
  EY_UNIQUE_PROJECTS,
  LiaisonConsultantItem,
  ProjectTowerColumn
} from "../data/eyTenderData";
import { 
  Shield, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  FileCheck2,
  Users,
  LayoutGrid,
  Table as TableIcon,
  FileSpreadsheet,
  X,
  Edit2,
  Check,
  ShieldCheck,
  Building,
  Flame,
  Trees,
  Plane,
  FileBadge2
} from "lucide-react";

export const LiaisoningTracker: React.FC = () => {
  const [consultants, setConsultants] = useState<LiaisonConsultantItem[]>(EY_LIAISON_CONSULTANTS);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [onboardFilter, setOnboardFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"MATRIX" | "CARDS">("MATRIX");
  const [activeCell, setActiveCell] = useState<{
    item: LiaisonConsultantItem;
    col: ProjectTowerColumn;
    currentVal: string;
  } | null>(null);

  const visibleColumns = useMemo(() => {
    if (selectedProject === "ALL") return EY_PROJECT_COLUMNS;
    return EY_PROJECT_COLUMNS.filter(c => c.project === selectedProject);
  }, [selectedProject]);

  const filteredConsultants = useMemo(() => {
    return consultants.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = item.consultantTitle.toLowerCase().includes(q) || item.scope.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (onboardFilter !== "ALL") {
        const hasMatch = visibleColumns.some(col => {
          const val = (item.statuses[`${col.project}__${col.tower}`] || "").toLowerCase();
          if (onboardFilter === "ONBOARD" && (val.includes("onboard") || val.includes("fixed")) && !val.includes("not onboard")) return true;
          if (onboardFilter === "NOT_ONBOARD" && val.includes("not onboard")) return true;
          return false;
        });
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [consultants, searchQuery, onboardFilter, visibleColumns]);

  // Overall compliance stats
  const complianceStats = useMemo(() => {
    let onboardCount = 0;
    let notOnboardCount = 0;
    let totalCells = 0;

    for (const item of filteredConsultants) {
      for (const col of visibleColumns) {
        const val = (item.statuses[`${col.project}__${col.tower}`] || "NA").toLowerCase();
        if (val === "na" || val === "-") continue;
        totalCells++;
        if (val.includes("not onboard")) notOnboardCount++;
        else if (val.includes("onboard") || val.includes("fixed")) onboardCount++;
      }
    }

    const rate = totalCells > 0 ? Math.round((onboardCount / totalCells) * 100) : 0;
    return { onboardCount, notOnboardCount, totalCells, rate };
  }, [filteredConsultants, visibleColumns]);

  const renderBadge = (rawVal: string) => {
    const val = (rawVal || "NA").trim();
    const lower = val.toLowerCase();

    if (lower === "na" || lower === "-") {
      return <span className="text-[11px] text-muted-foreground/30 font-mono select-none">—</span>;
    }
    if (lower.includes("not onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span>Not Onboard</span>
        </span>
      );
    }
    if (lower.includes("onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{lower.includes("pending") ? "Compliance Pending" : "Onboard"}</span>
        </span>
      );
    }
    if (lower.includes("fixed")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>Fixed Partner</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-foreground border border-border">
        {val}
      </span>
    );
  };

  const handleUpdateStatus = (newVal: string) => {
    if (!activeCell) return;
    const { item, col } = activeCell;
    const key = `${col.project}__${col.tower}`;

    setConsultants(prev => prev.map(c => {
      if (c.id === item.id) {
        return {
          ...c,
          statuses: {
            ...c.statuses,
            [key]: newVal
          }
        };
      }
      return c;
    }));

    setActiveCell(null);
  };

  const handleExportCsv = () => {
    const headers = ["Statutory Authority / Scope", "Scope Description", ...visibleColumns.map(c => `${c.project} - ${c.tower}`)];
    const rows = filteredConsultants.map(item => {
      const rowVals = visibleColumns.map(col => `"${(item.statuses[`${col.project}__${col.tower}`] || "NA").replace(/"/g, '""')}"`);
      return [`"${item.consultantTitle.replace(/"/g, '""')}"`, `"${(item.scope || "").replace(/"/g, '""')}"`, ...rowVals].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Statutory_Liaisoning_${selectedProject}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAuthorityIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("fire") || lower.includes("cfo")) return <Flame className="h-4 w-4 text-orange-500" />;
    if (lower.includes("tree")) return <Trees className="h-4 w-4 text-emerald-500" />;
    if (lower.includes("aviation") || lower.includes("aai")) return <Plane className="h-4 w-4 text-sky-500" />;
    if (lower.includes("rera")) return <FileBadge2 className="h-4 w-4 text-purple-500" />;
    if (lower.includes("architect") || lower.includes("liaison")) return <Building2 className="h-4 w-4 text-blue-500" />;
    return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Control Header Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center border border-purple-500/30 shadow-inner">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground tracking-tight">
                  Statutory Liaisoning & Authority NOC Matrix
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  {filteredConsultants.length} Authorities Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Municipal BMC sanctions, CFO Fire NOC, Tree Authority, Civil Aviation, RERA, and Environmental compliance onboarding
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* View Mode Toggle */}
            <div className="p-0.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-800 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("MATRIX")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "MATRIX" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Matrix Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "CARDS" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Authority Cards</span>
              </button>
            </div>

            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-surface text-xs font-bold text-foreground focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">🏢 All 11 Projects</option>
              {EY_UNIQUE_PROJECTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 sm:w-52">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search NOC / Consultant..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-purple-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Compliance Health Bar */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">Filter Onboarding:</span>
            <button
              type="button"
              onClick={() => setOnboardFilter("ALL")}
              className={`px-2.5 py-0.5 rounded-md font-semibold cursor-pointer text-[11px] ${
                onboardFilter === "ALL" ? "bg-foreground text-background font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({filteredConsultants.length})
            </button>
            <button
              type="button"
              onClick={() => setOnboardFilter("ONBOARD")}
              className={`px-2.5 py-0.5 rounded-md font-semibold cursor-pointer text-[11px] flex items-center gap-1 ${
                onboardFilter === "ONBOARD" ? "bg-emerald-500 text-white font-bold" : "text-emerald-600 dark:text-emerald-400 hover:underline"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Onboarded ({complianceStats.onboardCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOnboardFilter("NOT_ONBOARD")}
              className={`px-2.5 py-0.5 rounded-md font-semibold cursor-pointer text-[11px] flex items-center gap-1 ${
                onboardFilter === "NOT_ONBOARD" ? "bg-rose-500 text-white font-bold" : "text-rose-600 dark:text-rose-400 hover:underline"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Pending Onboard ({complianceStats.notOnboardCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground font-medium">Compliance Readiness:</span>
            <span className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">{complianceStats.rate}%</span>
            <div className="w-28 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${complianceStats.rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* View 1: Matrix Table */}
      {viewMode === "MATRIX" && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border shadow-xs">
                <tr>
                  <th className="p-3.5 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border min-w-[260px] font-black text-foreground uppercase tracking-wider text-[11px] shadow-sm">
                    Statutory Authority / Scope
                  </th>
                  {visibleColumns.map((col, idx) => (
                    <th
                      key={idx}
                      className="p-2.5 text-center font-bold text-foreground border-r border-border/40 text-[10px] uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 min-w-[125px]"
                    >
                      <div className="truncate font-black text-foreground">{col.project}</div>
                      <div className="text-muted-foreground font-mono font-semibold text-[9px] mt-0.5 px-1 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 inline-block">
                        {col.tower}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {filteredConsultants.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="p-3.5 sticky left-0 z-10 bg-surface group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-border shadow-sm">
                      <div className="flex items-center gap-2">
                        {getAuthorityIcon(item.consultantTitle)}
                        <div>
                          <div className="font-bold text-foreground text-xs leading-snug">
                            {item.consultantTitle}
                          </div>
                          {item.scope && item.scope !== item.consultantTitle && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.scope}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {visibleColumns.map((col, colIdx) => {
                      const val = item.statuses[`${col.project}__${col.tower}`] || "NA";
                      return (
                        <td 
                          key={colIdx} 
                          onClick={() => setActiveCell({ item, col, currentVal: val })}
                          className="p-2 border-r border-border/30 text-center cursor-pointer hover:bg-purple-500/5 transition-colors"
                          title={`Click to update: ${item.consultantTitle} • ${col.project} (${col.tower})`}
                        >
                          <div className="flex items-center justify-center">
                            {renderBadge(val)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Authority Cards */}
      {viewMode === "CARDS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConsultants.map((item) => {
            const totalTowers = visibleColumns.length;
            const onboardTowers = visibleColumns.filter(col => {
              const val = (item.statuses[`${col.project}__${col.tower}`] || "").toLowerCase();
              return (val.includes("onboard") || val.includes("fixed")) && !val.includes("not onboard");
            }).length;
            const towerRate = totalTowers > 0 ? Math.round((onboardTowers / totalTowers) * 100) : 0;

            return (
              <div 
                key={item.id}
                className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        {getAuthorityIcon(item.consultantTitle)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-foreground leading-snug">
                          {item.consultantTitle}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          {item.scope}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400">
                      {towerRate}%
                    </span>
                  </div>

                  {/* Tower Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all"
                      style={{ width: `${towerRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{onboardTowers} of {totalTowers} towers covered</span>
                  <span className="text-purple-500 font-bold">Verified Scope</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Authority Cell Update Modal */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-500 flex items-center gap-1">
                  <Edit2 className="h-3 w-3" />
                  <span>Update Authority Status</span>
                </span>
                <h4 className="text-base font-bold text-foreground mt-0.5">
                  {activeCell.item.consultantTitle}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {activeCell.col.project} • Wing {activeCell.col.tower}
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Select Compliance Status:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("Onboard")}
                  className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Mark Onboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("Fixed consultant")}
                  className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Fixed Partner</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("Not Onboard")}
                  className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  <span>Not Onboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("NA")}
                  className="p-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Not Applicable (NA)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border">
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

