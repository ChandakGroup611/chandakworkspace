"use client";

import React, { useState, useEffect, Profiler, useMemo } from "react";
import dynamic from 'next/dynamic';
import './dashboard.css'; // The extracted and scoped CSS

import MetricsRow from "./panels/MetricsRow";
import HealthGrid from "./panels/HealthGrid";
import { CentralOperationsDashboard } from "@/components/dashboards/CentralOperationsDashboard";

// Lazy load heavy charts and boards
const ChartsRow = dynamic(() => import("./panels/ChartsRow"), { 
  ssr: false, 
  loading: () => <div className="p-8 text-center text-gray-500 text-xs">Loading Charts...</div> 
});
const SprintKanbanBoard = dynamic(() => import("./panels/SprintKanbanBoard"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-gray-500 text-xs">Loading Kanban...</div>
});

import RecentTicketsTable from "./panels/RecentTicketsTable";
import ActivityFeed from "./panels/ActivityFeed";
import UpcomingDeadlines from "./panels/UpcomingDeadlines";
import TeamPerformance from "./panels/TeamPerformance";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";
import { performanceGovernor, DegradationStage } from "@/utils/performance/PerformanceGovernanceEngine";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import { AppButton } from "@/components/ui/AppButton";
import { Download, Plus } from "lucide-react";

interface DashboardCommandCenterProps {
  metrics?: any[];
  kpis?: any;
  dbError?: string | null;
  refreshComponent?: React.ReactNode;
}

