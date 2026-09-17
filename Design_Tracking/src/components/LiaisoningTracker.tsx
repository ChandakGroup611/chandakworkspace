"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { DesignMasterStore } from "../services/designMasterStore";
import { StatutoryAuthorityMaster } from "../types/masterTypes";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";

export const LiaisoningTracker: React.FC = () => {
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [selectedProjectFilters, setSelectedProjectFilters] = useState<string[]>([]);
  const [selectedOnboardingFilters, setSelectedOnboardingFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"MATRIX" | "CARDS">("MATRIX");
  const [customRemark, setCustomRemark] = useState<string>("");

  const [activeCell, setActiveCell] = useState<{
    authority: StatutoryAuthorityMaster;
    col: { projectId: string; projectName: string; towerId: string; towerName: string };
    currentVal: string;
  } | null>(null);

  // Subscribe to DesignMasterStore for dynamic real-time reactivity
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState(DesignMasterStore.getState());
    });
    return unsubscribe;
  }, []);

  const projects = storeState.projects;
  const towers = storeState.towers;
  const authorities = storeState.authorities;
  const statutoryClearances = storeState.statutoryClearances;

  // Dynamic project columns from active tower & project masters
  const dynamicColumns = useMemo(() => {
    const list: { projectId: string; projectName: string; towerId: string; towerName: string }[] = [];
    for (const tower of towers) {
      const proj = projects.find(p => p.id === tower.projectId);
      if (!proj) continue;
      if (selectedProjectFilters.length > 0 && !selectedProjectFilters.includes(proj.name)) continue;
      list.push({
        projectId: proj.id,
        projectName: proj.name,
        towerId: tower.id,
        towerName: tower.towerName
      });
    }
    return list;
  }, [projects, towers, selectedProjectFilters]);

  const uniqueProjectNames = useMemo(() => {
    return projects.map(p => p.name);
  }, [projects]);

  // Helper to read cell status
  const getCellStatus = (authorityId: string, projectId: string, towerId: string): string => {
    const key = `${projectId}__${towerId}__${authorityId}`;
    return statutoryClearances[key]?.onboardingStatus || "NA";
  };

  // Filtered authorities
  const filteredAuthorities = useMemo(() => {
    return authorities.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.authorityName.toLowerCase().includes(q) || 
          item.scope.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedOnboardingFilters.length > 0) {
        const hasMatch = dynamicColumns.some(col => {
          const val = getCellStatus(item.id, col.projectId, col.towerId).toLowerCase();
          return selectedOnboardingFilters.some(f => {
            if (f === "ONBOARD" && (val.includes("onboard") || val.includes("fixed") || val.includes("cleared")) && !val.includes("not onboard")) return true;
            if (f === "NOT_ONBOARD" && val.includes("not onboard")) return true;
            return false;
          });
        });
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [authorities, searchQuery, selectedOnboardingFilters, dynamicColumns, statutoryClearances]);

  // Overall compliance stats
  const complianceStats = useMemo(() => {
    let onboardCount = 0;
    let notOnboardCount = 0;
    let totalCells = 0;

    for (const item of filteredAuthorities) {
      for (const col of dynamicColumns) {
        const val = getCellStatus(item.id, col.projectId, col.towerId).toLowerCase();
        if (val === "na" || val === "-") continue;
        totalCells++;
        if (val.includes("not onboard")) notOnboardCount++;
        else if (val.includes("onboard") || val.includes("fixed") || val.includes("cleared")) onboardCount++;
      }
    }

    const rate = totalCells > 0 ? Math.round((onboardCount / totalCells) * 100) : 0;
    return { onboardCount, notOnboardCount, totalCells, rate };
  }, [filteredAuthorities, dynamicColumns, statutoryClearances]);

  // Dropdown options
  const projectOptions = useMemo<DropdownOption[]>(() => {
    return projects.map(p => {
      const towerCount = towers.filter(t => t.projectId === p.id).length;
      return {
        value: p.name,
        label: p.name,
        count: towerCount,
        subtitle: `${towerCount} wing${towerCount === 1 ? "" : "s"}`
      };
    });
  }, [projects, towers]);

  const onboardingOptions = useMemo<DropdownOption[]>(() => {
    return [
      {
        value: "ONBOARD",
        label: "Onboarded / Cleared",
        count: complianceStats.onboardCount,
        colorDot: "#10b981",
        subtitle: "Clearances in place"
      },
      {
        value: "NOT_ONBOARD",
        label: "Pending Onboarding",
        count: complianceStats.notOnboardCount,
        colorDot: "#f43f5e",
        subtitle: "Action required with authorities"
      }
    ];
  }, [complianceStats.onboardCount, complianceStats.notOnboardCount]);

  const totalActiveFilterCount =
    selectedProjectFilters.length +
    selectedOnboardingFilters.length;

  const handleClearAllFilters = () => {
    setSelectedProjectFilters([]);
    setSelectedOnboardingFilters([]);
    setSearchQuery("");
  };

  const renderBadge = (rawVal: string) => {
    const val = (rawVal || "NA").trim();
    const lower = val.toLowerCase();

    if (lower === "na" || lower === "-") {
      return <span className="text-[11px] text-muted-foreground/30 font-mono select-none whitespace-nowrap">—</span>;
    }
    if (lower.includes("not onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>Not Onboard</span>
        </span>
      );
    }
    if (lower.includes("onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>{lower.includes("pending") ? "Compliance Pending" : "Onboard"}</span>
        </span>
      );
    }
    if (lower.includes("fixed") || lower.includes("cleared") || lower.includes("obtained")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>{val}</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-foreground border border-border whitespace-nowrap">
        {val}
      </span>
    );
  };

  const handleUpdateStatus = (newVal: any) => {
    if (!activeCell) return;
    const { authority, col } = activeCell;

    DesignMasterStore.recordStatutoryClearance(
      col.projectId,
      col.towerId,
      authority.id,
      newVal,
      undefined,
      customRemark || undefined
    );

    setActiveCell(null);
    setCustomRemark("");
  };

  const handleExportCsv = () => {
    const headers = ["Statutory Authority", "Category / Scope", ...dynamicColumns.map(c => `${c.projectName} - ${c.towerName}`)];
    const rows = filteredAuthorities.map(item => {
      const rowVals = dynamicColumns.map(col => {
        const val = getCellStatus(item.id, col.projectId, col.towerId);
        return `"${val.replace(/"/g, '""')}"`;
      });
      return [`"${item.authorityName.replace(/"/g, '""')}"`, `"${(item.scope || item.category).replace(/"/g, '""')}"`, ...rowVals].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Statutory_Liaisoning_${new Date().toISOString().split("T")[0]}.csv`);
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
    if (lower.includes("architect") || lower.includes("liaison") || lower.includes("bmc") || lower.includes("mcgm")) return <Building2 className="h-4 w-4 text-blue-500" />;
    return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Control Header Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Statutory Liaisoning
              </h2>
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
                <span>Cards View</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search statutory authority"
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

        {/* Multi-Selection Dropdowns Filter Row */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 1. Projects Dropdown */}
            <DesignMultiSelectDropdown
              label="Projects"
              icon={<Building className="h-3.5 w-3.5" />}
              options={projectOptions}
              selectedValues={selectedProjectFilters}
              onChange={setSelectedProjectFilters}
              colorTheme="blue"
              placeholder={`All Projects (${projects.length})`}
              searchPlaceholder="Search project name..."
            />

            {/* 2. Onboarding Status Dropdown */}
            <DesignMultiSelectDropdown
              label="Onboarding"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              options={onboardingOptions}
              selectedValues={selectedOnboardingFilters}
              onChange={setSelectedOnboardingFilters}
              colorTheme="purple"
              placeholder="All Statuses"
              searchPlaceholder="Filter onboarding..."
              showSearch={false}
            />

            {/* Clear All Filters Button */}
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Reset all active filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters ({totalActiveFilterCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">Compliance Readiness:</span>
            <span className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">{complianceStats.rate}%</span>
            <div className="w-28 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${complianceStats.rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* 🏷️ Active Selected Filter Badges */}
        {totalActiveFilterCount > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1 shrink-0">
              Active Filters:
            </span>

            {/* Project Badges */}
            {selectedProjectFilters.map(p => (
              <span
                key={`proj-${p}`}
                className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Building className="h-2.5 w-2.5" />
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProjectFilters(prev => prev.filter(x => x !== p))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Onboarding Badges */}
            {selectedOnboardingFilters.map(f => (
              <span
                key={`onb-${f}`}
                className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>{f === "ONBOARD" ? "Onboarded / Cleared" : "Pending Onboarding"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedOnboardingFilters(prev => prev.filter(x => x !== f))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-muted-foreground hover:text-rose-500 underline ml-1 cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredAuthorities.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-3">
          <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Statutory Authorities Configured</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            You can add statutory bodies from the &ldquo;Masters Setup&rdquo; tab or load the EY Reference Template.
          </p>
        </div>
      )}

      {/* View 1: Matrix Table */}
      {viewMode === "MATRIX" && filteredAuthorities.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
            <table className="w-full text-left text-xs border-collapse min-w-max">
              <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border shadow-xs">
                <tr>
                  <th className="p-3.5 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border min-w-[280px] font-black text-foreground uppercase tracking-wider text-[11px] shadow-sm whitespace-nowrap">
                    Statutory Authority / Scope
                  </th>
                  {dynamicColumns.map((col, idx) => (
                    <th
                      key={idx}
                      className="p-2.5 text-center font-bold text-foreground border-r border-border/40 text-[10px] uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 min-w-[140px] whitespace-nowrap"
                    >
                      <div className="truncate font-black text-foreground whitespace-nowrap">{col.projectName}</div>
                      <div className="text-muted-foreground font-mono font-semibold text-[9px] mt-0.5 px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 inline-block whitespace-nowrap">
                        {col.towerName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {filteredAuthorities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="p-3.5 sticky left-0 z-10 bg-surface group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-border shadow-sm">
                      <div className="flex items-center gap-2">
                        {getAuthorityIcon(item.authorityName)}
                        <div>
                          <div className="font-bold text-foreground text-xs leading-snug">
                            {item.authorityName}
                          </div>
                          {item.scope && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.scope}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {dynamicColumns.map((col, colIdx) => {
                      const val = getCellStatus(item.id, col.projectId, col.towerId);
                      return (
                        <td 
                          key={colIdx} 
                          onClick={() => {
                            setActiveCell({ authority: item, col, currentVal: val });
                            setCustomRemark("");
                          }}
                          className="p-2 border-r border-border/30 text-center cursor-pointer hover:bg-purple-500/5 transition-colors"
                          title={`Click to update: ${item.authorityName} • ${col.projectName} (${col.towerName})`}
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
      {viewMode === "CARDS" && filteredAuthorities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAuthorities.map((item) => {
            const totalTowers = dynamicColumns.length;
            const onboardTowers = dynamicColumns.filter(col => {
              const val = getCellStatus(item.id, col.projectId, col.towerId).toLowerCase();
              return (val.includes("onboard") || val.includes("fixed") || val.includes("cleared")) && !val.includes("not onboard");
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
                        {getAuthorityIcon(item.authorityName)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-foreground leading-snug">
                          {item.authorityName}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          {item.scope || item.category}
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
                  {activeCell.authority.authorityName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {activeCell.col.projectName} • Wing {activeCell.col.towerName}
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
                  onClick={() => handleUpdateStatus("Compliance Pending")}
                  className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-purple-500" />
                  <span>Compliance Pending</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("Not Onboard")}
                  className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  <span>Not Onboard</span>
                </button>
              </div>
            </div>

            {/* Custom Target / Remarks Input */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-bold text-foreground block">
                Custom Target Date / Consultant Remark:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customRemark}
                  onChange={e => setCustomRemark(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(customRemark || "NA")}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Save
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
