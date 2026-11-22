"use client";

import { recordCreatedHref } from "@/components/ui/record";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { AppButton } from "@/components/ui/AppButton";
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  Database,
  Loader2,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  X,
  Calendar,
  AlertCircle
} from "lucide-react";
import { deleteTicket } from "@/lib/actions/tickets";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableContainer,
  AppTableHead,
  AppTableHeader,
  AppTableRow
} from "@/components/ui/AppTable";
import { AppBadge } from "@/components/ui/AppBadge";
import { StatusBadge, PriorityIndicator, DateCell, UserCell, statusTone } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { cn } from "@/lib/utils";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><ChandakLoader size="lg" title="Loading tickets…" /></div>}>
      <TicketsPageContent />
    </Suspense>
  );
}

function istDay(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function TicketsPageContent() {
  const router = useRouter();
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, roleCode, userId, loading: permissionsLoading } = usePermissions();

  // Master Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [scopesList, setScopesList] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Interactive KPI Filter Card
  const [selectedCard, setSelectedCard] = useState<null | "OPEN" | "IN_PROGRESS" | "RESOLVED">(null);

  // Date Filtering Mode & Inputs
  const [dateMode, setDateMode] = useState<"CREATED" | "DUE" | "BOTH">("CREATED");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const [showWizard, setShowWizard] = useState(false);
  // Record standard: the ticket just raised is highlighted in the list.
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  useEffect(() => {
    if (!createdCode) return;
    const t = window.setTimeout(() => setCreatedCode(null), 4000);
    return () => window.clearTimeout(t);
  }, [createdCode]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("create") === "true") {
      setShowWizard(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Date Range Validation
  useEffect(() => {
    if ((dateMode === "CREATED" || dateMode === "BOTH") && createdFrom && createdTo && createdFrom > createdTo) {
      setDateError("Created 'From' date cannot be after 'To' date.");
    } else if ((dateMode === "DUE" || dateMode === "BOTH") && dueFrom && dueTo && dueFrom > dueTo) {
      setDateError("Due 'From' date cannot be after 'To' date.");
    } else {
      setDateError(null);
    }
  }, [dateMode, createdFrom, createdTo, dueFrom, dueTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data: any = await fetchTicketDashboardData();

      const finalTicketData = data?.tickets || [];
      const activeDepts = data?.departments || [];
      const activePrios = data?.priorities || [];
      const activeStates = data?.states || [];
      const activeCats = data?.categories || [];
      const activeSubcats = data?.subcategories || [];
      const activeTypes = data?.issueTypes || [];
      const activeScopes = data?.scopes || [];
      const activeUsers = data?.users || [];

      setDepartments(activeDepts);
      setPriorities(activePrios);
      setStates(activeStates);
      setCategories(activeCats);
      setSubcategories(activeSubcats);
      setIssueTypes(activeTypes);
      setAllUsers(activeUsers);

      setScopesList(
        activeScopes.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        }))
      );

      const mappedTickets = (finalTicketData || []).map((t: any) => {
        const custom = t.custom_fields || {};
        const scName = activeScopes.find((s: any) => s.id === t.scope_id)?.name || t.scope_type || "";
        return {
          ...t,
          dbId: t.id,
          id: t.code || `INC-${t.id.slice(0, 8)}`,
          priorityObj:
            activePrios.find((p: any) => p.id === t.priority_id) ||
            (t.priority ? { id: t.priority_id, name: t.priority.priority_name, color: t.priority.priority_color } : undefined),
          statusObj:
            activeStates.find((s: any) => s.id === t.status_id) ||
            (t.status ? { id: t.status_id, name: t.status.status_name, color: t.status.status_color, is_terminal: t.status.is_terminal } : undefined),
          departmentObj: activeDepts.find((d: any) => d.id === t.department_id) || (t.department ? { name: t.department.name } : undefined),
          categoryObj: activeCats.find((c: any) => c.id === custom.category_id),
          subcategoryObj: activeSubcats.find((sc: any) => sc.id === custom.subcategory_id),
          issueTypeObj: activeTypes.find((it: any) => it.id === custom.issue_type_id),
          scopeName: scName,
          assignedTo: t.assignee?.full_name || "",
          createdAt: t.created_at,
        };
      });

      setTickets(mappedTickets);
    } catch (err) {
      console.error("Critical recovery during ticket hydration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTicketClick = (ticket: any) => {
    router.push(`/tickets/${ticket.dbId}`);
  };

  const isSuperAdminUser = roleCode === "SUPER_ADMIN" || hasPermission("SUPER_ADMIN");
  const canEditRow = (t: any) =>
    isSuperAdminUser ||
    hasPermission("TICKETS_MANAGE") ||
    hasPermission("TICKETS_UPDATE") ||
    (!!userId && (t.creator_id === userId || t.assignee_id === userId || t.queue_owner_id === userId));
  const canDeleteRow = (t: any) =>
    isSuperAdminUser || hasPermission("TICKETS_DELETE") || (!!userId && (t.creator_id === userId || t.queue_owner_id === userId));

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res: any = await deleteTicket(deleteTarget.dbId, deleteReason.trim() || undefined);
      if (res?.error) {
        setDeleteError(res.error);
        return;
      }
      setToastMessage(`Ticket ${deleteTarget.id} moved to Trash`);
      setDeleteTarget(null);
      setDeleteReason("");
      fetchData();
    } catch (err: any) {
      setDeleteError(err?.message || "Couldn't delete the ticket.");
    } finally {
      setDeleting(false);
    }
  };

  const ROW_ICON_BTN =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  // KPI Counts synchronized with authorized dataset
  const countOpen = useMemo(() => tickets.filter((t) => statusTone(t.statusObj?.name) === "info").length, [tickets]);
  const countInProgress = useMemo(
    () => tickets.filter((t) => statusTone(t.statusObj?.name) === "accent" || statusTone(t.statusObj?.name) === "warning").length,
    [tickets]
  );
  const countResolved = useMemo(
    () => tickets.filter((t) => statusTone(t.statusObj?.name) === "success" || t.statusObj?.is_terminal).length,
    [tickets]
  );

  // Overdue check
  const today = istDay(new Date().toISOString());
  const isOverdue = (t: any) => {
    if (!t.due_date) return false;
    if (t.statusObj?.is_terminal || statusTone(t.statusObj?.name) === "success") return false;
    return istDay(t.due_date) < today;
  };

  // Filter Options for MultiSelect
  const scopeOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.scopeName) set.add(t.scopeName);
    });
    scopesList.forEach((s) => set.add(s.name));
    return Array.from(set).map((s) => ({ value: s, label: s }));
  }, [tickets, scopesList]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    states.forEach((s) => s.name && set.add(s.name));
    tickets.forEach((t) => t.statusObj?.name && set.add(t.statusObj.name));
    return Array.from(set).map((s) => ({ value: s, label: s }));
  }, [states, tickets]);

  const priorityOptions = useMemo(() => {
    const set = new Set<string>();
    priorities.forEach((p) => p.name && set.add(p.name));
    tickets.forEach((t) => t.priorityObj?.name && set.add(t.priorityObj.name));
    return Array.from(set).map((p) => ({ value: p, label: p }));
  }, [priorities, tickets]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d) => d.name && set.add(d.name));
    tickets.forEach((t) => t.departmentObj?.name && set.add(t.departmentObj.name));
    return Array.from(set).map((d) => ({ value: d, label: d }));
  }, [departments, tickets]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>(["Unassigned"]);
    allUsers.forEach((u) => u.full_name && set.add(u.full_name));
    tickets.forEach((t) => t.assignedTo && set.add(t.assignedTo));
    return Array.from(set)
      .sort((a, b) => (a === "Unassigned" ? -1 : b === "Unassigned" ? 1 : a.localeCompare(b)))
      .map((a) => ({ value: a, label: a }));
  }, [allUsers, tickets]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => c.name && set.add(c.name));
    tickets.forEach((t) => t.categoryObj?.name && set.add(t.categoryObj.name));
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [categories, tickets]);

  // Combined Dataset Filter with Strict Scope and Logic
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tickets.filter((t: any) => {
      // 1. Search Query
      if (q) {
        const fullText = `${t.id || ""} ${t.code || ""} ${t.title || ""} ${t.description || ""}`.toLowerCase();
        if (!fullText.includes(q)) return false;
      }

      // 2. Interactive KPI Card
      if (selectedCard === "OPEN") {
        if (statusTone(t.statusObj?.name) !== "info") return false;
      } else if (selectedCard === "IN_PROGRESS") {
        const tone = statusTone(t.statusObj?.name);
        if (tone !== "accent" && tone !== "warning") return false;
      } else if (selectedCard === "RESOLVED") {
        if (statusTone(t.statusObj?.name) !== "success" && !t.statusObj?.is_terminal) return false;
      }

      // 3. Scopes Multi-Select
      if (selectedScopes.length > 0) {
        if (!t.scopeName || !selectedScopes.includes(t.scopeName)) return false;
      }

      // 4. Statuses Multi-Select
      if (selectedStatuses.length > 0) {
        const sName = t.statusObj?.name || "";
        if (!selectedStatuses.includes(sName)) return false;
      }

      // 5. Priorities Multi-Select
      if (selectedPriorities.length > 0) {
        const pName = t.priorityObj?.name || "";
        if (!selectedPriorities.includes(pName)) return false;
      }

      // 6. Departments Multi-Select
      if (selectedDepartments.length > 0) {
        const dName = t.departmentObj?.name || "";
        if (!selectedDepartments.includes(dName)) return false;
      }

      // 7. Assignees Multi-Select
      if (selectedAssignees.length > 0) {
        const aName = t.assignedTo || "Unassigned";
        if (!selectedAssignees.includes(aName)) return false;
      }

      // 8. Categories Multi-Select
      if (selectedCategories.length > 0) {
        const cName = t.categoryObj?.name || "";
        if (!selectedCategories.includes(cName)) return false;
      }

      // 9. Created Date Range
      if (dateMode === "CREATED" || dateMode === "BOTH") {
        const createdDay = istDay(t.createdAt || t.created_at);
        if (createdFrom && (!createdDay || createdDay < createdFrom)) return false;
        if (createdTo && (!createdDay || createdDay > createdTo)) return false;
      }

      // 10. Due Date Range (Records with no due date must NOT be accidentally included in a due date range)
      if (dateMode === "DUE" || dateMode === "BOTH") {
        if (dueFrom || dueTo) {
          if (!t.due_date) return false;
          const dueDay = istDay(t.due_date);
          if (dueFrom && (!dueDay || dueDay < dueFrom)) return false;
          if (dueTo && (!dueDay || dueDay > dueTo)) return false;
        }
      }

      return true;
    });
  }, [
    tickets,
    searchQuery,
    selectedCard,
    selectedScopes,
    selectedStatuses,
    selectedPriorities,
    selectedDepartments,
    selectedAssignees,
    selectedCategories,
    dateMode,
    createdFrom,
    createdTo,
    dueFrom,
    dueTo,
  ]);

  const hasActiveFilters =
    !!searchQuery ||
    selectedScopes.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedDepartments.length > 0 ||
    selectedAssignees.length > 0 ||
    selectedCategories.length > 0 ||
    selectedCard !== null ||
    !!createdFrom ||
    !!createdTo ||
    !!dueFrom ||
    !!dueTo;

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedScopes([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedDepartments([]);
    setSelectedAssignees([]);
    setSelectedCategories([]);
    setSelectedCard(null);
    setCreatedFrom("");
    setCreatedTo("");
    setDueFrom("");
    setDueTo("");
    setDateError(null);
  };

  if (!mounted || permissionsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-foreground">
        <ChandakLoader size="lg" title="Loading tickets…" />
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-center text-foreground">
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <Database className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to tickets</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Tickets view access in RBAC access policies.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      {/* Compact Page Header */}
      <PageHeader
        title="Tickets"
        description="Support and operations requests raised across Chandak Group"
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              variant="ghost"
              size="icon"
              onClick={() => fetchData()}
              aria-label="Refresh tickets"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </AppButton>
            {hasPermission("TICKETS_CREATE") && (
              <AppButton
                variant="primary"
                onClick={() => setShowWizard(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New ticket
              </AppButton>
            )}
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {/* Interactive KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCard(null);
              setSelectedStatuses([]);
            }}
            className={cn(
              "p-3 rounded-lg border text-left transition-all",
              selectedCard === null
                ? "bg-surface border-border-active shadow-xs ring-2 ring-primary/20"
                : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
            )}
          >
            <div className="text-[11px] font-semibold text-subtle">Total</div>
            <div className="text-xl font-bold text-foreground mt-0.5">{tickets.length}</div>
            <div className="text-[10px] text-muted mt-0.5">All tickets visible to you</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCard((prev) => (prev === "OPEN" ? null : "OPEN"))}
            className={cn(
              "p-3 rounded-lg border text-left transition-all",
              selectedCard === "OPEN"
                ? "bg-sky-500/10 border-sky-500/40 shadow-xs ring-2 ring-sky-500/30"
                : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
            )}
          >
            <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">Open</div>
            <div className="text-xl font-bold text-sky-700 dark:text-sky-300 mt-0.5">{countOpen}</div>
            <div className="text-[10px] text-muted mt-0.5">Awaiting resolution</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCard((prev) => (prev === "IN_PROGRESS" ? null : "IN_PROGRESS"))}
            className={cn(
              "p-3 rounded-lg border text-left transition-all",
              selectedCard === "IN_PROGRESS"
                ? "bg-amber-500/10 border-amber-500/40 shadow-xs ring-2 ring-amber-500/30"
                : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
            )}
          >
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">In progress</div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{countInProgress}</div>
            <div className="text-[10px] text-muted mt-0.5">Active investigation</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCard((prev) => (prev === "RESOLVED" ? null : "RESOLVED"))}
            className={cn(
              "p-3 rounded-lg border text-left transition-all",
              selectedCard === "RESOLVED"
                ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs ring-2 ring-emerald-500/30"
                : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
            )}
          >
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Resolved</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{countResolved}</div>
            <div className="text-[10px] text-muted mt-0.5">Closed & satisfied</div>
          </button>
        </div>

        {/* Compact, Organized Filter Toolbar */}
        <div className="theme-card-structural flex flex-col gap-2.5 p-3 rounded-lg border border-border">
          {/* Top Filter Row: Search & Multi-Selects */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                aria-label="Search tickets"
                placeholder="Search code, title, details…"
                className="h-8 w-full pl-8 pr-3 text-xs rounded-md border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <MultiSelectFilter placeholder="Scope" options={scopeOptions} selectedValues={selectedScopes} onChange={setSelectedScopes} />
            <MultiSelectFilter placeholder="Status" options={statusOptions} selectedValues={selectedStatuses} onChange={setSelectedStatuses} />
            <MultiSelectFilter placeholder="Priority" options={priorityOptions} selectedValues={selectedPriorities} onChange={setSelectedPriorities} />
            <MultiSelectFilter placeholder="Department" options={departmentOptions} selectedValues={selectedDepartments} onChange={setSelectedDepartments} />
            <MultiSelectFilter placeholder="Assignee" options={assigneeOptions} selectedValues={selectedAssignees} onChange={setSelectedAssignees} />
            <MultiSelectFilter placeholder="Category" options={categoryOptions} selectedValues={selectedCategories} onChange={setSelectedCategories} />

            {hasActiveFilters && (
              <AppButton variant="ghost" size="sm" onClick={handleClearAllFilters} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
                Clear
              </AppButton>
            )}
          </div>

          {/* Date Filtering Section */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="font-semibold text-subtle text-[11px]">Date Filter:</span>
              <select
                value={dateMode}
                onChange={(e: any) => setDateMode(e.target.value)}
                className="h-7 text-xs px-2 rounded border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
              >
                <option value="CREATED">Created Date</option>
                <option value="DUE">Due Date</option>
                <option value="BOTH">Both (Created & Due)</option>
              </select>
            </div>

            {/* Created Date Inputs */}
            {(dateMode === "CREATED" || dateMode === "BOTH") && (
              <div className="flex items-center gap-1.5 shrink-0 bg-sunken/40 px-2 py-0.5 rounded border border-border/40">
                <span className="text-[11px] text-muted">Created:</span>
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  aria-label="Created from"
                  className="h-6 px-1.5 text-xs rounded border border-border bg-surface text-foreground"
                />
                <span className="text-[10px] text-muted">to</span>
                <input
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  aria-label="Created to"
                  className="h-6 px-1.5 text-xs rounded border border-border bg-surface text-foreground"
                />
                {(createdFrom || createdTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedFrom("");
                      setCreatedTo("");
                    }}
                    className="text-muted hover:text-danger"
                    title="Clear created dates"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Due Date Inputs */}
            {(dateMode === "DUE" || dateMode === "BOTH") && (
              <div className="flex items-center gap-1.5 shrink-0 bg-sunken/40 px-2 py-0.5 rounded border border-border/40">
                <span className="text-[11px] text-muted">Due:</span>
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                  aria-label="Due from"
                  className="h-6 px-1.5 text-xs rounded border border-border bg-surface text-foreground"
                />
                <span className="text-[10px] text-muted">to</span>
                <input
                  type="date"
                  value={dueTo}
                  onChange={(e) => setDueTo(e.target.value)}
                  aria-label="Due to"
                  className="h-6 px-1.5 text-xs rounded border border-border bg-surface text-foreground"
                />
                {(dueFrom || dueTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDueFrom("");
                      setDueTo("");
                    }}
                    className="text-muted hover:text-danger"
                    title="Clear due dates"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {dateError && (
              <div className="flex items-center gap-1 text-[11px] text-danger font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{dateError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Removable Active Filters Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-surface/80 rounded-lg border border-border text-xs">
            <span className="text-[11px] font-semibold text-muted mr-1">Active filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Search: &ldquo;{searchQuery}&rdquo;
                <button type="button" onClick={() => setSearchQuery("")} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedCard && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Status: {selectedCard === "OPEN" ? "Open" : selectedCard === "IN_PROGRESS" ? "In Progress" : "Resolved"}
                <button type="button" onClick={() => setSelectedCard(null)} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedScopes.map((scope) => (
              <span key={scope} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Scope: {scope}
                <button type="button" onClick={() => setSelectedScopes((prev) => prev.filter((s) => s !== scope))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedStatuses.map((status) => (
              <span key={status} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Status: {status}
                <button type="button" onClick={() => setSelectedStatuses((prev) => prev.filter((s) => s !== status))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedPriorities.map((prio) => (
              <span key={prio} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Priority: {prio}
                <button type="button" onClick={() => setSelectedPriorities((prev) => prev.filter((p) => p !== prio))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedDepartments.map((dept) => (
              <span key={dept} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Dept: {dept}
                <button type="button" onClick={() => setSelectedDepartments((prev) => prev.filter((d) => d !== dept))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedAssignees.map((assignee) => (
              <span key={assignee} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Assignee: {assignee}
                <button type="button" onClick={() => setSelectedAssignees((prev) => prev.filter((a) => a !== assignee))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedCategories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Category: {cat}
                <button type="button" onClick={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {(createdFrom || createdTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Created: {createdFrom || "start"} → {createdTo || "now"}
                <button
                  type="button"
                  onClick={() => {
                    setCreatedFrom("");
                    setCreatedTo("");
                  }}
                  className="hover:text-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(dueFrom || dueTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Due: {dueFrom || "start"} → {dueTo || "now"}
                <button
                  type="button"
                  onClick={() => {
                    setDueFrom("");
                    setDueTo("");
                  }}
                  className="hover:text-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button type="button" onClick={handleClearAllFilters} className="ml-auto text-xs font-semibold text-danger hover:underline">
              Clear all
            </button>
          </div>
        )}

        {/* Tickets Table / List Area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && tickets.length === 0 ? (
            <div className="theme-card-structural flex h-64 items-center justify-center">
              <ChandakLoader size="md" title="Loading tickets…" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="theme-card-structural">
              <EmptyState
                kind={hasActiveFilters ? "no-results" : "empty"}
                title={hasActiveFilters ? "No tickets match these filters" : "No tickets yet"}
                description={hasActiveFilters ? "Try clearing filters or adjusting your date range." : "Raise a ticket when something needs the IT or operations team."}
                action={
                  hasActiveFilters ? (
                    <AppButton variant="outline" size="sm" onClick={handleClearAllFilters}>
                      Clear all filters
                    </AppButton>
                  ) : hasPermission("TICKETS_CREATE") ? (
                    <AppButton variant="secondary" onClick={() => setShowWizard(true)} leftIcon={<Plus className="h-4 w-4" />}>
                      New ticket
                    </AppButton>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile cards view (< 1024px) */}
              <ul className="space-y-2 lg:hidden">
                {filteredTickets.map((ticket) => {
                  const overdue = isOverdue(ticket);
                  return (
                    <li key={ticket.dbId}>
                      <button
                        type="button"
                        onClick={() => handleTicketClick(ticket)}
                        className="theme-card-structural w-full space-y-2 p-3.5 text-left transition-[border-color,box-shadow] hover:border-border-active hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12.5px] font-semibold text-accent-soft-text">{ticket.id}</span>
                            {ticket.scopeName && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sunken text-muted">
                                {ticket.scopeName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {overdue && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger bg-danger-soft border border-danger-border px-1.5 py-0.5 rounded">
                                <AlertTriangle className="h-3 w-3" /> Overdue
                              </span>
                            )}
                            <StatusBadge status={ticket.statusObj?.name || null} size="sm" />
                          </div>
                        </div>

                        <div className="line-clamp-2 text-[13.5px] font-semibold text-foreground">{ticket.title}</div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <PriorityIndicator priority={ticket.priorityObj?.name} className="text-xs" />
                          {ticket.departmentObj?.name && <span className="truncate">{ticket.departmentObj.name}</span>}
                          {ticket.due_date && (
                            <span className={cn("ml-auto text-[11px]", overdue ? "font-bold text-danger" : "text-subtle")}>
                              Due: {formatDate(ticket.due_date)}
                            </span>
                          )}
                        </div>

                        <div className="border-t border-border pt-2 text-xs flex items-center justify-between">
                          <UserCell name={ticket.assignedTo || null} />
                          <DateCell value={ticket.createdAt} className="text-muted text-[11px]" />
                        </div>
                      </button>

                      {(canEditRow(ticket) || canDeleteRow(ticket)) && (
                        <div className="-mt-1 flex justify-end gap-1 px-2 pb-1">
                          {canEditRow(ticket) && (
                            <button
                              type="button"
                              aria-label={`Edit ${ticket.id}`}
                              title="Edit"
                              onClick={() => handleTicketClick(ticket)}
                              className={ROW_ICON_BTN}
                            >
                              <Edit2 className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          {canDeleteRow(ticket) && (
                            <button
                              type="button"
                              aria-label={`Delete ${ticket.id}`}
                              title="Delete (moves to Trash)"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteReason("");
                                setDeleteTarget(ticket);
                              }}
                              className={cn(ROW_ICON_BTN, "hover:bg-danger-soft hover:text-danger-text")}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Desktop Table View (>= 1024px) */}
              <div className="hidden lg:block">
                <AppTableContainer>
                  <AppTable>
                    <AppTableHeader>
                      <AppTableRow>
                        <AppTableHead className="whitespace-nowrap">Ticket</AppTableHead>
                        <AppTableHead>Title</AppTableHead>
                        <AppTableHead>Scope</AppTableHead>
                        <AppTableHead>Priority</AppTableHead>
                        <AppTableHead>Status</AppTableHead>
                        <AppTableHead>Department</AppTableHead>
                        <AppTableHead>Assignee</AppTableHead>
                        <AppTableHead>Due Date</AppTableHead>
                        <AppTableHead>Created</AppTableHead>
                        <AppTableHead className="text-right">Actions</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody>
                      {filteredTickets.map((ticket) => {
                        const overdue = isOverdue(ticket);
                        return (
                          <AppTableRow key={ticket.dbId} data-record-id={ticket.id} data-highlight={createdCode === ticket.id || undefined} onClick={() => handleTicketClick(ticket)} className="cursor-pointer hover:bg-surface-hover">
                            <AppTableCell className="whitespace-nowrap font-mono text-[12.5px] font-semibold text-accent-soft-text">
                              {ticket.id}
                            </AppTableCell>

                            <AppTableCell className="max-w-xs font-medium text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate" title={ticket.title}>
                                  {ticket.title}
                                </span>
                                {overdue && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-danger bg-danger-soft border border-danger-border px-1.5 py-0.2 rounded shrink-0">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                                  </span>
                                )}
                              </div>
                            </AppTableCell>

                            <AppTableCell className="text-xs text-subtle whitespace-nowrap">
                              {ticket.scopeName || "—"}
                            </AppTableCell>

                            <AppTableCell>
                              <PriorityIndicator priority={ticket.priorityObj?.name} />
                            </AppTableCell>

                            <AppTableCell>
                              <StatusBadge status={ticket.statusObj?.name || null} />
                            </AppTableCell>

                            <AppTableCell className="text-subtle text-xs">
                              {ticket.departmentObj?.name || "—"}
                            </AppTableCell>

                            <AppTableCell>
                              <UserCell name={ticket.assignedTo || null} />
                            </AppTableCell>

                            <AppTableCell className="whitespace-nowrap text-xs">
                              <span className={cn(overdue ? "font-bold text-danger" : "text-subtle")}>
                                {formatDate(ticket.due_date)}
                              </span>
                            </AppTableCell>

                            <AppTableCell className="whitespace-nowrap text-xs">
                              <DateCell value={ticket.createdAt} />
                            </AppTableCell>

                            <AppTableCell className="px-2 text-right">
                              <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  aria-label={`View ${ticket.id}`}
                                  title="View"
                                  onClick={() => router.push(`/tickets/${ticket.dbId}?mode=view`)}
                                  className={ROW_ICON_BTN}
                                >
                                  <Eye className="h-4 w-4" aria-hidden />
                                </button>
                                {canEditRow(ticket) && (
                                  <button
                                    type="button"
                                    aria-label={`Edit ${ticket.id}`}
                                    title="Edit"
                                    onClick={() => router.push(`/tickets/${ticket.dbId}?mode=edit`)}
                                    className={ROW_ICON_BTN}
                                  >
                                    <Edit2 className="h-4 w-4" aria-hidden />
                                  </button>
                                )}
                                {canDeleteRow(ticket) && (
                                  <button
                                    type="button"
                                    aria-label={`Delete ${ticket.id}`}
                                    title="Delete (moves to Trash)"
                                    onClick={() => {
                                      setDeleteError(null);
                                      setDeleteReason("");
                                      setDeleteTarget(ticket);
                                    }}
                                    className={cn(ROW_ICON_BTN, "hover:bg-danger-soft hover:text-danger-text")}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                  </button>
                                )}
                              </div>
                            </AppTableCell>
                          </AppTableRow>
                        );
                      })}
                    </AppTableBody>
                  </AppTable>
                </AppTableContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {showWizard && (
        <TicketCreationWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(id) => {
            setShowWizard(false);
            if (id.includes("-REQ-")) {
              router.push(recordCreatedHref("/requirements", id));
            } else {
              fetchData();
              setCreatedCode(id);
              setToastMessage(`Ticket ${id} created`);
            }
          }}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4"
          role="presentation"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tk-del-title"
            className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-foreground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-danger-soft p-2 text-danger-text">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 id="tk-del-title" className="text-[15px] font-semibold text-heading">
                  Delete ticket {deleteTarget.id}?
                </h3>
                <p className="mt-1 text-[13px] text-muted">The ticket moves to Trash. A Super Admin can restore it from there.</p>
              </div>
            </div>
            <label htmlFor="tk-del-reason" className="mt-4 block text-[13px] font-medium text-subtle">
              Reason (optional)
            </label>
            <textarea
              id="tk-del-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-1.5 min-h-[64px] w-full resize-y p-2.5 text-[13px]"
              placeholder="Why is this ticket being deleted?"
            />
            {deleteError && (
              <p role="alert" className="mt-2 text-[12.5px] text-danger-text">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <AppButton variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </AppButton>
              <AppButton
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
                leftIcon={deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              >
                {deleting ? "Deleting…" : "Move to Trash"}
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-2 rounded-[10px] border border-border border-l-[3px] border-l-success bg-elevated px-4 py-3 text-[13.5px] text-foreground shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          {toastMessage}
        </div>
      )}
    </PageContainer>
  );
}
