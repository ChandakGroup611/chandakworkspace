"use client";

import React from "react";
import { Target, FolderOpen, LayoutDashboard, CheckCircle, Clock, FileText, Layers, GitMerge } from "lucide-react";
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
      {/* Workspaces KPI */}
      <Link href="/workspaces" className="block group">
        <BaseWidget 
          id="kpi-workspaces" 
          className="min-h-[130px] h-full overflow-hidden relative theme-card-structural"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <div className="absolute -bottom-4 -right-4 p-3 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-success">
            <FolderOpen className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Workspaces</h3>
              <div className="p-1 rounded-md bg-success/10 text-success">
                <FolderOpen className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground drop-shadow-sm">{kpis.workspaces?.total || 0}</span>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Sub Workspaces KPI */}
      <Link href="/workspaces" className="block group">
        <BaseWidget 
          id="kpi-sub-workspaces" 
          className="min-h-[130px] h-full overflow-hidden relative theme-card-structural"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
          <div className="absolute -bottom-4 -right-4 p-3 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-teal-500">
            <Layers className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Sub Workspaces</h3>
              <div className="p-1 rounded-md bg-teal-500/10 text-teal-500">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground drop-shadow-sm">{kpis.sub_workspaces?.total || 0}</span>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Tasks KPI */}
      <Link href="/workspaces/tasks" className="block group">
        <BaseWidget 
          id="kpi-tasks" 
          className="min-h-[130px] h-full overflow-hidden relative theme-card-structural"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <div className="absolute -bottom-4 -right-4 p-3 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-blue-500">
            <Target className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Tasks</h3>
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
                <Target className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground drop-shadow-sm">{kpis.tasks?.total || 0}</span>
            </div>
            
            <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground pt-3">
              <span className="text-blue-500 flex items-center gap-1 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.tasks?.resolved || 0} Resolved</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.tasks?.total || 0) - (kpis.tasks?.resolved || 0)} Pending</span>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Sub Tasks KPI */}
      <Link href="/workspaces/tasks" className="block group">
        <BaseWidget 
          id="kpi-sub-tasks" 
          className="min-h-[130px] h-full overflow-hidden relative theme-card-structural"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <div className="absolute -bottom-4 -right-4 p-3 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-cyan-500">
            <GitMerge className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Sub Tasks</h3>
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-500">
                <GitMerge className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground drop-shadow-sm">{kpis.sub_tasks?.total || 0}</span>
            </div>
            
            <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground pt-3">
              <span className="text-cyan-500 flex items-center gap-1 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.sub_tasks?.resolved || 0} Resolved</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.sub_tasks?.total || 0) - (kpis.sub_tasks?.resolved || 0)} Pending</span>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Requirements KPI */}
      <Link href="/requirements" className="block group">
        <BaseWidget 
          id="kpi-requirements" 
          className="min-h-[130px] h-full overflow-hidden relative theme-card-structural"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <div className="absolute -bottom-4 -right-4 p-3 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-indigo-500">
            <FileText className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Requirements</h3>
              <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground drop-shadow-sm">{kpis.requirements?.total || 0}</span>
            </div>
            
            <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground pt-3">
              <span className="text-indigo-500 flex items-center gap-1 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.requirements?.resolved || 0} Resolved</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.requirements?.total || 0) - (kpis.requirements?.resolved || 0)} Pending</span>
            </div>
          </div>
        </BaseWidget>
      </Link>

      {/* Tickets KPI */}
      <Link href="/tickets" className="block group">
        <BaseWidget 
          id="kpi-tickets" 
          className="min-h-[130px] h-full overflow-hidden relative theme-card-structural"
          noPadding
          overflowHidden
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <div className="absolute -bottom-4 -right-4 p-3 opacity-[0.05] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-500 text-purple-500">
            <LayoutDashboard className="h-16 w-16" />
          </div>

          <div className="p-4 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">Tickets</h3>
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
                <LayoutDashboard className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground drop-shadow-sm">{kpis.tickets?.total || 0}</span>
            </div>
            
            <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground pt-3">
              <span className="text-purple-500 flex items-center gap-1 whitespace-nowrap"><CheckCircle className="h-3 w-3 shrink-0" /> {kpis.tickets?.resolved || 0} Resolved</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">{(kpis.tickets?.total || 0) - (kpis.tickets?.resolved || 0)} Pending</span>
            </div>
          </div>
        </BaseWidget>
      </Link>
    </div>
  );
}
