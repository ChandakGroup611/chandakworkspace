"use client";

import React, { useState, useEffect, Profiler, useMemo } from "react";
import dynamic from 'next/dynamic';
import './dashboard.css'; // The extracted and scoped CSS

import { DashboardEngine } from "./engine/DashboardEngine";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";
import { performanceGovernor, DegradationStage } from "@/utils/performance/PerformanceGovernanceEngine";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import { AppButton } from "@/components/ui/AppButton";
import { Download, Plus } from "lucide-react";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";

const SCOPE_OPTIONS = [
  { value: "Tickets", label: "Tickets" },
  { value: "Tasks", label: "Tasks" },
  { value: "Sub Tasks", label: "Sub Tasks" },
  { value: "Requirements", label: "Requirements" },
  { value: "Workspaces", label: "Workspaces" },
  { value: "Sub Workspaces", label: "Sub Workspaces" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active (Open/Progress)" },
  { value: "Review", label: "In Review" },
  { value: "Escalated", label: "Escalated/Blocked" },
  { value: "Resolved", label: "Resolved/Done" },
];

interface DashboardCommandCenterProps {
  metrics?: any[];
  kpis?: any;
  dbError?: string | null;
  refreshComponent?: React.ReactNode;
}

export default function DashboardCommandCenter({ metrics = [], kpis, dbError, refreshComponent }: DashboardCommandCenterProps) {
  useRenderLog("DashboardCommandCenter", { metricsLength: metrics.length, dbError });
  const [mounted, setMounted] = useState(false);
  const [globalScopes, setGlobalScopes] = useState<string[]>(SCOPE_OPTIONS.map(o => o.value));
  const [globalStatuses, setGlobalStatuses] = useState<string[]>(STATUS_OPTIONS.map(o => o.value));
  const [globalUsers, setGlobalUsers] = useState<string[]>([]);
  const [usersInitialized, setUsersInitialized] = useState(false);
  
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

  const userOptions = useMemo(() => {
    return uniqueUsers.map(u => ({ value: u, label: u }));
  }, [uniqueUsers]);

  // Initialize globalUsers when uniqueUsers are first loaded
  useEffect(() => {
    if (!usersInitialized && uniqueUsers.length > 0) {
      setGlobalUsers(uniqueUsers);
      setUsersInitialized(true);
    }
  }, [uniqueUsers, usersInitialized]);

  // Filter metrics based on global filters memoized
  const filteredMetrics = useMemo(() => {
    if (!usersInitialized) return metrics; // Don't filter out everything before users are loaded
    
    return metrics.filter(m => {
      const scopeMatch = globalScopes.includes(m.module);
      const userMatch = globalUsers.includes(String(m.user)) || m.user === 'System';
      
      let statusMatch = false;
      const sLower = String(m.status).toLowerCase();
      const isResolved = sLower.includes('resolv') || sLower.includes('done');
      const isEscalated = sLower.includes('escalat') || sLower.includes('block');
      const isReview = sLower.includes('review');
      const isActive = !isResolved && !isEscalated && !isReview;

      if (globalStatuses.includes("Active") && isActive) statusMatch = true;
      if (globalStatuses.includes("Resolved") && isResolved) statusMatch = true;
      if (globalStatuses.includes("Escalated") && isEscalated) statusMatch = true;
      if (globalStatuses.includes("Review") && isReview) statusMatch = true;

      // Special case: if raw text status matched none of the above cleanly, let's include it if Active is checked as fallback
      if (!statusMatch && globalStatuses.includes("Active") && !isResolved) statusMatch = true;

      return scopeMatch && userMatch && statusMatch;
    });
  }, [metrics, globalScopes, globalUsers, globalStatuses, usersInitialized]);

  // Dynamic KPIs calculated strictly from filteredMetrics for full segregation
  const dynamicKpis = useMemo(() => {
    let wsTotal = 0, wsResolved = 0;
    let subWsTotal = 0, subWsResolved = 0;
    let tasksTotal = 0, tasksResolved = 0;
    let subTasksTotal = 0, subTasksResolved = 0;
    let reqsTotal = 0, reqsResolved = 0;
    let ticketsTotal = 0, ticketsResolved = 0;
    
    let healthy = 0, warning = 0, breached = 0;
    let totalEscalated = 0, totalOverdue = 0, totalActive = 0, totalReview = 0;
    
    // For Status-wise Comparison Monthly
    const monthlyData: Record<string, { active: number, review: number, escalated: number, resolved: number }> = {};
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      monthlyData[monthStr] = { active: 0, review: 0, escalated: 0, resolved: 0 };
    }

    filteredMetrics.forEach(m => {
      const sLower = String(m.status).toLowerCase();
      const isResolved = sLower.includes('resolv') || sLower.includes('done');
      const isEscalated = sLower.includes('escalat') || sLower.includes('block');
      const isReview = sLower.includes('review');
      const isActive = !isResolved && !isEscalated && !isReview;

      if (isActive) totalActive++;
      if (isEscalated) totalEscalated++;
      if (isReview) totalReview++;
      if (m.isOverdue) totalOverdue++;
      
      // Monthly Bucket
      if (m.createdAt) {
        const d = new Date(m.createdAt);
        const monthStr = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        if (monthlyData[monthStr]) {
          if (isResolved) monthlyData[monthStr].resolved++;
          else if (isEscalated) monthlyData[monthStr].escalated++;
          else if (isReview) monthlyData[monthStr].review++;
          else monthlyData[monthStr].active++;
        }
      }

      if (m.module === 'Workspaces') {
        wsTotal++;
        if (isResolved) wsResolved++;
      } else if (m.module === 'Sub Workspaces') {
        subWsTotal++;
        if (isResolved) subWsResolved++;
      } else if (m.module === 'Tasks') {
        tasksTotal++;
        if (isResolved) tasksResolved++;
        
        // SLA logic strictly for Tasks
        if (isResolved) {
          healthy++;
        } else {
          if (isEscalated || m.isOverdue) {
            breached++;
          } else if (m.dueDate && new Date(m.dueDate).getTime() - Date.now() <= 7 * 24 * 3600 * 1000) {
            warning++;
          } else {
            healthy++;
          }
        }
      } else if (m.module === 'Sub Tasks') {
        subTasksTotal++;
        if (isResolved) subTasksResolved++;
      } else if (m.module === 'Requirements') {
        reqsTotal++;
        if (isResolved) reqsResolved++;
      } else if (m.module === 'Tickets') {
        ticketsTotal++;
        if (isResolved) ticketsResolved++;
      }
    });

    const activeItems = totalActive + totalEscalated + totalReview;
    const escalationRate = activeItems > 0 ? (totalEscalated / activeItems) * 100 : 0;
    const overdueRate = activeItems > 0 ? (totalOverdue / activeItems) * 100 : 0;
    const resolutionVelocity = (wsResolved + tasksResolved + reqsResolved + ticketsResolved) / Math.max(1, (wsTotal + tasksTotal + reqsTotal + ticketsTotal));

    return {
      workspaces: { total: wsTotal, resolved: wsResolved },
      sub_workspaces: { total: subWsTotal, resolved: subWsResolved },
      tasks: { total: tasksTotal, resolved: tasksResolved },
      sub_tasks: { total: subTasksTotal, resolved: subTasksResolved },
      requirements: { total: reqsTotal, resolved: reqsResolved },
      tickets: { total: ticketsTotal, resolved: ticketsResolved },
      sla: { escalated_or_breached: breached, healthy, warning, breached },
      workload: {
        active_tasks: tasksTotal - tasksResolved,
        active_tickets: ticketsTotal - ticketsResolved,
        active_requirements: reqsTotal - reqsResolved
      },
      risk: {
        escalationRate,
        overdueRate,
        velocity: resolutionVelocity * 100
      },
      monthlyTrends: Object.keys(monthlyData).map(month => ({
        month,
        ...monthlyData[month]
      }))
    };
  }, [filteredMetrics]);

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
            <MultiSelectFilter
              options={SCOPE_OPTIONS}
              selectedValues={globalScopes}
              onChange={setGlobalScopes}
              placeholder="Scopes"
            />

            <MultiSelectFilter
              options={STATUS_OPTIONS}
              selectedValues={globalStatuses}
              onChange={setGlobalStatuses}
              placeholder="Statuses"
            />

            <MultiSelectFilter
              options={userOptions}
              selectedValues={globalUsers}
              onChange={setGlobalUsers}
              placeholder="Users"
            />

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
              <DashboardEngine metrics={filteredMetrics} kpis={dynamicKpis} />
            </div>
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
