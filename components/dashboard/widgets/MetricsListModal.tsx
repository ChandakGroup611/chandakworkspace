"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { ListChecks, Search, Download, Filter, X, ArrowUpDown, Clock, Building2 } from "lucide-react";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";

export interface DrillDownFilter {
  title?: string;
  description?: string;
  module?: string;
  status?: string;
  department?: string;
  urgency?: "critical" | "urgent" | "warning" | "breached";
  agingDaysMin?: number;
  userId?: string;
}

interface MetricsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: any[];
  filter?: DrillDownFilter | null;
}

export function MetricsListModal({ isOpen, onClose, metrics = [], filter }: MetricsListModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  useEffect(() => {
    if (filter?.module) setSelectedModule(filter.module);
    else setSelectedModule("ALL");
    if (filter?.status) setSelectedStatus(filter.status);
    else setSelectedStatus("ALL");
    setSearchTerm("");
  }, [filter, isOpen]);

  const filteredItems = useMemo(() => {
    return metrics.filter(m => {
      // 1. Base filter passed via drill-down
      if (filter) {
        if (filter.module && m.module !== filter.module) return false;
        if (filter.status && m.status !== filter.status) return false;
        if (filter.department && m.departmentName !== filter.department) return false;
        if (filter.userId && m.userId !== filter.userId) return false;
        if (filter.agingDaysMin !== undefined && (m.daysInStatus || 0) < filter.agingDaysMin) return false;
        
        if (filter.urgency) {
          const rem = m.slaRemainingMs;
          if (filter.urgency === "breached" && !m.isOverdue && !m.slaBreached) return false;
          if (filter.urgency === "critical" && (rem === null || rem <= 0 || rem > 2 * 3600 * 1000)) return false;
          if (filter.urgency === "urgent" && (rem === null || rem <= 2 * 3600 * 1000 || rem > 8 * 3600 * 1000)) return false;
          if (filter.urgency === "warning" && (rem === null || rem <= 8 * 3600 * 1000 || rem > 24 * 3600 * 1000)) return false;
        }
      }

      // 2. Local module filter
      if (selectedModule !== "ALL" && m.module !== selectedModule) return false;

      // 3. Local status filter
      if (selectedStatus !== "ALL" && m.status !== selectedStatus) return false;

      // 4. Search query
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = String(m.title || "").toLowerCase().includes(term);
        const matchCode = String(m.code || "").toLowerCase().includes(term);
        const matchModule = String(m.module || "").toLowerCase().includes(term);
        const matchUser = String(m.user || "").toLowerCase().includes(term);
        const matchDept = String(m.departmentName || "").toLowerCase().includes(term);
        return matchTitle || matchCode || matchModule || matchUser || matchDept;
      }

      return true;
    });
  }, [metrics, filter, selectedModule, selectedStatus, searchTerm]);

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = ["ID", "Code", "Module", "Title", "Status", "Priority", "Assignee", "Department", "Days in Status", "Due Date", "Is Overdue"];
    const rows = filteredItems.map(m => [
      `"${m.id || ""}"`,
      `"${m.code || ""}"`,
      `"${m.module || ""}"`,
      `"${(m.title || "").replace(/"/g, '""')}"`,
      `"${m.status || ""}"`,
      `"${m.priority || ""}"`,
      `"${m.user || ""}"`,
      `"${m.departmentName || "General"}"`,
      m.daysInStatus || 0,
      `"${m.dueDate ? new Date(m.dueDate).toISOString() : ""}"`,
      m.isOverdue ? "Yes" : "No"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dashboard_items_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatus = (s: string) => {
    const statusStr = String(s || "").toLowerCase();
    if (statusStr.includes("resolv") || statusStr.includes("done")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-success/10 text-success border border-emerald-500/20">Done</span>;
    if (statusStr.includes("escalat") || statusStr.includes("block")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-danger/10 text-danger border border-red-500/20">Blocked</span>;
    if (statusStr.includes("review")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-warning/10 text-warning border border-amber-500/20">Review</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20">Active</span>;
  };

  const renderPriority = (p: string) => {
    const priorityStr = String(p || "").toLowerCase();
    if (priorityStr.includes("critical") || priorityStr.includes("p1")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span><span className="text-xs font-semibold text-danger">Critical</span></div>;
    if (priorityStr.includes("high") || priorityStr.includes("p2")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-xs font-semibold text-orange-500">High</span></div>;
    if (priorityStr.includes("medium")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span><span className="text-xs text-foreground">Medium</span></div>;
    return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-xs text-muted-foreground">Standard</span></div>;
  };

  const dialogTitle = filter?.title || "Operational Items Drill-Down";
  const dialogDesc = filter?.description || "Interactive granular drill-down of filtered live items across workspaces, tasks, tickets, and requirements.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[92vw] sm:max-w-6xl h-[88vh] flex flex-col overflow-hidden bg-background p-0 border border-border/70 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/50 bg-surface/40 shrink-0 gap-4">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
              <ListChecks className="w-5 h-5 text-primary" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              {dialogDesc} ({filteredItems.length} items found)
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-64">
              <AppInput
                placeholder="Search ID, title, user, dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs bg-background/80"
                leftIcon={<Search className="w-3.5 h-3.5 text-muted-foreground" />}
              />
            </div>

            <AppButton
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs h-8 whitespace-nowrap"
            >
              Export CSV
            </AppButton>
          </div>
        </div>

        {/* Filters bar */}
        <div className="px-5 py-2.5 bg-surface/20 border-b border-border/40 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope:</span>
          </div>

          <div className="flex items-center gap-1">
            {["ALL", "Tasks", "Sub Tasks", "Tickets", "Requirements", "Workspaces"].map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  selectedModule === mod
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {mod}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1">
            {["ALL", "Active", "Review", "Escalated", "Resolved"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  selectedStatus === st
                    ? "bg-primary/20 text-primary font-bold border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {(selectedModule !== "ALL" || selectedStatus !== "ALL" || searchTerm || filter) && (
            <button
              type="button"
              onClick={() => {
                setSelectedModule("ALL");
                setSelectedStatus("ALL");
                setSearchTerm("");
              }}
              className="ml-auto text-[11px] text-muted-foreground hover:text-danger flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <AppTable>
            <AppTableHeader className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm shadow-sm">
              <AppTableRow className="border-b border-border/60">
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-2/5">Item / Subject</AppTableHead>
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-28">Scope</AppTableHead>
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-28">Priority</AppTableHead>
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-24">Status</AppTableHead>
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-36">Assignee / Dept</AppTableHead>
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-24">Aging</AppTableHead>
                <AppTableHead className="font-bold text-[11px] tracking-wider uppercase text-muted-foreground w-32">Due Date</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map((m, i) => {
                  const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
                  const isBug = m.module === 'Tickets';
                  const isTask = m.module === 'Tasks' || m.module === 'Sub Tasks';
                  const isReq = m.module === 'Requirements';
                  const tagBg = isBug ? 'bg-danger/10 text-danger border-red-500/20' : isTask ? 'bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/20' : isReq ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                  
                  const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

                  const handleRowClick = () => {
                    if (m.module === 'Tickets') window.location.href = `/tickets/${m.id}`;
                    else if (m.module === 'Tasks' || m.module === 'Sub Tasks') window.location.href = `/tasks/${m.id}`;
                    else if (m.module === 'Requirements') window.location.href = `/requirements/${m.id}`;
                    else if (m.module === 'Workspaces' || m.module === 'Sub Workspaces') window.location.href = `/workspaces?workspace=${m.id}`;
                    else window.location.href = `/${m.module.toLowerCase()}`;
                  };

                  return (
                    <AppTableRow key={`${m.id}-${i}`} onClick={handleRowClick} className="cursor-pointer hover:bg-surface-hover/50 transition-colors border-b border-border/40 group">
                      <AppTableCell>
                        <div className="font-mono text-[10px] font-bold text-muted-foreground uppercase mb-0.5">{m.code || `ID-${shortId}`}</div>
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors" title={m.title}>
                          {m.title || `${m.module} Assignment`}
                        </div>
                      </AppTableCell>
                      <AppTableCell>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${tagBg}`}>
                          {m.module}
                        </span>
                      </AppTableCell>
                      <AppTableCell>{renderPriority(m.priority || "")}</AppTableCell>
                      <AppTableCell>{renderStatus(m.status)}</AppTableCell>
                      <AppTableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-surface border border-border/50 flex items-center justify-center text-[9px] font-bold text-foreground shrink-0" title={m.user}>
                              {initials}
                            </div>
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{m.user}</span>
                          </div>
                          {m.departmentName && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 ml-6 truncate">
                              <Building2 className="w-2.5 h-2.5 shrink-0" />
                              {m.departmentName}
                            </span>
                          )}
                        </div>
                      </AppTableCell>
                      <AppTableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          (m.daysInStatus || 0) >= 10 ? 'text-danger' : (m.daysInStatus || 0) >= 5 ? 'text-amber-500' : 'text-muted-foreground'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {m.daysInStatus || 0}d
                        </span>
                      </AppTableCell>
                      <AppTableCell>
                        {m.dueDate ? (
                          <div className={`text-xs font-semibold ${m.isOverdue ? 'text-danger' : 'text-muted-foreground'}`}>
                            {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {m.isOverdue && <span className="block text-[9px] text-danger font-bold uppercase">Overdue</span>}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/50 italic">N/A</div>
                        )}
                      </AppTableCell>
                    </AppTableRow>
                  );
                })
              ) : (
                <AppTableRow>
                  <AppTableCell colSpan={7} className="text-center py-20 text-muted-foreground border-0">
                    <div className="flex flex-col items-center justify-center">
                      <ListChecks className="w-12 h-12 mb-4 opacity-20 text-primary" />
                      <span className="text-base font-semibold text-foreground/70">No matching items found</span>
                      <span className="text-xs mt-1 text-muted-foreground">Try adjusting your filters or search keywords</span>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </DialogContent>
    </Dialog>
  );
}
