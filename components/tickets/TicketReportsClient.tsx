"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Columns3,
  Search,
  X,
  Calendar,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import {
  AppTableContainer,
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableRow,
  AppTableHead,
  AppTableCell,
} from "@/components/ui/AppTable";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback/States";
import { usePermissions } from "@/hooks/usePermissions";
import { generateTicketReportData, type TicketReportRow } from "@/lib/actions/ticket_reports";
import { cn } from "@/lib/utils";

type ColumnKey = keyof TicketReportRow;

interface ReportColumn {
  key: ColumnKey;
  label: string;
  kind: "text" | "date" | "badge" | "number";
  defaultVisible: boolean;
  width: number;
}

const COLUMNS: ReportColumn[] = [
  { key: "code", label: "Code", kind: "text", defaultVisible: true, width: 120 },
  { key: "title", label: "Title", kind: "text", defaultVisible: true, width: 260 },
  { key: "scope", label: "Scope", kind: "text", defaultVisible: true, width: 140 },
  { key: "department", label: "Department", kind: "text", defaultVisible: true, width: 150 },
  { key: "category", label: "Category", kind: "text", defaultVisible: true, width: 150 },
  { key: "subcategory", label: "Sub-category", kind: "text", defaultVisible: false, width: 150 },
  { key: "issue_type", label: "Issue type", kind: "text", defaultVisible: false, width: 140 },
  { key: "priority", label: "Priority", kind: "badge", defaultVisible: true, width: 120 },
  { key: "status", label: "Status", kind: "badge", defaultVisible: true, width: 140 },
  { key: "creator_name", label: "Raised by", kind: "text", defaultVisible: true, width: 160 },
  { key: "assigned_to", label: "Assigned to", kind: "text", defaultVisible: true, width: 160 },
  { key: "due_date", label: "Due date", kind: "date", defaultVisible: true, width: 120 },
  { key: "created_at", label: "Created on", kind: "date", defaultVisible: true, width: 120 },
  { key: "updated_at", label: "Last updated", kind: "date", defaultVisible: false, width: 120 },
  { key: "age_days", label: "Open for (days)", kind: "number", defaultVisible: false, width: 120 },
  { key: "description", label: "Description", kind: "text", defaultVisible: false, width: 320 },
];

