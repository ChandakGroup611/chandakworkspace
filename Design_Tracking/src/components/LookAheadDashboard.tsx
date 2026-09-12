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

export const LookAheadDashboard: React.FC = () => {
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<"ALL" | "30_DAYS" | "60_DAYS">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<LookAheadEntry | null>(null);

  // Subscribe to DesignMasterStore for dynamic real-time reactivity
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState(DesignMasterStore.getState());
    });
    return unsubscribe;
  }, []);

  const lookAheads = storeState.lookAheads;

  // Name resolution maps
  const projectMap = useMemo(() => {
    return new Map(storeState.projects.map(p => [p.id, p.name]));
  }, [storeState.projects]);

  const towerMap = useMemo(() => {
    return new Map(storeState.towers.map(t => [t.id, t.towerName]));
  }, [storeState.towers]);

  // Unique project names with look-ahead deliverables
  const uniqueProjectNames = useMemo(() => {
    const set = new Set<string>();
    for (const item of lookAheads) {
      const pName = projectMap.get(item.projectId);
      if (pName) set.add(pName);
    }
    return Array.from(set);
  }, [lookAheads, projectMap]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return lookAheads.filter(item => {
      const projectName = projectMap.get(item.projectId) || "Development";
      const towerName = towerMap.get(item.towerId) || "Wing";
      const description = item.deliverableDescription || "";

      if (selectedProject !== "ALL" && projectName !== selectedProject) return false;
      if (timeframeFilter !== "ALL" && item.timeframe !== timeframeFilter) return false;
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
  }, [lookAheads, projectMap, towerMap, selectedProject, timeframeFilter, searchQuery]);

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
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
              Total Look-Ahead Milestones
            </span>
            <div className="text-3xl font-black text-foreground mt-1 tracking-tight">
              {lookAheads.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Master-driven critical deliverables</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-inner">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>In 30 Days (Critical Priority)</span>
            </span>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 tracking-tight">
              {count30}
            </div>
            <span className="text-[11px] text-rose-500 font-semibold">Tenders required within 1 month</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30 shadow-inner">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>In 60 Days (Mid-Term Forecast)</span>
            </span>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 tracking-tight">
              {count60}
            </div>
            <span className="text-[11px] text-amber-500 font-semibold">Tenders required within 2 months</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30 shadow-inner">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTimeframeFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              timeframeFilter === "ALL" 
                ? "bg-foreground text-background shadow-xs" 
                : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Windows ({lookAheads.length})
          </button>
          <button
            type="button"
            onClick={() => setTimeframeFilter("30_DAYS")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              timeframeFilter === "30_DAYS" 
                ? "bg-rose-600 text-white shadow-xs" 
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>🚨 In 30 Days ({count30})</span>
          </button>
          <button
            type="button"
            onClick={() => setTimeframeFilter("60_DAYS")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              timeframeFilter === "60_DAYS" 
                ? "bg-amber-600 text-white shadow-xs" 
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>⏳ In 60 Days ({count60})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="h-8 px-2.5 rounded-xl border border-border bg-surface text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
          >
            <option value="ALL">🏢 All Projects ({uniqueProjectNames.length})</option>
            {uniqueProjectNames.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-8 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>CSV</span>
          </button>
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
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Urgent Action</span>
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
                            {item.timeframe === "30_DAYS" ? "🚨 30-Day Window" : "⏳ 60-Day Window"}
                          </span>
                          {isExpedited && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5 fill-white" />
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
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2 text-xs">
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
