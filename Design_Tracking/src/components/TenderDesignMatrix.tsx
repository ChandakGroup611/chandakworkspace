"use client";

import React, { useState, useMemo } from "react";
import { 
  EY_PROJECT_COLUMNS, 
  EY_UNIQUE_PROJECTS, 
  EY_TENDER_PACKAGES, 
  TenderPackageItem,
  ProjectTowerColumn
} from "../data/eyTenderData";
import { 
  Search, 
  Filter, 
  Download, 
  Layers, 
  Building, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info,
  X,
  Edit2
} from "lucide-react";

export const TenderDesignMatrix: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCell, setActiveCell] = useState<{
    pkg: TenderPackageItem;
    col: ProjectTowerColumn;
    currentVal: string;
  } | null>(null);

  // Filter columns based on selected project
  const visibleColumns = useMemo(() => {
    if (selectedProject === "ALL") return EY_PROJECT_COLUMNS;
    return EY_PROJECT_COLUMNS.filter(c => c.project === selectedProject);
  }, [selectedProject]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(EY_TENDER_PACKAGES.map(p => p.category).filter(Boolean));
    return Array.from(set);
  }, []);

  // Filter packages based on category, search, and status
  const filteredPackages = useMemo(() => {
    return EY_TENDER_PACKAGES.filter(pkg => {
      if (categoryFilter !== "ALL" && pkg.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = pkg.packageName.toLowerCase().includes(q) || pkg.category.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      if (statusFilter !== "ALL") {
        const hasMatchingStatus = visibleColumns.some(col => {
          const val = (pkg.statuses[`${col.project}__${col.tower}`] || "").toLowerCase();
          if (statusFilter === "RECEIVED" && val.includes("received")) return true;
          if (statusFilter === "PENDING" && (val.includes("pending") || val.includes("not onboard"))) return true;
          if (statusFilter === "IN_PROGRESS" && (val.includes("progress") || val.includes("onboard"))) return true;
          return false;
        });
        if (!hasMatchingStatus) return false;
      }

      return true;
    });
  }, [categoryFilter, searchQuery, statusFilter, visibleColumns]);

  // Helper for cell badge styling
  const renderCellBadge = (rawVal: string) => {
    const val = (rawVal || "NA").trim();
    const lower = val.toLowerCase();

    if (lower === "na" || lower === "not applicable" || lower === "-") {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/60 bg-slate-100/50 dark:bg-slate-800/40">
          —
        </span>
      );
    }

    if (lower.includes("received")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="truncate max-w-[110px]" title={val}>{val}</span>
        </span>
      );
    }

    if (lower.includes("pending") || lower.includes("not onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="truncate max-w-[110px]" title={val}>{val}</span>
        </span>
      );
    }

    if (lower.includes("progress") || lower.includes("onboard") || lower.includes("track")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="truncate max-w-[110px]" title={val}>{val}</span>
        </span>
      );
    }

    // Likely a target date (e.g., 30-Aug, 46280, etc.)
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25 inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        <span className="truncate max-w-[110px]" title={val}>{val}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter & Control Bar */}
      <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Tender Design Package Master Matrix
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Cross-project package statuses across 11 Chandak developments and 24 wings/towers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">🏢 All 11 Projects ({EY_PROJECT_COLUMNS.length} Wings)</option>
              {EY_UNIQUE_PROJECTS.map(proj => (
                <option key={proj} value={proj}>{proj}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">⚙️ All Disciplines ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">Status: All</option>
              <option value="RECEIVED">✅ Drawings Received</option>
              <option value="IN_PROGRESS">⏳ In Progress / Onboard</option>
              <option value="PENDING">⚠️ Pending / Delayed</option>
            </select>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search package..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Legend strip */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">Legend:</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Received (GFC / Tender)
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> In Progress / Consultant Onboard
          </span>
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Pending / Action Required
          </span>
          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Target Delivery Date
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> Not Applicable (NA)
          </span>
        </div>
      </div>

      {/* Main Matrix Table with Frozen Header & First Column */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-border shadow-2xs">
              {/* Row 1: Project Group Headers */}
              <tr>
                <th 
                  rowSpan={2} 
                  className="p-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border min-w-[240px] max-w-[280px] font-bold text-foreground uppercase tracking-wider text-[11px]"
                >
                  Work Package & Discipline
                </th>
                {visibleColumns.map((col, idx) => (
                  <th
                    key={idx}
                    className="p-2.5 text-center font-bold text-foreground border-r border-border/50 text-[10px] uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 min-w-[130px]"
                  >
                    <div className="truncate font-black">{col.project}</div>
                    <div className="text-muted-foreground font-mono font-medium text-[9px] mt-0.5">
                      {col.tower}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-12 text-muted-foreground">
                    No work packages match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Frozen Package Name Column */}
                    <td className="p-3 sticky left-0 z-10 bg-surface border-r border-border font-medium text-foreground">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                          {pkg.category}
                        </span>
                      </div>
                      <div className="font-semibold text-foreground text-xs leading-snug">
                        {pkg.packageName}
                      </div>
                    </td>

                    {/* Status Cells */}
                    {visibleColumns.map((col, colIdx) => {
                      const val = pkg.statuses[`${col.project}__${col.tower}`] || "NA";
                      return (
                        <td
                          key={colIdx}
                          onClick={() => setActiveCell({ pkg, col, currentVal: val })}
                          className="p-2 border-r border-border/40 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                          title={`${pkg.packageName} for ${col.project} (${col.tower}): ${val}`}
                        >
                          {renderCellBadge(val)}
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

      {/* Cell Detail / Update Modal */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Package Status Inspector
                </span>
                <h4 className="text-sm font-bold text-foreground mt-0.5">
                  {activeCell.pkg.packageName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {activeCell.col.project} • {activeCell.col.tower}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Discipline Category:</span>
                <strong className="text-foreground">{activeCell.pkg.category}</strong>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Current Cell Value:</span>
                <span className="font-mono font-bold text-foreground">{activeCell.currentVal}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="px-4 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
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
