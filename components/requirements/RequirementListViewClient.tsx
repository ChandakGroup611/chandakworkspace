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
  ChevronDown,
  Layers,
  LayoutList,
  Clock,
  Eye,
  Edit2,
  Check,
  Printer
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
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
import { useSavedFilters, SavedFilter } from "@/hooks/useSavedFilters";
import { SavedFiltersDropdown } from "@/components/ui/SavedFiltersDropdown";
import { StatusBadge, PriorityIndicator, UserCell } from "@/components/ui/data";
import { RequirementPrintModal } from "@/components/requirements/RequirementPrintModal";
import { cn } from "@/lib/utils";

type RequirementRow = any;

type ColumnKey =
  | "code"
  | "title"
  | "system_name"
  | "module_name"
  | "department_name"
  | "priority_name"
  | "status_name"
  | "task_count"
  | "task_summary"
  | "requester_name"
  | "assignee_name"
  | "due_date"
  | "due_days"
  | "created_at"
  | "updated_at";

interface ReportColumn {
  key: ColumnKey;
  label: string;
  kind: "text" | "date" | "badge" | "number";
  defaultVisible: boolean;
  width: number;
}

const COLUMNS: ReportColumn[] = [
  { key: "code", label: "Req #", kind: "text", defaultVisible: true, width: 110 },
  { key: "title", label: "Title", kind: "text", defaultVisible: true, width: 260 },
  { key: "system_name", label: "System / Asset", kind: "text", defaultVisible: true, width: 140 },
  { key: "module_name", label: "Module", kind: "text", defaultVisible: false, width: 130 },
  { key: "department_name", label: "Department", kind: "text", defaultVisible: true, width: 140 },
  { key: "priority_name", label: "Priority", kind: "badge", defaultVisible: true, width: 110 },
  { key: "status_name", label: "Approval Status", kind: "badge", defaultVisible: true, width: 140 },
  { key: "task_count", label: "Tasks", kind: "number", defaultVisible: true, width: 90 },
  { key: "task_summary", label: "Tasks Status", kind: "text", defaultVisible: true, width: 150 },
  { key: "requester_name", label: "Requester", kind: "text", defaultVisible: true, width: 140 },
  { key: "assignee_name", label: "Approver/Assignee", kind: "text", defaultVisible: true, width: 150 },
  { key: "due_date", label: "Due Date", kind: "date", defaultVisible: true, width: 110 },
  { key: "due_days", label: "Due Timeline", kind: "text", defaultVisible: false, width: 140 },
  { key: "created_at", label: "Created On", kind: "date", defaultVisible: true, width: 110 },
  { key: "updated_at", label: "Last Updated", kind: "date", defaultVisible: false, width: 110 },
];

const COLUMN_STORAGE_KEY = "chandak_requirement_reports_columns_v1";
const REPORT_STATE_STORAGE_KEY = "chandak_requirement_reports_state_v1";

interface ReqReportFilterPayload {
  query: string;
  systems: string[];
  departments: string[];
  statuses: string[];
  priorities: string[];
  assignees: string[];
  requesters: string[];
  kpiCard: null | "PENDING" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "OVERDUE" | "WITH_TASKS";
  dateMode: "CREATED" | "DUE" | "BOTH";
  createdFrom: string;
  createdTo: string;
  dueFrom: string;
  dueTo: string;
}

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

