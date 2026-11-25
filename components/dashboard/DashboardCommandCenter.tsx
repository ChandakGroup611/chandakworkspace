/* eslint-disable */
"use client";

import React, { useState, useEffect, Profiler, useMemo } from "react";
import dynamic from 'next/dynamic';
import './dashboard.css'; // The extracted and scoped CSS

import { DashboardEngine } from "./engine/DashboardEngine";
import { MyPortfolioSection } from "./portfolio/MyPortfolioSection";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";
import { performanceGovernor, DegradationStage } from "@/utils/performance/PerformanceGovernanceEngine";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import { AppButton } from "@/components/ui/AppButton";
import { Download, Plus, LayoutDashboard, Briefcase, Sparkles, Building2, Users, UserCheck, Globe, Printer } from "lucide-react";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

type HierarchyScope = "all" | "my_dept" | "my_reports" | "assigned_me";

interface DashboardCommandCenterProps {
  metrics?: any[];
  kpis?: any;
  meta?: {
    currentUser?: {
      id: string;
      name: string;
      role: string;
      departmentId: string | null;
      departmentName: string;
      isSuperAdmin?: boolean;
      isManager?: boolean;
      isDepartmentHead?: boolean;
      directReportIds?: string[];
      subordinateUserIds?: string[];
      managedDepartmentIds?: string[];
      managedDepartments?: Array<{ id: string; name: string; code?: string }>;
    };
    departments?: Array<{ id: string; name: string; code: string }>;
  } | null;
  dbError?: string | null;
  refreshComponent?: React.ReactNode;
}

