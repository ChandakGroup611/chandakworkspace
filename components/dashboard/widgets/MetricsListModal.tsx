"use client";
/* eslint-disable no-restricted-syntax */

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { ListChecks, Search, Download, Filter, X, Clock, Building2, RotateCcw, ChevronDown, SlidersHorizontal } from "lucide-react";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { formatDate } from "@/components/ui/data";
import { WorkspaceFilterMultiSelect } from "@/components/workspaces/WorkspaceFilterMultiSelect";
import { fetchWorkspaces } from "@/lib/actions/workspaces";

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
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);

  // Multi-selection Filter States
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [selectedSubWorkspaceIds, setSelectedSubWorkspaceIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showFiltersBar, setShowFiltersBar] = useState<boolean>(true);

  // Fetch full workspace catalog for complete hierarchy options
  useEffect(() => {
    fetchWorkspaces().then(ws => {
      if (Array.isArray(ws)) setAllWorkspaces(ws);
    }).catch(console.error);
  }, []);

  // Pre-populate drilldown defaults when modal opens
  useEffect(() => {
    if (filter?.module) setSelectedModule(filter.module);
    else setSelectedModule("ALL");

    if (filter?.status) {
      setSelectedStatus(filter.status);
      setSelectedStatuses([filter.status]);
    } else {
      setSelectedStatus("ALL");
      setSelectedStatuses([]);
    }

    if (filter?.department) {
      setSelectedDepartments([filter.department]);
    } else {
      setSelectedDepartments([]);
    }

    setSearchTerm("");
    setSelectedWorkspaceIds([]);
    setSelectedSubWorkspaceIds([]);
    setSelectedPriorities([]);
    setSelectedAssignees([]);
    setOpenDropdown(null);
  }, [filter, isOpen]);

  // Root Workspaces Options
  const rootWorkspaces = useMemo(() => {
    const map = new Map<string, { id: string; label: string; sublabel?: string }>();
    
    // Supplement from fetched workspaces
    allWorkspaces.forEach(w => {
      if (!w.parent_workspace_id) {
        map.set(w.id, {
          id: w.id,
          label: w.workspace_name || w.name || "Workspace",
          sublabel: w.workspace_code || w.code ? `(${w.workspace_code || w.code})` : undefined
        });
      }
    });

    // Supplement from metrics
    metrics.forEach(m => {
      if (m.workspaceId && !map.has(m.workspaceId)) {
        map.set(m.workspaceId, {
          id: m.workspaceId,
          label: m.workspaceName || "Workspace"
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allWorkspaces, metrics]);

  // Sub-workspaces catalog
  const allSubWorkspaces = useMemo(() => {
    const list: Array<{ id: string; label: string; parentId?: string; sublabel?: string }> = [];
    const seen = new Set<string>();

    allWorkspaces.forEach(w => {
      if (w.parent_workspace_id) {
        seen.add(w.id);
        const parent = allWorkspaces.find(p => p.id === w.parent_workspace_id);
        list.push({
          id: w.id,
          label: w.workspace_name || w.name || "Sub-workspace",
          parentId: w.parent_workspace_id,
          sublabel: parent?.workspace_name || parent?.name ? `(${parent.workspace_name || parent.name})` : undefined
        });
      }
    });

    metrics.forEach(m => {
      if (m.subWorkspaceId && !seen.has(m.subWorkspaceId)) {
        seen.add(m.subWorkspaceId);
        list.push({
          id: m.subWorkspaceId,
          label: m.subWorkspaceName || "Sub-workspace",
          parentId: m.workspaceId,
          sublabel: m.workspaceName ? `(${m.workspaceName})` : undefined
        });
      }
    });

    return list;
  }, [allWorkspaces, metrics]);

  // Cascaded Sub-workspace options
  const subWorkspaceOptions = useMemo(() => {
    const filtered = selectedWorkspaceIds.length > 0
      ? allSubWorkspaces.filter(sw => sw.parentId && selectedWorkspaceIds.includes(sw.parentId))
      : allSubWorkspaces;

    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }, [allSubWorkspaces, selectedWorkspaceIds]);

  // Status options
  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    ["Active", "Review", "Escalated", "Resolved"].forEach(s => statuses.add(s));
    metrics.forEach(m => {
      if (m.status) statuses.add(m.status);
      if (m.rawStatus && m.rawStatus !== "Unknown") statuses.add(m.rawStatus);
    });
    return Array.from(statuses).map(s => ({ id: s, label: s }));
  }, [metrics]);

  // Priority options
  const priorityOptions = useMemo(() => {
    const priorities = new Set<string>();
    ["Critical", "High", "Medium", "Standard"].forEach(p => priorities.add(p));
    metrics.forEach(m => {
      if (m.priority && m.priority !== "—") priorities.add(m.priority);
    });
    return Array.from(priorities).map(p => ({ id: p, label: p }));
  }, [metrics]);

  // Department options
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    metrics.forEach(m => {
      if (m.departmentName && m.departmentName !== "General") depts.add(m.departmentName);
    });
    return Array.from(depts).sort().map(d => ({ id: d, label: d }));
  }, [metrics]);

  // Assignee options
  const assigneeOptions = useMemo(() => {
    const users = new Map<string, string>();
    metrics.forEach(m => {
      if (m.user && m.user !== "Unassigned" && m.user !== "System") {
        users.set(m.userId || m.user, m.user);
      }
    });
    return Array.from(users.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [metrics]);

  // Total active filter count
  const totalActiveFilterCount = useMemo(() => {
    let count = 0;
    if (selectedModule !== "ALL") count++;
    if (selectedStatus !== "ALL") count++;
    count += selectedStatuses.length;
    count += selectedWorkspaceIds.length;
    count += selectedSubWorkspaceIds.length;
    count += selectedPriorities.length;
    count += selectedDepartments.length;
    count += selectedAssignees.length;
    if (searchTerm) count++;
    return count;
  }, [selectedModule, selectedStatus, selectedStatuses, selectedWorkspaceIds, selectedSubWorkspaceIds, selectedPriorities, selectedDepartments, selectedAssignees, searchTerm]);

  const handleResetFilters = () => {
    setSelectedModule("ALL");
    setSelectedStatus("ALL");
    setSelectedStatuses([]);
    setSelectedWorkspaceIds([]);
    setSelectedSubWorkspaceIds([]);
    setSelectedPriorities([]);
    setSelectedDepartments([]);
    setSelectedAssignees([]);
    setSearchTerm("");
    setOpenDropdown(null);
  };

  const filteredItems = useMemo(() => {
    return metrics.filter(m => {
      // 1. Base filter passed via drill-down
      if (filter) {
        if (filter.module && m.module !== filter.module) return false;
        if (filter.status && m.status !== filter.status) return false;
        if (filter.department && m.departmentName !== filter.department && selectedDepartments.length === 0) return false;
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

      // 2. Local module / Scope filter
      if (selectedModule !== "ALL" && m.module !== selectedModule) return false;

      // 3. Local status pill filter
      if (selectedStatus !== "ALL" && m.status !== selectedStatus) return false;

      // 4. Status multi-select
      if (selectedStatuses.length > 0) {
        const matchStatus = selectedStatuses.some(st => m.status === st || m.rawStatus === st);
        if (!matchStatus) return false;
      }

      // 5. Workspace multi-select
      if (selectedWorkspaceIds.length > 0) {
        const matchWs = selectedWorkspaceIds.some(wsId => 
          m.workspaceId === wsId || 
          m.workspaceName === wsId || 
          m.subWorkspaceId === wsId
        );
        if (!matchWs) return false;
      }

      // 6. Sub-workspace multi-select
      if (selectedSubWorkspaceIds.length > 0) {
        const matchSub = selectedSubWorkspaceIds.some(subId => 
          m.subWorkspaceId === subId || 
          m.subWorkspaceName === subId
        );
        if (!matchSub) return false;
      }

      // 7. Priority multi-select
      if (selectedPriorities.length > 0) {
        if (!selectedPriorities.includes(m.priority)) return false;
      }

      // 8. Department multi-select
      if (selectedDepartments.length > 0) {
        if (!selectedDepartments.includes(m.departmentName)) return false;
      }

      // 9. Assignee multi-select
      if (selectedAssignees.length > 0) {
        const matchesAssignee = selectedAssignees.includes(m.user) || (m.userId && selectedAssignees.includes(m.userId));
        if (!matchesAssignee) return false;
      }

      // 10. Search query
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = String(m.title || "").toLowerCase().includes(term);
        const matchCode = String(m.code || "").toLowerCase().includes(term);
        const matchModule = String(m.module || "").toLowerCase().includes(term);
        const matchUser = String(m.user || "").toLowerCase().includes(term);
        const matchDept = String(m.departmentName || "").toLowerCase().includes(term);
        const matchWs = String(m.workspaceName || "").toLowerCase().includes(term);
        const matchSubWs = String(m.subWorkspaceName || "").toLowerCase().includes(term);
        return matchTitle || matchCode || matchModule || matchUser || matchDept || matchWs || matchSubWs;
      }

      return true;
    });
  }, [metrics, filter, selectedModule, selectedStatus, selectedStatuses, selectedWorkspaceIds, selectedSubWorkspaceIds, selectedPriorities, selectedDepartments, selectedAssignees, searchTerm]);

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = ["ID", "Code", "Module", "Title", "Workspace", "Sub-workspace", "Status", "Priority", "Assignee", "Department", "Days in Status", "Due Date", "Is Overdue"];
    const rows = filteredItems.map(m => [
      `"${m.id || ""}"`,
      `"${m.code || ""}"`,
      `"${m.module || ""}"`,
      `"${(m.title || "").replace(/"/g, '""')}"`,
      `"${(m.workspaceName || "").replace(/"/g, '""')}"`,
      `"${(m.subWorkspaceName || "").replace(/"/g, '""')}"`,
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
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-success-soft text-success-text border border-success-border">Done</span>;
    if (statusStr.includes("escalat") || statusStr.includes("block")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-danger-soft text-danger-text border border-danger-border">Blocked</span>;
    if (statusStr.includes("review")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-warning-soft text-warning-text border border-warning-border">Review</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent-soft text-accent-soft-text border border-border-active">Active</span>;
  };

  const renderPriority = (p: string) => {
    const priorityStr = String(p || "").toLowerCase();
    if (priorityStr.includes("critical") || priorityStr.includes("p1")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger"></span><span className="text-xs font-semibold text-danger-text">Critical</span></div>;
    if (priorityStr.includes("high") || priorityStr.includes("p2")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span><span className="text-xs font-semibold text-warning-text">High</span></div>;
    if (priorityStr.includes("medium")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span><span className="text-xs text-foreground">Medium</span></div>;
    return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-border-active"></span><span className="text-xs text-muted-foreground">Standard</span></div>;
  };

  const dialogTitle = filter?.title || "Operational Items Drill-Down";
  const dialogDesc = filter?.description || "Interactive granular drill-down of filtered live items across workspaces, tasks, tickets, and requirements.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[94vw] sm:max-w-6xl h-[90vh] flex flex-col overflow-hidden bg-background p-0 border border-border rounded-lg shadow-lg">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-border bg-surface/40 shrink-0 gap-3">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <ListChecks className="w-5 h-5 text-primary" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              {dialogDesc} ({filteredItems.length} items found)
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56 sm:w-64">
              <AppInput
                placeholder="Search ID, title, user, dept…"
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

        {/* Primary Filter Toolbar */}
        <div className="px-4 py-2 bg-surface/20 border-b border-border/40 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center flex-wrap gap-2">
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
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
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
                  onClick={() => {
                    setSelectedStatus(st);
                    if (st === "ALL") setSelectedStatuses([]);
                    else setSelectedStatuses([st]);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    selectedStatus === st
                      ? "bg-primary/20 text-primary font-semibold border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowFiltersBar(prev => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11.5px] font-medium border transition-colors ${
                showFiltersBar
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Dimension Filters</span>
              {totalActiveFilterCount > 0 && (
                <span className="ml-0.5 px-1 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground">
                  {totalActiveFilterCount}
                </span>
              )}
            </button>

            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-muted-foreground hover:text-danger-text flex items-center gap-1 transition-colors px-2 py-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset all
              </button>
            )}
          </div>
        </div>

        {/* Multi-Selection Dropdowns Bar */}
        {showFiltersBar && (
          <div className="px-4 py-2.5 bg-surface/40 border-b border-border/50 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            {/* Workspace Filter */}
            <WorkspaceFilterMultiSelect
              label="Workspace"
              placeholder="All workspaces"
              options={rootWorkspaces}
              selectedIds={selectedWorkspaceIds}
              onChange={(ids) => {
                setSelectedWorkspaceIds(ids);
                if (ids.length > 0) {
                  setSelectedSubWorkspaceIds(prev => prev.filter(swId => {
                    const sw = allSubWorkspaces.find(s => s.id === swId);
                    return sw?.parentId && ids.includes(sw.parentId);
                  }));
                }
              }}
              isOpen={openDropdown === 'workspace'}
              onToggle={() => setOpenDropdown(prev => prev === 'workspace' ? null : 'workspace')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Sub-workspace Filter */}
            <WorkspaceFilterMultiSelect
              label="Sub-workspace"
              placeholder={subWorkspaceOptions.length === 0 ? "No sub-workspaces" : "All sub-workspaces"}
              options={subWorkspaceOptions}
              selectedIds={selectedSubWorkspaceIds}
              onChange={(ids) => setSelectedSubWorkspaceIds(ids)}
              isOpen={openDropdown === 'subworkspace'}
              onToggle={() => setOpenDropdown(prev => prev === 'subworkspace' ? null : 'subworkspace')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Status Filter */}
            <WorkspaceFilterMultiSelect
              label="Status"
              placeholder="All statuses"
              options={statusOptions}
              selectedIds={selectedStatuses}
              onChange={(ids) => {
                setSelectedStatuses(ids);
                if (ids.length === 1 && ["Active", "Review", "Escalated", "Resolved"].includes(ids[0])) {
                  setSelectedStatus(ids[0]);
                } else if (ids.length === 0) {
                  setSelectedStatus("ALL");
                }
              }}
              isOpen={openDropdown === 'status'}
              onToggle={() => setOpenDropdown(prev => prev === 'status' ? null : 'status')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Priority Filter */}
            <WorkspaceFilterMultiSelect
              label="Priority"
              placeholder="All priorities"
              options={priorityOptions}
              selectedIds={selectedPriorities}
              onChange={(ids) => setSelectedPriorities(ids)}
              isOpen={openDropdown === 'priority'}
              onToggle={() => setOpenDropdown(prev => prev === 'priority' ? null : 'priority')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Department Filter */}
            <WorkspaceFilterMultiSelect
              label="Department"
              placeholder="All departments"
              options={departmentOptions}
              selectedIds={selectedDepartments}
              onChange={(ids) => setSelectedDepartments(ids)}
              isOpen={openDropdown === 'department'}
              onToggle={() => setOpenDropdown(prev => prev === 'department' ? null : 'department')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Assignee Filter */}
            <WorkspaceFilterMultiSelect
              label="Assignee"
              placeholder="All assignees"
              options={assigneeOptions}
              selectedIds={selectedAssignees}
              onChange={(ids) => setSelectedAssignees(ids)}
              isOpen={openDropdown === 'assignee'}
              onToggle={() => setOpenDropdown(prev => prev === 'assignee' ? null : 'assignee')}
              onClose={() => setOpenDropdown(null)}
            />
          </div>
        )}

        {/* Active Filter Chips Bar */}
        {totalActiveFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-surface/30 border-b border-border/40 text-xs">
            <span className="text-[11px] font-semibold text-muted mr-1">Active filters:</span>

            {/* Workspaces */}
            {selectedWorkspaceIds.map(id => {
              const ws = rootWorkspaces.find(w => w.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                  Workspace: {ws?.label || id}
                  <button type="button" aria-label={`Remove workspace ${ws?.label || id}`} onClick={() => setSelectedWorkspaceIds(prev => prev.filter(x => x !== id))} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Sub-workspaces */}
            {selectedSubWorkspaceIds.map(id => {
              const sw = allSubWorkspaces.find(s => s.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                  Sub-workspace: {sw?.label || id}
                  <button type="button" aria-label={`Remove sub-workspace ${sw?.label || id}`} onClick={() => setSelectedSubWorkspaceIds(prev => prev.filter(x => x !== id))} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Statuses */}
            {selectedStatuses.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Status: {s}
                <button type="button" aria-label={`Remove status ${s}`} onClick={() => {
                  setSelectedStatuses(prev => prev.filter(x => x !== s));
                  if (selectedStatus === s) setSelectedStatus("ALL");
                }} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Priorities */}
            {selectedPriorities.map(p => (
              <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Priority: {p}
                <button type="button" aria-label={`Remove priority ${p}`} onClick={() => setSelectedPriorities(prev => prev.filter(x => x !== p))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Departments */}
            {selectedDepartments.map(d => (
              <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Dept: {d}
                <button type="button" aria-label={`Remove department ${d}`} onClick={() => setSelectedDepartments(prev => prev.filter(x => x !== d))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Assignees */}
            {selectedAssignees.map(id => {
              const u = assigneeOptions.find(a => a.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                  Assignee: {u?.label || id}
                  <button type="button" aria-label={`Remove assignee ${u?.label || id}`} onClick={() => setSelectedAssignees(prev => prev.filter(x => x !== id))} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Search Term */}
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Keyword: "{searchTerm}"
                <button type="button" aria-label="Clear search keyword" onClick={() => setSearchTerm("")} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-[11px] font-semibold text-muted hover:text-danger flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Clear all
            </button>
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <AppTable>
            <AppTableHeader className="sticky top-0 z-10 bg-surface/90 shadow-sm">
              <AppTableRow className="border-b border-border">
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-2/5">Item / subject</AppTableHead>
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-28">Scope</AppTableHead>
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-28">Priority</AppTableHead>
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-24">Status</AppTableHead>
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-36">Assignee / dept</AppTableHead>
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-24">Aging</AppTableHead>
                <AppTableHead className="font-semibold text-[11px] text-muted-foreground w-32">Due date</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map((m, i) => {
                  const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
                  const isBug = m.module === 'Tickets';
                  const isTask = m.module === 'Tasks' || m.module === 'Sub Tasks';
                  const isReq = m.module === 'Requirements';
                  const tagBg = isBug ? 'bg-danger-soft text-danger-text border-danger-border' : isTask ? 'bg-accent-soft text-accent-soft-text border-border-active' : isReq ? 'bg-success-soft text-success-text border-success-border' : 'bg-warning-soft text-warning-text border-warning-border';
                  
                  const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

                  const handleRowClick = () => {
                    onClose();
                    if (m.module === 'Tickets') router.push(`/tickets/${m.id}`);
                    else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/tasks/${m.id}`);
                    else if (m.module === 'Requirements') router.push(`/requirements/${m.id}`);
                    else if (m.module === 'Workspaces' || m.module === 'Sub Workspaces') router.push(`/workspaces?workspace=${m.id}`);
                    else router.push(`/${m.module.toLowerCase()}`);
                  };

                  return (
                    <AppTableRow key={`${m.id}-${i}`} onClick={handleRowClick} className="cursor-pointer hover:bg-surface-hover/50 transition-colors border-b border-border/40 group">
                      <AppTableCell>
                        <div className="font-mono text-[11px] font-semibold text-muted-foreground mb-0.5">{m.code || `ID-${shortId}`}</div>
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors" title={m.title}>
                          {m.title || `${m.module} Assignment`}
                        </div>
                        {(m.workspaceName || m.subWorkspaceName) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted truncate">
                            {m.workspaceName && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-surface/80 border border-border text-[10.5px] font-medium text-foreground">
                                {m.workspaceName}
                              </span>
                            )}
                            {m.subWorkspaceName && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-accent-soft text-accent-soft-text border border-border text-[10.5px] font-medium">
                                {m.subWorkspaceName}
                              </span>
                            )}
                          </div>
                        )}
                      </AppTableCell>
                      <AppTableCell>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${tagBg}`}>
                          {m.module}
                        </span>
                      </AppTableCell>
                      <AppTableCell>{renderPriority(m.priority || "")}</AppTableCell>
                      <AppTableCell>{renderStatus(m.status)}</AppTableCell>
                      <AppTableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0" title={m.user}>
                              {initials}
                            </div>
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{m.user}</span>
                          </div>
                          {m.departmentName && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 ml-6 truncate">
                              <Building2 className="w-2.5 h-2.5 shrink-0" />
                              {m.departmentName}
                            </span>
                          )}
                        </div>
                      </AppTableCell>
                      <AppTableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          (m.daysInStatus || 0) >= 10 ? 'text-danger-text' : (m.daysInStatus || 0) >= 5 ? 'text-warning-text' : 'text-muted-foreground'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {m.daysInStatus || 0}d
                        </span>
                      </AppTableCell>
                      <AppTableCell>
                        {m.dueDate ? (
                          <div className={`text-xs font-semibold ${m.isOverdue ? 'text-danger-text' : 'text-muted-foreground'}`}>
                            {formatDate(m.dueDate)}
                            {m.isOverdue && <span className="block text-[11px] text-danger-text font-semibold">Overdue</span>}
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
