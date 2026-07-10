"use client";

import React from "react";
import { Target, FolderOpen, LayoutDashboard, CheckCircle, Clock, Activity, FileText, Layers, GitMerge } from "lucide-react";
import Link from "next/link";
import { BaseWidget } from "./BaseWidget";

interface ExecutiveKPIWidgetProps {
  analytics?: any;
  kpis?: any;
}

export function ExecutiveKPIWidget({ analytics, kpis: globalKpis }: ExecutiveKPIWidgetProps) {
  // Try to find the kpis object, fallback to checking analytics.kpis
  const kpis = globalKpis || analytics?.kpis || analytics || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 h-full">
      {/* Workspaces KPI */}
      <Link href="/workspaces/enrolled" className="block h-full group">
        <BaseWidget 
          id="kpi-workspaces" 
          className="h-full border-emerald-500/20 bg-gradient-to-br from-surface to-emerald-500/5 hover:to-emerald-500/10 dark:from-surface/80 dark:to-emerald-500/10 overflow-hidden relative"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] dark:opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-emerald-500">
            <FolderOpen className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Workspaces</h3>
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-500/20 shadow-sm">
                <FolderOpen className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{kpis.workspaces?.total || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.workspaces?.resolved || 0} Resolved</span>
              </div>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Sub Workspaces KPI */}
      <Link href="/workspaces/enrolled" className="block h-full group">
        <BaseWidget 
          id="kpi-sub-workspaces" 
          className="h-full border-teal-500/20 bg-gradient-to-br from-surface to-teal-500/5 hover:to-teal-500/10 dark:from-surface/80 dark:to-teal-500/10 overflow-hidden relative"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] dark:opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-teal-500">
            <Layers className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sub Workspaces</h3>
              <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-500 ring-1 ring-inset ring-teal-500/20 shadow-sm">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{kpis.sub_workspaces?.total || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                <span className="text-teal-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.sub_workspaces?.resolved || 0} Resolved</span>
              </div>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Tasks KPI */}
      <Link href="/workspaces/tasks" className="block h-full group">
        <BaseWidget 
          id="kpi-tasks" 
          className="h-full border-accent/20 bg-gradient-to-br from-surface to-blue-500/5 hover:to-blue-500/10 dark:from-surface/80 dark:to-blue-500/10 overflow-hidden relative"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-accent shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] dark:opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-accent">
            <Target className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tasks</h3>
              <div className="p-1.5 rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20 shadow-sm">
                <Target className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{kpis.tasks?.total || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                <span className="text-accent flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.tasks?.resolved || 0}</span>
                <span className="text-amber-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {kpis.tasks?.upcoming_due || 0}</span>
              </div>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Sub Tasks KPI */}
      <Link href="/workspaces/tasks" className="block h-full group">
        <BaseWidget 
          id="kpi-sub-tasks" 
          className="h-full border-cyan-500/20 bg-gradient-to-br from-surface to-cyan-500/5 hover:to-cyan-500/10 dark:from-surface/80 dark:to-cyan-500/10 overflow-hidden relative"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] dark:opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-cyan-500">
            <GitMerge className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sub Tasks</h3>
              <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-500 ring-1 ring-inset ring-cyan-500/20 shadow-sm">
                <GitMerge className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{kpis.sub_tasks?.total || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                <span className="text-cyan-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.sub_tasks?.resolved || 0} Resolved</span>
              </div>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Requirements KPI */}
      <Link href="/requirements" className="block h-full group">
        <BaseWidget 
          id="kpi-requirements" 
          className="h-full border-accent/20 bg-gradient-to-br from-surface to-indigo-500/5 hover:to-indigo-500/10 dark:from-surface/80 dark:to-indigo-500/10 overflow-hidden relative"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-accent shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] dark:opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-accent">
            <FileText className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Requirements</h3>
              <div className="p-1.5 rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20 shadow-sm">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{kpis.requirements?.total || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                <span className="text-accent flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.requirements?.resolved || 0} Resolved</span>
              </div>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Tickets KPI */}
      <Link href="/tickets" className="block h-full group">
        <BaseWidget 
          id="kpi-tickets" 
          className="h-full border-accent/20 bg-gradient-to-br from-surface to-purple-500/5 hover:to-purple-500/10 dark:from-surface/80 dark:to-purple-500/10 overflow-hidden relative"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-accent shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] dark:opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-accent">
            <LayoutDashboard className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tickets</h3>
              <div className="p-1.5 rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20 shadow-sm">
                <LayoutDashboard className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{kpis.tickets?.total || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                <span className="text-accent flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.tickets?.resolved || 0} Resolved</span>
              </div>
            </div>
          </div>
        </BaseWidget>
      </Link>
    </div>
  );
}
