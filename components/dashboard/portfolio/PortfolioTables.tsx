"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  History,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppInput } from "@/components/ui/AppInput";
import {
  AppTable,
  AppTableHeader,
  AppTableRow,
  AppTableHead,
  AppTableBody,
  AppTableCell
} from "@/components/ui/AppTable";
import { PortfolioItem } from "@/lib/actions/portfolioMetrics";
import { cn } from "@/lib/utils";

interface PortfolioTablesProps {
  items: PortfolioItem[];
  startDate?: string | null;
  endDate?: string | null;
}

type ActiveTableTab = "overdue" | "due_not_completed" | "timeline_revisions";

export function PortfolioTables({ items = [], startDate, endDate }: PortfolioTablesProps) {
  const [activeTab, setActiveTab] = useState<ActiveTableTab>("overdue");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // 1. Overdue List: Items that are currently overdue
  const overdueItems = useMemo(() => {
    return items.filter(item => item.isOverdue);
  }, [items]);

  // 2. Due But Not Completed In-Period:
  // Items whose due date fell within the selected period (or before now) and were not completed on time or still open
  const dueNotCompletedItems = useMemo(() => {
    const sTime = startDate ? new Date(startDate).getTime() : 0;
    const eTime = endDate ? new Date(endDate).getTime() : Number.MAX_SAFE_INTEGER;

    return items.filter(item => {
      if (!item.dueDate) return false;
      const dueTime = new Date(item.dueDate).getTime();
      const inPeriod = dueTime >= sTime && dueTime <= eTime;
      
      const isResolved = item.status === "Resolved";
      // Not completed, or completed late
      const completedLate = isResolved && item.completedAt && new Date(item.completedAt).getTime() > dueTime;
      const stillOpenAfterDue = !isResolved && dueTime < Date.now();

      return inPeriod && (stillOpenAfterDue || completedLate);
    });
  }, [items, startDate, endDate]);

  // 3. Timeline Revisions: Items that have had their schedule or due dates updated/revised
  const revisedItems = useMemo(() => {
    return items.filter(item => (item.revisionCount && item.revisionCount > 0) || (item.originalDueDate && item.originalDueDate !== item.dueDate) || item.revisedAt);
  }, [items]);

  // Select dataset based on active tab
  const activeDataset = useMemo(() => {
    if (activeTab === "overdue") return overdueItems;
    if (activeTab === "due_not_completed") return dueNotCompletedItems;
    return revisedItems;
  }, [activeTab, overdueItems, dueNotCompletedItems, revisedItems]);

  // Filter dataset by search and module
  const filteredData = useMemo(() => {
    return activeDataset.filter(item => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.userName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModule = moduleFilter === "all" || item.module === moduleFilter;

      return matchesSearch && matchesModule;
    });
  }, [activeDataset, searchQuery, moduleFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return filteredData.slice(startIdx, startIdx + pageSize);
  }, [filteredData, page, pageSize]);

  const handleTabChange = (tab: ActiveTableTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const getItemLink = (item: PortfolioItem) => {
    if (item.module === "Tasks" || item.module === "Sub Tasks") {
      return `/tasks/${item.id}`;
    }
    if (item.module === "Tickets") {
      return `/tickets/${item.id}`;
    }
    if (item.module === "Requirements") {
      return `/requirements/${item.id}`;
    }
    if (item.module === "Workspaces") {
      return `/workspaces?workspace=${item.id}`;
    }
    return "#";
  };

  const formatDisplayDate = (dString?: string | null) => {
    if (!dString) return "-";
    try {
      const d = new Date(dString);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dString;
    }
  };

  return (
    <AppCard className="p-0 border border-border/70 overflow-hidden shadow-sm theme-card-structural my-6">
      
      {/* TABLE TABS HEADER */}
      <div className="p-4 border-b border-border/60 bg-surface/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-background/60 p-1 rounded-xl border border-border/40 overflow-x-auto scrollbar-none">
          
          <button
            onClick={() => handleTabChange("overdue")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "overdue"
                ? "bg-danger text-white shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue Detailed List
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              activeTab === "overdue" ? "bg-white/20 text-white" : "bg-danger/10 text-danger"
            )}>
              {overdueItems.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("due_not_completed")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "due_not_completed"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Due But Not Completed In-Period
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              activeTab === "due_not_completed" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-500"
            )}>
              {dueNotCompletedItems.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("timeline_revisions")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "timeline_revisions"
                ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Timeline Revisions & Milestones
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              activeTab === "timeline_revisions" ? "bg-white/20 text-white" : "bg-theme-btn-primary/10 text-theme-icon"
            )}>
              {revisedItems.length}
            </span>
          </button>

        </div>

        {/* Search & Scope Filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search title, code, user..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-background border border-border/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-theme-btn-primary"
            />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-theme-btn-primary"
          >
            <option value="all">All Modules</option>
            <option value="Tasks">Tasks</option>
            <option value="Sub Tasks">Sub Tasks</option>
            <option value="Tickets">Tickets</option>
            <option value="Requirements">Requirements</option>
            <option value="Workspaces">Workspaces</option>
          </select>
        </div>

      </div>

      {/* TABLE BODY */}
      <div className="overflow-x-auto min-h-[280px]">
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
            <Layers className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold text-foreground">No matching items found</p>
            <p className="text-xs text-muted mt-1">There are no records under the current filter criteria.</p>
          </div>
        ) : (
          <AppTable>
            <AppTableHeader>
              <AppTableRow className="border-b border-border/60 bg-surface/60 text-[11px] uppercase tracking-wider font-semibold text-muted">
                <AppTableHead className="w-24">Item Code</AppTableHead>
                <AppTableHead className="min-w-[200px]">Subject / Title</AppTableHead>
                <AppTableHead className="w-28">Module</AppTableHead>
                <AppTableHead className="w-36">Assignee / User</AppTableHead>
                <AppTableHead className="w-24">Priority</AppTableHead>
                <AppTableHead className="w-32">
                  {activeTab === "timeline_revisions" ? "Created / Revised" : "Target Due Date"}
                </AppTableHead>
                <AppTableHead className="w-36">
                  {activeTab === "timeline_revisions" ? "Timeline Evolution" : "Overdue Status"}
                </AppTableHead>
                <AppTableHead className="w-28 text-right">Action</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {paginatedData.map((item) => {
                const linkHref = getItemLink(item);

                return (
                  <AppTableRow key={item.id} className="hover:bg-surface/30 transition-colors border-b border-border/40 text-xs">
                    
                    {/* Item Code */}
                    <AppTableCell className="font-mono font-bold text-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-surface border border-border/60 text-[11px]">
                        {item.code || "N/A"}
                      </span>
                    </AppTableCell>

                    {/* Title */}
                    <AppTableCell>
                      <div className="flex flex-col">
                        <Link href={linkHref} className="font-semibold text-foreground hover:text-theme-icon transition-colors line-clamp-1">
                          {item.title}
                        </Link>
                        <span className="text-[10px] text-muted">Created: {formatDisplayDate(item.createdAt)}</span>
                      </div>
                    </AppTableCell>

                    {/* Module */}
                    <AppTableCell>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                        item.module === "Tasks" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                        item.module === "Sub Tasks" && "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                        item.module === "Tickets" && "bg-purple-500/10 text-purple-500 border-purple-500/20",
                        item.module === "Requirements" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        item.module === "Workspaces" && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {item.module}
                      </span>
                    </AppTableCell>

                    {/* Assignee / User */}
                    <AppTableCell>
                      <div className="flex items-center gap-2">
                        {item.userAvatar ? (
                          <img src={item.userAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-theme-btn-primary/20 text-theme-icon flex items-center justify-center text-[10px] font-bold">
                            {item.userName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground truncate max-w-[110px]">{item.userName}</span>
                          <span className="text-[9px] text-muted truncate max-w-[110px]">{item.userRole}</span>
                        </div>
                      </div>
                    </AppTableCell>

                    {/* Priority */}
                    <AppTableCell>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        item.priority === "Critical" && "bg-danger/15 text-danger border border-danger/30",
                        item.priority === "High" && "bg-amber-500/15 text-amber-500 border border-amber-500/30",
                        item.priority === "Medium" && "bg-blue-500/15 text-blue-500 border border-blue-500/30",
                        (item.priority === "Low" || item.priority === "Standard" || item.priority === "N/A") && "bg-surface text-muted border border-border"
                      )}>
                        {item.priority}
                      </span>
                    </AppTableCell>

                    {/* Date Column */}
                    <AppTableCell>
                      {activeTab === "timeline_revisions" ? (
                        <div className="flex flex-col text-[11px]">
                          <span className="text-muted">Created: {formatDisplayDate(item.createdAt)}</span>
                          {item.revisedAt && (
                            <span className="text-amber-500 font-medium">Revised: {formatDisplayDate(item.revisedAt)}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col text-[11px]">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted" />
                            {formatDisplayDate(item.dueDate)}
                          </span>
                          {item.originalDueDate && item.originalDueDate !== item.dueDate && (
                            <span className="text-[10px] text-muted line-through">Orig: {formatDisplayDate(item.originalDueDate)}</span>
                          )}
                        </div>
                      )}
                    </AppTableCell>

                    {/* Overdue / Timeline Status Column */}
                    <AppTableCell>
                      {activeTab === "timeline_revisions" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-foreground">
                            {item.originalDueDate ? `Orig Due: ${formatDisplayDate(item.originalDueDate)}` : "No original due date"}
                          </span>
                          <span className="text-[10px] text-theme-icon font-medium">
                            {item.dueDate ? `→ New Due: ${formatDisplayDate(item.dueDate)}` : ""}
                          </span>
                          {item.isOverdue && (
                            <span className="text-[10px] text-danger font-bold">
                              Overdue by {item.overdueDays}d (Status: {item.rawStatus})
                            </span>
                          )}
                        </div>
                      ) : item.isOverdue ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-danger font-bold text-xs">
                            <AlertCircle className="h-3.5 w-3.5" />
                            +{item.overdueDays} {item.overdueDays === 1 ? "day" : "days"} overdue
                          </span>
                          <span className="text-[10px] text-muted">Status: {item.rawStatus}</span>
                        </div>
                      ) : item.status === "Resolved" ? (
                        <span className="inline-flex items-center gap-1 text-success text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Due in period ({item.rawStatus})</span>
                      )}
                    </AppTableCell>

                    {/* Direct Action */}
                    <AppTableCell className="text-right">
                      <Link href={linkHref}>
                        <AppButton variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1 border-border/70 hover:bg-theme-btn-primary hover:text-white">
                          Open <ExternalLink className="h-3 w-3" />
                        </AppButton>
                      </Link>
                    </AppTableCell>

                  </AppTableRow>
                );
              })}
            </AppTableBody>
          </AppTable>
        )}
      </div>

      {/* PAGINATION FOOTER */}
      <div className="p-3 border-t border-border/60 bg-surface/30 flex items-center justify-between text-xs text-muted">
        <div>
          Showing <span className="font-semibold text-foreground">{paginatedData.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-semibold text-foreground">{Math.min(page * pageSize, filteredData.length)}</span> of{" "}
          <span className="font-semibold text-foreground">{filteredData.length}</span> items
        </div>

        <div className="flex items-center gap-2">
          <AppButton
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </AppButton>
          <span className="text-xs font-medium">Page {page} of {totalPages}</span>
          <AppButton
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      </div>

    </AppCard>
  );
}
