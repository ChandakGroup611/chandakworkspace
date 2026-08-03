"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Download, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Layers, 
  ListTodo, 
  Briefcase, 
  FileText, 
  Building2, 
  TrendingUp, 
  Award, 
  ShieldCheck, 
  ExternalLink,
  Calendar,
  Filter,
  UserCheck
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { fetchUserPerformanceWorkingSheet, UserPerformanceSummary, UserPerformanceActivity } from "@/lib/actions/userPerformance";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserPerformanceWorkingSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userNameOrId: string | null;
}

type TabType = "all" | "tasks" | "subtasks" | "tickets" | "requirements" | "workspaces" | "trends";
type TimeRangeType = "all" | "month" | "30days" | "quarter" | "90days";

export function UserPerformanceWorkingSheetModal({
  isOpen,
  onClose,
  userNameOrId
}: UserPerformanceWorkingSheetModalProps) {
  const [data, setData] = useState<UserPerformanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    if (isOpen && userNameOrId) {
      loadPerformanceData();
    }
  }, [isOpen, userNameOrId, timeRange]);

  const loadPerformanceData = async () => {
    if (!userNameOrId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUserPerformanceWorkingSheet(userNameOrId, timeRange);
      if (res.error) {
        setError(res.error);
        setData(null);
      } else {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  // Filter activities based on active tab, search, status, and priority
  const filteredActivities = useMemo(() => {
    if (!data?.activities) return [];

    return data.activities.filter(activity => {
      // Tab filter
      if (activeTab === "tasks" && activity.module !== "Tasks") return false;
      if (activeTab === "subtasks" && activity.module !== "Sub Tasks") return false;
      if (activeTab === "tickets" && activity.module !== "Tickets") return false;
      if (activeTab === "requirements" && activity.module !== "Requirements") return false;
      if (activeTab === "workspaces" && (activity.module !== "Workspaces" && activity.module !== "Sub Workspaces")) return false;

      // Status filter
      if (statusFilter === "resolved" && activity.status !== "Resolved") return false;
      if (statusFilter === "active" && activity.status !== "Active") return false;
      if (statusFilter === "review" && activity.status !== "Review") return false;
      if (statusFilter === "escalated" && activity.status !== "Escalated") return false;
      if (statusFilter === "overdue" && !activity.isOverdue) return false;

      // Priority filter
      if (priorityFilter !== "all" && activity.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = activity.title.toLowerCase().includes(q);
        const matchCode = activity.code?.toLowerCase().includes(q) || false;
        const matchContext = activity.context?.toLowerCase().includes(q) || false;
        const matchRawStatus = activity.rawStatus.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchContext && !matchRawStatus) return false;
      }

      return true;
    });
  }, [data, activeTab, statusFilter, priorityFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!data) return;

    const headers = [
      "Item Code",
      "Module",
      "Title",
      "Context / Workspace",
      "Role",
      "Status",
      "Priority",
      "Created Date",
      "Due Date",
      "Performance Tag"
    ];

    const rows = data.activities.map(a => [
      `"${a.code || a.id}"`,
      `"${a.module}"`,
      `"${(a.title || "").replace(/"/g, '""')}"`,
      `"${(a.context || "").replace(/"/g, '""')}"`,
      `"${a.roleInActivity || "Participant"}"`,
      `"${a.rawStatus}"`,
      `"${a.priority}"`,
      `"${a.createdAt ? format(new Date(a.createdAt), "yyyy-MM-dd HH:mm") : ""}"`,
      `"${a.dueDate ? format(new Date(a.dueDate), "yyyy-MM-dd") : "N/A"}"`,
      `"${a.status === "Resolved" ? (a.isOnTime ? "Completed On-Time" : "Completed Late") : (a.isOverdue ? "Overdue / Breached" : "In Progress")}"`
    ]);

    const summarySection = [
      ["USER PERFORMANCE WORKING SHEET"],
      ["User Name", data.user.fullName],
      ["User Code", data.user.userCode || ""],
      ["Email", data.user.email],
      ["Designation", data.user.designation],
      ["Department", data.user.department],
      ["Period", timeRange.toUpperCase()],
      ["Overall Performance Ratio", `${data.ratios.overallPerformanceRatio}%`],
      ["Rating", data.ratios.performanceRating],
      ["Completion Rate", `${data.ratios.completionRate}%`],
      ["On-Time Delivery Rate", `${data.ratios.onTimeDeliveryRate}%`],
      ["SLA Compliance Rate", `${data.ratios.slaComplianceRate}%`],
      ["Total Work Volume", data.metrics.totalAssigned],
      ["Total Completed", data.metrics.totalCompleted],
      ["Active Workload", data.metrics.totalActive],
      ["Overdue Items", data.metrics.totalOverdue],
      [],
      ["ITEMIZED ACTIVITY WORKING LOG"],
      headers
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      summarySection.map(e => e.join(",")).join("\n") + "\n" +
      rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedName = data.user.fullName.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("download", `${sanitizedName}_Performance_Working_Sheet_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/60 flex items-center justify-center p-3 md:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] bg-surface dark:bg-[#0B0F19] border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 md:p-5 border-b border-border/60 flex flex-wrap items-center justify-between gap-4 bg-surface/50 dark:bg-[#0E1320]/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-emerald-500/20 border border-primary/30 flex items-center justify-center text-primary font-black text-lg shadow-sm">
              {data?.user?.fullName ? data.user.fullName.substring(0, 2).toUpperCase() : (userNameOrId?.substring(0, 2).toUpperCase() || "UP")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">
                  {data?.user?.fullName || userNameOrId || "User Performance Working Sheet"}
                </h2>
                {data && (
                  <AppBadge 
                    variant={
                      data.ratios.performanceRating === "Exceptional" ? "success" :
                      data.ratios.performanceRating === "High Performer" ? "info" :
                      data.ratios.performanceRating === "Standard" ? "neutral" : "danger"
                    }
                    className="font-bold text-[11px] px-2.5 py-0.5"
                  >
                    {data.ratios.performanceRating}
                  </AppBadge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                <span>{data?.user?.designation || "Team Member"}</span>
                <span>•</span>
                <span>{data?.user?.department || "Operations"}</span>
                <span>•</span>
                <span>ID: {data?.user?.userCode || data?.user?.id.substring(0, 8)}</span>
              </div>
            </div>
          </div>

          {/* PERIOD SELECTOR & ACTIONS */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 bg-surface dark:bg-[#131927] border border-border rounded-xl p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRangeType)}
                className="bg-transparent border-0 text-foreground font-medium text-xs py-1 px-2 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="all" className="bg-surface dark:bg-[#0B0F19]">All Time</option>
                <option value="month" className="bg-surface dark:bg-[#0B0F19]">This Month</option>
                <option value="30days" className="bg-surface dark:bg-[#0B0F19]">Last 30 Days</option>
                <option value="quarter" className="bg-surface dark:bg-[#0B0F19]">This Quarter</option>
                <option value="90days" className="bg-surface dark:bg-[#0B0F19]">Last 90 Days</option>
              </select>
            </div>

            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />}
              onClick={loadPerformanceData}
              title="Refresh Data"
            >
              Sync
            </AppButton>

            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5 text-primary" />}
              onClick={handleExportCSV}
              disabled={!data || data.activities.length === 0}
              className="hidden sm:inline-flex"
            >
              Export CSV
            </AppButton>

            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              className="hidden md:inline-flex"
            >
              Print
            </AppButton>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface dark:hover:bg-surface/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm font-medium">Aggregating cross-module activities and performance ratios...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              {/* EXECUTIVE PERFORMANCE RATIO & KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                
                {/* Overall Score */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-surface dark:from-primary/15 dark:via-[#111625] dark:to-[#0E1320] border border-primary/20 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Performance Index</span>
                    <Award className="w-4 h-4 text-primary" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.ratios.overallPerformanceRatio}%
                    </span>
                    <span className="text-xs font-semibold text-emerald-500">
                      Score
                    </span>
                  </div>
                  <div className="mt-2.5 w-full bg-surface dark:bg-surface/20 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${data.ratios.overallPerformanceRatio}%` }}
                    />
                  </div>
                </div>

                {/* On-Time Delivery Rate */}
                <div className="p-4 rounded-2xl bg-surface dark:bg-[#111625] border border-border/70 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">On-Time Delivery</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.ratios.onTimeDeliveryRate}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {data.metrics.onTimeCompleted} of {data.metrics.totalCompleted}
                    </span>
                  </div>
                  <div className="mt-2.5 w-full bg-surface dark:bg-surface/20 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${data.ratios.onTimeDeliveryRate}%` }}
                    />
                  </div>
                </div>

                {/* SLA Compliance */}
                <div className="p-4 rounded-2xl bg-surface dark:bg-[#111625] border border-border/70 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">SLA Compliance</span>
                    <ShieldCheck className="w-4 h-4 text-accent" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.ratios.slaComplianceRate}%
                    </span>
                    <span className="text-xs text-muted-foreground">Adherence</span>
                  </div>
                  <div className="mt-2.5 w-full bg-surface dark:bg-surface/20 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full transition-all duration-1000"
                      style={{ width: `${data.ratios.slaComplianceRate}%` }}
                    />
                  </div>
                </div>

                {/* Completion Volume */}
                <div className="p-4 rounded-2xl bg-surface dark:bg-[#111625] border border-border/70 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Resolved Volume</span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.metrics.totalCompleted}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {data.metrics.totalAssigned} items ({data.ratios.completionRate}%)
                    </span>
                  </div>
                  <div className="mt-2.5 w-full bg-surface dark:bg-surface/20 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: `${data.ratios.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Active & Risk Load */}
                <div className="p-4 rounded-2xl bg-surface dark:bg-[#111625] border border-border/70 shadow-sm col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active & Overdue</span>
                    <AlertTriangle className={cn("w-4 h-4", data.metrics.totalOverdue > 0 ? "text-rose-500" : "text-amber-500")} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.metrics.totalActive}
                    </span>
                    <span className={cn("text-xs font-bold", data.metrics.totalOverdue > 0 ? "text-rose-500" : "text-muted-foreground")}>
                      ({data.metrics.totalOverdue} overdue)
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{data.metrics.totalInReview} In Review</span>
                    <span className="mx-1">•</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{data.metrics.totalEscalated} Escalated</span>
                  </div>
                </div>

              </div>

              {/* MODULE BREAKDOWN PILLS */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-surface/50 dark:bg-[#0E1320] border border-border/60 rounded-2xl text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">Output Breakdown:</span>
                
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface dark:bg-[#131927] border border-border font-medium">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span className="text-foreground font-semibold">Tasks:</span>
                  <span className="text-primary font-bold">{data.moduleBreakdown.tasks.completed}/{data.moduleBreakdown.tasks.total}</span>
                  <span className="text-muted-foreground text-[10px]">({data.moduleBreakdown.tasks.rate}%)</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface dark:bg-[#131927] border border-border font-medium">
                  <ListTodo className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-foreground font-semibold">Subtasks:</span>
                  <span className="text-primary font-bold">{data.moduleBreakdown.subTasks.completed}/{data.moduleBreakdown.subTasks.total}</span>
                  <span className="text-muted-foreground text-[10px]">({data.moduleBreakdown.subTasks.rate}%)</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface dark:bg-[#131927] border border-border font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-foreground font-semibold">Tickets:</span>
                  <span className="text-primary font-bold">{data.moduleBreakdown.tickets.resolved}/{data.moduleBreakdown.tickets.total}</span>
                  <span className="text-muted-foreground text-[10px]">({data.moduleBreakdown.tickets.rate}%)</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface dark:bg-[#131927] border border-border font-medium">
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-foreground font-semibold">Requirements:</span>
                  <span className="text-primary font-bold">{data.moduleBreakdown.requirements.completed}/{data.moduleBreakdown.requirements.total}</span>
                  <span className="text-muted-foreground text-[10px]">({data.moduleBreakdown.requirements.rate}%)</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface dark:bg-[#131927] border border-border font-medium">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-foreground font-semibold">Workspaces:</span>
                  <span className="text-primary font-bold">{data.moduleBreakdown.workspaces.total} Enrolled</span>
                </div>
              </div>

              {/* WORKING SHEET TABS & CONTROLS */}
              <div className="space-y-4">
                
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  
                  {/* Module Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                    {[
                      { key: "all", label: "All Activities", count: data.activities.length, icon: UserCheck },
                      { key: "tasks", label: "Tasks", count: data.moduleBreakdown.tasks.total, icon: Layers },
                      { key: "subtasks", label: "Subtasks", count: data.moduleBreakdown.subTasks.total, icon: ListTodo },
                      { key: "tickets", label: "Tickets", count: data.moduleBreakdown.tickets.total, icon: Briefcase },
                      { key: "requirements", label: "Requirements", count: data.moduleBreakdown.requirements.total, icon: FileText },
                      { key: "workspaces", label: "Workspaces", count: data.moduleBreakdown.workspaces.total, icon: Building2 },
                      { key: "trends", label: "Monthly Trends", count: null, icon: TrendingUp },
                    ].map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as TabType)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                              : "text-muted-foreground hover:text-foreground hover:bg-surface dark:hover:bg-surface/10"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                          {tab.count !== null && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-surface dark:bg-surface/20 text-muted-foreground"
                            )}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search and Filters */}
                  {activeTab !== "trends" && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search activities..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-surface dark:bg-[#111625] border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-surface dark:bg-[#111625] border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-medium outline-none cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="resolved">Resolved</option>
                        <option value="active">Active</option>
                        <option value="review">In Review</option>
                        <option value="escalated">Escalated</option>
                        <option value="overdue">Overdue</option>
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="bg-surface dark:bg-[#111625] border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-medium outline-none cursor-pointer"
                      >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="standard">Standard</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  )}

                </div>

                {/* TAB CONTENT */}
                {activeTab === "trends" ? (
                  /* MONTHLY TRENDS VIEW */
                  <div className="p-5 bg-surface dark:bg-[#111625] border border-border/70 rounded-2xl space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Monthly Output & Resolution Velocity</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Historical activity volume and resolution performance over the last 6 months.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {data.monthlyTrends.map((trend, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-surface/50 dark:bg-[#0E1320] border border-border text-center space-y-2">
                          <span className="text-xs font-bold font-mono text-muted-foreground uppercase">{trend.month}</span>
                          <div className="text-2xl font-black text-foreground">{trend.total}</div>
                          <div className="text-[11px] text-muted-foreground">
                            <span className="text-emerald-500 font-bold">{trend.completed} closed</span>
                            {trend.escalated > 0 && <span className="text-rose-500 ml-1">({trend.escalated} esc)</span>}
                          </div>
                          <div className="w-full bg-surface dark:bg-surface/20 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${trend.completionRate}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-primary font-semibold">{trend.completionRate}% completion</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* TABULAR WORKING SHEET */
                  <div className="border border-border/70 rounded-2xl overflow-hidden bg-surface dark:bg-[#111625] shadow-sm">
                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                      <AppTable>
                        <AppTableHeader className="sticky top-0 z-10 bg-surface/95 dark:bg-[#111625]/95 backdrop-blur-md">
                          <AppTableRow>
                            <AppTableHead className="w-28">Item Code</AppTableHead>
                            <AppTableHead className="w-24">Module</AppTableHead>
                            <AppTableHead>Title & Context</AppTableHead>
                            <AppTableHead className="w-24">Role</AppTableHead>
                            <AppTableHead className="w-24 text-center">Priority</AppTableHead>
                            <AppTableHead className="w-28">Status</AppTableHead>
                            <AppTableHead className="w-28 text-right">Target Due</AppTableHead>
                            <AppTableHead className="w-36 text-right">Performance Tag</AppTableHead>
                          </AppTableRow>
                        </AppTableHeader>
                        <AppTableBody>
                          {filteredActivities.length === 0 ? (
                            <AppTableRow>
                              <AppTableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                  <Filter className="w-8 h-8 mb-2 opacity-25" />
                                  <span className="text-sm font-semibold">No activities found</span>
                                  <span className="text-xs text-muted-foreground mt-0.5">Try clearing filters or search keyword.</span>
                                </div>
                              </AppTableCell>
                            </AppTableRow>
                          ) : (
                            filteredActivities.map((act) => {
                              const isResolved = act.status === "Resolved";
                              const isEscalated = act.status === "Escalated";
                              const isReview = act.status === "Review";

                              return (
                                <AppTableRow key={`${act.module}-${act.id}`} className="hover:bg-surface/50 dark:hover:bg-surface/[0.03] transition-colors">
                                  
                                  {/* Code */}
                                  <AppTableCell className="font-mono text-xs font-bold text-primary">
                                    {act.code || act.id.substring(0, 8)}
                                  </AppTableCell>

                                  {/* Module Badge */}
                                  <AppTableCell>
                                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                                      {act.module === "Tasks" && <Layers className="w-3.5 h-3.5 text-accent" />}
                                      {act.module === "Sub Tasks" && <ListTodo className="w-3.5 h-3.5 text-teal-500" />}
                                      {act.module === "Tickets" && <Briefcase className="w-3.5 h-3.5 text-amber-500" />}
                                      {act.module === "Requirements" && <FileText className="w-3.5 h-3.5 text-rose-500" />}
                                      {(act.module === "Workspaces" || act.module === "Sub Workspaces") && <Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                                      {act.module}
                                    </span>
                                  </AppTableCell>

                                  {/* Title & Context */}
                                  <AppTableCell>
                                    <div>
                                      <div className="font-semibold text-foreground text-xs">{act.title}</div>
                                      {act.context && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs font-mono">
                                          ↳ {act.context}
                                        </div>
                                      )}
                                    </div>
                                  </AppTableCell>

                                  {/* Role */}
                                  <AppTableCell className="text-xs text-muted-foreground font-mono">
                                    {act.roleInActivity || "Assignee"}
                                  </AppTableCell>

                                  {/* Priority */}
                                  <AppTableCell className="text-center">
                                    <span className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono",
                                      act.priority.toLowerCase().includes("urgent") ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                      act.priority.toLowerCase().includes("high") ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                      "bg-surface dark:bg-surface/20 text-muted-foreground"
                                    )}>
                                      {act.priority}
                                    </span>
                                  </AppTableCell>

                                  {/* Status */}
                                  <AppTableCell>
                                    <span className={cn(
                                      "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg",
                                      isResolved ? "bg-emerald-500/10 text-emerald-500" :
                                      isEscalated ? "bg-rose-500/10 text-rose-500" :
                                      isReview ? "bg-accent/10 text-accent" :
                                      "bg-accent/10 text-accent"
                                    )}>
                                      <span className={cn("w-1.5 h-1.5 rounded-full", isResolved ? "bg-emerald-500" : isEscalated ? "bg-rose-500" : isReview ? "bg-accent" : "bg-accent")} />
                                      {act.rawStatus}
                                    </span>
                                  </AppTableCell>

                                  {/* Target Due */}
                                  <AppTableCell className="text-right text-xs font-mono">
                                    {act.dueDate ? (
                                      <span className={cn(act.isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground")}>
                                        {format(new Date(act.dueDate), "MMM d, yyyy")}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">—</span>
                                    )}
                                  </AppTableCell>

                                  {/* Performance Tag */}
                                  <AppTableCell className="text-right">
                                    {isResolved ? (
                                      <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-md",
                                        act.isOnTime 
                                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" 
                                          : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                      )}>
                                        {act.isOnTime ? "✓ On-Time" : "⚠ Completed Late"}
                                      </span>
                                    ) : act.isOverdue ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                        ✕ Overdue / SLA Risk
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface dark:bg-surface/20 text-muted-foreground">
                                        ⏳ In Progress
                                      </span>
                                    )}
                                  </AppTableCell>

                                </AppTableRow>
                              );
                            })
                          )}
                        </AppTableBody>
                      </AppTable>
                    </div>

                    {/* TABLE FOOTER SUMMARY */}
                    <div className="p-3 bg-surface/50 dark:bg-[#0E1320] border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Showing <strong>{filteredActivities.length}</strong> of <strong>{data.activities.length}</strong> recorded activities</span>
                      <span className="font-mono text-[11px]">User Performance Working Sheet</span>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between bg-surface/50 dark:bg-[#0E1320]/80">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>TaskForge Intelligence Governance • Realtime Multi-Module Sync</span>
          </div>
          <AppButton variant="primary" size="sm" onClick={onClose}>
            Done
          </AppButton>
        </div>

      </div>
    </div>
  );
}