export default function DashboardCommandCenter({ metrics = [], kpis, dbError, refreshComponent }: DashboardCommandCenterProps) {
  useRenderLog("DashboardCommandCenter", { metricsLength: metrics.length, dbError });
  const [mounted, setMounted] = useState(false);
  const [globalScope, setGlobalScope] = useState<string>("All");
  const [globalUser, setGlobalUser] = useState<string>("All");
  const [globalStatus, setGlobalStatus] = useState<string>("All");
  
  const [degradationStage, setDegradationStage] = useState<DegradationStage>(DegradationStage.STAGE_0_NORMAL);

  useEffect(() => {
    setMounted(true);
    performanceGovernor.setRoute('Dashboard');
    const unsubscribe = performanceGovernor.subscribeToStageChanges((stage) => {
      setDegradationStage(stage);
    });
    return () => { unsubscribe(); };
  }, []);

  // Get unique users for the dropdown
  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(metrics.filter(m => m.user && m.user !== 'System').map(m => String(m.user))));
  }, [metrics]);

  // Filter metrics based on global filters memoized
  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      const scopeMatch = globalScope === "All" || m.module === globalScope;
      const userMatch = globalUser === "All" || String(m.user) === globalUser;
      
      let statusMatch = true;
      if (globalStatus !== "All") {
        const sLower = String(m.status).toLowerCase();
        if (globalStatus === "Active" && !sLower.includes('resolv') && !sLower.includes('done')) statusMatch = true;
        else if (globalStatus === "Resolved" && (sLower.includes('resolv') || sLower.includes('done'))) statusMatch = true;
        else if (globalStatus === "Escalated" && (sLower.includes('escalat') || sLower.includes('block'))) statusMatch = true;
        else if (globalStatus === "Review" && sLower.includes('review')) statusMatch = true;
        else statusMatch = false;
      }

      return scopeMatch && userMatch && statusMatch;
    });
  }, [metrics, globalScope, globalUser, globalStatus]);

  // Dynamic KPIs calculated strictly from filteredMetrics for full segregation
  const dynamicKpis = useMemo(() => {
    let tasksTotal = 0, tasksResolved = 0, tasksUpcoming = 0;
    let ticketsReqsTotal = 0, reqsTotal = 0;
    let healthy = 0, warning = 0, breached = 0;

    filteredMetrics.forEach(m => {
      const sLower = String(m.status).toLowerCase();
      const isResolved = sLower.includes('resolv') || sLower.includes('done');
      const isEscalated = sLower.includes('escalat') || sLower.includes('block');
      
      // Module specific
      if (m.module === 'Tasks') {
        tasksTotal++;
        if (isResolved) tasksResolved++;
      }
      if (m.module === 'Tickets') ticketsReqsTotal++;
      if (m.module === 'Requirements') reqsTotal++;

      // SLA logic matches dashboardMetrics but ONLY for Tasks as requested
      if (m.module === 'Tasks') {
        if (isResolved) {
          // Resolved not included in SLA warnings
          healthy++;
        } else {
          if (isEscalated || m.isOverdue) {
            breached++;
          } else if (m.dueDate && new Date(m.dueDate).getTime() - Date.now() <= 7 * 24 * 3600 * 1000) {
            warning++;
            tasksUpcoming++;
          } else {
            healthy++;
          }
        }
      }
    });

    return {
      tasks: { total: tasksTotal, resolved: tasksResolved, upcoming_due: tasksUpcoming },
      workspaces: kpis?.workspaces || { enrolled_workspaces: 0, enrolled_sub_workspaces: 0 },
      tickets_reqs: { total_tickets: ticketsReqsTotal, total_requirements: reqsTotal },
      sla: { escalated_or_breached: breached, healthy, warning, breached },
      workload: { 
        active_tasks: tasksTotal - tasksResolved, 
        active_tickets: ticketsReqsTotal, 
        active_requirements: reqsTotal 
      }
    };
  }, [filteredMetrics, kpis]);

  if (!mounted) {
    return <div style={{ padding: '2rem', color: '#8b91a8', fontFamily: 'monospace' }}>Loading Exact Match Dashboard...</div>;
  }

  return (
    <ExperienceProvider mode="executive">
      <Profiler id="DashboardCommandCenter" onRender={onRenderCallback}>
      <div className="dash-theme">
        <main className="main" style={{ width: '100%', minHeight: '100vh' }}>
        
        {/* TOPBAR */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Overview Dashboard</div>
            <div className="topbar-sub">Live System Metrics</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={globalScope}
              onChange={(e) => setGlobalScope(e.target.value)}
              className="tb-btn"
              style={{ paddingRight: '24px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Scopes</option>
              <option value="Tickets">Tickets</option>
              <option value="Tasks">Tasks</option>
              <option value="Sub Tasks">Sub Tasks</option>
              <option value="Requirements">Requirements</option>
              <option value="Workspaces">Workspaces</option>
              <option value="Sub Workspaces">Sub Workspaces</option>
            </select>

            <select
              value={globalStatus}
              onChange={(e) => setGlobalStatus(e.target.value)}
              className="tb-btn"
              style={{ paddingRight: '24px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active (Open/Progress)</option>
              <option value="Review">In Review</option>
              <option value="Escalated">Escalated/Blocked</option>
              <option value="Resolved">Resolved/Done</option>
            </select>

            <select
              value={globalUser}
              onChange={(e) => setGlobalUser(e.target.value)}
              className="tb-btn"
              style={{ paddingRight: '24px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <AppButton variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
              Export
            </AppButton>
            <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              New Metric
            </AppButton>
            
            {refreshComponent && (
              <div className="ml-2 pl-2 border-l border-[var(--border)]">
                {refreshComponent}
              </div>
            )}
          </div>
        </div>

        <div className="content">
          
          {dbError && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,95,126,0.1)', color: 'var(--red)', border: '0.5px solid rgba(255,95,126,0.3)', borderRadius: '8px', fontSize: '12px' }}>
              Data Sync Warning: {dbError}
            </div>
          )}

          {dynamicKpis && (
            <div className="mb-6">
              <CentralOperationsDashboard analytics={dynamicKpis} preferences={{ widget_layout: { sla: 'top', workload: 'bottom' } }} />
            </div>
          )}
          
          {degradationStage < DegradationStage.STAGE_3_SEVERE && (
            <>
              <ChartsRow metrics={filteredMetrics} />
              
              <SprintKanbanBoard metrics={filteredMetrics} />

              <div className="grid-3">
                <RecentTicketsTable metrics={filteredMetrics} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ActivityFeed metrics={filteredMetrics} />
                  <UpcomingDeadlines metrics={filteredMetrics} />
                </div>
              </div>

              <TeamPerformance metrics={filteredMetrics} />
            </>
          )}

          {degradationStage >= DegradationStage.STAGE_3_SEVERE && (
            <div style={{ padding: '20px', background: 'rgba(255,200,0,0.1)', color: 'var(--amber)', borderRadius: '8px', textAlign: 'center', marginTop: '20px', fontSize: '12px', border: '1px solid rgba(255,200,0,0.2)' }}>
              <strong>Stage 3 Auto-Governance Active:</strong> Non-essential charts and activity feeds have been paused to protect core system stability.
            </div>
          )}

          {/* FOOTER */}
          <div style={{ marginTop: '20px', padding: '14px 0', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>TaskForge Internal</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Live Data Sync</div>
            <div style={{ flex: 1 }}></div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Active Items: <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{metrics.length}</span></div>
          </div>

        </div>
        </main>
      </div>
      </Profiler>
    </ExperienceProvider>
  );
}
