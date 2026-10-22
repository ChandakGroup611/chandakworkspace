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
import { TransactionFormLayout, WorkingDocumentLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { toast } from "react-toastify";
import { confirmAction } from "@/components/ui/feedback/confirm";

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
        label: "30-Day critical window",
        count: count30,
        colorDot: "var(--danger)",
        subtitle: "Immediate action required"
      },
      {
        value: "60_DAYS",
        label: "60-Day scheduled window",
        count: count60,
        colorDot: "var(--warning)",
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

  const handleDeleteItem = async (id: string) => {
    if (await confirmAction("Remove this milestone from the look-ahead schedule?")) {
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
      {!isAddModalOpen && !selectedItem && (
        <>
          {/* Header & Filter Ribbon */}
      <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning-text flex items-center justify-center border border-warning-border shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Look-ahead forecast
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
              className="h-8 px-3 rounded-lg bg-success hover:bg-success text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add milestone</span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-sunken text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
              placeholder="All milestone windows"
              searchPlaceholder="Filter timeframe..."
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

          <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-xs">
            <span>Showing <strong className="text-foreground">{filteredItems.length}</strong> of {lookAheads.length} milestones</span>
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

            {/* Timeframe Badges */}
            {selectedTimeframeFilters.map(tf => (
              <span
                key={`tf-${tf}`}
                className="px-2 py-0.5 rounded-lg bg-warning-soft text-warning-text border border-warning-border text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Clock className="h-2.5 w-2.5" />
                <span>{tf === "30_DAYS" ? "30-Day Critical" : "60-Day Scheduled"}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedTimeframeFilters(prev => prev.filter(x => x !== tf))}
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

      {/* Critical Packages & Consultant Bottlenecks Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Critical Design Packages */}
        <div className="p-4 sm:p-5 rounded-lg border border-danger-border bg-danger-soft shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-danger-solid shrink-0" />
              <h3 className="text-xs font-semibold text-danger-text whitespace-nowrap">
                Critical design package blockers
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger-text border border-danger-border shrink-0 whitespace-nowrap">
              High priority
            </span>
          </div>

          <div className="space-y-2">
            {criticalDesignBlockers.length === 0 ? (
              <div className="p-3 rounded-lg bg-surface/60 border border-danger-border text-center text-muted-foreground text-xs">
                No critical package blockers logged
              </div>
            ) : (
              criticalDesignBlockers.map((blk, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-surface border border-danger-border text-xs flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground whitespace-nowrap">
                      <span className="text-danger-text">{blk.project}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{blk.tower}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                      {blk.package}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono font-semibold text-danger-text block whitespace-nowrap">
                      {blk.target}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-danger-solid text-white font-semibold inline-block mt-0.5 whitespace-nowrap">
                      {blk.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Consultant Bottlenecks */}
        <div className="p-4 sm:p-5 rounded-lg border border-warning-border bg-warning-soft shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
              <h3 className="text-xs font-semibold text-warning-text whitespace-nowrap">
                Consultant onboarding bottlenecks
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning-soft text-warning-text border border-warning-border shrink-0 whitespace-nowrap">
              Work order gates
            </span>
          </div>

          <div className="space-y-2">
            {criticalConsultantBottlenecks.length === 0 ? (
              <div className="p-3 rounded-lg bg-surface/60 border border-warning-border text-center text-muted-foreground text-xs">
                No consultant onboarding blockers logged
              </div>
            ) : (
              criticalConsultantBottlenecks.map((cst, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-surface border border-warning-border text-xs flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground whitespace-nowrap">
                      <span className="text-warning-text">{cst.project}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{cst.tower}</span>
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                      {cst.consultant}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {cst.issue}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning-soft text-warning-text border border-warning-border whitespace-nowrap">
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
        <div className="p-12 text-center rounded-lg border border-border bg-surface space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">No look-ahead milestones configured</h4>
          
        </div>
      )}

      {/* Grouped Look-Ahead Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedByProject.map(([key, items], idx) => {
          const has30 = items.some(i => i.timeframe === "30_DAYS");
          return (
            <div 
              key={idx} 
              className={`p-4 sm:p-5 rounded-lg border bg-surface shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                has30 ? "border-danger-border hover:border-danger-border" : "border-border hover:border-border"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Building className="h-4 w-4 text-success-text" />
                    <span>{key}</span>
                  </div>
                  {has30 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-danger-soft text-danger-text border border-danger-border flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger-solid" />
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
                        className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 transition-all cursor-pointer group ${
                          item.timeframe === "30_DAYS"
                            ? "bg-danger-soft hover:bg-danger-soft border-danger-border text-foreground"
                            : "bg-warning-soft hover:bg-warning-soft border-warning-border text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            item.timeframe === "30_DAYS" ? "bg-danger-solid text-white" : "bg-warning text-white"
                          }`}>
                            {item.timeframe === "30_DAYS" ? "30-Day Critical" : "60-Day Forecast"}
                          </span>
                          {isExpedited && (
                            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-success text-white flex items-center gap-1">
                              <span>Expedited</span>
                            </span>
                          )}
                        </div>

                        <span className="leading-snug font-semibold text-foreground group-hover:text-success-text transition-colors">
                          {item.deliverableDescription}
                        </span>
                        {item.targetDate && (
                          <span className="text-[11px] text-muted-foreground font-mono">
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
                <button
                  type="button"
                  onClick={() => setSelectedItem(items[0])}
                  className="h-6 px-2.5 rounded-lg bg-success-soft hover:bg-success-soft text-success-text border border-success-border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Manage milestones</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Item Detail / Expedite Action Working Document Canvas */}
      {selectedItem && (
        <WorkingDocumentLayout
          title={`Milestone Action: ${selectedItem.deliverableDescription}`}
          badge={selectedItem.isExpedited ? "Fast-tracked" : "Normal schedule"}
          badgeColor={selectedItem.isExpedited ? "bg-warning-soft text-warning-text border border-warning-border" : "bg-success-soft text-success-text border border-success-border"}
          category="Look-Ahead Schedule"
          icon={Clock}
          iconBg="bg-warning-soft text-warning-text"
          description="Inspect deliverable readiness, manage expedite acceleration, or adjust milestone commitments."
          breadcrumbs={[
            { label: "Design Tracking Desk" },
            { label: "Look-Ahead Forecast", onClick: () => setSelectedItem(null) },
            { label: selectedItem.deliverableDescription }
          ]}
          onBack={() => setSelectedItem(null)}
          backLabel="Back to Look-Ahead Forecast"
          headerActions={
            <div className="flex items-center gap-2">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleToggleExpedite(selectedItem.id)}
                className={`text-xs h-9 font-semibold gap-1.5 ${
                  selectedItem.isExpedited
                    ? "border-warning-border text-warning-text hover:bg-warning-soft"
                    : "border-success-border text-success-text hover:bg-success-soft"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{selectedItem.isExpedited ? "Revoke Expedited" : "Fast-Track Expedite"}</span>
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleDeleteItem(selectedItem.id);
                  setSelectedItem(null);
                }}
                className="text-xs h-9 font-semibold text-danger-text border-danger-border hover:bg-danger-soft gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove milestone</span>
              </AppButton>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <AppCard>
                <AppCardHeader>
                  <AppCardTitle className="text-sm font-semibold text-foreground">Deliverable overview</AppCardTitle>
                </AppCardHeader>
                <AppCardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Project / development</span>
                      <span className="text-xs font-semibold text-foreground">{projectMap.get(selectedItem.projectId) || "Development"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Tower / wing</span>
                      <span className="text-xs font-semibold text-foreground">Wing {towerMap.get(selectedItem.towerId) || "Wing"}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">Milestone deliverable description</span>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">{selectedItem.deliverableDescription}</p>
                  </div>
                </AppCardContent>
              </AppCard>
            </div>

            <div className="space-y-6">
              <AppCard>
                <AppCardHeader>
                  <AppCardTitle className="text-sm font-semibold text-foreground">Schedule timeline</AppCardTitle>
                </AppCardHeader>
                <AppCardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                    <span className="text-muted-foreground">Execution Window:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      selectedItem.timeframe === "30_DAYS" ? "bg-danger-solid text-white" : "bg-warning text-white"
                    }`}>
                      {selectedItem.timeframe === "30_DAYS" ? "Immediate 30 Days" : "Forecast 60 Days"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                    <span className="text-muted-foreground">Priority Tier:</span>
                    <span className="font-semibold text-foreground">
                      {selectedItem.isExpedited ? "Fast-tracked" : "Normal schedule"}
                    </span>
                  </div>

                  {selectedItem.targetDate && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                      <span className="text-muted-foreground">Target Date:</span>
                      <span className="font-semibold font-mono text-foreground">{selectedItem.targetDate}</span>
                    </div>
                  )}
                </AppCardContent>
              </AppCard>
            </div>
          </div>
        </WorkingDocumentLayout>
      )}

      {/* Add Milestone Transaction Form */}
      {isAddModalOpen && (
        <TransactionFormLayout
          title="Add look-ahead milestone"
          category="Milestone Management"
          icon={Plus}
          iconBg="bg-success-soft text-success-text"
          description="Record upcoming tender package deliverable or consultant target to track horizon commitments."
          breadcrumbs={[
            { label: "Design Tracking Desk" },
            { label: "Look-Ahead Forecast", onClick: () => setIsAddModalOpen(false) },
            { label: "New milestone" }
          ]}
          onBack={() => setIsAddModalOpen(false)}
          backLabel="Back to Look-Ahead Forecast"
          onReset={() => {
            setNewDesc("");
            setNewTargetDate("");
            setNewTimeframe("30_DAYS");
          }}
          onSave={() => {
            if (!newProjectId || !newTowerId || !newDesc.trim()) {
              toast.error("Please select Project, Tower Wing, and enter Deliverable Description.");
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
            toast.success("Look-Ahead deliverable added successfully!");
            setIsAddModalOpen(false);
          }}
          saveLabel="Save Milestone"
        >
          <div className="max-w-4xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-semibold text-foreground">Milestone details</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Project / development *</label>
                    <select
                      value={newProjectId}
                      onChange={e => {
                        const p = e.target.value;
                        setNewProjectId(p);
                        const twrs = storeState.towers.filter(t => t.projectId === p);
                        if (twrs.length > 0) setNewTowerId(twrs[0].id);
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {accessibleProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Tower / wing *</label>
                    <select
                      value={newTowerId}
                      onChange={e => setNewTowerId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {storeState.towers.filter(t => t.projectId === newProjectId).map(t => (
                        <option key={t.id} value={t.id}>{t.towerName} ({t.towerType})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Deliverable description *</label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="e.g., structural foundation GFC drawings & schedule of finishes"
                    className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Urgency horizon window *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewTimeframe("30_DAYS")}
                        className={`py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          newTimeframe === "30_DAYS"
                            ? "border-danger-border bg-danger-soft text-danger-text ring-1 ring-danger-border"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        In 30 days
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTimeframe("60_DAYS")}
                        className={`py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          newTimeframe === "60_DAYS"
                            ? "border-warning-border bg-warning-soft text-warning-text ring-1 ring-warning-border"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ⏳ In 60 days
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Target delivery date / milestone</label>
                    <input
                      type="text"
                      value={newTargetDate}
                      onChange={e => setNewTargetDate(e.target.value)}
                      placeholder="e.g. 15 Oct 2026 or Q4-2026"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                    />
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
