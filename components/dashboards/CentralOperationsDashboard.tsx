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
        <Link href="/workspaces/tasks" className="block">
          <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <Target className="h-16 w-16" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Tasks</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-500">{kpis.tasks?.total || 0}</span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs font-medium">
                <span className="text-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {kpis.tasks?.resolved || 0} Resolved</span>
                <span className="text-amber-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {kpis.tasks?.upcoming_due || 0} Upcoming</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Workspace KPI */}
        <Link href="/workspaces/enrolled" className="block">
          <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <FolderOpen className="h-16 w-16" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Enrolled Workspaces</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-emerald-500">{kpis.workspaces?.enrolled_workspaces || 0}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Also enrolled in {kpis.workspaces?.enrolled_sub_workspaces || 0} Sub-Workspaces</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Requirement & Ticket KPI */}
        <Link href="/tickets" className="block">
          <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="h-16 w-16" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Tickets & Reqs</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-purple-500">{kpis.tickets_reqs?.total_tickets || 0}</span>
                <span className="text-sm font-medium text-muted-foreground">Tickets</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-400">
                <Activity className="h-3 w-3" />
                <span>{kpis.tickets_reqs?.total_requirements || 0} Requirements</span>
              </div>
            </div>
          </div>
        </Link>

        {/* SLA KPI */}
        <Link href="/sla" className="block">
          <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group hover:border-red-500/50 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-16 w-16" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Escalated / SLA</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-destructive">{kpis.sla?.escalated_or_breached || 0}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-500">
                <AlertTriangle className="h-3 w-3" />
                <span>Requires immediate attention</span>
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