export default function DashboardCommandCenter({ metrics = [], kpis, meta, dbError, refreshComponent }: DashboardCommandCenterProps) {
  useRenderLog("DashboardCommandCenter", { metricsLength: metrics.length, dbError });
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const initialView = searchParams.get("view") === "portfolio" ? "portfolio" : "overview";
  const [activeView, setActiveView] = useState<"overview" | "portfolio">(initialView);

  // Synchronize activeView immediately when query parameter changes (e.g. from sidebar links)
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "portfolio") {
      setActiveView("portfolio");
    } else {
      setActiveView("overview");
    }
  }, [searchParams]);

  // Hierarchy & Department filter state
  const [hierarchyScope, setHierarchyScope] = useState<HierarchyScope>("all");
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string>("ALL");

  const [globalScopes, setGlobalScopes] = useState<string[]>(SCOPE_OPTIONS.map(o => o.value));
  const [globalStatuses, setGlobalStatuses] = useState<string[]>(STATUS_OPTIONS.map(o => o.value));
  const [globalUsers, setGlobalUsers] = useState<string[]>([]);
  const [globalWorkspaces, setGlobalWorkspaces] = useState<string[]>([]);
  const [globalSubWorkspaces, setGlobalSubWorkspaces] = useState<string[]>([]);
  const [usersInitialized, setUsersInitialized] = useState(false);
  
  const [degradationStage, setDegradationStage] = useState<DegradationStage>(DegradationStage.STAGE_0_NORMAL);

  const [newMetricOpen, setNewMetricOpen] = useState(false);
  const newMetricRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newMetricRef.current && !newMetricRef.current.contains(event.target as Node)) {
        setNewMetricOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Get unique workspaces for multi-select
  const workspaceOptions = useMemo(() => {
    const wsSet = new Set<string>();
    metrics.forEach(m => {
      if (m.workspaceName) wsSet.add(String(m.workspaceName));
    });
    return Array.from(wsSet).sort().map(w => ({ value: w, label: w }));
  }, [metrics]);

  // Get unique sub-workspaces for multi-select (context-filtered if workspaces are selected)
  const subWorkspaceOptions = useMemo(() => {
    const swSet = new Set<string>();
    metrics.forEach(m => {
      if (globalWorkspaces.length > 0 && m.workspaceName && !globalWorkspaces.includes(m.workspaceName)) {
        return;
      }
      if (m.subWorkspaceName) swSet.add(String(m.subWorkspaceName));
    });
    return Array.from(swSet).sort().map(sw => ({ value: sw, label: sw }));
  }, [metrics, globalWorkspaces]);

  // Initialize globalUsers when uniqueUsers are first loaded
  useEffect(() => {
    if (!usersInitialized && uniqueUsers.length > 0) {
      setGlobalUsers(uniqueUsers);
      setUsersInitialized(true);
    }
  }, [uniqueUsers, usersInitialized]);

  const currentUser = meta?.currentUser;
  const isSuperAdmin = currentUser?.isSuperAdmin;
  const isManager = currentUser?.isManager || (currentUser?.subordinateUserIds && currentUser.subordinateUserIds.length > 1);
  const managedDepts = currentUser?.managedDepartments || [];

  // Automatically enforce user scope: non-super-admins cannot default to or remain on "all"
  useEffect(() => {
    if (currentUser && !isSuperAdmin && hierarchyScope === "all") {
      setHierarchyScope(isManager ? "my_reports" : (currentUser.departmentName ? "my_dept" : "assigned_me"));
    }
  }, [currentUser, isSuperAdmin, isManager, hierarchyScope]);

  // Filter metrics based on hierarchy & global filters memoized
  const filteredMetrics = useMemo(() => {
    const isAllUsersSelected = !usersInitialized || globalUsers.length === 0 || globalUsers.length >= uniqueUsers.filter(u => u !== 'Unassigned').length;

    return metrics.filter(m => {
      // 0. Super Admin Enforcement: Non-super-admins cannot view 'all' (entire organisation)
      if (!isSuperAdmin && hierarchyScope === "all") {
        if (currentUser?.id && m.userId !== currentUser.id && m.assigneeId !== currentUser.id) return false;
      }

      // 1. Hierarchy & Department Filtering
      if (hierarchyScope === "my_dept") {
        if (selectedDepartmentName !== "ALL") {
          if (m.departmentName !== selectedDepartmentName) return false;
        } else {
          // If viewing all managed departments (e.g. CFO managing Finance + Accounts)
          if (managedDepts.length > 0) {
            const managedNames = managedDepts.map((d: any) => d.name);
            if (!managedNames.includes(m.departmentName)) return false;
          } else if (currentUser?.departmentName) {
            if (m.departmentName !== currentUser.departmentName) return false;
          }
        }
      } else if (hierarchyScope === "my_reports") {
        // Reporting line (all subordinates in manager tree)
        const subIds = currentUser?.subordinateUserIds || currentUser?.directReportIds || [];
        if (!subIds.includes(m.userId)) return false;
      } else if (hierarchyScope === "assigned_me" && currentUser?.id) {
        if (m.userId !== currentUser.id) return false;
      }

      // 2. Specific Department Filter (when set under any scope)
      if (selectedDepartmentName !== "ALL" && hierarchyScope !== "my_dept") {
        if (m.departmentName !== selectedDepartmentName) return false;
      }

      // 3. Workspace & Sub-workspace Matching
      if (globalWorkspaces.length > 0) {
        if (!m.workspaceName || !globalWorkspaces.includes(m.workspaceName)) return false;
      }
      if (globalSubWorkspaces.length > 0) {
        if (!m.subWorkspaceName || !globalSubWorkspaces.includes(m.subWorkspaceName)) return false;
      }

      // 4. Scope Matching
      const scopeMatch = globalScopes.includes(m.module);
      if (!scopeMatch) return false;
      
      // 5. User Matching
      let userMatch = false;
      if (m.user === 'System') {
        userMatch = true;
      } else if (m.user === 'Unassigned') {
        userMatch = isAllUsersSelected || globalUsers.includes('Unassigned');
      } else {
        userMatch = isAllUsersSelected || globalUsers.includes(String(m.user));
      }
      if (!userMatch) return false;
      
      // 6. Status Matching
      let statusMatch = false;
      const sLower = String(m.status).toLowerCase();
      const isResolved = sLower.includes('resolv') || sLower.includes('done') || sLower.includes('clos') || sLower.includes('complete');
      const isEscalated = sLower.includes('escalat') || sLower.includes('block');
      const isReview = sLower.includes('review') || sLower.includes('qa') || sLower.includes('approval') || sLower.includes('pending');
      const isActive = !isResolved && !isEscalated && !isReview;

      if (globalStatuses.includes("Active") && isActive) statusMatch = true;
      if (globalStatuses.includes("Resolved") && isResolved) statusMatch = true;
      if (globalStatuses.includes("Escalated") && isEscalated) statusMatch = true;
      if (globalStatuses.includes("Review") && isReview) statusMatch = true;

      if (!statusMatch && globalStatuses.includes("Active") && !isResolved) statusMatch = true;

      return statusMatch;
    });
  }, [metrics, hierarchyScope, selectedDepartmentName, currentUser, managedDepts, globalWorkspaces, globalSubWorkspaces, globalScopes, globalUsers, globalStatuses, usersInitialized, uniqueUsers]);

  // Dynamic KPIs calculated strictly from filteredMetrics for full segregation
  const dynamicKpis = useMemo(() => {
    let wsTotal = 0, wsResolved = 0;
    let subWsTotal = 0, subWsResolved = 0;
    let tasksTotal = 0, tasksResolved = 0, tasksUpcoming = 0;
    let subTasksTotal = 0, subTasksResolved = 0;
    let reqsTotal = 0, reqsResolved = 0, reqsUpcoming = 0;
    let ticketsTotal = 0, ticketsResolved = 0, ticketsUpcoming = 0;
    
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
      const isResolved = sLower.includes('resolv') || sLower.includes('done') || sLower.includes('clos') || sLower.includes('complete');
      const isEscalated = sLower.includes('escalat') || sLower.includes('block');
      const isReview = sLower.includes('review') || sLower.includes('pending') || sLower.includes('approval');
      const isActive = !isResolved && !isEscalated && !isReview;

      if (isActive) totalActive++;
      if (isEscalated) totalEscalated++;
      if (isReview) totalReview++;
      if (m.isOverdue || m.slaBreached) totalOverdue++;
      
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

      const isUpcoming = m.dueDate && !isResolved && 
        (new Date(m.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24) >= 0 && 
        (new Date(m.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 3;

      if (m.module === 'Workspaces') {
        wsTotal++;
        if (isResolved) wsResolved++;
      } else if (m.module === 'Sub Workspaces') {
        subWsTotal++;
        if (isResolved) subWsResolved++;
      } else if (m.module === 'Tasks') {
        tasksTotal++;
        if (isResolved) tasksResolved++;
        if (isUpcoming) tasksUpcoming++;
        
        // SLA logic strictly for Tasks
        if (isResolved) {
          healthy++;
        } else {
          if (isEscalated || m.isOverdue) {
            breached++;
          } else if (m.dueDate && new Date(m.dueDate).getTime() - Date.now() <= 3 * 24 * 3600 * 1000) {
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
        if (isUpcoming) reqsUpcoming++;
      } else if (m.module === 'Tickets') {
        ticketsTotal++;
        if (isResolved) ticketsResolved++;
        if (isUpcoming) ticketsUpcoming++;
      }
    });

    const activeItems = totalActive + totalEscalated + totalReview;
    const escalationRate = activeItems > 0 ? (totalEscalated / activeItems) * 100 : 0;
    const overdueRate = activeItems > 0 ? (totalOverdue / activeItems) * 100 : 0;
    const resolutionVelocity = (wsResolved + tasksResolved + reqsResolved + ticketsResolved) / Math.max(1, (wsTotal + tasksTotal + reqsTotal + ticketsTotal));

    return {
      workspaces: { total: wsTotal, resolved: wsResolved },
      sub_workspaces: { total: subWsTotal, resolved: subWsResolved },
      tasks: { total: tasksTotal, resolved: tasksResolved, upcoming_due: tasksUpcoming },
      sub_tasks: { total: subTasksTotal, resolved: subTasksResolved },
      requirements: { total: reqsTotal, resolved: reqsResolved, upcoming_due: reqsUpcoming },
      tickets: { total: ticketsTotal, resolved: ticketsResolved, upcoming_due: ticketsUpcoming },
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

  const handlePrintSnapshot = () => {
    window.print();
  };

  if (!mounted) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Loading the command center…</div>;
  }

  return (
    <ExperienceProvider mode="executive">
      <Profiler id="DashboardCommandCenter" onRender={onRenderCallback}>
      <div className="dash-theme">
        <main className="main" style={{ width: '100%', minHeight: '100vh' }}>
        
        {/* TOPBAR */}
        <div className="topbar">
          {/* TITLE */}
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading topbar-title whitespace-nowrap">
              {activeView === "portfolio" ? "My portfolio" : "Command center"}
            </h1>
          </div>

          {/* MAIN DASHBOARD VIEW SWITCHER + NEW ITEM + LIVE BADGE (All in one unified flex group) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 p-1 bg-sunken rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveView("overview");
                  router.replace("/?view=overview");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                  activeView === "overview"
                    ? "bg-surface text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted hover:text-foreground hover:bg-surface"
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">Overview</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView("portfolio");
                  router.replace("/?view=portfolio");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                  activeView === "portfolio"
                    ? "bg-surface text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted hover:text-foreground hover:bg-surface"
                )}
              >
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">My portfolio</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
                  "bg-accent-soft text-accent-soft-text"
                )}>
                  Live
                </span>
              </button>
            </div>

            {/* + New Item Button */}
            <div className="relative shrink-0" ref={newMetricRef}>
              <AppButton 
                variant="primary" 
                size="sm" 
                leftIcon={<Plus className="h-3.5 w-3.5 shrink-0" />} 
                onClick={() => setNewMetricOpen(!newMetricOpen)}
                className="text-xs font-semibold shadow-xs whitespace-nowrap shrink-0"
              >
                New item
              </AppButton>
              {newMetricOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-48 rounded-lg shadow-lg theme-card-structural border border-border z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <a href="/workspaces?create=true" className="block px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent-soft transition-colors" role="menuitem">New workspace</a>
                    <a href="/workspaces/tasks?create=true" className="block px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent-soft transition-colors" role="menuitem">New task</a>
                    <a href="/tickets?create=true" className="block px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent-soft transition-colors" role="menuitem">New ticket</a>
                    <a href="/requirements?create=true" className="block px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent-soft transition-colors" role="menuitem">New requirement</a>
                    <div className="border-t border-border my-1"></div>
                    <a href="/masters?create=true" className="block px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent-soft transition-colors" role="menuitem">Master configuration</a>
                  </div>
                </div>
              )}
            </div>

            {/* Live Indicator */}
            {refreshComponent && (
              <div className="shrink-0">
                {refreshComponent}
              </div>
            )}
          </div>

          {/* FILTERS & SNAPSHOT (Right side) */}
          {activeView === "overview" && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 shrink-0 ml-auto flex-nowrap">
              {workspaceOptions.length > 0 && (
                <MultiSelectFilter
                  options={workspaceOptions}
                  selectedValues={globalWorkspaces}
                  onChange={(vals) => {
                    setGlobalWorkspaces(vals);
                    if (vals.length > 0) {
                      setGlobalSubWorkspaces(prev => prev.filter(sw => {
                        const match = metrics.find(m => m.subWorkspaceName === sw);
                        return match?.workspaceName && vals.includes(match.workspaceName);
                      }));
                    }
                  }}
                  placeholder="Workspaces"
                />
              )}

              {subWorkspaceOptions.length > 0 && (
                <MultiSelectFilter
                  options={subWorkspaceOptions}
                  selectedValues={globalSubWorkspaces}
                  onChange={setGlobalSubWorkspaces}
                  placeholder="Sub-workspaces"
                />
              )}

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

              <AppButton
                variant="outline"
                size="sm"
                onClick={handlePrintSnapshot}
                leftIcon={<Printer className="h-3.5 w-3.5 shrink-0" />}
                className="theme-card-structural hidden lg:inline-flex text-xs shrink-0"
                title="Print executive snapshot"
              >
                Snapshot
              </AppButton>
            </div>
          )}
        </div>

        {/* HIERARCHY SCOPE BAR (Overview Mode) */}
        {activeView === "overview" && (
          <div className="px-3 sm:px-6 py-2 bg-surface/40 border-b border-border flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
            <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
              <span className="text-[11px] sm:text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
                Scope:
              </span>

              {/* Entire Organization (Super Admin / Global) */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setHierarchyScope("all");
                    setSelectedDepartmentName("ALL");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                    hierarchyScope === "all" && selectedDepartmentName === "ALL"
                      ? "bg-accent-soft text-accent-soft-text font-semibold ring-1 ring-inset ring-primary/25"
                      : "bg-surface text-subtle hover:text-foreground hover:bg-surface-hover border border-border"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Entire organisation
                </button>
              )}

              {/* Reporting Line (for CFO / Managers / Team Leads) */}
              {isManager && (
                <button
                  type="button"
                  onClick={() => {
                    setHierarchyScope("my_reports");
                    setSelectedDepartmentName("ALL");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    hierarchyScope === "my_reports"
                      ? "bg-accent-soft text-accent-soft-text font-semibold ring-1 ring-inset ring-primary/25"
                      : "bg-surface text-subtle hover:text-foreground hover:bg-surface-hover border border-border"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  My reporting tree ({currentUser?.subordinateUserIds?.length || 0} Members)
                </button>
              )}

              {/* Department(s) Scope (Handles Single Dept or CFO Multi-Department) */}
              {(managedDepts.length > 0 || currentUser?.departmentName) && (
                <div className="flex items-center gap-1 bg-surface/60 rounded-lg p-0.5 border border-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setHierarchyScope("my_dept");
                      setSelectedDepartmentName("ALL");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                      hierarchyScope === "my_dept" && selectedDepartmentName === "ALL"
                        ? "bg-accent-soft text-accent-soft-text font-semibold ring-1 ring-inset ring-primary/25"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {managedDepts.length > 1
                      ? `All My Depts (${managedDepts.length})`
                      : `My Dept (${currentUser?.departmentName || "General"})`}
                  </button>

                  {/* Multi-Department Dropdown (e.g. for CFO) */}
                  {(managedDepts.length > 1 || isSuperAdmin) && (
                    <select
                      value={selectedDepartmentName}
                      onChange={(e) => {
                        setSelectedDepartmentName(e.target.value);
                        setHierarchyScope("my_dept");
                      }}
                      className="text-xs bg-background/80 border border-border rounded px-2 py-0.5 text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ALL">
                        {isSuperAdmin ? "Filter by Dept (All)" : `All Managed (${managedDepts.length})`}
                      </option>
                      {(isSuperAdmin ? (meta?.departments || []) : managedDepts).map((d: any) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Personal Assigned Scope */}
              <button
                type="button"
                onClick={() => {
                  setHierarchyScope("assigned_me");
                  setSelectedDepartmentName("ALL");
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  hierarchyScope === "assigned_me"
                    ? "bg-accent-soft text-accent-soft-text font-semibold ring-1 ring-inset ring-primary/25"
                    : "bg-surface text-subtle hover:text-foreground hover:bg-surface-hover border border-border"
                )}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Assigned to me
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground font-medium shrink-0">
              Showing <strong className="text-foreground">{filteredMetrics.length}</strong> of {metrics.length} operational deliverables
            </div>
          </div>
        )}

        <div className="content">
          
          {dbError && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--danger-soft)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: '8px', fontSize: '12px' }}>
              Data sync warning: {dbError}
            </div>
          )}

          {activeView === "portfolio" ? (
            <div className="mb-8">
              <MyPortfolioSection />
            </div>
          ) : (
            dynamicKpis && (
              <div className="mb-6">
                <DashboardEngine metrics={filteredMetrics} kpis={dynamicKpis} />
              </div>
            )
          )}

          {degradationStage >= DegradationStage.STAGE_3_SEVERE && (
            <div style={{ padding: '20px', background: 'var(--warning-soft)', color: 'var(--warning-text)', borderRadius: '8px', textAlign: 'center', marginTop: '20px', fontSize: '12px', border: '1px solid var(--warning-border)' }}>
              <strong>Stage 3 Auto-Governance Active:</strong> Non-essential charts and activity feeds have been paused to protect core system stability.
            </div>
          )}

          {/* FOOTER */}
          <div style={{ marginTop: '20px', padding: '14px 0', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>ADIOS OperationsOS</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Live data sync (15s)</div>
            <div style={{ flex: 1 }}></div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              Active items in scope: <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{filteredMetrics.length}</span>
            </div>
          </div>

        </div>
        </main>
      </div>
      </Profiler>
    </ExperienceProvider>
  );
}
