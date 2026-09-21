"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Clock, 
  AlertCircle, 
  Calendar, 
  Building, 
  Filter, 
  CheckCircle2, 
  ArrowRight,
  Search,
  FileSpreadsheet,
  Zap,
  SlidersHorizontal,
  X,
  Trash2,
  Sparkles,
  ShieldAlert,
  Plus
} from "lucide-react";
import { DesignMasterStore } from "../services/designMasterStore";
import { LookAheadEntry } from "../types/masterTypes";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";

export const LookAheadDashboard: React.FC = () => {
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [selectedProjectFilters, setSelectedProjectFilters] = useState<string[]>([]);
  const [selectedTimeframeFilters, setSelectedTimeframeFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<LookAheadEntry | null>(null);

  // Quick Add Milestone Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newTowerId, setNewTowerId] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newTimeframe, setNewTimeframe] = useState<"30_DAYS" | "60_DAYS">("30_DAYS");
  const [newTargetDate, setNewTargetDate] = useState<string>("");
  const [newPriority, setNewPriority] = useState<"CRITICAL" | "HIGH" | "NORMAL">("CRITICAL");

  // Subscribe to DesignMasterStore for dynamic real-time reactivity
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState(DesignMasterStore.getState());
    });
    return unsubscribe;
  }, []);

  // Accessible Projects Scoped to Active User
  const accessibleProjects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects();
  }, [storeState.projects, storeState.userAccessList]);

  const accessibleProjectIds = useMemo(() => new Set(accessibleProjects.map(p => p.id)), [accessibleProjects]);

  const lookAheads = useMemo(() => {
    return storeState.lookAheads.filter(i => accessibleProjectIds.has(i.projectId));
  }, [storeState.lookAheads, accessibleProjectIds]);

  // Name resolution maps
  const projectMap = useMemo(() => {
    return new Map(accessibleProjects.map(p => [p.id, p.name]));
  }, [accessibleProjects]);

  const towerMap = useMemo(() => {
    return new Map(storeState.towers.map(t => [t.id, t.towerName]));
  }, [storeState.towers]);

  // Critical Design & Consultant Bottlenecks dynamically derived from live store
  const criticalDesignBlockers = useMemo(() => {
    return storeState.lookAheads
      .filter(item => item.priority === "CRITICAL" || item.timeframe === "30_DAYS")
      .map(item => ({
        project: projectMap.get(item.projectId) || "Development",
        tower: towerMap.get(item.towerId) || "Wing",
        package: item.deliverableDescription,
        target: item.targetDate,
        status: item.priority === "CRITICAL" ? "Critical" : "Urgent"
      }));
  }, [storeState.lookAheads, projectMap, towerMap]);

  const criticalConsultantBottlenecks = useMemo(() => {
    return storeState.consultants
      .filter(c => c.onboardingStatus === "Not Onboard")
      .map(c => ({
        project: (c.activeProjects && c.activeProjects.length > 0) ? c.activeProjects.join(", ") : "All Developments",
        tower: c.category,
        consultant: c.name,
        issue: "Work order onboarding pending",
        severity: "HIGH"
      }));
  }, [storeState.consultants]);

  // Unique project names with look-ahead deliverables
  const uniqueProjectNames = useMemo(() => {
    return accessibleProjects.map(p => p.name);
  }, [accessibleProjects]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return lookAheads.filter(item => {
      const projectName = projectMap.get(item.projectId) || "Development";
      const towerName = towerMap.get(item.towerId) || "Wing";
      const description = item.deliverableDescription || "";

      if (selectedProjectFilters.length > 0 && !selectedProjectFilters.includes(projectName)) return false;
      if (selectedTimeframeFilters.length > 0 && !selectedTimeframeFilters.includes(item.timeframe)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          projectName.toLowerCase().includes(q) || 
          towerName.toLowerCase().includes(q) || 
          description.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [lookAheads, projectMap, towerMap, selectedProjectFilters, selectedTimeframeFilters, searchQuery]);

  // Group items by Project and Tower
  const groupedByProject = useMemo(() => {
    const map = new Map<string, LookAheadEntry[]>();
    for (const item of filteredItems) {
      const projectName = projectMap.get(item.projectId) || "Development";
      const towerName = towerMap.get(item.towerId) || "Wing";
      const key = `${projectName} • ${towerName}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredItems, projectMap, towerMap]);

  const count30 = lookAheads.filter(i => i.timeframe === "30_DAYS").length;
  const count60 = lookAheads.filter(i => i.timeframe === "60_DAYS").length;

  // Dropdown options
  const projectOptions = useMemo<DropdownOption[]>(() => {
    return uniqueProjectNames.map(p => {
      const cnt = lookAheads.filter(i => projectMap.get(i.projectId) === p).length;
      return {
        value: p,
        label: p,
        count: cnt,
        subtitle: `${cnt} milestone${cnt === 1 ? "" : "s"}`
      };
    });
  }, [uniqueProjectNames, lookAheads, projectMap]);

  const timeframeOptions = useMemo<DropdownOption[]>(() => {
    return [
      {
        value: "30_DAYS",
        label: "30-Day Critical Window",
        count: count30,
        colorDot: "#f43f5e",
        subtitle: "Immediate action required"
      },
      {
        value: "60_DAYS",
        label: "60-Day Scheduled Window",
        count: count60,
        colorDot: "#f59e0b",
        subtitle: "Planned forecast milestones"
      }
    ];
  }, [count30, count60]);

  const totalActiveFilterCount =
    selectedProjectFilters.length +
    selectedTimeframeFilters.length;

  const handleClearAllFilters = () => {
    setSelectedProjectFilters([]);
    setSelectedTimeframeFilters([]);
    setSearchQuery("");
  };

  const handleToggleExpedite = (id: string) => {
    DesignMasterStore.toggleExpediteLookAhead(id);
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(prev => prev ? { ...prev, isExpedited: !prev.isExpedited } : null);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to remove this milestone from the look-ahead schedule?")) {
      DesignMasterStore.deleteLookAhead(id);
      setSelectedItem(null);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Timeframe", "Project", "Wing / Tower", "Deliverable Description", "Expedited Status", "Target Date"];
    const rows = filteredItems.map(item => {
      const pName = projectMap.get(item.projectId) || "Development";
      const tName = towerMap.get(item.towerId) || "Wing";
      return [
        `"${item.timeframe === "30_DAYS" ? "30 Days (Immediate)" : "60 Days (Forecast)"}"`,
        `"${pName}"`,
        `"${tName}"`,
        `"${(item.deliverableDescription || "").replace(/"/g, '""')}"`,
        `"${item.isExpedited ? "EXPEDITED" : "NORMAL"}"`,
        `"${item.targetDate || "-"}"`
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Look_Ahead_Schedule_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Filter Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Look-Ahead Forecast
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Add Milestone Button */}
            <button
              type="button"
              onClick={() => {
                if (accessibleProjects.length > 0) {
                  const p = accessibleProjects[0].id;
                  setNewProjectId(p);
                  const twrs = storeState.towers.filter(t => t.projectId === p);
                  if (twrs.length > 0) setNewTowerId(twrs[0].id);
                }
                setNewDesc("");
                setNewTargetDate("");
                setIsAddModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Milestone</span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
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
              placeholder={`All Projects (${uniqueProjectNames.length})`}
              searchPlaceholder="Search project name..."
            />

            {/* 2. Timeframe Window Dropdown */}
            <DesignMultiSelectDropdown
              label="Window"
              icon={<Clock className="h-3.5 w-3.5" />}
              options={timeframeOptions}
              selectedValues={selectedTimeframeFilters}
              onChange={setSelectedTimeframeFilters}
              colorTheme="amber"
              placeholder="All Milestone Windows"
              searchPlaceholder="Filter timeframe..."
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

          <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-xs">
            <span>Showing <strong className="text-foreground">{filteredItems.length}</strong> of {lookAheads.length} milestones</span>
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

            {/* Timeframe Badges */}
            {selectedTimeframeFilters.map(tf => (
              <span
                key={`tf-${tf}`}
                className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Clock className="h-2.5 w-2.5" />
                <span>{tf === "30_DAYS" ? "30-Day Critical" : "60-Day Scheduled"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTimeframeFilters(prev => prev.filter(x => x !== tf))}
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

      {/* Critical Packages & Consultant Bottlenecks Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Critical Design Packages */}
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/25 bg-rose-500/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 whitespace-nowrap">
                Critical Design Package Blockers
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 shrink-0 whitespace-nowrap">
              High Priority
            </span>
          </div>

          <div className="space-y-2">
            {criticalDesignBlockers.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface/60 border border-rose-500/10 text-center text-muted-foreground text-xs">
                No critical package blockers logged
              </div>
            ) : (
              criticalDesignBlockers.map((blk, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-surface border border-rose-500/20 text-xs flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground whitespace-nowrap">
                      <span className="text-rose-600 dark:text-rose-400">{blk.project}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{blk.tower}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                      {blk.package}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 block whitespace-nowrap">
                      {blk.target}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold inline-block mt-0.5 whitespace-nowrap">
                      {blk.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Consultant Bottlenecks */}
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 whitespace-nowrap">
                Consultant Onboarding Bottlenecks
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0 whitespace-nowrap">
              Work Order Gates
            </span>
          </div>

          <div className="space-y-2">
            {criticalConsultantBottlenecks.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface/60 border border-amber-500/10 text-center text-muted-foreground text-xs">
                No consultant onboarding blockers logged
              </div>
            ) : (
              criticalConsultantBottlenecks.map((cst, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-surface border border-amber-500/20 text-xs flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground whitespace-nowrap">
                      <span className="text-amber-600 dark:text-amber-400">{cst.project}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{cst.tower}</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5 truncate">
                      {cst.consultant}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {cst.issue}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                      {cst.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {lookAheads.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Look-Ahead Milestones Configured</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your workspace is master-driven. You can add look-ahead milestones using &ldquo;Quick Fill Entry&rdquo; above or restore the EY reference template from the &ldquo;Masters Setup&rdquo; tab.
          </p>
        </div>
      )}

      {/* Grouped Look-Ahead Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedByProject.map(([key, items], idx) => {
          const has30 = items.some(i => i.timeframe === "30_DAYS");
          return (
            <div 
              key={idx} 
              className={`p-4 sm:p-5 rounded-2xl border bg-surface shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                has30 ? "border-rose-500/30 hover:border-rose-500/50" : "border-border hover:border-border/80"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-foreground">
                    <Building className="h-4 w-4 text-emerald-500" />
                    <span>{key}</span>
                  </div>
                  {has30 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <span>Urgent</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {items.map((item) => {
                    const isExpedited = !!item.isExpedited;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all cursor-pointer group ${
                          item.timeframe === "30_DAYS"
                            ? "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20 text-foreground"
                            : "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20 text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.timeframe === "30_DAYS" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                          }`}>
                            {item.timeframe === "30_DAYS" ? "30-Day Critical" : "60-Day Forecast"}
                          </span>
                          {isExpedited && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white flex items-center gap-1">
                              <span>Expedited</span>
                            </span>
                          )}
                        </div>

                        <span className="leading-snug font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                          {item.deliverableDescription}
                        </span>
                        {item.targetDate && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Target: {item.targetDate}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{items.length} {items.length === 1 ? "deliverable" : "deliverables"} queued</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1 cursor-pointer hover:underline">
                  <span>Manage Milestones</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Detail / Expedite Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                  Look-Ahead Milestone Action
                </span>
                <h4 className="text-base font-bold text-foreground mt-0.5">
                  {selectedItem.deliverableDescription}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {projectMap.get(selectedItem.projectId) || "Development"} • Wing {towerMap.get(selectedItem.towerId) || "Wing"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Execution Urgency:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedItem.timeframe === "30_DAYS" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                }`}>
                  {selectedItem.timeframe === "30_DAYS" ? "Immediate 30 Days" : "Forecast 60 Days"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Priority Status:</span>
                <span className="font-bold text-foreground">
                  {selectedItem.isExpedited ? "⚡ Fast-Track Expedited" : "Normal Schedule"}
                </span>
              </div>
              {selectedItem.targetDate && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Target Date:</span>
                  <span className="font-bold text-foreground">{selectedItem.targetDate}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleToggleExpedite(selectedItem.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedItem.isExpedited
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                    : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{selectedItem.isExpedited ? "Revoke Expedited Priority" : "Fast-Track / Mark Expedited"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="w-full py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Milestone</span>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Milestone Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Add Look-Ahead Milestone
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Record upcoming tender package or consultant deliverable
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newProjectId || !newTowerId || !newDesc.trim()) {
                  alert("Please select Project, Tower Wing, and enter Deliverable Description.");
                  return;
                }
                DesignMasterStore.addLookAhead({
                  projectId: newProjectId,
                  towerId: newTowerId,
                  deliverableDescription: newDesc.trim(),
                  timeframe: newTimeframe,
                  targetDate: newTargetDate || (newTimeframe === "30_DAYS" ? "30 Days Window" : "60 Days Window"),
                  priority: newPriority,
                  status: "PENDING"
                });
                setIsAddModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground block">Project:</label>
                  <select
                    value={newProjectId}
                    onChange={e => {
                      const p = e.target.value;
                      setNewProjectId(p);
                      const twrs = storeState.towers.filter(t => t.projectId === p);
                      if (twrs.length > 0) setNewTowerId(twrs[0].id);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {accessibleProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">Tower / Wing:</label>
                  <select
                    value={newTowerId}
                    onChange={e => setNewTowerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {storeState.towers.filter(t => t.projectId === newProjectId).map(t => (
                      <option key={t.id} value={t.id}>{t.towerName} ({t.towerType})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">Deliverable Description:</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground block">Urgency Window:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewTimeframe("30_DAYS")}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newTimeframe === "30_DAYS"
                          ? "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      🚨 In 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTimeframe("60_DAYS")}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newTimeframe === "60_DAYS"
                          ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ⏳ In 60 Days
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground block">Target Date / Milestone:</label>
                  <input
                    type="text"
                    value={newTargetDate}
                    onChange={e => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
