"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  FileCheck2,
  Ticket,
  FolderKanban,
  CheckSquare,
  ShieldCheck,
  History,
  RotateCcw,
  Sparkles,
  ArrowUpDown
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { fetchLivePortfolioData, PortfolioItem, PortfolioUser } from "@/lib/actions/portfolioMetrics";
import { PortfolioCharts } from "./PortfolioCharts";
import { PortfolioTables } from "./PortfolioTables";
import { UserComparisonMatrix } from "./UserComparisonMatrix";
import { cn } from "@/lib/utils";

const SCOPE_OPTIONS = [
  { value: "Tasks", label: "Tasks" },
  { value: "Sub Tasks", label: "Sub Tasks" },
  { value: "Tickets", label: "Tickets" },
  { value: "Requirements", label: "Requirements" },
  { value: "Workspaces", label: "Workspaces" },
];

type DatePreset = "this_week" | "last_week" | "this_month" | "last_month" | "last_30_days" | "custom" | "all";

export function MyPortfolioSection() {
  // 1. Fetch live portfolio data via TanStack Query
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["portfolio", "live_metrics"],
    queryFn: async () => {
      const res = await fetchLivePortfolioData();
      if (res.error) throw new Error(res.error);
      return res;
    },
    refetchInterval: 15000,
    staleTime: 5000,
    refetchOnWindowFocus: true
  });

  const rawItems: PortfolioItem[] = data?.items || [];
  const usersList: PortfolioUser[] = data?.users || [];
  const currentUserId = data?.currentUserId || "";
  const currentUserName = data?.currentUserName || "Current User";

  // 2. Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [selectedScopes, setSelectedScopes] = useState<string[]>(SCOPE_OPTIONS.map(s => s.value));
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [userInitialized, setUserInitialized] = useState<boolean>(false);

  // Default to selecting the current user initially
  useEffect(() => {
    if (!userInitialized && currentUserId) {
      setSelectedUserIds([currentUserId]);
      setUserInitialized(true);
    }
  }, [currentUserId, userInitialized]);

  // Compute calculated start and end dates based on preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();

    if (datePreset === "this_week") {
      const day = now.getDay(); // 0 is Sunday
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { startDate: monday.toISOString(), endDate: sunday.toISOString() };
    }

    if (datePreset === "last_week") {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const lastMonday = new Date(now.setDate(diffToMonday));
      lastMonday.setHours(0, 0, 0, 0);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      return { startDate: lastMonday.toISOString(), endDate: lastSunday.toISOString() };
    }

    if (datePreset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (datePreset === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (datePreset === "last_30_days") {
      const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }

    if (datePreset === "custom") {
      return {
        startDate: customStartDate ? new Date(customStartDate).toISOString() : null,
        endDate: customEndDate ? new Date(customEndDate).toISOString() : null
      };
    }

    return { startDate: null, endDate: null }; // "all"
  }, [datePreset, customStartDate, customEndDate]);

  // User Dropdown Options
  const userOptions = useMemo(() => {
    return usersList.map(u => ({
      value: u.id,
      label: u.fullName
    }));
  }, [usersList]);

  // Quick Action: Select Only Me
  const handleSelectMe = () => {
    if (currentUserId) {
      setSelectedUserIds([currentUserId]);
    }
  };

  // Quick Action: Select All Users
  const handleSelectAllUsers = () => {
    setSelectedUserIds(usersList.map(u => u.id));
  };

  // 3. Filter Items Based on Date Range, Scopes, and Users
  const filteredItems = useMemo(() => {
    const sTime = startDate ? new Date(startDate).getTime() : 0;
    const eTime = endDate ? new Date(endDate).getTime() : Number.MAX_SAFE_INTEGER;

    return rawItems.filter(item => {
      // Scope Match
      if (selectedScopes.length > 0 && !selectedScopes.includes(item.module)) {
        return false;
      }

      // User Match (If users are selected, must match userId or userName)
      if (selectedUserIds.length > 0) {
        const matchesUser =
          (item.userId && selectedUserIds.includes(item.userId)) ||
          (item.creatorId && selectedUserIds.includes(item.creatorId));

        if (!matchesUser) return false;
      }

      // If Date Filter is active, item should be relevant to this time window:
      // Either created in period, updated/closed in period, or due in period
      if (startDate || endDate) {
        const cTime = new Date(item.createdAt).getTime();
        const uTime = new Date(item.updatedAt).getTime();
        const dTime = item.dueDate ? new Date(item.dueDate).getTime() : 0;

        const isCreatedInPeriod = cTime >= sTime && cTime <= eTime;
        const isUpdatedInPeriod = uTime >= sTime && uTime <= eTime;
        const isDueInPeriod = dTime >= sTime && dTime <= eTime;
        const isCurrentlyOverdue = item.isOverdue;

        return isCreatedInPeriod || isUpdatedInPeriod || isDueInPeriod || isCurrentlyOverdue;
      }

      return true;
    });
  }, [rawItems, selectedScopes, selectedUserIds, startDate, endDate]);

  // 4. Point 1 - Segregated KPI Calculations (Strict Live Data)
  const kpis = useMemo(() => {
    const sTime = startDate ? new Date(startDate).getTime() : 0;
    const eTime = endDate ? new Date(endDate).getTime() : Number.MAX_SAFE_INTEGER;

    let createdCount = 0;
    let closedCount = 0;
    let overdueCount = 0;
    let dueNotCompletedCount = 0;
    let activeCount = 0;
    let inReviewCount = 0;
    let onTimeCompletedCount = 0;
    let revisionCount = 0;

    // Module specific counts for created items
    const createdByModule: Record<string, number> = {
      Tasks: 0,
      "Sub Tasks": 0,
      Tickets: 0,
      Requirements: 0,
      Workspaces: 0
    };

    filteredItems.forEach(item => {
      const cTime = new Date(item.createdAt).getTime();
      const uTime = new Date(item.updatedAt).getTime();
      const isResolved = item.status === "Resolved";
      const isReview = item.status === "Review";

      // Created in period
      if (cTime >= sTime && cTime <= eTime) {
        createdCount++;
        if (createdByModule[item.module] !== undefined) {
          createdByModule[item.module]++;
        }
      }

      // Closed / Resolved in period
      if (isResolved) {
        if (uTime >= sTime && uTime <= eTime) {
          closedCount++;
          if (item.isOnTime) {
            onTimeCompletedCount++;
          }
        }
      } else {
        if (isReview) inReviewCount++;
        else activeCount++;
      }

      // Overdue
      if (item.isOverdue) {
        overdueCount++;
      }

      // Due But Not Completed in between period:
      // Target due date falls between startDate & endDate, and was not resolved on time
      if (item.dueDate) {
        const dTime = new Date(item.dueDate).getTime();
        if (dTime >= sTime && dTime <= eTime) {
          if (!isResolved || (item.completedAt && new Date(item.completedAt).getTime() > dTime)) {
            dueNotCompletedCount++;
          }
        }
      }

      // Revisions
      if ((item.revisionCount && item.revisionCount > 0) || item.revisedAt) {
        revisionCount++;
      }
    });

    const onTimeRate = closedCount > 0 
      ? Math.max(0, Math.min(100, Math.round((onTimeCompletedCount / closedCount) * 100))) 
      : (filteredItems.length > 0 && overdueCount === 0 ? 100 : 0);

    return {
      createdCount,
      closedCount,
      overdueCount,
      dueNotCompletedCount,
      activeCount,
      inReviewCount,
      onTimeRate,
      revisionCount,
      createdByModule
    };
  }, [filteredItems, startDate, endDate]);

  const activeUserCount = selectedUserIds.length > 0 ? selectedUserIds.length : usersList.length;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* SECTION MASTER HEADER & FILTER BAR */}
      <div className="p-5 rounded-2xl border border-border/80 shadow-sm theme-card-structural space-y-4">
        
        {/* Top Title & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-theme-btn-primary text-theme-btn-primary-text shadow-md">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  My Portfolio & User Analytics
                </h2>
                <p className="text-xs text-muted">
                  Personal, team & comparative operational health metrics with timeline revision analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* COMPARE MODE TOGGLE BUTTON */}
            <AppButton
              variant={compareMode ? "primary" : "outline"}
              size="sm"
              leftIcon={<ArrowUpDown className="h-4 w-4" />}
              onClick={() => setCompareMode(!compareMode)}
              className={cn(
                "font-bold transition-all shadow-sm",
                compareMode 
                  ? "bg-gradient-to-r from-theme-btn-primary to-indigo-600 ring-2 ring-theme-btn-primary/30" 
                  : "border-border/80 hover:border-theme-btn-primary"
              )}
            >
              {compareMode ? "Compare Mode Active" : "Compare Users"}
              {compareMode && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                  ON
                </span>
              )}
            </AppButton>

            {/* LIVE REFRESH BUTTON */}
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />}
              onClick={() => refetch()}
              className="border-border/80 text-xs"
            >
              Sync Live
            </AppButton>

          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* Granular Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Date Range Preset */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Calendar className="h-3 w-3 text-theme-icon" /> Time Window
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-theme-btn-primary"
            >
              <option value="this_week">This Week (Mon - Sun)</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month (Current)</option>
              <option value="last_month">Last Month</option>
              <option value="last_30_days">Last 30 Days Rolling</option>
              <option value="custom">Custom Date Range...</option>
              <option value="all">All Time (No Constraint)</option>
            </select>
          </div>

          {/* 2. Scope / Entity Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Layers className="h-3 w-3 text-theme-icon" /> Entity Scope
            </label>
            <MultiSelectFilter
              options={SCOPE_OPTIONS}
              selectedValues={selectedScopes}
              onChange={setSelectedScopes}
              placeholder="Scope Types"
            />
          </div>

          {/* 3. User Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <Users className="h-3 w-3 text-theme-icon" /> Selected Users
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectMe}
                  className="text-theme-icon hover:underline font-bold"
                >
                  Only Me
                </button>
                <span className="text-muted">·</span>
                <button
                  type="button"
                  onClick={handleSelectAllUsers}
                  className="text-muted hover:text-foreground"
                >
                  All
                </button>
              </div>
            </div>
            <MultiSelectFilter
              options={userOptions}
              selectedValues={selectedUserIds}
              onChange={setSelectedUserIds}
              placeholder="Select Users"
            />
          </div>

          {/* 4. Active Filter Summary */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3 text-theme-icon" /> Filter Scope
            </label>
            <div className="p-2 rounded-lg bg-background/60 border border-border/70 text-xs flex items-center justify-between">
              <span className="font-semibold text-foreground truncate max-w-[130px]">
                {filteredItems.length} matching items
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-btn-primary/15 text-theme-icon">
                {activeUserCount} {activeUserCount === 1 ? "User" : "Users"}
              </span>
            </div>
          </div>

        </div>

        {/* Custom Date Range Pickers (Rendered if 'custom' is active) */}
        {datePreset === "custom" && (
          <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-300">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase">From Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full mt-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-theme-btn-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase">To Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full mt-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-theme-btn-primary"
              />
            </div>
          </div>
        )}

      </div>

      {/* ERROR WARNING IF ANY */}
      {error && (
        <div className="p-4 rounded-xl bg-danger/10 text-danger border border-danger/30 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Failed to synchronize live portfolio metrics: {(error as any)?.message || "Unknown error"}</span>
        </div>
      )}

      {/* POINT 4: USER COMPARISON MATRIX (SHOWN WHEN COMPARE MODE IS ACTIVE) */}
      {compareMode && (
        <UserComparisonMatrix
          items={filteredItems}
          users={usersList}
          selectedUserIds={selectedUserIds}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {/* POINT 1: SEGREGATED KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: CREATED IN PERIOD (WITH SEGREGATED SCOPE BREAKDOWN) */}
        <AppCard className="p-5 border border-border/80 shadow-sm theme-card-structural relative overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Created in Period</span>
              <div className="text-3xl font-black text-foreground mt-1 tracking-tight">
                {kpis.createdCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 space-y-1">
            <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">Segregated Counts:</span>
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-blue-500 font-semibold">{kpis.createdByModule.Tasks} Tasks</span>
              <span className="text-muted">·</span>
              <span className="text-cyan-500 font-semibold">{kpis.createdByModule["Sub Tasks"]} Subtasks</span>
              <span className="text-muted">·</span>
              <span className="text-purple-500 font-semibold">{kpis.createdByModule.Tickets} Tickets</span>
            </div>
          </div>
        </AppCard>

        {/* KPI 2: CLOSED / COMPLETED IN PERIOD */}
        <AppCard className="p-5 border border-border/80 shadow-sm theme-card-structural relative overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-success uppercase tracking-wider">Closed / Completed</span>
              <div className="text-3xl font-black text-success mt-1 tracking-tight">
                {kpis.closedCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> On-Time Rate:
            </span>
            <span className="font-bold text-foreground">{kpis.onTimeRate}%</span>
          </div>
        </AppCard>

        {/* KPI 3: OVERDUE TASK COUNT */}
        <AppCard className="p-5 border border-border/80 shadow-sm theme-card-structural relative overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-danger uppercase tracking-wider">Currently Overdue</span>
              <div className="text-3xl font-black text-danger mt-1 tracking-tight">
                {kpis.overdueCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted">Active Overdue Risk:</span>
            <span className="font-bold text-danger">
              {kpis.overdueCount > 0 ? "Action Required" : "All Clear"}
            </span>
          </div>
        </AppCard>

        {/* KPI 4: DUE BUT NOT COMPLETED IN PERIOD */}
        <AppCard className="p-5 border border-border/80 shadow-sm theme-card-structural relative overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Due But Not Done (Period)</span>
              <div className="text-3xl font-black text-amber-500 mt-1 tracking-tight">
                {kpis.dueNotCompletedCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted">Revised Deadlines:</span>
            <span className="font-bold text-theme-icon">{kpis.revisionCount} Tasks</span>
          </div>
        </AppCard>

      </div>

      {/* POINT 2: VISUAL CHARTS (STATUS-WISE & PRIORITY-WISE MATRIX) */}
      <PortfolioCharts items={filteredItems} />

      {/* POINT 3 & 5: DETAILED TABLES (OVERDUE, DUE NOT COMPLETED & TIMELINE REVISIONS) */}
      <PortfolioTables
        items={filteredItems}
        startDate={startDate}
        endDate={endDate}
      />

    </div>
  );
}
