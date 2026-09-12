"use client";

import React, { useState, useMemo } from "react";
import { EY_LOOK_AHEAD_ITEMS, LookAheadItem } from "../data/eyTenderData";
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
  Send,
  Sparkles,
  ShieldAlert
} from "lucide-react";

export const LookAheadDashboard: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<"ALL" | "30_DAYS" | "60_DAYS">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<LookAheadItem | null>(null);
  const [expeditedIds, setExpeditedIds] = useState<Set<string>>(new Set());

  // Unique projects from look ahead items
  const projects = useMemo(() => {
    const list = Array.from(new Set(EY_LOOK_AHEAD_ITEMS.map(i => i.project).filter(Boolean)));
    return list;
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return EY_LOOK_AHEAD_ITEMS.filter(item => {
      if (selectedProject !== "ALL" && item.project !== selectedProject) return false;
      if (timeframeFilter !== "ALL" && item.timeframe !== timeframeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.project.toLowerCase().includes(q) || 
          item.tower.toLowerCase().includes(q) || 
          item.description.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [selectedProject, timeframeFilter, searchQuery]);

  // Group items by Project and Tower
  const groupedByProject = useMemo(() => {
    const map = new Map<string, LookAheadItem[]>();
    for (const item of filteredItems) {
      const key = `${item.project} • ${item.tower}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredItems]);

  const count30 = EY_LOOK_AHEAD_ITEMS.filter(i => i.timeframe === "30_DAYS").length;
  const count60 = EY_LOOK_AHEAD_ITEMS.filter(i => i.timeframe === "60_DAYS").length;

  const getItemKey = (item: LookAheadItem) => `${item.project}__${item.tower}__${item.description}`;

  const handleToggleExpedite = (key: string) => {
    setExpeditedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExportCsv = () => {
    const headers = ["Timeframe", "Project", "Wing / Tower", "Deliverable Description", "Expedited Status"];
    const rows = filteredItems.map(item => [
      `"${item.timeframe === "30_DAYS" ? "30 Days (Immediate)" : "60 Days (Forecast)"}"`,
      `"${item.project}"`,
      `"${item.tower}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${expeditedIds.has(getItemKey(item)) ? "EXPEDITED" : "NORMAL"}"`
    ].join(","));
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
              Total Look-Ahead Packages
            </span>
            <div className="text-3xl font-black text-foreground mt-1 tracking-tight">
              {EY_LOOK_AHEAD_ITEMS.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Critical execution milestones</span>
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
            All Windows ({EY_LOOK_AHEAD_ITEMS.length})
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
            <option value="ALL">🏢 All Projects ({projects.length})</option>
            {projects.map(p => (
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
                  {items.map((item, itemIdx) => {
                    const itemKey = getItemKey(item);
                    const isExpedited = expeditedIds.has(itemKey);
                    return (
                      <div 
                        key={itemIdx}
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
                          {item.description}
                        </span>
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
                  {selectedItem.description}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {selectedItem.project} • Wing {selectedItem.tower}
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
                  {expeditedIds.has(getItemKey(selectedItem)) ? "⚡ Fast-Track Expedited" : "Normal Schedule"}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleToggleExpedite(getItemKey(selectedItem))}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  expeditedIds.has(getItemKey(selectedItem))
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                    : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{expeditedIds.has(getItemKey(selectedItem)) ? "Revoke Expedited Priority" : "Fast-Track / Mark Expedited"}</span>
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