const COLUMN_STORAGE_KEY = "chandak_ticket_report_columns_v1";
const REPORT_STATE_STORAGE_KEY = "chandak_ticket_reports_filter_state_v1";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function istDay(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function cellText(col: ReportColumn, row: TicketReportRow): string {
  const v = row[col.key];
  if (col.kind === "date") return formatDate(v as string | null);
  if (col.kind === "number") return v === null || v === undefined ? "—" : String(v);
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function optionsOf(rows: TicketReportRow[], key: ColumnKey) {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = r[key];
    if (v !== null && v !== undefined && v !== "") set.add(String(v));
  });
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

export default function TicketReportsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, roleCode } = usePermissions();
  const canExport =
    roleCode === "SUPER_ADMIN" || hasPermission("TICKETS_MANAGE") || hasPermission("REPORTS_EXPORT");

  const [rows, setRows] = useState<TicketReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  // Filters State
  const [query, setQuery] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);

  // Interactive KPI Card Filter: null | "OPEN" | "CLOSED" | "OVERDUE" | "UNASSIGNED"
  const [kpiCard, setKpiCard] = useState<null | "OPEN" | "CLOSED" | "OVERDUE" | "UNASSIGNED">(null);

  // Date Filter State
  const [dateMode, setDateMode] = useState<"CREATED" | "DUE" | "BOTH">("CREATED");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Record Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectAllFiltered, setIsSelectAllFiltered] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Columns Chooser
  const [visibleKeys, setVisibleKeys] = useState<ColumnKey[]>(
    COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Export Scope Modal / Popover
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"SELECTED" | "PAGE" | "ALL">("ALL");

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Restore columns choice from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        const keys = (JSON.parse(saved) as string[]).filter((k) => COLUMNS.some((c) => c.key === k)) as ColumnKey[];
        if (keys.length) setVisibleKeys(keys);
      }
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleKeys));
    } catch { /* storage unavailable */ }
  }, [visibleKeys]);

  // Restore filter state from sessionStorage (for Back to Reports workflow)
  useEffect(() => {
    try {
      const savedState = window.sessionStorage.getItem(REPORT_STATE_STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.query !== undefined) setQuery(parsed.query);
        if (parsed.scopes) setScopes(parsed.scopes);
        if (parsed.statuses) setStatuses(parsed.statuses);
        if (parsed.priorities) setPriorities(parsed.priorities);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.departments) setDepartments(parsed.departments);
        if (parsed.assignees) setAssignees(parsed.assignees);
        if (parsed.kpiCard !== undefined) setKpiCard(parsed.kpiCard);
        if (parsed.dateMode) setDateMode(parsed.dateMode);
        if (parsed.createdFrom !== undefined) setCreatedFrom(parsed.createdFrom);
        if (parsed.createdTo !== undefined) setCreatedTo(parsed.createdTo);
        if (parsed.dueFrom !== undefined) setDueFrom(parsed.dueFrom);
        if (parsed.dueTo !== undefined) setDueTo(parsed.dueTo);
        if (parsed.columnFilters) setColumnFilters(parsed.columnFilters);
        if (parsed.currentPage) setCurrentPage(parsed.currentPage);
      }
    } catch { /* ignore */ }
  }, []);

  // Save state to sessionStorage whenever filters change
  const saveStateToSession = useCallback(() => {
    try {
      const stateObj = {
        query,
        scopes,
        statuses,
        priorities,
        categories,
        departments,
        assignees,
        kpiCard,
        dateMode,
        createdFrom,
        createdTo,
        dueFrom,
        dueTo,
        columnFilters,
        currentPage,
      };
      window.sessionStorage.setItem(REPORT_STATE_STORAGE_KEY, JSON.stringify(stateObj));
    } catch { /* ignore */ }
  }, [query, scopes, statuses, priorities, categories, departments, assignees, kpiCard, dateMode, createdFrom, createdTo, dueFrom, dueTo, columnFilters, currentPage]);

  useEffect(() => {
    saveStateToSession();
  }, [saveStateToSession]);

  // Date Validation
  useEffect(() => {
    if ((dateMode === "CREATED" || dateMode === "BOTH") && createdFrom && createdTo && createdFrom > createdTo) {
      setDateError("Created 'From' date cannot be after 'To' date.");
    } else if ((dateMode === "DUE" || dateMode === "BOTH") && dueFrom && dueTo && dueFrom > dueTo) {
      setDateError("Due 'From' date cannot be after 'To' date.");
    } else {
      setDateError(null);
    }
  }, [dateMode, createdFrom, createdTo, dueFrom, dueTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateTicketReportData();
      if (res.error) setError(res.error);
      setRows(res.rows || []);
      setTruncated(!!res.truncated);
    } catch (e: any) {
      setError(e?.message || "Could not load the ticket report.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys]
  );

  const todayStr = istDay(new Date().toISOString());

  // Filtered dataset
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      // Search
      if (q && !`${r.code} ${r.title} ${r.description} ${r.department} ${r.assigned_to}`.toLowerCase().includes(q)) return false;

      // KPI Card filter
      if (kpiCard === "OPEN" && r.is_closed) return false;
      if (kpiCard === "CLOSED" && !r.is_closed) return false;
      if (kpiCard === "OVERDUE" && (r.is_closed || !r.due_date || istDay(r.due_date) >= todayStr)) return false;
      if (kpiCard === "UNASSIGNED" && (r.is_closed || r.assigned_to !== "Unassigned")) return false;

      // Multi-selects
      if (scopes.length && !scopes.includes(r.scope)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (priorities.length && !priorities.includes(r.priority)) return false;
      if (categories.length && !categories.includes(r.category)) return false;
      if (departments.length && !departments.includes(r.department)) return false;
      if (assignees.length && !assignees.includes(r.assigned_to)) return false;

      // Created Date range
      if (dateMode === "CREATED" || dateMode === "BOTH") {
        const day = istDay(r.created_at);
        if (createdFrom && (!day || day < createdFrom)) return false;
        if (createdTo && (!day || day > createdTo)) return false;
      }

      // Due Date range (records with no due date must NOT be included in due date range)
      if (dateMode === "DUE" || dateMode === "BOTH") {
        if (dueFrom || dueTo) {
          if (!r.due_date) return false;
          const dueDay = istDay(r.due_date);
          if (dueFrom && (!dueDay || dueDay < dueFrom)) return false;
          if (dueTo && (!dueDay || dueDay > dueTo)) return false;
        }
      }

      // Column text filters
      for (const [key, value] of Object.entries(columnFilters)) {
        if (!value) continue;
        const col = COLUMNS.find((c) => c.key === key);
        if (col && !cellText(col, r).toLowerCase().includes(value.toLowerCase())) return false;
      }

      return true;
    });
  }, [rows, query, kpiCard, scopes, statuses, priorities, categories, departments, assignees, dateMode, createdFrom, createdTo, dueFrom, dueTo, columnFilters, todayStr]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setIsSelectAllFiltered(false);
  }, [query, kpiCard, scopes, statuses, priorities, categories, departments, assignees, dateMode, createdFrom, createdTo, dueFrom, dueTo, columnFilters]);

  // KPI Metrics calculation
  const kpis = useMemo(() => {
    const open = rows.filter((r) => !r.is_closed);
    const overdue = open.filter((r) => r.due_date && istDay(r.due_date) < todayStr).length;
    const unassigned = open.filter((r) => r.assigned_to === "Unassigned").length;

    return {
      total: rows.length,
      open: open.length,
      closed: rows.length - open.length,
      overdue,
      unassigned,
    };
  }, [rows, todayStr]);

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = useMemo(() => filtered.slice(pageStart, pageStart + pageSize), [filtered, pageStart, pageSize]);

  // Record selection state computation
  const isAllPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const isSomePageSelected = pageRows.some((r) => selectedIds.has(r.id)) && !isAllPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsSelectAllFiltered(false);
  };

  const handleToggleSelectPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.delete(r.id));
        return next;
      });
      setIsSelectAllFiltered(false);
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((r) => r.id)));
    setIsSelectAllFiltered(true);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectAllFiltered(false);
  };

  const hasFilters =
    !!query ||
    scopes.length > 0 ||
    statuses.length > 0 ||
    priorities.length > 0 ||
    categories.length > 0 ||
    departments.length > 0 ||
    assignees.length > 0 ||
    kpiCard !== null ||
    !!createdFrom ||
    !!createdTo ||
    !!dueFrom ||
    !!dueTo ||
    Object.values(columnFilters).some(Boolean);

  const resetFilters = () => {
    setQuery("");
    setScopes([]);
    setStatuses([]);
    setPriorities([]);
    setCategories([]);
    setDepartments([]);
    setAssignees([]);
    setKpiCard(null);
    setCreatedFrom("");
    setCreatedTo("");
    setDueFrom("");
    setDueTo("");
    setColumnFilters({});
    setSelectedIds(new Set());
    setIsSelectAllFiltered(false);
    setCurrentPage(1);
    setDateError(null);
  };

  const fileStamp = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const getExportDataset = (): TicketReportRow[] => {
    if (exportScope === "SELECTED" && selectedIds.size > 0) {
      return filtered.filter((r) => selectedIds.has(r.id));
    }
    if (exportScope === "PAGE") {
      return pageRows;
    }
    return filtered;
  };

  const exportToExcel = async () => {
    const dataset = getExportDataset();
    if (dataset.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ticket report");
    sheet.columns = visibleColumns.map((c) => ({
      header: c.label,
      key: c.key,
      width: c.key === "title" || c.key === "description" ? 45 : 20,
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };

    dataset.forEach((r) => {
      const out: Record<string, string> = {};
      visibleColumns.forEach((c) => {
        out[c.key] = cellText(c, r);
      });
      sheet.addRow(out);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Ticket_Report_${fileStamp()}_${exportScope.toLowerCase()}.xlsx`);
    setExportOpen(false);
  };

  const exportToPDF = () => {
    const dataset = getExportDataset();
    if (dataset.length === 0) return;

    const doc = new jsPDF("landscape");
    doc.text(`Ticket Report (${exportScope} - ${dataset.length} records)`, 14, 15);
    autoTable(doc, {
      head: [visibleColumns.map((c) => c.label)],
      body: dataset.map((r) => visibleColumns.map((c) => cellText(c, r))),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`Ticket_Report_${fileStamp()}_${exportScope.toLowerCase()}.pdf`);
    setExportOpen(false);
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleKeys((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      return COLUMNS.filter((c) => prev.includes(c.key) || c.key === key).map((c) => c.key);
    });
  };

  const handleOpenTicket = (ticketId: string) => {
    saveStateToSession();
    router.push(`/tickets/${ticketId}?from=reports`);
  };

  if (loading) return <LoadingState label="Loading ticket report…" />;
  if (error && rows.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-3">
      {/* Interactive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setKpiCard(null);
            setStatuses([]);
          }}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            kpiCard === null
              ? "bg-surface border-border-active shadow-xs ring-2 ring-primary/20"
              : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
          )}
        >
          <div className="text-[11px] font-semibold text-subtle">Tickets</div>
          <div className="text-xl font-bold text-foreground mt-0.5">{kpis.total}</div>
          <div className="text-[10px] text-muted mt-0.5">All authorized records</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard((prev) => (prev === "OPEN" ? null : "OPEN"))}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            kpiCard === "OPEN"
              ? "bg-sky-500/10 border-sky-500/40 shadow-xs ring-2 ring-sky-500/30"
              : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
          )}
        >
          <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">Open</div>
          <div className="text-xl font-bold text-sky-700 dark:text-sky-300 mt-0.5">{kpis.open}</div>
          <div className="text-[10px] text-muted mt-0.5">Active tickets</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard((prev) => (prev === "CLOSED" ? null : "CLOSED"))}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            kpiCard === "CLOSED"
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs ring-2 ring-emerald-500/30"
              : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
          )}
        >
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Closed</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{kpis.closed}</div>
          <div className="text-[10px] text-muted mt-0.5">Completed & resolved</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard((prev) => (prev === "OVERDUE" ? null : "OVERDUE"))}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            kpiCard === "OVERDUE"
              ? "bg-rose-500/10 border-rose-500/40 shadow-xs ring-2 ring-rose-500/30"
              : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
          )}
        >
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Overdue</div>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{kpis.overdue}</div>
          <div className="text-[10px] text-muted mt-0.5">Passed due date</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard((prev) => (prev === "UNASSIGNED" ? null : "UNASSIGNED"))}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            kpiCard === "UNASSIGNED"
              ? "bg-amber-500/10 border-amber-500/40 shadow-xs ring-2 ring-amber-500/30"
              : "bg-surface/60 border-border hover:bg-surface hover:border-border-active"
          )}
        >
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Unassigned</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{kpis.unassigned}</div>
          <div className="text-[10px] text-muted mt-0.5">Needs owner</div>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="theme-card-structural flex flex-col gap-2.5 p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, title, details…"
              aria-label="Search tickets"
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <MultiSelectFilter placeholder="Scope" options={optionsOf(rows, "scope")} selectedValues={scopes} onChange={setScopes} />
          <MultiSelectFilter placeholder="Status" options={optionsOf(rows, "status")} selectedValues={statuses} onChange={setStatuses} />
          <MultiSelectFilter placeholder="Priority" options={optionsOf(rows, "priority")} selectedValues={priorities} onChange={setPriorities} />
          <MultiSelectFilter placeholder="Category" options={optionsOf(rows, "category")} selectedValues={categories} onChange={setCategories} />
          <MultiSelectFilter placeholder="Department" options={optionsOf(rows, "department")} selectedValues={departments} onChange={setDepartments} />
          <MultiSelectFilter placeholder="Assigned to" options={optionsOf(rows, "assigned_to")} selectedValues={assignees} onChange={setAssignees} />

          {hasFilters && (
            <AppButton variant="ghost" size="sm" onClick={resetFilters} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
              Clear
            </AppButton>
          )}

          {/* Actions: Columns & Export */}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setColumnsOpen((v) => !v)}
                leftIcon={<Columns3 className="h-3.5 w-3.5" />}
                aria-expanded={columnsOpen}
              >
                Columns
              </AppButton>
              {columnsOpen && (
                <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-border bg-elevated p-2 shadow-lg">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-xs font-semibold text-subtle">Show columns</span>
                    <button type="button" aria-label="Close column picker" onClick={() => setColumnsOpen(false)} className="text-muted hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {COLUMNS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-xs text-foreground rounded hover:bg-surface cursor-pointer">
                        <input type="checkbox" checked={visibleKeys.includes(c.key)} onChange={() => toggleColumn(c.key)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {canExport && (
              <div className="relative">
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => setExportOpen((v) => !v)}
                  disabled={filtered.length === 0}
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                >
                  Export
                  <ChevronDown className="h-3 w-3 ml-1" />
                </AppButton>
                {exportOpen && (
                  <div className="absolute right-0 z-40 mt-1 w-64 rounded-md border border-border bg-elevated p-3 shadow-lg">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-xs font-semibold text-foreground">Export Scope Indicator</span>
                      <button type="button" onClick={() => setExportOpen(false)} className="text-muted hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2.5 space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportScope"
                          value="ALL"
                          checked={exportScope === "ALL"}
                          onChange={() => setExportScope("ALL")}
                        />
                        <span>All filtered records ({filtered.length})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportScope"
                          value="PAGE"
                          checked={exportScope === "PAGE"}
                          onChange={() => setExportScope("PAGE")}
                        />
                        <span>Current page records ({pageRows.length})</span>
                      </label>
                      <label className={cn("flex items-center gap-2", selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}>
                        <input
                          type="radio"
                          name="exportScope"
                          value="SELECTED"
                          disabled={selectedIds.size === 0}
                          checked={exportScope === "SELECTED"}
                          onChange={() => setExportScope("SELECTED")}
                        />
                        <span>Selected records only ({selectedIds.size})</span>
                      </label>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                      <AppButton size="sm" variant="outline" onClick={exportToExcel} leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-success" />}>
                        Excel
                      </AppButton>
                      <AppButton size="sm" variant="outline" onClick={exportToPDF} leftIcon={<FileText className="h-3.5 w-3.5 text-danger" />}>
                        PDF
                      </AppButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Filter Controls */}
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
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

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

      {/* Active Filter Chips Bar */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-surface/80 rounded-lg border border-border text-xs">
          <span className="text-[11px] font-semibold text-muted mr-1">Active filters:</span>

          {query && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Search: &ldquo;{query}&rdquo;
              <button type="button" onClick={() => setQuery("")} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {kpiCard && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              Card: {kpiCard}
              <button type="button" onClick={() => setKpiCard(null)} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {scopes.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Scope: {s}
              <button type="button" onClick={() => setScopes((p) => p.filter((x) => x !== s))} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {statuses.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Status: {s}
              <button type="button" onClick={() => setStatuses((p) => p.filter((x) => x !== s))} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {priorities.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Priority: {p}
              <button type="button" onClick={() => setPriorities((prev) => prev.filter((x) => x !== p))} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {departments.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Dept: {d}
              <button type="button" onClick={() => setDepartments((p) => p.filter((x) => x !== d))} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {categories.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Category: {c}
              <button type="button" onClick={() => setCategories((p) => p.filter((x) => x !== c))} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {assignees.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
              Assignee: {a}
              <button type="button" onClick={() => setAssignees((p) => p.filter((x) => x !== a))} className="hover:text-danger">
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

          <button type="button" onClick={resetFilters} className="ml-auto text-xs font-semibold text-danger hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Select All Across Pages Banner */}
      {isAllPageSelected && filtered.length > pageRows.length && (
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs">
          <span>
            {isSelectAllFiltered
              ? `All ${filtered.length} tickets matching filters are selected.`
              : `All ${pageRows.length} tickets on this page are selected.`}
          </span>
          {!isSelectAllFiltered ? (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="font-bold text-primary hover:underline ml-2"
            >
              Select all {filtered.length} tickets across all pages
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-danger hover:underline ml-2"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Selected Records Status Bar */}
      {selectedIds.size > 0 && !isAllPageSelected && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-sunken rounded-lg border border-border text-xs">
          <span className="font-semibold text-foreground">
            {selectedIds.size} {selectedIds.size === 1 ? "ticket" : "tickets"} selected
          </span>
          <button type="button" onClick={handleClearSelection} className="text-danger hover:underline">
            Deselect all
          </button>
        </div>
      )}

      {truncated && (
        <p className="text-xs text-warning">Showing the newest 10,000 tickets. Narrow the filters to see older ones.</p>
      )}

      {/* Report Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No tickets to report yet" : "No tickets match these filters"}
          description={rows.length === 0 ? "Tickets you can see will appear here." : "Change or clear the filters."}
          action={hasFilters ? <AppButton size="sm" variant="outline" onClick={resetFilters}>Clear filters</AppButton> : undefined}
        />
      ) : (
        <div className="space-y-2">
          <AppTableContainer maxHeight="calc(100vh - 360px)">
            <AppTable>
              <AppTableHeader>
                <AppTableRow>
                  {/* Select All Checkbox Head */}
                  <AppTableHead style={{ width: 44, position: "sticky", top: 0, left: 0, zIndex: 40 }} className="bg-elevated border-b border-border px-3 py-2">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectPage}
                      aria-label="Select all on this page"
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </AppTableHead>

                  {visibleColumns.map((c, i) => (
                    <AppTableHead
                      key={c.key}
                      style={{
                        minWidth: c.width,
                        position: "sticky",
                        top: 0,
                        left: i === 0 ? 44 : undefined,
                        zIndex: i === 0 ? 30 : 20,
                      }}
                      className="bg-elevated border-b border-border px-3 py-2 text-foreground whitespace-nowrap"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-xs">{c.label}</span>
                        <input
                          type="text"
                          value={columnFilters[c.key] || ""}
                          onChange={(e) => setColumnFilters((prev) => ({ ...prev, [c.key]: e.target.value }))}
                          placeholder={`Filter ${c.label}…`}
                          aria-label={`Filter ${c.label}`}
                          className="w-full text-[11px] font-normal px-2 py-0.5 rounded border border-border bg-surface text-foreground focus:outline-none focus:border-primary placeholder:text-muted"
                        />
                      </div>
                    </AppTableHead>
                  ))}
                </AppTableRow>
              </AppTableHeader>

              <AppTableBody>
                {pageRows.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <AppTableRow
                      key={r.id}
                      onClick={() => handleOpenTicket(r.id)}
                      className={cn("cursor-pointer hover:bg-surface-hover", isSelected && "bg-primary/5")}
                      title={`Open ${r.code}`}
                    >
                      {/* Checkbox cell */}
                      <AppTableCell
                        style={{ position: "sticky", left: 0, zIndex: 25 }}
                        className="bg-surface px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(r.id)}
                          aria-label={`Select ticket ${r.code}`}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </AppTableCell>

                      {visibleColumns.map((c, i) => (
                        <AppTableCell
                          key={c.key}
                          style={i === 0 ? { position: "sticky", left: 44, zIndex: 10 } : undefined}
                          className={`px-3 py-2 text-xs ${i === 0 ? "bg-surface" : ""} ${
                            c.kind === "date" || c.key === "code" ? "whitespace-nowrap" : ""
                          }`}
                        >
                          {c.key === "code" ? (
                            <Link
                              href={`/tickets/${r.id}?from=reports`}
                              onClick={(e) => {
                                e.stopPropagation();
                                saveStateToSession();
                              }}
                              className="font-mono font-semibold text-primary hover:underline"
                            >
                              {r.code}
                            </Link>
                          ) : c.kind === "badge" && r[c.key] ? (
                            <AppBadge
                              size="sm"
                              customColor={c.key === "status" ? r.status_color : c.key === "priority" ? r.priority_color : null}
                            >
                              {cellText(c, r)}
                            </AppBadge>
                          ) : c.key === "title" || c.key === "description" ? (
                            <span className="line-clamp-2" title={cellText(c, r)}>
                              {cellText(c, r)}
                            </span>
                          ) : (
                            cellText(c, r)
                          )}
                        </AppTableCell>
                      ))}
                    </AppTableRow>
                  );
                })}
              </AppTableBody>
            </AppTable>
          </AppTableContainer>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-subtle">
            <div className="flex items-center gap-2">
              <span>Showing {pageStart + 1}–{Math.min(filtered.length, pageStart + pageSize)} of {filtered.length} tickets</span>
              <span className="text-muted">|</span>
              <label className="flex items-center gap-1 text-muted">
                Rows per page:
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-6 px-1.5 rounded border border-border bg-surface text-foreground"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Previous
              </AppButton>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Next
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
