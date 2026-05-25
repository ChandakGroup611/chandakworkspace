"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  ArrowUpRight, 
  Activity, 
  Database,
  Filter,
  RefreshCw,
  Ticket,
  FolderKanban,
  FileCheck2,
  Search,
  Sliders,
  Calendar,
  User,
  ExternalLink,
  ShieldCheck,
  Check,
  Clock,
  AlertCircle
} from "lucide-react";

import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";

import OperationalHeatmap from "@/components/dashboard/OperationalHeatmap";
import WorkloadDistributionMap from "@/components/dashboard/WorkloadDistributionMap";
import EscalationMonitor from "@/components/dashboard/EscalationMonitor";

interface DashboardCommandCenterProps {
  initialActivities: any[];
  dbError: string | null;
}

interface HistoryItem {
  id: string;
  module: "tickets" | "tasks" | "requirements";
  moduleLabel: string;
  title: string;
  status: "active" | "resolved" | "review" | "escalated";
  statusLabel: string;
  timestamp: string;
  operator: string;
  impact: "Critical" | "High" | "Medium" | "Low";
}

export default function DashboardCommandCenter({ initialActivities, dbError }: DashboardCommandCenterProps) {
  const [activeModule, setActiveModule] = useState<"all" | "tickets" | "tasks" | "requirements">("all");
  const [activeStatus, setActiveStatus] = useState<"all" | "active" | "resolved" | "review" | "escalated">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1200);
  };

  const allHistory = useMemo(() => {
    // Format the timestamp nicely for the UI
    const timeAgo = (dateStr: string) => {
      if (!mounted) return "";
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return `${mins} mins ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hours ago`;
      return `${Math.floor(hrs / 24)} days ago`;
    };

    return (initialActivities || []).map(act => ({
      ...act,
      rawTimestamp: act.timestamp,
      timestamp: mounted ? timeAgo(act.timestamp) : ""
    }));
  }, [initialActivities, mounted]);

  // Handle KPI card dispatch clicks targeting related history views directly
  const selectFilterPreset = (module: "all" | "tickets" | "tasks" | "requirements", status: "all" | "active" | "resolved" | "review" | "escalated") => {
    setActiveModule(module);
    setActiveStatus(status);
    
    // Smooth scroll down to highlight target grid section
    const el = document.getElementById("advanced-history-anchor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredHistory = useMemo(() => {
    return allHistory.filter(item => {
      const matchModule = activeModule === "all" || item.module === activeModule;
      const matchStatus = activeStatus === "all" || item.status === activeStatus;
      const matchQuery = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.operator.toLowerCase().includes(searchQuery.toLowerCase());
      return matchModule && matchStatus && matchQuery;
    });
  }, [allHistory, activeModule, activeStatus, searchQuery]);

  const kpis = useMemo(() => {
    const totalCount = allHistory.length;
    const resolvedCount = allHistory.filter(h => h.status === "resolved").length;
    const slaAdherence = totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(1) + "%" : "100%";
    const escalations = allHistory.filter(h => h.status === "escalated").length;
    const requirements = allHistory.filter(h => h.module === "requirements").length;

    return [
      { 
        label: "Active Operational Scope", 
        value: totalCount.toString(), 
        change: "Live Feed", 
        trend: "up", 
        icon: Layers, 
        color: "text-blue-400", 
        bg: "bg-blue-500/10", 
        border: "border-blue-500/20",
        targetModule: "all" as const,
        targetStatus: "all" as const,
        desc: "Total scoped records"
      },
      { 
        label: "SLA Adherence Ratio", 
        value: slaAdherence, 
        change: "Resolved/Total", 
        trend: "up", 
        icon: CheckCircle2, 
        color: "text-emerald-400", 
        bg: "bg-emerald-500/10", 
        border: "border-emerald-500/20",
        targetModule: "all" as const,
        targetStatus: "resolved" as const,
        desc: "System throughput health"
      },
      { 
        label: "Critical Escalations", 
        value: escalations.toString(), 
        change: "Active Breaches", 
        trend: escalations > 0 ? "up" : "down", 
        icon: AlertTriangle, 
        color: escalations > 0 ? "text-rose-400" : "text-gray-400", 
        bg: escalations > 0 ? "bg-rose-500/10" : "bg-gray-500/10", 
        border: escalations > 0 ? "border-rose-500/20" : "border-gray-500/20",
        targetModule: "tickets" as const,
        targetStatus: "escalated" as const,
        desc: "Tickets requiring attention"
      },
      { 
        label: "Active Workspaces", 
        value: requirements.toString(), 
        change: "Environment Tier", 
        trend: "up", 
        icon: FileCheck2, 
        color: "text-amber-400", 
        bg: "bg-amber-500/10", 
        border: "border-amber-500/20",
        targetModule: "requirements" as const,
        targetStatus: "all" as const,
        desc: "Active workspace clusters"
      },
    ];
  }, [allHistory]);

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case "resolved": return "success";
      case "escalated": return "danger";
      case "review": return "warning";
      default: return "info";
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Controls Banner: View Filtering & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Executive Command Center</h1>
            <AppBadge variant="info">Phase 6 Active</AppBadge>
          </div>
          <p className="text-xs text-gray-400">
            Intelligent dashboard orchestration mapping continuous cross-module transaction log history. Click KPI summary cards below to instantly filter history streams.
          </p>
        </div>

        {/* View Roles & Actions */}
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center p-1 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
            <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm">Global Master</button>
            <button 
              onClick={() => selectFilterPreset("tickets", "all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeModule === "tickets" ? "text-blue-400 font-bold" : "text-gray-400 hover:text-white"}`}
            >
              Tickets
            </button>
            <button 
              onClick={() => selectFilterPreset("tasks", "all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeModule === "tasks" ? "text-blue-400 font-bold" : "text-gray-400 hover:text-white"}`}
            >
              Tasks
            </button>
            <button 
              onClick={() => selectFilterPreset("requirements", "all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeModule === "requirements" ? "text-blue-400 font-bold" : "text-gray-400 hover:text-white"}`}
            >
              Requirements
            </button>
          </div>
          <AppButton variant="secondary" size="sm" onClick={triggerSync} isLoading={isSyncing} className="hidden md:flex">
            <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync DB Stream</span>
          </AppButton>
        </div>
      </div>

      {/* KPI Intelligence Track (Bento Track 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          const isSelected = activeModule === kpi.targetModule && activeStatus === kpi.targetStatus;
          
          return (
            <AppCard 
              key={idx} 
              onClick={() => selectFilterPreset(kpi.targetModule, kpi.targetStatus)}
              className={`p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                isSelected 
                  ? "ring-2 ring-blue-500 bg-white/[0.03] border-blue-500/30 shadow-lg shadow-blue-500/10" 
                  : "hover:border-white/20 hover:scale-[1.01] bg-white/[0.005]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-semibold text-gray-400 tracking-wide block">{kpi.label}</span>
                  <span className="text-[10px] text-gray-500 italic block">{kpi.desc}</span>
                </div>
                <div className={`p-2 rounded-xl shrink-0 ${kpi.bg} ${kpi.color} border ${kpi.border} group-hover:scale-110 transition-transform`}>
                  <IconComponent className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between pt-1 border-t border-white/5">
                <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border ${
                  isSelected ? "bg-blue-500 text-white border-blue-400" : "bg-white/5 text-gray-400 border-white/10 group-hover:text-white"
                }`}>
                  <span>{kpi.change}</span>
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </AppCard>
          );
        })}
      </div>

      {/* Primary Analytics Track: Asymmetric Bento Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Span 2: Operational Heatmap Matrix */}
        <div className="lg:col-span-2">
          <OperationalHeatmap activities={allHistory} />
        </div>

        {/* Right Span 1: Workload Saturation Engine */}
        <div>
          <WorkloadDistributionMap activities={allHistory} />
        </div>
      </div>

      {/* ADVANCED LEVEL MODULE-WISE HISTORICAL AUDIT & TRANSACTION LOGS */}
      <div id="advanced-history-anchor" className="scroll-mt-24 space-y-4 pt-2">
        <AppCard className="p-1 flex flex-col overflow-hidden border-blue-500/20">
          {/* Header Action Row */}
          <div className="p-4 bg-white/[0.01] border-b border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                <h3 className="text-sm font-bold tracking-tight">Master Transaction Audit & Module History Engine</h3>
                <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.2 rounded border border-blue-500/20">
                  {filteredHistory.length} items mapped
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Authoritative chronological record reflecting state events across Tickets, Tasks, and Requirement workflows.
              </p>
            </div>

            {/* Quick module interactive selector pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mr-1">Filter View:</span>
              {(["all", "tickets", "tasks", "requirements"] as const).map((mod) => (
                <button
                  key={mod}
                  onClick={() => setActiveModule(mod)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    activeModule === mod 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {mod === "all" ? "Cross-Module" : mod}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-filtering parameters strip: Search & State Statuses */}
          <div className="p-3 bg-white/[0.005] border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search description, operator ID, ref ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-white/5 border border-white/5 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-white">
                  ✕
                </button>
              )}
            </div>

            {/* Status indicators filter bar */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[10px] text-gray-500 font-medium mr-1 whitespace-nowrap">State:</span>
              {(["all", "active", "review", "resolved", "escalated"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveStatus(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                    activeStatus === st 
                      ? "bg-white/10 text-white font-bold border border-white/10" 
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {st === "all" ? "All States" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Transactions Dynamic Grid Listing */}
          <div className="p-1">
            {filteredHistory.length > 0 ? (
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead className="w-[100px]">Ref ID</AppTableHead>
                      <AppTableHead className="w-[130px]">Module Scope</AppTableHead>
                      <AppTableHead>Transaction History Abstract</AppTableHead>
                      <AppTableHead className="w-[120px]">Operator</AppTableHead>
                      <AppTableHead className="w-[110px]">Timeline</AppTableHead>
                      <AppTableHead className="text-right w-[120px]">Status Matrix</AppTableHead>
                    </tr>
                  </AppTableHeader>
                  <AppTableBody>
                    {filteredHistory.map((hItem) => (
                      <AppTableRow key={hItem.id} className="hover:bg-white/[0.02] transition-colors">
                        <AppTableCell className="font-mono font-bold text-blue-400 text-xs">
                          {hItem.id}
                        </AppTableCell>
                        <AppTableCell>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                            {hItem.module === "tickets" && <Ticket className="h-3 w-3 text-blue-400" />}
                            {hItem.module === "tasks" && <FolderKanban className="h-3 w-3 text-indigo-400" />}
                            {hItem.module === "requirements" && <FileCheck2 className="h-3 w-3 text-amber-400" />}
                            <span>{hItem.moduleLabel}</span>
                          </span>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-xs text-gray-200 line-clamp-1">{hItem.title}</p>
                            <span className={`text-[9px] font-semibold px-1 py-0.2 rounded uppercase border ${
                              hItem.impact === "Critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              hItem.impact === "High" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-white/5 text-gray-400 border-white/5"
                            }`}>
                              Impact: {hItem.impact}
                            </span>
                          </div>
                        </AppTableCell>
                        <AppTableCell className="text-xs text-gray-400 font-medium">
                          {hItem.operator}
                        </AppTableCell>
                        <AppTableCell className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-gray-600" />
                          <span>{hItem.timestamp}</span>
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          <AppBadge variant={getStatusBadgeVariant(hItem.status)}>
                            {hItem.statusLabel}
                          </AppBadge>
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            ) : (
              <div className="text-center py-12 px-4 space-y-2">
                <AlertCircle className="h-8 w-8 text-gray-600 mx-auto" />
                <p className="text-xs font-bold text-gray-400">Zero Transaction History Found</p>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  No operational records matched the active module filter (<strong className="text-gray-300">{activeModule}</strong>) and status parameters (<strong className="text-gray-300">{activeStatus}</strong>).
                </p>
                <AppButton variant="outline" size="sm" onClick={() => selectFilterPreset("all", "all")} className="mt-2 text-[11px]">
                  Reset All Filters
                </AppButton>
              </div>
            )}
          </div>
        </AppCard>
      </div>

      {/* Secondary Track: Live Integration & Escalation Risk Gating */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 border-t border-white/5">
        {/* Left Span 2: Realtime Pre-fetched Storage Layer table */}
        <div className="lg:col-span-2 flex flex-col">
          <AppCard className="flex-1 flex flex-col justify-between">
            <AppCardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5">
              <div className="space-y-0.5">
                <AppCardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-400" />
                  <span>Verified Backend Operations DB Channel</span>
                </AppCardTitle>
                <p className="text-[11px] text-gray-400">Server pre-fetched state array feeding core metrics.</p>
              </div>
              <AppBadge variant="success">Connected</AppBadge>
            </AppCardHeader>

            <div className="p-4 flex-1">
              {dbError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  Database binding connection message: {dbError}
                </div>
              ) : initialActivities && initialActivities.length > 0 ? (
                <AppTableContainer>
                  <AppTable>
                    <AppTableHeader>
                      <tr>
                        <AppTableHead className="w-[100px]">Entity ID</AppTableHead>
                        <AppTableHead>Storage Channel Payload Description</AppTableHead>
                        <AppTableHead className="text-right">State Token</AppTableHead>
                      </tr>
                    </AppTableHeader>
                    <AppTableBody>
                      {initialActivities.slice(0, 5).map((todo: any) => (
                        <AppTableRow key={todo.id}>
                          <AppTableCell className="font-mono text-gray-500">#{String(todo.id).slice(0, 8)}</AppTableCell>
                          <AppTableCell className="font-semibold text-gray-200">{todo.title || "Default System Channel Block"}</AppTableCell>
                          <AppTableCell className="text-right">
                            <AppBadge variant="success">Synchronized</AppBadge>
                          </AppTableCell>
                        </AppTableRow>
                      ))}
                    </AppTableBody>
                  </AppTable>
                </AppTableContainer>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">
                  Storage stream returns empty tuples. Populated tuples will feed live historical metrics.
                </div>
              )}
            </div>
          </AppCard>
        </div>

        {/* Right Span 1: SLA Breach Governance Console */}
        <div>
          <EscalationMonitor activities={allHistory} />
        </div>
      </div>
    </div>
  );
}
