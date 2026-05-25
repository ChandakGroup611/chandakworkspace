"use client";

import React, { useState } from "react";
import { useDashboardTheme } from "@/components/theme/DashboardThemeProvider";
import { LayoutDashboard, CheckCircle, AlertTriangle, Clock, Target, Activity } from "lucide-react";
import { WorkloadIntelligence } from "./WorkloadIntelligence";
import { SlaGovernanceView } from "./SlaGovernanceView";

interface DashboardProps {
  analytics: any;
  preferences: any;
}

export function CentralOperationsDashboard({ analytics, preferences }: DashboardProps) {
  const { dashboardTheme } = useDashboardTheme();
  
  // Example of using layout preferences
  // In a real app we'd use react-grid-layout or similar to arrange these based on preferences.widget_layout
  const layout = preferences.widget_layout || { sla: 'top', workload: 'bottom' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Executive KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ticket KPI */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
            <LayoutDashboard className="h-16 w-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Open Tickets</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-primary">{analytics.kpis.tickets.open}</span>
              <span className="text-sm font-medium text-muted-foreground">/ {analytics.kpis.tickets.total}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-500">
              <CheckCircle className="h-3 w-3" />
              <span>{analytics.kpis.tickets.closed} Resolved</span>
            </div>
          </div>
        </div>

        {/* Task KPI */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
            <Target className="h-16 w-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Task Completion</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-blue-500">{analytics.kpis.tasks.completion_percentage}%</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${analytics.kpis.tasks.completion_percentage}%` }} />
            </div>
          </div>
        </div>

        {/* Requirement KPI */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
            <Activity className="h-16 w-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Active Requirements</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-purple-500">{analytics.kpis.requirements.pending}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-400">
              <span>{analytics.kpis.requirements.uat} pending UAT</span>
            </div>
          </div>
        </div>

        {/* Workload SLA */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-16 w-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">SLA Breaches</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-destructive">{analytics.sla.breached}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-500">
              <Clock className="h-3 w-3" />
              <span>{analytics.sla.warning} in Warning</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {layout.sla === 'top' ? (
            <SlaGovernanceView slaStats={analytics.sla} />
          ) : (
            <WorkloadIntelligence workload={analytics.workload} />
          )}
        </div>
        <div className="lg:col-span-1">
          {layout.sla === 'top' ? (
            <WorkloadIntelligence workload={analytics.workload} />
          ) : (
            <SlaGovernanceView slaStats={analytics.sla} />
          )}
        </div>
      </div>

    </div>
  );
}
