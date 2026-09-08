"use client";

import React from "react";
import { Target, FolderOpen, LayoutDashboard, CheckCircle, Clock, FileText, Layers, GitMerge, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { BaseWidget } from "./BaseWidget";
import { DrillDownFilter } from "./MetricsListModal";

interface ExecutiveKPIWidgetProps {
  analytics?: any;
  kpis?: any;
  onDrillDown?: (filter: DrillDownFilter) => void;
}

export function ExecutiveKPIWidget({ analytics, kpis: globalKpis, onDrillDown }: ExecutiveKPIWidgetProps) {
  // Try to find the kpis object, fallback to checking analytics.kpis
  const kpis = globalKpis || analytics?.kpis || analytics || {};

  const handleCardClick = (moduleName: string, title: string) => {
    if (onDrillDown) {
      onDrillDown({
        title: `${title} Deliverables`,
        description: `All active and historical items under ${title}.`,
        module: moduleName
      });
    }
  };

  const totalCount = (kpis.workspaces?.total || 0) + (kpis.sub_workspaces?.total || 0) + (kpis.tasks?.total || 0) + (kpis.sub_tasks?.total || 0) + (kpis.requirements?.total || 0) + (kpis.tickets?.total || 0);

  return (
    <BaseWidget
      id="kpi-main-group"
      title="Core Deliverables & Workspace KPIs"
      subtitle="Workspaces, Tasks, Sub-Tasks, Requirements & Tickets"
      icon={<Target className="w-5 h-5 text-theme-icon" />}
      badge={
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20 shrink-0">
          {totalCount} Total Items
        </span>
      }
      collapsible={true}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
        {/* Workspaces KPI */}
        <div 
          onClick={() => handleCardClick("Workspaces", "Workspaces")}
          className="block group cursor-pointer"
        >
          <div className="min-h-[120px] h-full overflow-hidden relative rounded-xl bg-surface/60 border border-border/70 hover:border-emerald-500/50 hover:bg-surface transition-all shadow-xs p-3.5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <div className="absolute -bottom-3 -right-3 p-2 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-success">
              <FolderOpen className="h-14 w-14" />
            </div>

            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Workspaces</h3>
              <div className="p-1 rounded-md bg-success/10 text-success">
                <FolderOpen className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="my-1 relative z-10">
              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm group-hover:text-emerald-500 transition-colors">{kpis.workspaces?.total || 0}</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground relative z-10">
              <span className="text-emerald-500 font-semibold">{kpis.workspaces?.resolved || 0} Done</span>
              <span>·</span>
              <span>{(kpis.workspaces?.total || 0) - (kpis.workspaces?.resolved || 0)} Open</span>
            </div>
          </div>
        </div>

        {/* Sub Workspaces KPI */}
        <div 
          onClick={() => handleCardClick("Sub Workspaces", "Sub Workspaces")}
          className="block group cursor-pointer"
        >
          <div className="min-h-[120px] h-full overflow-hidden relative rounded-xl bg-surface/60 border border-border/70 hover:border-teal-500/50 hover:bg-surface transition-all shadow-xs p-3.5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
            <div className="absolute -bottom-3 -right-3 p-2 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-teal-500">
              <Layers className="h-14 w-14" />
            </div>

            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Sub Workspaces</h3>
              <div className="p-1 rounded-md bg-teal-500/10 text-teal-500">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="my-1 relative z-10">
              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm group-hover:text-teal-500 transition-colors">{kpis.sub_workspaces?.total || 0}</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground relative z-10">
              <span className="text-teal-500 font-semibold">{kpis.sub_workspaces?.resolved || 0} Done</span>
              <span>·</span>
              <span>{(kpis.sub_workspaces?.total || 0) - (kpis.sub_workspaces?.resolved || 0)} Open</span>
            </div>
          </div>
        </div>

        {/* Tasks KPI */}
        <div 
          onClick={() => handleCardClick("Tasks", "Tasks")}
          className="block group cursor-pointer"
        >
          <div className="min-h-[120px] h-full overflow-hidden relative rounded-xl bg-surface/60 border border-border/70 hover:border-blue-500/50 hover:bg-surface transition-all shadow-xs p-3.5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <div className="absolute -bottom-3 -right-3 p-2 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-blue-500">
              <Target className="h-14 w-14" />
            </div>

            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Tasks</h3>
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
                <Target className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="my-1 relative z-10">
              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm group-hover:text-blue-500 transition-colors">{kpis.tasks?.total || 0}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-muted-foreground relative z-10">
              <span className="text-blue-500 flex items-center gap-0.5 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.tasks?.resolved || 0} Done</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.tasks?.total || 0) - (kpis.tasks?.resolved || 0)} Open</span>
            </div>
          </div>
        </div>

        {/* Sub Tasks KPI */}
        <div 
          onClick={() => handleCardClick("Sub Tasks", "Sub Tasks")}
          className="block group cursor-pointer"
        >
          <div className="min-h-[120px] h-full overflow-hidden relative rounded-xl bg-surface/60 border border-border/70 hover:border-cyan-500/50 hover:bg-surface transition-all shadow-xs p-3.5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <div className="absolute -bottom-3 -right-3 p-2 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-cyan-500">
              <GitMerge className="h-14 w-14" />
            </div>

            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Sub Tasks</h3>
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-500">
                <GitMerge className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="my-1 relative z-10">
              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm group-hover:text-cyan-500 transition-colors">{kpis.sub_tasks?.total || 0}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-muted-foreground relative z-10">
              <span className="text-cyan-500 flex items-center gap-0.5 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.sub_tasks?.resolved || 0} Done</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.sub_tasks?.total || 0) - (kpis.sub_tasks?.resolved || 0)} Open</span>
            </div>
          </div>
        </div>

        {/* Requirements KPI */}
        <div 
          onClick={() => handleCardClick("Requirements", "Requirements")}
          className="block group cursor-pointer"
        >
          <div className="min-h-[120px] h-full overflow-hidden relative rounded-xl bg-surface/60 border border-border/70 hover:border-indigo-500/50 hover:bg-surface transition-all shadow-xs p-3.5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <div className="absolute -bottom-3 -right-3 p-2 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-indigo-500">
              <FileText className="h-14 w-14" />
            </div>

            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Requirements</h3>
              <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                <FileText className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="my-1 relative z-10">
              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm group-hover:text-indigo-500 transition-colors">{kpis.requirements?.total || 0}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-muted-foreground relative z-10">
              <span className="text-indigo-500 flex items-center gap-0.5 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.requirements?.resolved || 0} Done</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.requirements?.total || 0) - (kpis.requirements?.resolved || 0)} Open</span>
            </div>
          </div>
        </div>

        {/* Tickets KPI */}
        <div 
          onClick={() => handleCardClick("Tickets", "Tickets")}
          className="block group cursor-pointer"
        >
          <div className="min-h-[120px] h-full overflow-hidden relative rounded-xl bg-surface/60 border border-border/70 hover:border-purple-500/50 hover:bg-surface transition-all shadow-xs p-3.5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            <div className="absolute -bottom-3 -right-3 p-2 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-purple-500">
              <LayoutDashboard className="h-14 w-14" />
            </div>

            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Tickets</h3>
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="my-1 relative z-10">
              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm group-hover:text-purple-500 transition-colors">{kpis.tickets?.total || 0}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-muted-foreground relative z-10">
              <span className="text-purple-500 flex items-center gap-0.5 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.tickets?.resolved || 0} Done</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.tickets?.total || 0) - (kpis.tickets?.resolved || 0)} Open</span>
            </div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
