"use client";

import React, { useState, useMemo } from "react";
import { EY_LOOK_AHEAD_ITEMS, LookAheadItem } from "../data/eyTenderData";
import { Clock, AlertCircle, Calendar, Building, Filter, CheckCircle2, ArrowRight } from "lucide-react";

export const LookAheadDashboard: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<"ALL" | "30_DAYS" | "60_DAYS">("ALL");

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
      return true;
    });
  }, [selectedProject, timeframeFilter]);

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

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header & KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Look-Ahead Packages
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {EY_LOOK_AHEAD_ITEMS.length}
            </div>
            <span className="text-[10px] text-muted-foreground">Critical execution milestones</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              In 30 Days (Immediate Priority)
            </span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {count30}
            </div>
            <span className="text-[10px] text-rose-500">Tenders required within 1 month</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              In 60 Days (Mid-Term Forecast)
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {count60}
            </div>
            <span className="text-[10px] text-amber-500">Tenders required within 2 months</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimeframeFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeframeFilter === "ALL" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Windows ({EY_LOOK_AHEAD_ITEMS.length})
          </button>
          <button
            type="button"
            onClick={() => setTimeframeFilter("30_DAYS")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeframeFilter === "30_DAYS" ? "bg-rose-500 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🚨 In 30 Days ({count30})
          </button>
          <button
            type="button"
            onClick={() => setTimeframeFilter("60_DAYS")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeframeFilter === "60_DAYS" ? "bg-amber-500 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ⏳ In 60 Days ({count60})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Filter Project:</span>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Look-Ahead Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedByProject.map(([key, items], idx) => {
          const has30 = items.some(i => i.timeframe === "30_DAYS");
          return (
            <div 
              key={idx} 
              className={`p-4 rounded-2xl border bg-surface shadow-xs flex flex-col justify-between space-y-3 ${
                has30 ? "border-rose-500/30" : "border-border"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    <span>{key}</span>
                  </div>
                  {has30 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                      Urgent Action
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  {items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx}
                      className={`p-2 rounded-xl border text-xs flex items-start gap-2 ${
                        item.timeframe === "30_DAYS"
                          ? "bg-rose-500/10 border-rose-500/20 text-foreground"
                          : "bg-amber-500/10 border-amber-500/20 text-foreground"
                      }`}
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5 ${
                        item.timeframe === "30_DAYS" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                      }`}>
                        {item.timeframe === "30_DAYS" ? "30d" : "60d"}
                      </span>
                      <span className="leading-snug font-medium">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{items.length} {items.length === 1 ? "package" : "packages"} queued</span>
                <span className="text-primary font-semibold flex items-center gap-1">
                  <span>Track Specs</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