function cellText(col: ReportColumn, row: RequirementRow): string {
  const v = row[col.key];
  if (col.kind === "date") return formatDate(v as string | null);
  if (col.kind === "number") return v === null || v === undefined ? "—" : String(v);
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default function RequirementListViewClient({ initialReqs }: { initialReqs: RequirementRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, roleCode } = usePermissions();
  const canExport =
    roleCode === "SUPER_ADMIN" || hasPermission("REQUIREMENTS_MANAGE") || hasPermission("REPORTS_EXPORT");

  const [reqs, setReqs] = useState<RequirementRow[]>(initialReqs || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters State
  const [query, setQuery] = useState("");
  const [systems, setSystems] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [requesters, setRequesters] = useState<string[]>([]);

  // Interactive KPI Card Filter
  const [kpiCard, setKpiCard] = useState<null | "PENDING" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "OVERDUE" | "WITH_TASKS">(null);

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
  const [printTargetReq, setPrintTargetReq] = useState<any | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Columns Chooser
  const [visibleKeys, setVisibleKeys] = useState<ColumnKey[]>(
    COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [colSearchQuery, setColSearchQuery] = useState("");

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Restore columns choice from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        const keys = (JSON.parse(saved) as string[]).filter((k) => COLUMNS.some((c) => c.key === k)) as ColumnKey[];
        if (keys.length) setVisibleKeys(keys);
      }
    } catch { }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleKeys));
    } catch { }
  }, [visibleKeys]);

  // Current user resolution
  useEffect(() => {
    async function getUser() {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      } catch (e) { }
    }
    getUser();
  }, []);

  // Restore filter state from sessionStorage (for Back to Reports workflow)
  useEffect(() => {
    try {
      const savedState = window.sessionStorage.getItem(REPORT_STATE_STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.query !== undefined) setQuery(parsed.query);
        if (parsed.systems) setSystems(parsed.systems);
        if (parsed.departments) setDepartments(parsed.departments);
        if (parsed.statuses) setStatuses(parsed.statuses);
        if (parsed.priorities) setPriorities(parsed.priorities);
        if (parsed.assignees) setAssignees(parsed.assignees);
        if (parsed.requesters) setRequesters(parsed.requesters);
        if (parsed.kpiCard !== undefined) setKpiCard(parsed.kpiCard);
        if (parsed.dateMode) setDateMode(parsed.dateMode);
        if (parsed.createdFrom !== undefined) setCreatedFrom(parsed.createdFrom);
        if (parsed.createdTo !== undefined) setCreatedTo(parsed.createdTo);
        if (parsed.dueFrom !== undefined) setDueFrom(parsed.dueFrom);
        if (parsed.dueTo !== undefined) setDueTo(parsed.dueTo);
        if (parsed.currentPage) setCurrentPage(parsed.currentPage);
      }
    } catch { }
  }, []);

  // Save filter state to sessionStorage
  const saveStateToSession = useCallback(() => {
    try {
      const stateObj = {
        query,
        systems,
        departments,
        statuses,
        priorities,
        assignees,
        requesters,
        kpiCard,
        dateMode,
        createdFrom,
        createdTo,
        dueFrom,
        dueTo,
        currentPage,
      };
      window.sessionStorage.setItem(REPORT_STATE_STORAGE_KEY, JSON.stringify(stateObj));
    } catch { }
  }, [query, systems, departments, statuses, priorities, assignees, requesters, kpiCard, dateMode, createdFrom, createdTo, dueFrom, dueTo, currentPage]);

  useEffect(() => {
    saveStateToSession();
  }, [saveStateToSession]);

  // Date validation
  useEffect(() => {
    if (createdFrom && createdTo && createdFrom > createdTo) {
      setDateError("Created 'From' date cannot be later than 'To' date");
    } else if (dueFrom && dueTo && dueFrom > dueTo) {
      setDateError("Due 'From' date cannot be later than 'To' date");
    } else {
      setDateError(null);
    }
  }, [createdFrom, createdTo, dueFrom, dueTo]);

  // Saved Filters Integration
  const currentPayload: ReqReportFilterPayload = useMemo(() => ({
    query,
    systems,
    departments,
    statuses,
    priorities,
    assignees,
    requesters,
    kpiCard,
    dateMode,
    createdFrom,
    createdTo,
    dueFrom,
    dueTo,
  }), [query, systems, departments, statuses, priorities, assignees, requesters, kpiCard, dateMode, createdFrom, createdTo, dueFrom, dueTo]);

  const resetAllFilters = useCallback(() => {
    setQuery("");
    setSystems([]);
    setDepartments([]);
    setStatuses([]);
    setPriorities([]);
    setAssignees([]);
    setRequesters([]);
    setKpiCard(null);
    setCreatedFrom("");
    setCreatedTo("");
    setDueFrom("");
    setDueTo("");
    setDateError(null);
    setColumnFilters({});
    setSelectedIds(new Set());
    setIsSelectAllFiltered(false);
    setCurrentPage(1);
    try {
      window.sessionStorage.removeItem(REPORT_STATE_STORAGE_KEY);
    } catch { }
  }, []);

  const {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    updateSavedFilter,
    applySavedFilter,
    deleteSavedFilter
  } = useSavedFilters<ReqReportFilterPayload>(
    "chandak_req_reports_v1",
    currentUserId,
    (payload) => {
      setQuery(payload.query || "");
      setSystems(payload.systems || []);
      setDepartments(payload.departments || []);
      setStatuses(payload.statuses || []);
      setPriorities(payload.priorities || []);
      setAssignees(payload.assignees || []);
      setRequesters(payload.requesters || []);
      setKpiCard(payload.kpiCard || null);
      setDateMode(payload.dateMode || "CREATED");
      setCreatedFrom(payload.createdFrom || "");
      setCreatedTo(payload.createdTo || "");
      setDueFrom(payload.dueFrom || "");
      setDueTo(payload.dueTo || "");
      setCurrentPage(1);
    }
  );

  const handleApplySavedFilter = (f: SavedFilter<ReqReportFilterPayload>) => {
    applySavedFilter(
      f,
      (payload) => {
        setQuery(payload.query || "");
        setSystems(payload.systems || []);
        setDepartments(payload.departments || []);
        setStatuses(payload.statuses || []);
        setPriorities(payload.priorities || []);
        setAssignees(payload.assignees || []);
        setRequesters(payload.requesters || []);
        setKpiCard(payload.kpiCard || null);
        setDateMode(payload.dateMode || "CREATED");
        setCreatedFrom(payload.createdFrom || "");
        setCreatedTo(payload.createdTo || "");
        setDueFrom(payload.dueFrom || "");
        setDueTo(payload.dueTo || "");
        setCurrentPage(1);
      },
      resetAllFilters
    );
  };

  // Overdue check
  const today = istDay(new Date().toISOString());
  const isOverdue = useCallback((r: RequirementRow) => {
    const s = (r.status_name || "").toLowerCase();
    if (s.includes("approved") || s.includes("closed") || s.includes("rejected") || s.includes("cancelled")) return false;
    if (r.overdue_days && r.overdue_days > 0) return true;
    if (r.due_date && istDay(r.due_date) < today) return true;
    return false;
  }, [today]);

  // KPI Metrics
  const countPending = useMemo(() => reqs.filter(r => (r.status_name || "").toLowerCase().includes("pending")).length, [reqs]);
  const countApproved = useMemo(() => reqs.filter(r => (r.status_name || "").toLowerCase().includes("approved") || (r.status_name || "").toLowerCase() === "closed").length, [reqs]);
  const countInProgress = useMemo(() => reqs.filter(r => {
    const s = (r.status_name || "").toLowerCase();
    return s.includes("in progress") || s.includes("development") || s.includes("uat");
  }).length, [reqs]);
  const countRejected = useMemo(() => reqs.filter(r => {
    const s = (r.status_name || "").toLowerCase();
    return s.includes("rejected") || s.includes("hold") || s.includes("cancelled");
  }).length, [reqs]);
  const countOverdue = useMemo(() => reqs.filter(isOverdue).length, [reqs, isOverdue]);
  const countWithTasks = useMemo(() => reqs.filter(r => r.task_count && r.task_count > 0).length, [reqs]);

  // Multi-select option lists
  const systemOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.system_name && r.system_name !== "—") set.add(r.system_name); });
    return Array.from(set).sort().map(s => ({ value: s, label: s }));
  }, [reqs]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.department_name && r.department_name !== "—") set.add(r.department_name); });
    return Array.from(set).sort().map(d => ({ value: d, label: d }));
  }, [reqs]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => {
      const b = (r.status_name || "").split(" · ")[0];
      if (b && b !== "—") set.add(b);
    });
    return Array.from(set).sort().map(s => ({ value: s, label: s }));
  }, [reqs]);

  const priorityOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.priority_name && r.priority_name !== "—") set.add(r.priority_name); });
    return Array.from(set).sort().map(p => ({ value: p, label: p }));
  }, [reqs]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>(["Unassigned"]);
    reqs.forEach(r => {
      if (r.assignee_name && r.assignee_name !== "—") set.add(r.assignee_name);
    });
    return Array.from(set)
      .sort((a, b) => (a === "Unassigned" ? -1 : b === "Unassigned" ? 1 : a.localeCompare(b)))
      .map(a => ({ value: a, label: a }));
  }, [reqs]);

  const requesterOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.requester_name && r.requester_name !== "—") set.add(r.requester_name); });
    return Array.from(set).sort().map(u => ({ value: u, label: u }));
  }, [reqs]);

  // Combined Filtered Dataset
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return reqs.filter((r) => {
      // 1. Text Search
      if (q) {
        const fullText = `${r.code || ""} ${r.title || ""} ${r.department_name || ""} ${r.system_name || ""} ${r.objective || ""}`.toLowerCase();
        if (!fullText.includes(q)) return false;
      }

      // 2. Interactive KPI Card
      if (kpiCard === "PENDING") {
        if (!r.status_name?.toLowerCase().includes("pending")) return false;
      } else if (kpiCard === "APPROVED") {
        if (!r.status_name?.toLowerCase().includes("approved") && r.status_name?.toLowerCase() !== "closed") return false;
      } else if (kpiCard === "IN_PROGRESS") {
        const s = (r.status_name || "").toLowerCase();
        if (!s.includes("in progress") && !s.includes("development") && !s.includes("uat")) return false;
      } else if (kpiCard === "REJECTED") {
        const s = (r.status_name || "").toLowerCase();
        if (!s.includes("rejected") && !s.includes("hold") && !s.includes("cancelled")) return false;
      } else if (kpiCard === "OVERDUE") {
        if (!isOverdue(r)) return false;
      } else if (kpiCard === "WITH_TASKS") {
        if (!r.task_count || r.task_count === 0) return false;
      }

      // 3. Multi-Select Filters
      if (systems.length > 0 && !systems.includes(r.system_name)) return false;
      if (departments.length > 0 && !departments.includes(r.department_name)) return false;
      if (statuses.length > 0) {
        const b = (r.status_name || "").split(" · ")[0];
        if (!statuses.includes(b)) return false;
      }
      if (priorities.length > 0 && !priorities.includes(r.priority_name)) return false;
      if (assignees.length > 0) {
        const aName = r.assignee_name || "Unassigned";
        if (!assignees.includes(aName)) return false;
      }
      if (requesters.length > 0 && !requesters.includes(r.requester_name)) return false;

      // 4. Date Filtering
      if (dateMode === "CREATED" || dateMode === "BOTH") {
        const createdDay = istDay(r.created_at);
        if (createdFrom && (!createdDay || createdDay < createdFrom)) return false;
        if (createdTo && (!createdDay || createdDay > createdTo)) return false;
      }
      if (dateMode === "DUE" || dateMode === "BOTH") {
        if (dueFrom || dueTo) {
          if (!r.due_date) return false;
          const dueDay = istDay(r.due_date);
          if (dueFrom && (!dueDay || dueDay < dueFrom)) return false;
          if (dueTo && (!dueDay || dueDay > dueTo)) return false;
        }
      }

      // 5. Per-column header search filters
      for (const [key, val] of Object.entries(columnFilters)) {
        if (!val) continue;
        const col = COLUMNS.find((c) => c.key === key);
        if (!col) continue;
        const cell = cellText(col, r).toLowerCase();
        if (!cell.includes(val.toLowerCase())) return false;
      }

      return true;
    });
  }, [reqs, query, kpiCard, systems, departments, statuses, priorities, assignees, requesters, dateMode, createdFrom, createdTo, dueFrom, dueTo, columnFilters, isOverdue]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setIsSelectAllFiltered(false);
  }, [query, systems, departments, statuses, priorities, assignees, requesters, kpiCard, dateMode, createdFrom, createdTo, dueFrom, dueTo, columnFilters]);

  // Pagination slicing
  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const pageStart = (currentPageClamped - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalRecords);
  const pagedRows = useMemo(() => filteredRows.slice(pageStart, pageEnd), [filteredRows, pageStart, pageEnd]);

  // Visible columns selection
  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys]
  );

  // Selection Logic
  const allPageIds = useMemo(() => pagedRows.map((r) => r.id), [pagedRows]);
  const isAllPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const isPageIndeterminate =
    allPageIds.some((id) => selectedIds.has(id)) && !isAllPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isPageIndeterminate;
    }
  }, [isPageIndeterminate]);

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsSelectAllFiltered(false);
  };

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
    setIsSelectAllFiltered(false);
  };

  const handleSelectAllFiltered = () => {
    setIsSelectAllFiltered(true);
    const allFilteredIds = new Set(filteredRows.map((r) => r.id));
    setSelectedIds(allFilteredIds);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectAllFiltered(false);
  };

  const selectedCount = isSelectAllFiltered ? filteredRows.length : selectedIds.size;

  // Navigation into requirement details with state preservation
  const handleViewRequirement = (dbId: string) => {
    saveStateToSession();
    router.push(`/requirements/${dbId}?from=reports&mode=view`);
  };

  const handleEditRequirement = (dbId: string) => {
    saveStateToSession();
    router.push(`/requirements/${dbId}?from=reports&tab=analysis`);
  };

  // Determine export rows
  const rowsToExport = useMemo(() => {
    if (isSelectAllFiltered) return filteredRows;
    if (selectedIds.size > 0) return reqs.filter((r) => selectedIds.has(r.id));
    return filteredRows;
  }, [isSelectAllFiltered, selectedIds, reqs, filteredRows]);

  const exportScopeLabel = useMemo(() => {
    if (isSelectAllFiltered) return `All ${filteredRows.length} matching requirements`;
    if (selectedIds.size > 0) return `${selectedIds.size} selected requirements`;
    return `All ${filteredRows.length} filtered requirements`;
  }, [isSelectAllFiltered, selectedIds, filteredRows.length]);

  // Export to Excel
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Chandak Workspace";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Requirements Analysis");

    // Title Row
    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "CHANDAK WORKSPACE — REQUIREMENT ANALYSIS & REPORTS";
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    // Subtitle Row
    sheet.mergeCells("A2:G2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Scope: ${exportScopeLabel} | Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
    subCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF475569" } };
    sheet.getRow(2).height = 18;

    // Header Row
    const headerCols = visibleColumns;
    const headerRow = sheet.getRow(4);
    headerRow.height = 24;
    headerCols.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label;
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: col.kind === "number" ? "right" : "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Data Rows
    rowsToExport.forEach((r, rowIdx) => {
      const dataRow = sheet.getRow(5 + rowIdx);
      dataRow.height = 20;
      headerCols.forEach((col, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        const text = cellText(col, r);
        cell.value = text;
        cell.font = { name: "Segoe UI", size: 9 };
        cell.alignment = { vertical: "middle", horizontal: col.kind === "number" ? "right" : "left" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (rowIdx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });
    });

    // Auto-fit column widths
    headerCols.forEach((col, idx) => {
      sheet.getColumn(idx + 1).width = Math.max(col.width / 8, 14);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Requirements_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CHANDAK WORKSPACE — REQUIREMENT REPORTS", 40, 36);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Scope: ${exportScopeLabel} | Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, 40, 52);

    const head = [visibleColumns.map((c) => c.label)];
    const body = rowsToExport.map((r) => visibleColumns.map((c) => cellText(c, r)));

    autoTable(doc, {
      head,
      body,
      startY: 64,
      styles: { fontSize: 8, cellPadding: 4, font: "helvetica" },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`Requirements_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const isFiltersActive = Boolean(
    query ||
    kpiCard ||
    systems.length ||
    departments.length ||
    statuses.length ||
    priorities.length ||
    assignees.length ||
    requesters.length ||
    createdFrom ||
    createdTo ||
    dueFrom ||
    dueTo ||
    Object.keys(columnFilters).length
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-heading">Requirement Reports</h1>
          <p className="text-xs text-muted">Analysis, status tracking, and SLA auditing across workspace requirements</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Saved Filters Dropdown */}
          <SavedFiltersDropdown<ReqReportFilterPayload>
            savedFilters={savedFilters}
            activeSavedFilterId={activeSavedFilterId}
            onSaveCurrent={() => saveCurrentFilter(currentPayload)}
            onApplyFilter={handleApplySavedFilter}
            onDeleteFilter={deleteSavedFilter}
            onUpdateFilter={updateSavedFilter}
            currentPayload={currentPayload}
          />

          {/* Column Chooser Popover */}
          <Popover.Root open={columnsOpen} onOpenChange={setColumnsOpen}>
            <Popover.Trigger asChild>
              <AppButton
                variant="secondary"
                aria-label="Customize columns"
                className="gap-1.5"
                leftIcon={<Columns3 className="h-4 w-4" />}
              >
                Columns
                <span className="rounded-full bg-accent-soft px-1.5 py-0.2 text-[11px] font-semibold text-accent-soft-text">
                  {visibleColumns.length}/{COLUMNS.length}
                </span>
              </AppButton>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                className="z-[var(--z-popover)] w-64 rounded-xl border border-border bg-elevated p-3 shadow-md outline-none space-y-2"
              >
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <span className="text-xs font-semibold text-heading">Choose columns</span>
                  <button
                    type="button"
                    onClick={() => setVisibleKeys(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Reset default
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={colSearchQuery}
                    onChange={(e) => setColSearchQuery(e.target.value)}
                    placeholder="Search columns..."
                    className="h-7 w-full rounded border border-border bg-surface pl-7 pr-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {COLUMNS.filter(c => c.label.toLowerCase().includes(colSearchQuery.toLowerCase())).map((col) => {
                    const isChecked = visibleKeys.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-surface cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (visibleKeys.length > 1) {
                                setVisibleKeys(visibleKeys.filter((k) => k !== col.key));
                              }
                            } else {
                              setVisibleKeys([...visibleKeys, col.key]);
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-border text-primary"
                        />
                        <span className="text-foreground">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Export Actions with Scope Indicator */}
          {canExport && (
            <div className="flex items-center gap-1.5">
              <AppButton
                variant="secondary"
                onClick={handleExportExcel}
                title={`Export to Excel (${exportScopeLabel})`}
                leftIcon={<FileSpreadsheet className="h-4 w-4 text-success-text" />}
              >
                Excel
              </AppButton>
              <AppButton
                variant="secondary"
                onClick={handleExportPDF}
                title={`Export to PDF (${exportScopeLabel})`}
                leftIcon={<FileText className="h-4 w-4 text-danger-text" />}
              >
                PDF
              </AppButton>
            </div>
          )}

          <AppButton
            variant="ghost"
            onClick={resetAllFilters}
            aria-label="Reset all filters"
            title="Reset all filters"
            className="text-muted hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      {/* Interactive KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setKpiCard(null)}
          className={cn(
            "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
            kpiCard === null
              ? "bg-elevated border-primary/40 ring-1 ring-primary/40 shadow-xs"
              : "bg-surface border-border hover:border-border-active hover:bg-surface-hover"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11.5px] font-semibold text-muted uppercase tracking-wider">Total</span>
            <div className="rounded-lg p-1.5 bg-accent-soft text-theme-icon">
              <LayoutList className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground">{reqs.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard(prev => prev === "PENDING" ? null : "PENDING")}
          className={cn(
            "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
            kpiCard === "PENDING"
              ? "bg-elevated border-warning/50 ring-1 ring-warning/50 shadow-xs"
              : "bg-surface border-border hover:border-warning/30 hover:bg-surface-hover"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11.5px] font-semibold text-warning-text uppercase tracking-wider">Pending</span>
            <div className="rounded-lg p-1.5 bg-warning-soft text-warning-text">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-warning-text">{countPending}</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard(prev => prev === "APPROVED" ? null : "APPROVED")}
          className={cn(
            "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
            kpiCard === "APPROVED"
              ? "bg-elevated border-success/50 ring-1 ring-success/50 shadow-xs"
              : "bg-surface border-border hover:border-success/30 hover:bg-surface-hover"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11.5px] font-semibold text-success-text uppercase tracking-wider">Approved</span>
            <div className="rounded-lg p-1.5 bg-success-soft text-success-text">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-success-text">{countApproved}</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard(prev => prev === "IN_PROGRESS" ? null : "IN_PROGRESS")}
          className={cn(
            "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
            kpiCard === "IN_PROGRESS"
              ? "bg-elevated border-accent-soft-text/50 ring-1 ring-accent-soft-text/50 shadow-xs"
              : "bg-surface border-border hover:border-accent-soft-text/30 hover:bg-surface-hover"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11.5px] font-semibold text-accent-soft-text uppercase tracking-wider">In Progress</span>
            <div className="rounded-lg p-1.5 bg-accent-soft text-accent-soft-text">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-accent-soft-text">{countInProgress}</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard(prev => prev === "OVERDUE" ? null : "OVERDUE")}
          className={cn(
            "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
            kpiCard === "OVERDUE"
              ? "bg-elevated border-purple-500/50 ring-1 ring-purple-500/50 shadow-xs"
              : "bg-surface border-border hover:border-purple-500/30 hover:bg-surface-hover"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11.5px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Overdue</span>
            <div className="rounded-lg p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">{countOverdue}</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiCard(prev => prev === "WITH_TASKS" ? null : "WITH_TASKS")}
          className={cn(
            "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
            kpiCard === "WITH_TASKS"
              ? "bg-elevated border-primary/50 ring-1 ring-primary/50 shadow-xs"
              : "bg-surface border-border hover:border-primary/30 hover:bg-surface-hover"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11.5px] font-semibold text-theme-icon uppercase tracking-wider">With Tasks</span>
            <div className="rounded-lg p-1.5 bg-accent-soft text-theme-icon">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-theme-icon">{countWithTasks}</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="theme-card-structural space-y-3 p-3">
        {/* Row 1: Search & Multi-Select Dropdowns */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Code, title, system..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8.5 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              System / Asset
            </label>
            <MultiSelectFilter
              options={systemOptions}
              selectedValues={systems}
              onChange={setSystems}
              placeholder="All systems"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              Department
            </label>
            <MultiSelectFilter
              options={departmentOptions}
              selectedValues={departments}
              onChange={setDepartments}
              placeholder="All depts"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              Approval Status
            </label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={statuses}
              onChange={setStatuses}
              placeholder="All statuses"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              Priority
            </label>
            <MultiSelectFilter
              options={priorityOptions}
              selectedValues={priorities}
              onChange={setPriorities}
              placeholder="All priorities"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              Assignee
            </label>
            <MultiSelectFilter
              options={assigneeOptions}
              selectedValues={assignees}
              onChange={setAssignees}
              placeholder="All assignees"
            />
          </div>
        </div>

        {/* Row 2: Date Filtering */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted" />
            <span className="font-semibold text-muted text-[11.5px] uppercase tracking-wider">Date Mode:</span>
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(["CREATED", "DUE", "BOTH"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDateMode(mode)}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] font-medium rounded-md transition-colors",
                    dateMode === mode
                      ? "bg-accent-soft text-accent-soft-text font-semibold shadow-2xs"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {mode === "CREATED" ? "Created date" : mode === "DUE" ? "Due date" : "Both dates"}
                </button>
              ))}
            </div>
          </div>

          {(dateMode === "CREATED" || dateMode === "BOTH") && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted text-[11.5px]">Created:</span>
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted text-[11.5px]">to</span>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {(dateMode === "DUE" || dateMode === "BOTH") && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted text-[11.5px]">Due:</span>
              <input
                type="date"
                value={dueFrom}
                onChange={(e) => setDueFrom(e.target.value)}
                className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted text-[11.5px]">to</span>
              <input
                type="date"
                value={dueTo}
                onChange={(e) => setDueTo(e.target.value)}
                className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {(createdFrom || createdTo || dueFrom || dueTo) && (
            <button
              type="button"
              onClick={() => { setCreatedFrom(""); setCreatedTo(""); setDueFrom(""); setDueTo(""); setDateError(null); }}
              className="text-[11.5px] text-muted hover:text-foreground underline ml-auto"
            >
              Reset dates
            </button>
          )}

          {dateError && (
            <div className="flex items-center gap-1 text-[11.5px] text-danger-text w-full">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{dateError}</span>
            </div>
          )}
        </div>

        {/* Active Filter Chips */}
        {isFiltersActive && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted mr-1">Active:</span>

            {query && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11.5px] text-accent-soft-text">
                Search: &ldquo;{query}&rdquo;
                <button type="button" onClick={() => setQuery("")} className="hover:text-foreground"><X className="h-3 w-3" /></button>
              </span>
            )}

            {kpiCard && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11.5px] text-accent-soft-text font-semibold">
                Card: {kpiCard.replace("_", " ")}
                <button type="button" onClick={() => setKpiCard(null)} className="hover:text-foreground"><X className="h-3 w-3" /></button>
              </span>
            )}

            {systems.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                System: {s}
                <button type="button" onClick={() => setSystems((prev) => prev.filter((x) => x !== s))} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            ))}

            {departments.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                Dept: {d}
                <button type="button" onClick={() => setDepartments((prev) => prev.filter((x) => x !== d))} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            ))}

            {statuses.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                Status: {s}
                <button type="button" onClick={() => setStatuses((prev) => prev.filter((x) => x !== s))} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            ))}

            {priorities.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                Priority: {p}
                <button type="button" onClick={() => setPriorities((prev) => prev.filter((x) => x !== p))} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            ))}

            {assignees.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                Assignee: {a}
                <button type="button" onClick={() => setAssignees((prev) => prev.filter((x) => x !== a))} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            ))}

            {(createdFrom || createdTo) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                Created: {createdFrom || "start"} → {createdTo || "now"}
                <button type="button" onClick={() => { setCreatedFrom(""); setCreatedTo(""); }} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            )}

            {(dueFrom || dueTo) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                Due: {dueFrom || "start"} → {dueTo || "now"}
                <button type="button" onClick={() => { setDueFrom(""); setDueTo(""); }} className="hover:text-danger-text"><X className="h-3 w-3" /></button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Select-All Across Pages Banner */}
      {isAllPageSelected && totalRecords > pageSize && (
        <div className="flex items-center justify-between rounded-lg border border-accent-soft-text/30 bg-accent-soft px-3 py-2 text-xs text-accent-soft-text">
          <span>
            {isSelectAllFiltered ? (
              <>All <strong>{totalRecords}</strong> requirements matching current filters are selected.</>
            ) : (
              <>All <strong>{pagedRows.length}</strong> requirements on this page are selected.</>
            )}
          </span>
          <div className="flex items-center gap-2">
            {!isSelectAllFiltered ? (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="font-semibold underline hover:text-foreground"
              >
                Select all {totalRecords} matching requirements
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClearSelection}
                className="font-semibold underline hover:text-foreground"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Report Table Viewport */}
      <div className="theme-card-structural overflow-hidden">
        {totalRecords === 0 ? (
          <EmptyState
            kind={isFiltersActive ? "no-results" : "empty"}
            title={isFiltersActive ? "No requirements match these filters" : "No requirement records available"}
            description={isFiltersActive ? "Clear a filter or search with different keywords." : "Requirements will appear here once registered."}
            action={isFiltersActive ? (
              <AppButton variant="secondary" onClick={resetAllFilters}>
                Clear filters
              </AppButton>
            ) : undefined}
          />
        ) : (
          <>
            <AppTableContainer className="max-h-[60vh] overflow-auto">
              <AppTable>
                <AppTableHeader>
                  <AppTableRow>
                    {/* Checkbox Column */}
                    <AppTableHead className="w-10 text-center sticky top-0 bg-elevated z-30">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAllPage}
                        aria-label="Select all on this page"
                        className="h-3.5 w-3.5 rounded border-border text-primary cursor-pointer"
                      />
                    </AppTableHead>

                    {visibleColumns.map((col) => (
                      <AppTableHead
                        key={col.key}
                        className={cn(
                          "sticky top-0 bg-elevated z-25 text-xs font-semibold text-foreground px-3 py-2 select-none",
                          col.kind === "number" ? "text-right" : "text-left"
                        )}
                        style={{ minWidth: `${col.width}px` }}
                      >
                        <div className="flex flex-col gap-1.5">
                          <span>{col.label}</span>
                          <input
                            type="text"
                            value={columnFilters[col.key] || ""}
                            onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                            placeholder={`Filter ${col.label}...`}
                            className="h-6 w-full rounded border border-border bg-surface px-1.5 text-[11px] font-normal text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </AppTableHead>
                    ))}

                    <AppTableHead className="w-20 text-right sticky top-0 bg-elevated z-30 px-3">
                      Actions
                    </AppTableHead>
                  </AppTableRow>
                </AppTableHeader>

                <AppTableBody>
                  {pagedRows.map((r) => {
                    const isSelected = selectedIds.has(r.id);
                    const overdue = isOverdue(r);

                    return (
                      <AppTableRow
                        key={r.id}
                        className={cn(
                          "cursor-pointer hover:bg-surface-hover transition-colors",
                          isSelected && "bg-accent-soft/40"
                        )}
                        onClick={() => handleViewRequirement(r.id)}
                      >
                        {/* Row Checkbox */}
                        <AppTableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.id)}
                            aria-label={`Select ${r.code || r.id}`}
                            className="h-3.5 w-3.5 rounded border-border text-primary cursor-pointer"
                          />
                        </AppTableCell>

                        {/* Data Cells */}
                        {visibleColumns.map((col) => {
                          if (col.key === "code") {
                            return (
                              <AppTableCell key={col.key} className="whitespace-nowrap font-mono text-[12px] font-medium text-accent-soft-text">
                                <div className="flex items-center gap-1.5">
                                  <span>{r.code || r.id}</span>
                                  {overdue && (
                                    <span className="inline-flex items-center gap-0.5 rounded bg-danger-soft px-1 py-0.2 text-[9.5px] font-bold text-danger-text" title="Overdue">
                                      <Clock className="h-3 w-3" />
                                    </span>
                                  )}
                                </div>
                              </AppTableCell>
                            );
                          }
                          if (col.key === "title") {
                            return (
                              <AppTableCell key={col.key} className="max-w-[280px] truncate font-medium text-foreground" title={r.title}>
                                {r.title}
                              </AppTableCell>
                            );
                          }
                          if (col.key === "priority_name") {
                            return (
                              <AppTableCell key={col.key}>
                                {r.priority_name && r.priority_name !== "—" ? (
                                  <PriorityIndicator priority={r.priority_name} />
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </AppTableCell>
                            );
                          }
                          if (col.key === "status_name") {
                            return (
                              <AppTableCell key={col.key}>
                                <StatusBadge status={(r.status_name || "").split(" · ")[0]} />
                              </AppTableCell>
                            );
                          }
                          if (col.key === "task_count") {
                            return (
                              <AppTableCell key={col.key} className="text-right tabular text-subtle">
                                {r.task_count > 0 ? r.task_count : "—"}
                              </AppTableCell>
                            );
                          }
                          if (col.key === "task_summary") {
                            return (
                              <AppTableCell key={col.key} className="text-xs text-subtle whitespace-nowrap">
                                {r.task_summary || "No Tasks"}
                              </AppTableCell>
                            );
                          }
                          if (col.key === "due_date") {
                            return (
                              <AppTableCell key={col.key} className="whitespace-nowrap text-subtle tabular">
                                {r.due_date ? (
                                  <span className={overdue ? "font-semibold text-danger-text" : ""}>
                                    {formatDate(r.due_date)}
                                  </span>
                                ) : "—"}
                              </AppTableCell>
                            );
                          }
                          if (col.key === "created_at" || col.key === "updated_at") {
                            return (
                              <AppTableCell key={col.key} className="whitespace-nowrap text-subtle tabular">
                                {formatDate(r[col.key])}
                              </AppTableCell>
                            );
                          }
                          return (
                            <AppTableCell key={col.key} className="text-subtle text-xs whitespace-nowrap">
                              {r[col.key] || "—"}
                            </AppTableCell>
                          );
                        })}

                        {/* Actions */}
                        <AppTableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPrintTargetReq(r)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground"
                              title="Print Change Order"
                              aria-label={`Print requirement ${r.code || r.id}`}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewRequirement(r.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground"
                              title="View requirement"
                              aria-label={`View requirement ${r.code || r.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditRequirement(r.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground"
                              title="Edit requirement analysis"
                              aria-label={`Edit requirement analysis for ${r.code || r.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>

            {/* Pagination & Status Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong>{totalRecords > 0 ? pageStart + 1 : 0}</strong>–<strong>{pageEnd}</strong> of <strong>{totalRecords}</strong> requirements
                </span>
                {selectedCount > 0 && (
                  <span className="rounded bg-accent-soft px-2 py-0.5 text-accent-soft-text font-semibold">
                    {selectedCount} selected
                  </span>
                )}
                {canExport && (
                  <span className="hidden md:inline-block text-[11px] text-subtle font-medium">
                    (Export scope: {exportScopeLabel})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 rounded border border-border bg-surface px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <AppButton
                    variant="ghost"
                    size="icon"
                    aria-label="Previous page"
                    disabled={currentPageClamped <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-7 w-7"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </AppButton>
                  <span>
                    Page {currentPageClamped} of {totalPages}
                  </span>
                  <AppButton
                    variant="ghost"
                    size="icon"
                    aria-label="Next page"
                    disabled={currentPageClamped >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 w-7"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </AppButton>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {printTargetReq && (
        <RequirementPrintModal
          isOpen={!!printTargetReq}
          onClose={() => setPrintTargetReq(null)}
          requirement={printTargetReq}
        />
      )}
    </div>
  );
}