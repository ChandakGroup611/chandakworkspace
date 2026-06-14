"use client";

import React, { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { LayoutDashboard, CheckCircle, AlertTriangle, Clock, Target, Activity, FolderOpen } from "lucide-react";
import { WorkloadIntelligence } from "./WorkloadIntelligence";
import { SlaGovernanceView } from "./SlaGovernanceView";
import Link from "next/link";

interface DashboardProps {
  analytics: any;
  preferences: any;
}

export function CentralOperationsDashboard({ analytics, preferences }: DashboardProps) {
  const kpis = analytics.kpis || analytics; // fallback if wrapper strips it
  
  // Example of using layout preferences
  const layout = preferences?.widget_layout || { sla: 'top', workload: 'bottom' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Executive KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Task KPI */}
        <Link href="/workspaces/tasks" className="block h-full">
          <div className="h-full relative overflow-hidden rounded-2xl group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border bg-surface text-foreground shadow-sm">
            {/* 3D Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white to-blue-500/10 dark:from-white/5 dark:to-blue-500/20 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
            
            {/* Glowing Accent Top Border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />

            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform text-blue-500">
              <Target className="h-24 w-24" />
            </div>

            <div className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-80 mix-blend-luminosity">Total Tasks</h3>
                <div className="p-2 rounded-xl bg-background/50 backdrop-blur-md shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 text-blue-500">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-black tracking-tight text-blue-600 dark:text-blue-400 drop-shadow-sm">{kpis.tasks?.total || 0}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> {kpis.tasks?.resolved || 0} Resolved</span>
                  <span className="text-amber-500 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {kpis.tasks?.upcoming_due || 0} Upcoming</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Workspace KPI */}
        <Link href="/workspaces/enrolled" className="block h-full">
          <div className="h-full relative overflow-hidden rounded-2xl group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border bg-surface text-foreground shadow-sm">
            {/* 3D Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white to-emerald-500/10 dark:from-white/5 dark:to-emerald-500/20 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
            
            {/* Glowing Accent Top Border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />

            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform text-emerald-500">
              <FolderOpen className="h-24 w-24" />
            </div>

            <div className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-80 mix-blend-luminosity">Enrolled Workspaces</h3>
                <div className="p-2 rounded-xl bg-background/50 backdrop-blur-md shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 text-emerald-500">
                  <FolderOpen className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{kpis.workspaces?.enrolled_workspaces || 0}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span>Also enrolled in {kpis.workspaces?.enrolled_sub_workspaces || 0} Sub-Workspaces</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Requirement & Ticket KPI */}
        <Link href="/tickets" className="block h-full">
          <div className="h-full relative overflow-hidden rounded-2xl group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border bg-surface text-foreground shadow-sm">
            {/* 3D Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white to-purple-500/10 dark:from-white/5 dark:to-purple-500/20 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
            
            {/* Glowing Accent Top Border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />

            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform text-purple-500">
              <LayoutDashboard className="h-24 w-24" />
            </div>

            <div className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-80 mix-blend-luminosity">Tickets & Reqs</h3>
                <div className="p-2 rounded-xl bg-background/50 backdrop-blur-md shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 text-purple-500">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-black tracking-tight text-purple-600 dark:text-purple-400 drop-shadow-sm">{kpis.tickets_reqs?.total_tickets || 0}</span>
                  <span className="text-sm font-semibold text-muted-foreground">Tickets</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-purple-500 dark:text-purple-400">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{kpis.tickets_reqs?.total_requirements || 0} Requirements</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* SLA KPI */}
        <Link href="/sla" className="block h-full">
          <div className="h-full relative overflow-hidden rounded-2xl group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border bg-card text-card-foreground shadow-sm">
            {/* 3D Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white to-rose-500/10 dark:from-white/5 dark:to-rose-500/20 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
            
            {/* Glowing Accent Top Border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />

            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform text-rose-500">
              <AlertTriangle className="h-24 w-24" />
            </div>

            <div className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-80 mix-blend-luminosity">Escalated / SLA</h3>
                <div className="p-2 rounded-xl bg-background/50 backdrop-blur-md shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-black tracking-tight text-rose-600 dark:text-rose-400 drop-shadow-sm">{kpis.sla?.escalated_or_breached || 0}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-rose-500 dark:text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Requires immediate attention</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {layout.sla === 'top' ? (
            <SlaGovernanceView slaStats={kpis.sla || { healthy: 0, warning: 0, breached: 0 }} />
          ) : (
            <WorkloadIntelligence workload={kpis.workload || { active_tickets: 0, active_tasks: 0, active_requirements: 0 }} />
          )}
        </div>
        <div className="lg:col-span-1">
          {layout.sla === 'top' ? (
            <WorkloadIntelligence workload={kpis.workload || { active_tickets: 0, active_tasks: 0, active_requirements: 0 }} />
          ) : (
            <SlaGovernanceView slaStats={kpis.sla || { healthy: 0, warning: 0, breached: 0 }} />
          )}
        </div>
      </div>

    </div>
  );
}
