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
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";

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

  const projects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects();
  }, [storeState.projects, storeState.userAccessList]);
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
        colorDot: "var(--success)",
        subtitle: "Clearances in place"
      },
      {
        value: "NOT_ONBOARD",
        label: "Pending Onboarding",
        count: complianceStats.notOnboardCount,
        colorDot: "var(--danger)",
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
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-danger-soft text-danger-text border border-danger-border inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-danger-solid shrink-0" />
          <span>Not onboard</span>
        </span>
      );
    }
    if (lower.includes("onboard")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-success-soft text-success-text border border-success-border inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
          <span>{lower.includes("pending") ? "Compliance Pending" : "Onboard"}</span>
        </span>
      );
    }
    if (lower.includes("fixed") || lower.includes("cleared") || lower.includes("obtained")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-info-soft text-info-text border border-info-border inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-info shrink-0" />
          <span>{val}</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sunken text-foreground border border-border whitespace-nowrap">
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
    if (lower.includes("fire") || lower.includes("cfo")) return <Flame className="h-4 w-4 text-warning-text" />;
    if (lower.includes("tree")) return <Trees className="h-4 w-4 text-success-text" />;
    if (lower.includes("aviation") || lower.includes("aai")) return <Plane className="h-4 w-4 text-info-text" />;
    if (lower.includes("rera")) return <FileBadge2 className="h-4 w-4 text-accent-soft-text" />;
    if (lower.includes("architect") || lower.includes("liaison") || lower.includes("bmc") || lower.includes("mcgm")) return <Building2 className="h-4 w-4 text-info-text" />;
    return <ShieldCheck className="h-4 w-4 text-success-text" />;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {!activeCell && (
        <>
          {/* Control Header Ribbon */}
          <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-surface text-accent-soft-text dark:text-muted-foreground flex items-center justify-center border border-border shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Statutory liaisoning
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* View Mode Toggle */}
            <div className="p-0.5 rounded-lg border border-border bg-sunken flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("MATRIX")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "MATRIX" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Matrix grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "CARDS" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards view</span>
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
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-sunken text-foreground focus:outline-none focus:border-border-active"
              />
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-sunken text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-accent-soft-text" />
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
              placeholder="All statuses"
              searchPlaceholder="Filter onboarding..."
              showSearch={false}
            />

            {/* Clear All Filters Button */}
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="h-9 px-3 rounded-lg border border-danger-border bg-danger-soft hover:bg-danger-soft text-danger-text text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Reset all active filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset filters ({totalActiveFilterCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">Compliance Readiness:</span>
            <span className="text-xs font-semibold text-accent-soft-text dark:text-muted-foreground font-mono">{complianceStats.rate}%</span>
            <div className="w-28 h-2 rounded-full bg-sunken overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all duration-500"
                style={{ width: `${complianceStats.rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Selected Filter Badges */}
        {totalActiveFilterCount > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
              Active Filters:
            </span>

            {/* Project Badges */}
            {selectedProjectFilters.map(p => (
              <span
                key={`proj-${p}`}
                className="px-2 py-0.5 rounded-lg bg-info-soft text-info-text border border-info-border text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Building className="h-2.5 w-2.5" />
                <span>{p}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedProjectFilters(prev => prev.filter(x => x !== p))}
                  className="hover:text-danger-text cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Onboarding Badges */}
            {selectedOnboardingFilters.map(f => (
              <span
                key={`onb-${f}`}
                className="px-2 py-0.5 rounded-lg bg-surface text-foreground dark:text-muted-foreground border border-border text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>{f === "ONBOARD" ? "Onboarded / Cleared" : "Pending Onboarding"}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedOnboardingFilters(prev => prev.filter(x => x !== f))}
                  className="hover:text-danger-text cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-muted-foreground hover:text-danger-text underline ml-1 cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredAuthorities.length === 0 && (
        <div className="p-12 text-center rounded-lg border border-border bg-surface space-y-3">
          <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">No statutory authorities configured</h4>
          
        </div>
      )}

      {/* View 1: Matrix Table */}
      {viewMode === "MATRIX" && filteredAuthorities.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
            <table className="w-full text-left text-xs border-collapse min-w-max">
              <thead className="sticky top-0 z-20 bg-sunken border-b border-border shadow-xs">
                <tr>
                  <th className="p-3.5 sticky left-0 z-30 bg-sunken border-r border-border min-w-[280px] font-semibold text-foreground text-[11px] shadow-sm whitespace-nowrap">
                    Statutory authority / scope
                  </th>
                  {dynamicColumns.map((col, idx) => (
                    <th
                      key={idx}
                      className="p-2.5 text-center font-semibold text-foreground border-r border-border/40 text-[11px] bg-sunken min-w-[140px] whitespace-nowrap"
                    >
                      <div className="truncate font-semibold text-foreground whitespace-nowrap">{col.projectName}</div>
                      <div className="text-muted-foreground font-mono font-semibold text-[11px] mt-0.5 px-1.5 py-0.5 rounded bg-sunken inline-block whitespace-nowrap">
                        {col.towerName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {filteredAuthorities.map((item) => (
                  <tr key={item.id} className="hover:bg-sunken transition-colors group">
                    <td className="p-3.5 sticky left-0 z-10 bg-surface group-hover:bg-sunken border-r border-border shadow-sm">
                      <div className="flex items-center gap-2">
                        {getAuthorityIcon(item.authorityName)}
                        <div>
                          <div className="font-semibold text-foreground text-xs leading-snug">
                            {item.authorityName}
                          </div>
                          {item.scope && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
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
                          }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                          className="p-2 border-r border-border/30 text-center cursor-pointer hover:bg-surface transition-colors"
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
                className="p-5 rounded-lg border border-border bg-surface shadow-xs space-y-3.5 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-surface flex items-center justify-center border border-border">
                        {getAuthorityIcon(item.authorityName)}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground leading-snug">
                          {item.authorityName}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {item.scope || item.category}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-accent-soft-text dark:text-muted-foreground">
                      {towerRate}%
                    </span>
                  </div>

                  {/* Tower Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-sunken overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all"
                      style={{ width: `${towerRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{onboardTowers} of {totalTowers} towers covered</span>
                  <span className="text-accent-soft-text font-semibold">Verified scope</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Authority Cell Update Transaction Canvas */}
      {activeCell && (
        <TransactionFormLayout
          title={`Update Compliance: ${activeCell.authority.authorityName}`}
          category="Statutory Authority & Liaisoning"
          icon={Shield}
          iconBg="bg-surface text-accent-soft-text dark:text-muted-foreground"
          description={`Update statutory approval status and consultant onboarding scope for ${activeCell.col.projectName} • Wing ${activeCell.col.towerName}.`}
          breadcrumbs={[
            { label: "Design Tracking Desk" },
            { label: "Statutory Liaisoning", onClick: () => setActiveCell(null) },
            { label: activeCell.authority.authorityName }
          ]}
          onBack={() => setActiveCell(null)}
          backLabel="Back to Statutory Liaisoning"
          onReset={() => setCustomRemark("")}
          onSave={() => handleUpdateStatus(customRemark || activeCell.currentVal)}
          saveLabel="Save Compliance Status"
        >
          <div className="max-w-4xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-semibold text-foreground">Authority scope & tower target</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-muted/20 border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">Statutory authority body</span>
                    <span className="text-sm font-semibold text-foreground">{activeCell.authority.authorityName}</span>
                    <p className="text-[11px] text-muted-foreground">{activeCell.authority.scope || activeCell.authority.category}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/20 border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">Target development & wing</span>
                    <span className="text-sm font-semibold text-foreground">{activeCell.col.projectName}</span>
                    <p className="text-[11px] text-muted-foreground">Wing {activeCell.col.towerName}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-semibold text-foreground block">Quick select compliance status:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("Onboard")}
                      className="p-3 rounded-lg border border-success-border bg-success-soft text-success-text hover:bg-success-soft text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success-text" />
                      <span>Mark onboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("Fixed consultant")}
                      className="p-3 rounded-lg border border-info-border bg-info-soft text-info-text hover:bg-info-soft text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Building2 className="h-4 w-4 text-info-text" />
                      <span>Fixed partner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("Compliance Pending")}
                      className="p-3 rounded-lg border border-border bg-surface text-foreground dark:text-muted-foreground hover:bg-surface text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <FileCheck2 className="h-4 w-4 text-accent-soft-text" />
                      <span>Compliance pending</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("Not Onboard")}
                      className="p-3 rounded-lg border border-danger-border bg-danger-soft text-danger-text hover:bg-danger-soft text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <AlertCircle className="h-4 w-4 text-danger-text" />
                      <span>Not onboard</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="font-semibold text-foreground block">
                    Custom target date / consultant remark:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="e.g. In scrutiny at CFO / target 15 Nov"
                      value={customRemark}
                      onChange={e => setCustomRemark(e.target.value)}
                      className="flex-1 h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateStatus(customRemark || "NA")}
                      className="h-10 px-5 text-xs font-semibold"
                    >
                      Save custom remark
                    </AppButton>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}
    </div>
  );
};
