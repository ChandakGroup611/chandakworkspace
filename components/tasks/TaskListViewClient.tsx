// TODO(ui-v2): migrate to tokens
"use client";
/* eslint-disable no-restricted-syntax */
import { toast } from 'react-toastify';

import React, { useMemo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import SafeHtml from "@/components/ui/SafeHtml";
import { useVirtualizer } from '@tanstack/react-virtual';
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import {
  AppTableContainer,
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableRow,
  AppTableHead,
  AppTableCell
} from "@/components/ui/AppTable";
import { Loader2, Eye, Filter, Search, Users, Calendar, ArrowLeft, Download, FileText, FileSpreadsheet, Edit2, Trash2, Paperclip, Shield, Globe, Building2, UserCheck, MoreVertical } from "lucide-react";
import Link from "next/link";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { deleteTask, getTaskStatuses, updateTaskStatusInline, getDepartments, executeTaskBatchOperation, createTask } from "@/lib/actions/tasks";
import { fetchTasksByWorkspace, fetchAllTasks, fetchWorkspaces, fetchPriorities } from "@/lib/actions/workspaces";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalReportConfig, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import DynamicReportBuilder from "@/components/reports/DynamicReportBuilder";
import { Settings2, MessageSquare, ExternalLink, Plus, Upload, RotateCcw, LayoutList, Layers, CheckCircle2 } from "lucide-react";
import { HierarchyManager } from "@/lib/services/HierarchyManager";
import { HierarchyStateManager } from "@/lib/services/HierarchyStateManager";
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { WorkspaceFilterMultiSelect } from "@/components/workspaces/WorkspaceFilterMultiSelect";
import * as Popover from "@radix-ui/react-popover";

const getSafeExternalUrl = (url: string | undefined | null) => {
  if (!url) return '#';
  const str = String(url).trim();
  if (/^(https?|file|ftp|smb|mailto|tel):/i.test(str)) return str;
  return `https://${str}`;
};

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAllReportCustomFields } from "@/lib/actions/workspace_reports";
import dynamic from "next/dynamic";

const TaskCreationWizard = dynamic(() => import("@/components/tasks/TaskCreationWizard"), {
  ssr: false
});
const TaskBoardView = dynamic(() => import("@/components/tasks/TaskBoardView"), {
  ssr: false
});
const TaskTimelineView = dynamic(() => import("@/components/tasks/TaskTimelineView"), {
  ssr: false
});

import { LayoutGrid, List as ListIcon, CalendarDays, ChevronDown, X } from "lucide-react";
import { StatusBadge, PriorityIndicator, DateCell, DueDateCell, UserCell, UserStack, StatTile, StatTileRow } from "@/components/ui/data";
import { ConfirmDialog } from "@/components/ui/enterprise/ConfirmDialog";
import { EmptyState } from "@/components/ui/feedback/States";
import { useSavedFilters, SavedFilter } from "@/hooks/useSavedFilters";
import { SavedFiltersDropdown } from "@/components/ui/SavedFiltersDropdown";

type Task = any;

interface TaskFilterPayload {
  scope?: "ALL" | "ASSIGNEE" | "ENROLLED";
  hierarchyScope?: "all" | "my_dept" | "my_reports" | "assigned_me";
  selectedDepartmentName?: string;
  selectedDepartmentNames?: string[];
  query?: string;
  columnFilters?: Record<string, string[]>;
  kpiFilter?: string | null;
  selectedWorkspaceId?: string | null;
  selectedWorkspaceIds?: string[];
  selectedSubWorkspaceIds?: string[];
  selectedStatus?: string;
  selectedStatuses?: string[];
  selectedPriority?: string;
  selectedPriorities?: string[];
  selectedAssigneeIds?: string[];
  showEscalatedOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

const getSubWorkspaceName = (t: Task) => {
  let subName = '—';
  if (t.sub_workspace) {
    subName = t.sub_workspace.name || t.sub_workspace.code || '—';
    if (t.workspace?.name && subName.startsWith(t.workspace.name)) {
      subName = subName.replace(t.workspace.name, '').replace(/^[\s-]+/, '');
    }
  } else {
    const fullName = t.workspace?.name || t.workspace?.code || '—';
    const parts = fullName.split(' - ');
    if (parts.length > 1) {
      subName = parts.slice(1).join(' - ');
    }
  }
  return subName;
};

export const isTaskCompleted = (t: any): boolean => {
  if (!t || !t.status) return false;
  if (t.status.is_closed || t.status.is_terminal) return true;
  const code = (t.status.code || t.status.status_code || "").toUpperCase().replace(/[\s_-]+/g, "");
  const name = (t.status.name || t.status.status_name || "").toLowerCase();
  return (
    code === "COMPLETED" ||
    code === "TASKCOMPLETED" ||
    code === "CLOSED" ||
    code === "RESOLVED" ||
    code === "DONE" ||
    name.includes("complete") ||
    name.includes("closed") ||
    name.includes("resolved") ||
    name.includes("done")
  );
};

export const isTaskInProgress = (t: any): boolean => {
  if (!t || !t.status) return false;
  if (isTaskCompleted(t)) return false;
  const code = (t.status.code || t.status.status_code || "").toUpperCase().replace(/[\s_-]+/g, "");
  const name = (t.status.name || t.status.status_name || "").toLowerCase();
  return (
    code === "INPROGRESS" ||
    code === "WORKINPROGRESS" ||
    code === "WIP" ||
    code === "PROGRESS" ||
    code === "UNDERREVIEW" ||
    code === "INREVIEW" ||
    name.includes("progress") ||
    name.includes("wip") ||
    name.includes("review") ||
    name.includes("working")
  );
};

export const isTaskOpen = (t: any): boolean => {
  if (!t || !t.status) return false;
  return !isTaskCompleted(t) && !isTaskInProgress(t);
};

/** Sentence case for column names coming from the report config ("Created At" → "Created"). */
const HEADER_OVERRIDES: Record<string, string> = { "Created At": "Created", "Updated At": "Updated", "Due Date": "Due", "Watchers & Reviewers": "Watchers & reviewers", "Remarks & Comments": "Remarks" };
function headerLabel(name: string) {
  if (!name) return name;
  if (HEADER_OVERRIDES[name]) return HEADER_OVERRIDES[name];
  return name
    .split(" ")
    .map((w, i) => (i === 0 || /^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(" ");
}

function DraggableTableHead({ 
  col, 
  isFirst, 
  filterValues, 
  onFilterChange,
  options 
}: { 
  col: any, 
  isFirst?: boolean, 
  filterValues?: string[], 
  onFilterChange?: (vals: string[]) => void,
  options?: {label: string, value: string}[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.field_id });
  const isActions = col.field_key === "actions";
  // Floors stop saved column configs from squeezing names, badges and dates into "Avinas…".
  const w = isActions ? Math.max(col.column_width || col.default_width || 120, 110) : Math.max(col.column_width || col.default_width || 150, MIN_COL_WIDTH[col.field_key] ?? 0);
  const isTitle = col.field_key === "title_description";
  const style = { 
    transform: CSS.Translate.toString(transform), 
    transition, 
    minWidth: `${w}px`,
    width: `${w}px`,
    opacity: isDragging ? 0.5 : 1,
    position: 'sticky' as any,
    top: 0,
    left: isFirst ? '40px' : undefined,
    right: isActions ? '0px' : undefined,
    zIndex: isDragging ? 50 : (isActions ? 40 : (isFirst ? 30 : 25)),
  };
  return (
    <AppTableHead 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "select-none bg-sunken border-b border-border text-[12px] font-semibold text-subtle px-3 py-2 cursor-grab active:cursor-grabbing hover:text-foreground transition-colors align-middle group/header relative text-left",
        isActions ? "text-right shadow-[inset_1px_0_0_var(--border-subtle)]" : "",
        ["code", "due_date", "created_at", "updated_at", "status", "priority", "department"].includes(col.field_key) ? "whitespace-nowrap" : ""
      )}
      {...attributes} 
      {...listeners}
    >
      <div className={cn("flex items-center gap-2 w-full", isActions ? "justify-end" : "justify-between")}>
        <span className="truncate flex-1">{isTitle ? "Title" : headerLabel(col.display_name)}</span>
        {col.field_key !== "actions" && options && onFilterChange && (
          <div className="flex-shrink-0 opacity-0 group-hover/header:opacity-100 data-[active=true]:opacity-100 transition-opacity" data-active={filterValues && filterValues.length > 0} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <MultiSelectFilter 
              options={options} 
              selectedValues={filterValues || []} 
              onChange={onFilterChange} 
              iconOnly={true}
            />
          </div>
        )}
      </div>
    </AppTableHead>
  );
}

const MIN_COL_WIDTH: Record<string, number> = { assignee: 180, creator_name: 170, executors: 140, reviewers: 140, status: 140, due_date: 130, created_at: 120, updated_at: 120, start_date: 120, priority: 110, department: 150, workspace: 150, sub_workspace: 150 };
const SEG_ON = "bg-surface text-foreground font-semibold shadow-sm";
const SEG_OFF = "text-muted hover:text-foreground";
const ROW_ICON_BTN = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

const INITIAL_TASK_FIELDS: UIFieldDefinition[] = [
  { field_key: "code", display_name: "Code", data_type: "text", is_default: true, default_width: 100 },
  { field_key: "title_description", display_name: "Title", data_type: "custom", is_default: true, default_width: 300 },
  { field_key: "workspace", display_name: "Workspace", data_type: "text", is_default: true, default_width: 160 },
  { field_key: "sub_workspace", display_name: "Sub-Workspace", data_type: "text", is_default: true, default_width: 160 },
  { field_key: "department", display_name: "Department", data_type: "badge", is_default: true, default_width: 160 },
  { field_key: "priority", display_name: "Priority", data_type: "badge", is_default: true, default_width: 120 },
  { field_key: "due_date", display_name: "Due Date", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "status", display_name: "Status", data_type: "badge", is_default: true, default_width: 150 },
  { field_key: "assignee", display_name: "Assignee", data_type: "user", is_default: true, default_width: 180 },
  { field_key: "created_at", display_name: "Created At", data_type: "date", is_default: true, default_width: 130 },
  { field_key: "actions", display_name: "Actions", data_type: "custom", is_default: true, default_width: 120 },
  { field_key: "start_date", display_name: "Start Date", data_type: "date", is_default: false, default_width: 120 },
  { field_key: "duration", display_name: "Duration", data_type: "custom", is_default: false, default_width: 100 },
  { field_key: "progress", display_name: "Checklist Progress", data_type: "custom", is_default: false, default_width: 130 },
  { field_key: "executors", display_name: "Executors", data_type: "custom", is_default: false, default_width: 150 },
  { field_key: "watchers", display_name: "Watchers", data_type: "custom", is_default: false, default_width: 150 },
  { field_key: "reviewers", display_name: "Watchers & Reviewers", data_type: "custom", is_default: false, default_width: 150 },
  { field_key: "attachments", display_name: "Attachments", data_type: "custom", is_default: false, default_width: 100 },
  { field_key: "comments", display_name: "Remarks & Comments", data_type: "custom", is_default: false, default_width: 150 },
  { field_key: "external_link", display_name: "External Link", data_type: "link", is_default: false, default_width: 200 },
  { field_key: "creator_name", display_name: "Creator", data_type: "user", is_default: false, default_width: 150 },
  { field_key: "updated_at", display_name: "Updated At", data_type: "date", is_default: false, default_width: 120 },
];

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
};

interface TaskListViewClientProps {
  initialTasks: Task[];
  userScope?: any;
  currentUserId?: string | null;
}

export default function TaskListViewClient({ initialTasks, userScope, currentUserId: initialCurrentUserId }: TaskListViewClientProps) {
  const [viewMode, setViewMode] = useState<"list" | "board" | "timeline">("list");
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [scope, setScope] = useState<"ALL" | "ASSIGNEE" | "ENROLLED">("ALL");
  const [hierarchyScope, setHierarchyScope] = useState<"all" | "my_dept" | "my_reports" | "assigned_me">("all");
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN" || roleCode === "ROLE_SUPER_ADMIN" || userScope?.isSuperAdmin;
  const isManager = userScope?.isManager || (userScope?.subordinateUserIds && userScope.subordinateUserIds.length > 1);
  const managedDepts = userScope?.managedDepartments || [];
  const canDelete = isSuperAdmin || hasPermission("TASKS_DELETE");
  const canUpdate = isSuperAdmin || hasPermission("TASKS_UPDATE");
  const canCreate = isSuperAdmin || hasPermission("TASKS_CREATE");

  const canUpdateRow = (t: Task) => {
    if (isSuperAdmin) return true;
    if (!effectiveUserId) return false;
    return t.assigned_to === effectiveUserId || t.owner_id === effectiveUserId || t.participants?.some((p: any) => p.user_id === effectiveUserId && p.participation_role === 'EXECUTOR');
  };

  const canDeleteRow = (t: Task) => {
    if (isSuperAdmin) return true;
    if (!effectiveUserId) return false;
    return (t.assigned_to === effectiveUserId || t.owner_id === effectiveUserId) && canDelete;
  };

  const [dynamicFields, setDynamicFields] = useState<UIFieldDefinition[]>([]);

  const combinedFields = useMemo(() => {
    return [...INITIAL_TASK_FIELDS, ...dynamicFields];
  }, [dynamicFields]);

  const { layout, availableFields, loading: configLoading, saveLayout, resetToDefault } = useLocalReportConfig('WORKSPACE_TASKS', combinedFields);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [creationWorkspaceId, setCreationWorkspaceId] = useState("");
  const [creationSubWorkspaceId, setCreationSubWorkspaceId] = useState("");
  const visibleColumns = useMemo(() => layout.filter(l => l.is_visible).sort((a, b) => a.display_order - b.display_order), [layout]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialCurrentUserId || userScope?.userId || null);
  const effectiveUserId = userScope?.userId || currentUserId || initialCurrentUserId;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("create") === "true") {
      setShowWorkspaceSelector(true);
    }
  }, [searchParams]);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const handleColumnFilterChange = (fieldId: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [fieldId]: values }));
  };

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [selectedSubWorkspaceIds, setSelectedSubWorkspaceIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDepartmentNames, setSelectedDepartmentNames] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<'workspace' | 'subworkspace' | 'status' | 'priority' | 'department' | 'assignee' | null>(null);
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [showEscalatedOnly, setShowEscalatedOnly] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [viewState, setViewState] = useState<any>(null);
  
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenMenuTaskId(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    updateSavedFilter,
    applySavedFilter,
    deleteSavedFilter,
    setActiveSavedFilterId
  } = useSavedFilters<TaskFilterPayload>("chandak_tasks", effectiveUserId, (payload) => {
    if (payload.scope) setScope(payload.scope);
    if (payload.hierarchyScope) setHierarchyScope(payload.hierarchyScope);
    if (payload.selectedDepartmentName !== undefined) setSelectedDepartmentName(payload.selectedDepartmentName);
    if (payload.selectedDepartmentNames !== undefined) setSelectedDepartmentNames(payload.selectedDepartmentNames);
    if (payload.query !== undefined) setQuery(payload.query);
    if (payload.columnFilters) setColumnFilters(payload.columnFilters);
    if (payload.kpiFilter !== undefined) setKpiFilter(payload.kpiFilter);
    if (payload.selectedWorkspaceId !== undefined) {
      setSelectedWorkspaceId(payload.selectedWorkspaceId || null);
    }
    if (payload.selectedWorkspaceIds !== undefined) {
      setSelectedWorkspaceIds(payload.selectedWorkspaceIds);
    } else if (payload.selectedWorkspaceId) {
      setSelectedWorkspaceIds([payload.selectedWorkspaceId]);
    }
    if (payload.selectedSubWorkspaceIds !== undefined) {
      setSelectedSubWorkspaceIds(payload.selectedSubWorkspaceIds);
    }
    if (payload.selectedStatus !== undefined) setSelectedStatus(payload.selectedStatus);
    if (payload.selectedStatuses !== undefined) {
      setSelectedStatuses(payload.selectedStatuses);
    } else if (payload.selectedStatus) {
      setSelectedStatuses([payload.selectedStatus]);
    }
    if (payload.selectedPriority !== undefined) setSelectedPriority(payload.selectedPriority);
    if (payload.selectedPriorities !== undefined) {
      setSelectedPriorities(payload.selectedPriorities);
    } else if (payload.selectedPriority) {
      setSelectedPriorities([payload.selectedPriority]);
    }
    if (payload.selectedAssigneeIds !== undefined) setSelectedAssigneeIds(payload.selectedAssigneeIds);
    if (payload.showEscalatedOnly !== undefined) setShowEscalatedOnly(Boolean(payload.showEscalatedOnly));
    if (payload.dateFrom !== undefined) setDateFrom(payload.dateFrom);
    if (payload.dateTo !== undefined) setDateTo(payload.dateTo);
  });

  const handleSaveCurrentFilter = () => {
    saveCurrentFilter({
      scope,
      hierarchyScope,
      selectedDepartmentName,
      selectedDepartmentNames,
      query,
      columnFilters,
      kpiFilter,
      selectedWorkspaceId,
      selectedWorkspaceIds,
      selectedSubWorkspaceIds,
      selectedStatus,
      selectedStatuses,
      selectedPriority,
      selectedPriorities,
      selectedAssigneeIds,
      showEscalatedOnly,
      dateFrom,
      dateTo
    }, () => triggerToast("Filter saved successfully!"));
  };

  const applyFilter = (f: SavedFilter<TaskFilterPayload>) => {
    applySavedFilter(
      f,
      (payload) => {
        setScope(payload.scope || "ALL");
        setHierarchyScope(payload.hierarchyScope || "all");
        setSelectedDepartmentName(payload.selectedDepartmentName || "ALL");
        setSelectedDepartmentNames(payload.selectedDepartmentNames || []);
        setQuery(payload.query || "");
        setColumnFilters(payload.columnFilters || {});
        setKpiFilter(payload.kpiFilter ?? null);
        setSelectedWorkspaceId(payload.selectedWorkspaceId || null);
        setSelectedWorkspaceIds(payload.selectedWorkspaceIds || (payload.selectedWorkspaceId ? [payload.selectedWorkspaceId] : []));
        setSelectedSubWorkspaceIds(payload.selectedSubWorkspaceIds || []);
        setSelectedStatus(payload.selectedStatus || "");
        setSelectedStatuses(payload.selectedStatuses || (payload.selectedStatus ? [payload.selectedStatus] : []));
        setSelectedPriority(payload.selectedPriority || "");
        setSelectedPriorities(payload.selectedPriorities || (payload.selectedPriority ? [payload.selectedPriority] : []));
        setSelectedAssigneeIds(payload.selectedAssigneeIds || []);
        setShowEscalatedOnly(Boolean(payload.showEscalatedOnly));
        setDateFrom(payload.dateFrom || "");
        setDateTo(payload.dateTo || "");
      },
      () => {
        handleResetAllFilters();
      }
    );
  };
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const [masterStatuses, setMasterStatuses] = useState<any[]>([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [inlineTask, setInlineTask] = useState<Task | null>(null);
  const [inlineNewStatus, setInlineNewStatus] = useState<string>("");
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [inlineNewDepartment, setInlineNewDepartment] = useState<string>("");
  const [inlineRemark, setInlineRemark] = useState<string>("");
  const [inlineLoading, setInlineLoading] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkOldStatus, setBulkOldStatus] = useState<string>("");
  const [bulkNewStatus, setBulkNewStatus] = useState<string>("");
  const [bulkOldDepartment, setBulkOldDepartment] = useState<string>("");
  const [bulkNewDepartment, setBulkNewDepartment] = useState<string>("");
  const [bulkRemark, setBulkRemark] = useState<string>("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [masterPriorities, setMasterPriorities] = useState<any[]>([]);
  const [masterAssignees, setMasterAssignees] = useState<any[]>([]);


  useEffect(() => {
    getTaskStatuses().then(setMasterStatuses).catch(console.error);
    getDepartments().then(setDepartments).catch(console.error);
    getAllReportCustomFields().then(setDynamicFields).catch(console.error);
    fetchPriorities().then(setMasterPriorities).catch(console.error);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setCurrentUserId(data.user.id);
    });
    supabase.from('user_master').select('id, full_name, email, user_code').eq('is_active', true).eq('is_deleted', false).order('full_name').then(({ data }) => {
      if (data) setMasterAssignees(data);
    });
  }, []);

  const uniqueStatuses = useMemo(() => {
    if (masterStatuses.length > 0) return masterStatuses.map(s => s.name);
    return Array.from(new Set(tasks.map((t: any) => t.status?.name).filter(Boolean))) as string[];
  }, [tasks, masterStatuses]);

  const uniquePriorities = useMemo(() => {
    if (masterPriorities.length > 0) return masterPriorities.map(p => p.name || p.priority_name);
    return Array.from(new Set(tasks.map((t: any) => t.priority?.name).filter(Boolean))) as string[];
  }, [tasks, masterPriorities]);
  const router = useRouter();

  const parentRef = useRef<HTMLDivElement>(null);

  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);

  const columnOptions = useMemo(() => {
    const optionsMap: Record<string, {label: string, value: string}[]> = {};
    
    visibleColumns.forEach(col => {
      const key = col.field_key;
      const fieldId = col.field_id || key;
      if (key === "actions") return;

      if (key === "department" && departments.length > 0) {
        optionsMap[fieldId] = [...departments]
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map(d => ({ label: d.name, value: d.name }));
        return;
      }
      
      if (key === "status" && masterStatuses.length > 0) {
        optionsMap[fieldId] = [...masterStatuses]
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map(s => ({ label: s.name, value: s.name }));
        return;
      }

      if (key === "workspace" && allWorkspaces.length > 0) {
        optionsMap[fieldId] = [...allWorkspaces]
          .sort((a, b) => (a.name || a.code || "").localeCompare(b.name || b.code || ""))
          .map(w => ({ label: w.name || w.code, value: w.name || w.code }));
        return;
      }

      if (key === "priority" && masterPriorities.length > 0) {
        optionsMap[fieldId] = [...masterPriorities]
          .sort((a, b) => (a.priority_name || a.name || "").localeCompare(b.priority_name || b.name || ""))
          .map(p => ({ label: p.priority_name || p.name, value: p.priority_name || p.name }));
        return;
      }

      if ((key === "assignee" || key === "creator_name") && masterAssignees.length > 0) {
        optionsMap[fieldId] = [...masterAssignees]
          .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
          .map(u => ({ label: u.full_name, value: u.full_name }));
        return;
      }

      const uniqueVals = new Set<string>();

      tasks.forEach(t => {
        let val = undefined;
        if (key === "department") val = t.department?.name;
        else if (key === "priority") val = t.priority?.name;
        else if (key === "status") val = t.status?.name;
        else if (key === "workspace") val = t.workspace?.name || t.workspace?.code;
        else if (key === "sub_workspace") val = getSubWorkspaceName(t);
        else if (key === "assignee") {
            const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
            val = a?.full_name;
        }
        else if (key === "creator_name") val = t.creator?.full_name;
        else if (key === "title_description") val = t.title;
        else if (key === "code") val = t.code;
        else if (key === "executors") {
          (t.executors || []).forEach((u: any) => {
            const name = u.full_name || u.name;
            if (name) uniqueVals.add(String(name).trim());
          });
          return;
        }
        else if (key === "reviewers" || key === "watchers") {
          (t.watchers || t.reviewers || t.task_watchers || []).forEach((u: any) => {
            const name = u.full_name || u.name;
            if (name) uniqueVals.add(String(name).trim());
          });
          return;
        }
        else if (t.custom_fields && t.custom_fields[key] !== undefined) val = t.custom_fields[key];
        else val = t[key];

        if (val !== undefined && val !== null && val !== "") {
          if (Array.isArray(val)) {
            val.forEach(item => {
              if (item && typeof item === "object") {
                const name = item.full_name || item.name || item.label;
                if (name) uniqueVals.add(String(name).trim());
              } else if (item !== undefined && item !== null && item !== "") {
                uniqueVals.add(String(item).trim());
              }
            });
          } else if (typeof val === "object") {
            const name = val.full_name || val.name || val.label;
            if (name) uniqueVals.add(String(name).trim());
          } else {
            uniqueVals.add(String(val).trim());
          }
        }
      });

      optionsMap[fieldId] = Array.from(uniqueVals)
        .sort((a, b) => a.localeCompare(b))
        .map(v => ({ label: v, value: v }));
    });

    return optionsMap;
  }, [tasks, visibleColumns, departments, masterStatuses, allWorkspaces, masterPriorities, masterAssignees]);

  useEffect(() => {
    fetchWorkspaces().then(ws => setAllWorkspaces(ws)).catch(console.error);
  }, []);

  const uniqueWorkspaces = useMemo(() => {
    const map = new Map();
    initialTasks.forEach(t => {
      if (t.workspace) {
        map.set(t.workspace.id || t.workspace_id, t.workspace);
      }
    });
    return Array.from(map.values()) as any[];
  }, [initialTasks]);

  const rootWorkspaces = useMemo(() => {
    return (allWorkspaces || []).filter((w: any) => !w.parent_workspace_id);
  }, [allWorkspaces]);

  const allSubWorkspaces = useMemo(() => {
    const list: Array<{ id: string; name: string; parent_workspace_id?: string; parentName?: string }> = [];
    const seen = new Set<string>();

    (allWorkspaces || []).forEach((w: any) => {
      if (w.parent_workspace_id) {
        seen.add(w.id);
        const parent = allWorkspaces.find((p: any) => p.id === w.parent_workspace_id);
        list.push({
          id: w.id,
          name: w.workspace_name || w.name,
          parent_workspace_id: w.parent_workspace_id,
          parentName: parent?.workspace_name || parent?.name
        });
      }
    });

    tasks.forEach((t: any) => {
      if (t.sub_workspace && t.sub_workspace.id && !seen.has(t.sub_workspace.id)) {
        seen.add(t.sub_workspace.id);
        list.push({
          id: t.sub_workspace.id,
          name: t.sub_workspace.name || t.sub_workspace.code,
          parent_workspace_id: t.sub_workspace.parent_workspace_id || t.workspace?.id,
          parentName: t.workspace?.name || t.workspace?.code
        });
      }
    });

    return list;
  }, [allWorkspaces, tasks]);

  const workspaceFilterOptions = useMemo(() => {
    const list = rootWorkspaces.length > 0 ? rootWorkspaces : allWorkspaces;
    return list.map((w: any) => ({
      id: w.id,
      label: w.workspace_name || w.name || 'Workspace',
      sublabel: w.workspace_code || w.code ? `(${w.workspace_code || w.code})` : undefined
    }));
  }, [rootWorkspaces, allWorkspaces]);

  const subWorkspaceFilterOptions = useMemo(() => {
    const activeWs = selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : (selectedWorkspaceId ? [selectedWorkspaceId] : []);
    const filteredSubs = activeWs.length > 0
      ? allSubWorkspaces.filter(sw => sw.parent_workspace_id && activeWs.includes(sw.parent_workspace_id))
      : allSubWorkspaces;

    return filteredSubs.map(sw => ({
      id: sw.id,
      label: sw.name,
      sublabel: sw.parentName ? `(${sw.parentName})` : undefined
    }));
  }, [allSubWorkspaces, selectedWorkspaceIds, selectedWorkspaceId]);

  const statusFilterOptions = useMemo(() => {
    return uniqueStatuses.map(s => {
      const match = masterStatuses.find(ms => ms.name === s || ms.status_name === s);
      return {
        id: s,
        label: s,
        color: match?.status_color
      };
    });
  }, [uniqueStatuses, masterStatuses]);

  const priorityFilterOptions = useMemo(() => {
    return uniquePriorities.map(p => {
      const match = masterPriorities.find(mp => mp.name === p || mp.priority_name === p);
      return {
        id: p,
        label: p,
        color: match?.priority_color
      };
    });
  }, [uniquePriorities, masterPriorities]);

  const departmentFilterOptions = useMemo(() => {
    return (departments || []).map(d => ({
      id: d.name,
      label: d.name
    }));
  }, [departments]);

  const assigneeFilterOptions = useMemo(() => {
    return (masterAssignees || []).map(u => ({
      id: u.id,
      label: u.full_name,
      sublabel: u.user_code ? `(${u.user_code})` : undefined
    }));
  }, [masterAssignees]);

  const totalActiveFilterCount = useMemo(() => {
    let count = 0;
    count += selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds.length : (selectedWorkspaceId ? 1 : 0);
    count += selectedSubWorkspaceIds.length;
    count += selectedStatuses.length > 0 ? selectedStatuses.length : (selectedStatus ? 1 : 0);
    count += selectedPriorities.length > 0 ? selectedPriorities.length : (selectedPriority ? 1 : 0);
    count += selectedDepartmentNames.length;
    count += selectedAssigneeIds.length;
    if (showEscalatedOnly) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [selectedWorkspaceIds, selectedWorkspaceId, selectedSubWorkspaceIds, selectedStatuses, selectedStatus, selectedPriorities, selectedPriority, selectedDepartmentNames, selectedAssigneeIds, showEscalatedOnly, dateFrom, dateTo]);

  const handleResetAllFilters = () => {
    setSelectedStatus("");
    setSelectedPriority("");
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedWorkspaceId(null);
    setSelectedWorkspaceIds([]);
    setSelectedSubWorkspaceIds([]);
    setSelectedDepartmentNames([]);
    setSelectedAssigneeIds([]);
    setShowEscalatedOnly(false);
    setDateFrom("");
    setDateTo("");
    setColumnFilters({});
    setScope("ALL");
    setHierarchyScope("all");
    setSelectedDepartmentName("ALL");
    setKpiFilter(null);
    setQuery("");
    setActiveSavedFilterId(null);
    setOpenDropdown(null);
    if (effectiveUserId) {
      localStorage.removeItem(`chandak_tasks_active_id_${effectiveUserId}`);
    }
    fetchTasksData(null);
  };

  const baseFiltered = useMemo(() => {
    return tasks.filter(t => {
      // 1. Hierarchy & Multi-Department Scope
      if (hierarchyScope === "my_dept") {
        if (selectedDepartmentName !== "ALL") {
          if (t.department?.name !== selectedDepartmentName) return false;
        } else if (managedDepts.length > 0) {
          const deptNames = managedDepts.map((d: any) => d.name);
          if (!deptNames.includes(t.department?.name)) return false;
        } else if (userScope?.primaryDepartmentName) {
          if (t.department?.name !== userScope.primaryDepartmentName) return false;
        }
      } else if (hierarchyScope === "my_reports") {
        const subIds = userScope?.subordinateUserIds || [];
        const assigneeId = (Array.isArray(t.assignee) ? t.assignee[0]?.id : t.assignee?.id) || t.assigned_to;
        if (!subIds.includes(assigneeId) && !subIds.includes(t.created_by)) return false;
      } else if (hierarchyScope === "assigned_me") {
        const myId = effectiveUserId;
        const assigneeId = (Array.isArray(t.assignee) ? t.assignee[0]?.id : t.assignee?.id) || t.assigned_to;
        if (assigneeId !== myId && t.created_by !== myId) return false;
      }

      if (selectedDepartmentName !== "ALL" && hierarchyScope !== "my_dept") {
        if (t.department?.name !== selectedDepartmentName) return false;
      }

      if (selectedDepartmentNames.length > 0 && !selectedDepartmentNames.includes(t.department?.name)) {
        return false;
      }

      if (scope === "ASSIGNEE") {
        const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
        if (a?.id !== effectiveUserId && t.assigned_to !== effectiveUserId) return false;
      }
      if (scope === "ENROLLED") {
        const isExecutor = t.executors?.some((e: any) => e.id === effectiveUserId);
        const isReviewer = t.reviewers?.some((r: any) => r.id === effectiveUserId);
        if (!isExecutor && !isReviewer) return false;
      }

      // Workspace multi-select matching
      const activeWsIds = selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : (selectedWorkspaceId ? [selectedWorkspaceId] : []);
      if (activeWsIds.length > 0) {
        const matchesWs = activeWsIds.some(wsId => 
          t.workspace_id === wsId || 
          t.workspace?.id === wsId || 
          t.sub_workspace?.id === wsId ||
          t.workspace?.parent_workspace_id === wsId
        );
        if (!matchesWs) return false;
      }

      // Sub-workspace multi-select matching
      if (selectedSubWorkspaceIds.length > 0) {
        const matchesSubWs = selectedSubWorkspaceIds.some(subWsId => 
          t.sub_workspace?.id === subWsId ||
          t.workspace_id === subWsId ||
          t.sub_workspace?.name === subWsId ||
          getSubWorkspaceName(t) === subWsId
        );
        if (!matchesSubWs) return false;
      }
      
      // Status multi-select matching
      const activeStatuses = selectedStatuses.length > 0 ? selectedStatuses : (selectedStatus ? [selectedStatus] : []);
      if (activeStatuses.length > 0 && !activeStatuses.includes(t.status?.name)) return false;

      // Priority multi-select matching
      const activePriorities = selectedPriorities.length > 0 ? selectedPriorities : (selectedPriority ? [selectedPriority] : []);
      if (activePriorities.length > 0 && !activePriorities.includes(t.priority?.name || t.priority?.priority_name)) return false;

      // Assignee multi-select matching
      if (selectedAssigneeIds.length > 0) {
        const aId = (Array.isArray(t.assignee) ? t.assignee[0]?.id : t.assignee?.id) || t.assigned_to;
        if (!selectedAssigneeIds.includes(aId)) return false;
      }

      if (showEscalatedOnly) {
        const sName = t.status?.name?.toLowerCase() || "";
        const isStatusEscalated = sName.includes("escalat") || sName.includes("block");
        const isResolved = sName.includes("resolv") || sName.includes("done") || t.status?.is_closed;
        
        let isOverdue = false;
        if (!isResolved && t.end_date) {
          const dueDate = new Date(t.end_date);
          dueDate.setHours(23, 59, 59, 999);
          if (Date.now() > dueDate.getTime()) {
            isOverdue = true;
          }
        }
        
        if (!isStatusEscalated && !isOverdue) return false;
      }

      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime();
        const taskDate = new Date(t.created_at).getTime();
        if (taskDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + 86400000;
        const taskDate = new Date(t.created_at).getTime();
        if (taskDate >= toDate) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        if (!(
          (t.title || "").toLowerCase().includes(q) ||
          (t.code || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.workspace?.name || "").toLowerCase().includes(q)
        )) return false;
      }

      for (const [fieldId, filterVals] of Object.entries(columnFilters)) {
        if (!filterVals || filterVals.length === 0) continue;
        const col = combinedFields.find(c => (c as any).field_id === fieldId) || combinedFields.find(c => c.field_key === fieldId);
        if (!col) continue;

        const key = col.field_key;
        if (key === "executors") {
          const executorNames = (t.executors || []).map((u: any) => u.full_name || u.name).filter(Boolean);
          if (!filterVals.some(fv => executorNames.includes(fv))) return false;
          continue;
        }
        if (key === "reviewers" || key === "watchers") {
          const watcherNames = (t.watchers || t.reviewers || t.task_watchers || []).map((u: any) => u.full_name || u.name).filter(Boolean);
          if (!filterVals.some(fv => watcherNames.includes(fv))) return false;
          continue;
        }

        let val = undefined;
        
        if (key === "department") val = t.department?.name;
        else if (key === "priority") val = t.priority?.name;
        else if (key === "status") val = t.status?.name;
        else if (key === "workspace") val = t.workspace?.name || t.workspace?.code;
        else if (key === "sub_workspace") val = getSubWorkspaceName(t);
        else if (key === "assignee") {
            const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
            val = a?.full_name;
        }
        else if (key === "creator_name") val = t.creator?.full_name;
        else if (key === "title_description") val = t.title;
        else if (t.custom_fields && t.custom_fields[key] !== undefined) val = t.custom_fields[key];
        else val = t[key];

        if (val === undefined || val === null) return false;
        
        if (Array.isArray(val)) {
          const itemStrings = val.map(item => typeof item === "object" ? (item?.full_name || item?.name || item?.label) : String(item)).filter(Boolean);
          if (!filterVals.some(fv => itemStrings.includes(fv))) return false;
        } else {
          const stringVal = String(val);
          if (!filterVals.includes(stringVal)) return false;
        }
      }

      return true;
    });
  }, [tasks, scope, hierarchyScope, selectedDepartmentName, userScope, managedDepts, query, currentUserId, selectedWorkspaceId, selectedWorkspaceIds, selectedSubWorkspaceIds, selectedStatus, selectedStatuses, selectedPriority, selectedPriorities, selectedDepartmentNames, selectedAssigneeIds, showEscalatedOnly, dateFrom, dateTo, columnFilters, combinedFields]);

  const kpis = useMemo(() => {
    const total = baseFiltered.length;
    const open = baseFiltered.filter(t => isTaskOpen(t)).length;
    const inProgress = baseFiltered.filter(t => isTaskInProgress(t)).length;
    const completed = baseFiltered.filter(t => isTaskCompleted(t)).length;
    
    return [
      { label: "Total", value: total, icon: <LayoutList className="h-5 w-5" />, iconBgClass: "bg-info-soft", iconColorClass: "text-info-text", onClick: () => setKpiFilter(null), isActive: kpiFilter === null },
      { label: "Open", value: open, icon: <Layers className="h-5 w-5" />, iconBgClass: "bg-theme-btn-primary/10", iconColorClass: "text-theme-icon", onClick: () => setKpiFilter(kpiFilter === 'Open' ? null : 'Open'), isActive: kpiFilter === 'Open' },
      { label: "In progress", value: inProgress, icon: <Loader2 className="h-5 w-5" />, iconBgClass: "bg-warning/10", iconColorClass: "text-warning dark:text-warning", onClick: () => setKpiFilter(kpiFilter === 'In Progress' ? null : 'In Progress'), isActive: kpiFilter === 'In Progress' },
      { label: "Completed", value: completed, icon: <CheckCircle2 className="h-5 w-5" />, iconBgClass: "bg-success/10", iconColorClass: "text-success dark:text-success", onClick: () => setKpiFilter(kpiFilter === 'Completed' ? null : 'Completed'), isActive: kpiFilter === 'Completed' },
    ];
  }, [baseFiltered, kpiFilter]);

  const filtered = useMemo(() => {
    if (!kpiFilter) return baseFiltered;
    return baseFiltered.filter(t => {
      if (kpiFilter === 'Open') return isTaskOpen(t);
      if (kpiFilter === 'In Progress') return isTaskInProgress(t);
      if (kpiFilter === 'Completed') return isTaskCompleted(t);
      return true;
    });
  }, [baseFiltered, kpiFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeCol = layout.find(l => l.field_id === active.id);
      const overCol = layout.find(l => l.field_id === over.id);
      
      if (!activeCol || !overCol) return;

      const newLayout = [...layout];
      newLayout.sort((a, b) => a.display_order - b.display_order);
      
      const oldIndex = newLayout.findIndex(i => i.field_id === active.id);
      const newIndex = newLayout.findIndex(i => i.field_id === over.id);
      
      const reorderedLayout = arrayMove(newLayout, oldIndex, newIndex);
      reorderedLayout.forEach((item, idx) => item.display_order = idx + 1);
      
      await saveLayout(reorderedLayout);
    }
  };

  const fetchTasksData = async (overrideWsId?: string | null) => {
    setLoading(true);
    const currentWsId = overrideWsId !== undefined ? overrideWsId : selectedWorkspaceId;

    try {
      let newTasks: any[] = [];
      if (currentWsId) {
        newTasks = await fetchTasksByWorkspace(currentWsId, true);
      } else {
        newTasks = await fetchAllTasks();
      }

      setTasks(newTasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchTasksData();
  };

  // Delete asks for confirmation in an in-app dialog (was window.confirm).
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const handleDeleteTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const t = tasks.find(x => x.id === taskId);
    setPendingDelete({ id: taskId, title: t?.title || "this task" });
  };

  const performDeleteTask = async (taskId: string) => {
    try {
      setDeleteLoadingId(taskId);
      const res = await deleteTask(taskId);
      if (res?.error) {
        throw new Error(res.error);
      }
      setTasks(prev => prev.filter(t => t.id !== taskId));
      triggerToast("Task deleted");
    } catch (e: any) {
      toast.error("Couldn't delete the task: " + e.message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(new Set(filtered.map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const next = new Set(selectedTaskIds);
    if (checked) next.add(taskId);
    else next.delete(taskId);
    setSelectedTaskIds(next);
  };

  const handleBulkDelete = () => setConfirmBulkDelete(true);

  const performBulkDelete = async () => {
    try {
      setLoading(true);
      const results = await Promise.all(Array.from(selectedTaskIds).map(id => deleteTask(id)));
      const failed = results.find(r => r?.error);
      if (failed) {
        throw new Error(failed.error);
      }
      setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
      setSelectedTaskIds(new Set());
      triggerToast("Tasks deleted");
    } catch (e: any) {
      toast.error("Couldn't delete the selected tasks: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusSave = async () => {
    if (!bulkNewStatus && !bulkNewDepartment) return;
    try {
      setInlineLoading(true);
      const stMaster = masterStatuses.find(s => s.id === bulkNewStatus);
      const mappedStatus = stMaster ? { name: stMaster.name, code: stMaster.code, status_color: stMaster.color } : undefined;
      const deptMaster = departments.find(d => d.id === bulkNewDepartment);

      await Promise.all(Array.from(selectedTaskIds).map(id => {
        const t = tasks.find(x => x.id === id);
        if (!t) return Promise.resolve(null);
        
        let newStatus = bulkNewStatus || undefined;
        let newDept = bulkNewDepartment || undefined;

        if (bulkOldStatus && t.status_id !== bulkOldStatus) {
           newStatus = undefined;
        }
        if (bulkOldDepartment && t.department_id !== bulkOldDepartment) {
           newDept = undefined;
        }

        if (!newStatus && !newDept) {
           return Promise.resolve(null);
        }

        return executeTaskBatchOperation({
          taskId: id,
          statusChanges: newStatus,
          departmentChange: newDept ? { 
            old_id: t.department_id, 
            new_id: newDept,
            old_name: t.department?.name,
            new_name: deptMaster?.name
          } : undefined,
          remarks: bulkRemark || "Bulk Update"
        });
      }));
      
      setTasks(prev => prev.map(t => {
        if (selectedTaskIds.has(t.id)) {
          let newStatus = bulkNewStatus || undefined;
          let newDept = bulkNewDepartment || undefined;
          if (bulkOldStatus && t.status_id !== bulkOldStatus) newStatus = undefined;
          if (bulkOldDepartment && t.department_id !== bulkOldDepartment) newDept = undefined;
          
          return {
            ...t,
            ...(newStatus ? { status_id: newStatus, status: mappedStatus } : {}),
            ...(newDept ? { department_id: newDept, department: deptMaster } : {})
          };
        }
        return t;
      }));
      setSelectedTaskIds(new Set());
      setBulkStatusModalOpen(false);
      triggerToast(`Successfully updated tasks.`);
    } catch (e: any) {
      toast.error("Bulk update failed: " + e.message);
    } finally {
      setInlineLoading(false);
    }
  };

  const handleStatusClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    e.preventDefault();
    setInlineTask(task);
    setInlineNewStatus("");
    setInlineRemark("");
    setStatusModalOpen(true);
  };

  const handleDepartmentClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    e.preventDefault();
    setInlineTask(task);
    setInlineNewDepartment(task.department_id || "");
    setInlineRemark("");
    setDepartmentModalOpen(true);
  };

  const isOwner = inlineTask?.assigned_to === effectiveUserId;
  const isExecutive = inlineTask?.participants?.some((p: any) => p.user_id === effectiveUserId && p.participation_role === 'EXECUTOR');
  const canChangeFields = isOwner || isSuperAdmin || isExecutive;

  const handleStatusSave = async () => {
    if (!inlineTask) return;
    if (canChangeFields && !inlineNewStatus) {
      toast.warning("Status selection is mandatory. Please select a status.");
      return;
    }
    if (!inlineRemark || inlineRemark.trim().length === 0) {
      toast.warning("A remark is required.");
      return;
    }

    setInlineLoading(true);
    try {
      const { error } = await updateTaskStatusInline(inlineTask.id, inlineNewStatus, inlineRemark);
      if (error) {
        toast.error("Failed to update: " + error);
        return;
      }

      const stMaster = masterStatuses.find(s => s.id === inlineNewStatus);
      const mappedStatus = stMaster ? { name: stMaster.name, code: stMaster.code, status_color: stMaster.color } : undefined;

      setTasks(prev => prev.map(t => t.id === inlineTask.id ? { ...t, status_id: inlineNewStatus, status: mappedStatus || t.status } : t));
      setStatusModalOpen(false);
      triggerToast(`Status updated successfully.`);
    } catch (error: any) {
      if (error.message && error.message.includes("was not found on the server")) {
         window.location.reload();
         return;
      }
      toast.error("Failed to update: " + error.message);
    } finally {
      setInlineLoading(false);
    }
  };

  const handleDepartmentSave = async () => {
    if (!inlineTask) return;
    if (!inlineRemark || inlineRemark.trim().length === 0) {
      toast.warning("A remark is required.");
      return;
    }

    setInlineLoading(true);
    try {
      const deptMaster = departments.find(d => d.id === inlineNewDepartment);
      
      let newDept = inlineNewDepartment || undefined;
      if (inlineNewDepartment === inlineTask.department_id) {
         newDept = undefined;
      }

      const res = await executeTaskBatchOperation({
        taskId: inlineTask.id,
        departmentChange: newDept ? { 
          old_id: inlineTask.department_id, 
          new_id: newDept,
          old_name: inlineTask.department?.name,
          new_name: deptMaster?.name
        } : undefined,
        remarks: inlineRemark
      });

      if (res?.error) throw new Error(res.error);

      setTasks(prev => prev.map(t => t.id === inlineTask.id ? { 
        ...t, 
        ...(newDept ? { department_id: newDept, department: deptMaster } : {}) 
      } : t));

      setDepartmentModalOpen(false);
      triggerToast(`Department updated successfully.`);
    } catch (error: any) {
      if (error.message && error.message.includes("was not found on the server")) {
         window.location.reload();
         return;
      }
      toast.error("Failed to update: " + error.message);
    } finally {
      setInlineLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wsId = params.get("workspaceId");
      if (wsId) {
        setSelectedWorkspaceId(wsId);
      }
    }
  }, []);

  const getExportCellValue = (col: any, t: any) => {
    switch(col.field_key) {
      case "code": return t.code || `TSK-${t.id.substring(0,4).toUpperCase()}`;
      case "title_description": return t.title || "—";
      case "workspace": {
        const wsName = t.workspace?.name || t.workspace?.code || "—";
        return wsName.split(' - ')[0];
      }
      case "sub_workspace": {
        return getSubWorkspaceName(t);
      }
      case "department": return t.department?.name || "—";
      case "priority": return t.priority?.name || "—";
      case "due_date": return t.end_date || "—";
      case "status": return t.status?.name || "—";
      case "start_date": return formatDate(t.start_date);
      case "duration": {
        if (!t.start_date || !t.end_date) return "—";
        const diff = Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24));
        const days = Math.max(1, diff);
        return `${days} day(s)`;
      }
      case "progress": return `${t.progress_percentage || 0}%`;
      case "executors": return t.executors?.map((u: any) => u.full_name || u.name).join(", ") || "—";
      case "reviewers":
      case "watchers": return (t.watchers || t.reviewers || t.task_watchers)?.map((u: any) => u.full_name || u.name).join(", ") || "—";
      case "attachments": return t.attachmentCount ? `${t.attachmentCount} file(s)` : "—";
      case "comments": return t.commentCount ? `${t.commentCount} remark(s)` : "—";
      case "external_link": return t.custom_fields?.link_url || "—";
      case "creator_name": return t.creator?.full_name || "—";
      case "assignee": 
        const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
        return a?.full_name || "Unassigned";
      case "created_at": return formatDate(t.created_at);
      case "updated_at": return formatDate(t.updated_at);
      default: {
        let val = undefined;
        if (t.custom_fields && t.custom_fields[col.field_key] !== undefined) {
          val = t.custom_fields[col.field_key];
        } else if (t[col.field_key] !== undefined) {
          val = t[col.field_key];
        }
        
        if (val !== undefined && val !== null) {
          if (col.data_type === "boolean") return val ? "Yes" : "No";
          if (col.data_type === "date") return formatDate(val);
          if (Array.isArray(val)) {
            return val.map((v: any) => typeof v === "object" ? (v?.full_name || v?.name || v?.label || JSON.stringify(v)) : String(v)).join(", ");
          }
          if (typeof val === "object") {
            return val.full_name || val.name || val.label || JSON.stringify(val);
          }
          return val;
        }
        return "—";
      }
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks");

    const exportCols = visibleColumns.filter(c => c.field_key !== "actions");

    worksheet.columns = exportCols.map(col => ({
      header: col.display_name,
      key: col.field_key,
      width: col.field_key === "title_description" ? 40 : 20,
    }));

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    filtered.forEach((t) => {
      const row: any = {};
      exportCols.forEach(col => {
        row[col.field_key] = getExportCellValue(col, t);
      });
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Workspace_Tasks_Export.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("All Workspace Tasks", 14, 15);
    
    const exportCols = visibleColumns.filter(c => c.field_key !== "actions");
    const tableData = filtered.map(t => exportCols.map(col => getExportCellValue(col, t)));

    autoTable(doc, {
      head: [exportCols.map(col => col.display_name)],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [243, 244, 246] }
    });

    doc.save("Workspace_Tasks_Export.pdf");
  };

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  if (permsLoading) {
    return (
      <div className="py-12 flex justify-center">
        <ChandakLoader size="md" title="Verifying permissions…" subtitle="Loading enterprise task matrix" />
      </div>
    );
  }

  if (!hasPermission("TASKS_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <Shield className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to workspace tasks</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Tasks view access in RBAC access policies.</p>
      </div>
    );
  }

  return (
    <ExperienceProvider mode="operational">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                const wsTarget = selectedWorkspaceId ? `?workspace=${selectedWorkspaceId}&restoreHierarchy=true` : '?restoreHierarchy=true';
                router.push(`/workspaces${wsTarget}`);
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-soft-text hover:underline"
              title="Return to the workspace hierarchy at the current level"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to hierarchy
            </button>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-heading">Workspace tasks</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-muted">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {selectedWorkspaceId ? allWorkspaces.find(w => w.id === selectedWorkspaceId)?.workspace_name || allWorkspaces.find(w => w.id === selectedWorkspaceId)?.name || 'Selected workspace' : 'All workspaces'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <StatTileRow>
              {kpis.map((k, i) => (
                <StatTile
                  key={k.label}
                  label={k.label === "In Progress" ? "In progress" : k.label}
                  value={k.value}
                  icon={k.icon}
                  tone={(["neutral", "info", "accent", "success"] as const)[i] ?? "neutral"}
                  selected={k.isActive}
                  onSelect={k.onClick}
                />
              ))}
            </StatTileRow>
            {canCreate && (
              <AppButton size="lg" onClick={() => {
                let initialWs = selectedWorkspaceId || "";
                let initialSubWs = "";
                const selectedWsObj = allWorkspaces.find(w => w.id === selectedWorkspaceId);
                if (selectedWsObj && selectedWsObj.parent_workspace_id) {
                  initialWs = selectedWsObj.parent_workspace_id;
                  initialSubWs = selectedWsObj.id;
                }
                setCreationWorkspaceId(initialWs);
                setCreationSubWorkspaceId(initialSubWs);
                setShowWorkspaceSelector(true);
              }} leftIcon={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
                New task
              </AppButton>
            )}
          </div>
        </header>

        {/* Toolbar card: scope, view, involvement, search and actions */}
        <div className="theme-card-structural flex flex-col gap-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="theme-label mr-1">Scope</span>
            <div className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="Scope">
              {(isSuperAdmin || !isManager) && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={hierarchyScope === "all" && selectedDepartmentName === "ALL"}
                  onClick={() => { setHierarchyScope("all"); setSelectedDepartmentName("ALL"); }}
                  className={cn("inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors", hierarchyScope === "all" && selectedDepartmentName === "ALL" ? SEG_ON : SEG_OFF)}
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden /> Entire organisation
                </button>
              )}
              {isManager && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={hierarchyScope === "my_reports"}
                  onClick={() => { setHierarchyScope("my_reports"); setSelectedDepartmentName("ALL"); }}
                  className={cn("inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors", hierarchyScope === "my_reports" ? SEG_ON : SEG_OFF)}
                >
                  <Users className="h-3.5 w-3.5" aria-hidden /> My reporting tree
                  <span className="rounded bg-sunken px-1 text-[11.5px] text-muted tabular">{userScope?.subordinateUserIds?.length || 0}</span>
                </button>
              )}
              {(managedDepts.length > 0 || userScope?.primaryDepartmentName) && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={hierarchyScope === "my_dept"}
                  onClick={() => { setHierarchyScope("my_dept"); setSelectedDepartmentName("ALL"); }}
                  className={cn("inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors", hierarchyScope === "my_dept" ? SEG_ON : SEG_OFF)}
                >
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  {managedDepts.length > 1 ? "My departments" : `My department${userScope?.primaryDepartmentName ? ` · ${userScope.primaryDepartmentName}` : ""}`}
                </button>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={hierarchyScope === "assigned_me"}
                onClick={() => { setHierarchyScope("assigned_me"); setSelectedDepartmentName("ALL"); }}
                className={cn("inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors", hierarchyScope === "assigned_me" ? SEG_ON : SEG_OFF)}
              >
                <UserCheck className="h-3.5 w-3.5" aria-hidden /> Assigned to me
              </button>
            </div>

            {managedDepts.length > 1 && hierarchyScope === "my_dept" && (
              <label className="relative inline-flex items-center">
                <span className="sr-only">Department</span>
                <select
                  value={selectedDepartmentName}
                  onChange={(e) => { setSelectedDepartmentName(e.target.value); setHierarchyScope("my_dept"); }}
                  className="h-8 appearance-none pl-3 pr-8 text-[13px]"
                >
                  <option value="ALL">All my departments ({managedDepts.length})</option>
                  {managedDepts.map((d: any) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
              </label>
            )}

            {filtered.length !== kpis[0]?.value && (
              <span className="ml-auto text-[12.5px] text-muted tabular">
                {filtered.length} of {kpis[0]?.value ?? filtered.length} shown
              </span>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-2 border-t border-border pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {/* View Toggles */}
            <div className="inline-flex shrink-0 gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="View">
              <button type="button" role="radio" aria-checked={viewMode === "list"} aria-label="List view" title="List view"
                onClick={() => setViewMode("list")}
                className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors", viewMode === "list" ? SEG_ON : SEG_OFF)}
              >
                <ListIcon className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" role="radio" aria-checked={viewMode === "board"} aria-label="Board view" title="Board view"
                onClick={() => setViewMode("board")}
                className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors", viewMode === "board" ? SEG_ON : SEG_OFF)}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" role="radio" aria-checked={viewMode === "timeline"} aria-label="Timeline view" title="Timeline view"
                onClick={() => setViewMode("timeline")}
                className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors", viewMode === "timeline" ? SEG_ON : SEG_OFF)}
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Involvement + saved filter tabs */}
            <div className="inline-flex shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-sunken p-0.5 no-scrollbar" role="radiogroup" aria-label="Show">
              {(["ALL","ASSIGNEE","ENROLLED"] as const).map(sc => (
                <button
                  key={sc}
                  type="button"
                  role="radio"
                  aria-checked={!activeSavedFilterId && scope === sc}
                  onClick={() => setScope(sc)}
                  className={cn("inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors", !activeSavedFilterId && scope === sc ? SEG_ON : SEG_OFF)}
                >
                  {sc === "ALL" ? "All tasks" : sc === "ASSIGNEE" ? "I'm the assignee" : "I'm enrolled"}
                </button>
              ))}
              
              {savedFilters.length > 0 && <div className="mx-1 h-4 w-px shrink-0 bg-border-active" aria-hidden></div>}
              
              {savedFilters.map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={activeSavedFilterId === f.id}
                  onClick={() => applyFilter(f)}
                  className={cn("inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors", activeSavedFilterId === f.id ? "bg-accent-soft text-accent-soft-text font-semibold" : SEG_OFF)}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Saved Filters */}
            <SavedFiltersDropdown
              savedFilters={savedFilters}
              activeSavedFilterId={activeSavedFilterId}
              onSaveCurrent={handleSaveCurrentFilter}
              onApplyFilter={applyFilter}
              onDeleteFilter={deleteSavedFilter}
              onUpdateFilter={updateSavedFilter}
              currentPayload={{
                scope,
                hierarchyScope,
                selectedDepartmentName,
                selectedDepartmentNames,
                query,
                columnFilters,
                kpiFilter,
                selectedWorkspaceId,
                selectedWorkspaceIds,
                selectedSubWorkspaceIds,
                selectedStatus,
                selectedStatuses,
                selectedPriority,
                selectedPriorities,
                selectedAssigneeIds,
                showEscalatedOnly,
                dateFrom,
                dateTo
              }}
            />

          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                aria-label="Search tasks"
                placeholder="Search by title, code or assignee"
                value={query}
                onChange={(e:any) => setQuery(e.target.value)}
                className="h-9 w-full pl-9 pr-3 text-[13.5px]"
              />
            </div>
            
            <Popover.Root>
              <Popover.Trigger asChild>
                <AppButton variant="secondary" className="shrink-0" leftIcon={<Filter className="h-4 w-4" />}>
                  Filters
                  {totalActiveFilterCount > 0 ? (
                    <span className="rounded bg-primary px-1.5 text-[11px] leading-[18px] text-primary-foreground tabular">
                      {totalActiveFilterCount}
                    </span>
                  ) : null}
                </AppButton>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={8} className="z-[var(--z-popover)] w-80 sm:w-96 max-h-[85vh] overflow-y-auto space-y-4 rounded-[10px] border border-border bg-elevated p-4 text-foreground shadow-lg outline-none">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[14px] font-semibold text-heading">Filters</h4>
                    <AppButton variant="ghost" size="sm" onClick={handleResetAllFilters} className="flex items-center gap-1 text-[12.5px] font-medium text-accent-soft-text">
                      <RotateCcw className="h-3 w-3" aria-hidden /> Reset all
                    </AppButton>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Workspace Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Workspace"
                      placeholder="All workspaces"
                      options={workspaceFilterOptions}
                      selectedIds={selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : (selectedWorkspaceId ? [selectedWorkspaceId] : [])}
                      onChange={(ids) => {
                        setSelectedWorkspaceIds(ids);
                        setSelectedWorkspaceId(ids.length === 1 ? ids[0] : null);
                        if (ids.length > 0) {
                          setSelectedSubWorkspaceIds(prev => prev.filter(swId => {
                            const sw = allSubWorkspaces.find(s => s.id === swId);
                            return sw?.parent_workspace_id && ids.includes(sw.parent_workspace_id);
                          }));
                        }
                      }}
                      isOpen={openDropdown === 'workspace'}
                      onToggle={() => setOpenDropdown(prev => prev === 'workspace' ? null : 'workspace')}
                      onClose={() => setOpenDropdown(null)}
                    />

                    {/* Sub-workspace Multi-Select */}
                    {subWorkspaceFilterOptions.length > 0 && (
                      <WorkspaceFilterMultiSelect
                        label="Sub-workspace"
                        placeholder="All sub-workspaces"
                        options={subWorkspaceFilterOptions}
                        selectedIds={selectedSubWorkspaceIds}
                        onChange={(ids) => setSelectedSubWorkspaceIds(ids)}
                        isOpen={openDropdown === 'subworkspace'}
                        onToggle={() => setOpenDropdown(prev => prev === 'subworkspace' ? null : 'subworkspace')}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    {/* Status Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Status"
                      placeholder="All statuses"
                      options={statusFilterOptions}
                      selectedIds={selectedStatuses.length > 0 ? selectedStatuses : (selectedStatus ? [selectedStatus] : [])}
                      onChange={(ids) => {
                        setSelectedStatuses(ids);
                        setSelectedStatus(ids.length === 1 ? ids[0] : "");
                      }}
                      isOpen={openDropdown === 'status'}
                      onToggle={() => setOpenDropdown(prev => prev === 'status' ? null : 'status')}
                      onClose={() => setOpenDropdown(null)}
                    />

                    {/* Priority Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Priority"
                      placeholder="All priorities"
                      options={priorityFilterOptions}
                      selectedIds={selectedPriorities.length > 0 ? selectedPriorities : (selectedPriority ? [selectedPriority] : [])}
                      onChange={(ids) => {
                        setSelectedPriorities(ids);
                        setSelectedPriority(ids.length === 1 ? ids[0] : "");
                      }}
                      isOpen={openDropdown === 'priority'}
                      onToggle={() => setOpenDropdown(prev => prev === 'priority' ? null : 'priority')}
                      onClose={() => setOpenDropdown(null)}
                    />

                    {/* Department Multi-Select */}
                    {departmentFilterOptions.length > 0 && (
                      <WorkspaceFilterMultiSelect
                        label="Department"
                        placeholder="All departments"
                        options={departmentFilterOptions}
                        selectedIds={selectedDepartmentNames}
                        onChange={(ids) => setSelectedDepartmentNames(ids)}
                        isOpen={openDropdown === 'department'}
                        onToggle={() => setOpenDropdown(prev => prev === 'department' ? null : 'department')}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    {/* Assignee Multi-Select */}
                    {assigneeFilterOptions.length > 0 && (
                      <WorkspaceFilterMultiSelect
                        label="Assignee"
                        placeholder="All assignees"
                        options={assigneeFilterOptions}
                        selectedIds={selectedAssigneeIds}
                        onChange={(ids) => setSelectedAssigneeIds(ids)}
                        isOpen={openDropdown === 'assignee'}
                        onToggle={() => setOpenDropdown(prev => prev === 'assignee' ? null : 'assignee')}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-subtle">Due between</label>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-full px-2 text-[13.5px] rounded-md border border-border bg-surface text-foreground" />
                        <span className="text-muted text-xs">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-full px-2 text-[13.5px] rounded-md border border-border bg-surface text-foreground" />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 rounded-md p-1 text-[13.5px] text-foreground">
                      <input type="checkbox" checked={showEscalatedOnly} onChange={e => setShowEscalatedOnly(e.target.checked)} className="h-4 w-4 rounded border-border" />
                      Escalated tasks only
                    </label>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <AppButton
              variant="ghost"
              onClick={() => router.push("/migration")}
              className="shrink-0"
              title="Import tasks from Excel"
              aria-label="Import tasks from Excel"
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Import</span>
            </AppButton>

            <Popover.Root>
              <Popover.Trigger asChild>
                <AppButton variant="ghost" className="shrink-0" aria-label="Export tasks" leftIcon={<Download className="h-4 w-4" />}>
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </AppButton>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={8} className="z-[var(--z-popover)] min-w-[170px] rounded-[10px] border border-border bg-elevated p-1 text-foreground shadow-lg">
                  <button type="button" onClick={exportToExcel} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-surface-hover">
                    <FileSpreadsheet className="h-4 w-4 text-muted" aria-hidden /> Excel (.xlsx)
                  </button>
                  <button type="button" onClick={exportToPDF} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-surface-hover">
                    <FileText className="h-4 w-4 text-muted" aria-hidden /> PDF
                  </button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <AppButton
              variant="ghost"
              size="icon"
              onClick={() => setIsConfigOpen(true)}
              className="shrink-0"
              title="Choose columns"
              aria-label="Choose columns"
            >
              <Settings2 className="h-4 w-4" />
            </AppButton>
          </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {totalActiveFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-surface/60 rounded-lg border border-border text-xs">
            <span className="text-[11px] font-semibold text-muted mr-1">Active filters:</span>
            
            {/* Workspaces */}
            {(selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : (selectedWorkspaceId ? [selectedWorkspaceId] : [])).map(id => {
              const ws = allWorkspaces.find((w: any) => w.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                  Workspace: {ws?.workspace_name || ws?.name || id}
                  <button type="button" aria-label={`Remove workspace ${ws?.workspace_name || ws?.name || id}`} onClick={() => { setSelectedWorkspaceIds(prev => prev.filter(x => x !== id)); setSelectedWorkspaceId(null); }} className="hover:text-danger">
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
                  Sub-workspace: {sw?.name || id}
                  <button type="button" aria-label={`Remove sub-workspace ${sw?.name || id}`} onClick={() => setSelectedSubWorkspaceIds(prev => prev.filter(x => x !== id))} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Statuses */}
            {(selectedStatuses.length > 0 ? selectedStatuses : (selectedStatus ? [selectedStatus] : [])).map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Status: {s}
                <button type="button" aria-label={`Remove status ${s}`} onClick={() => { setSelectedStatuses(prev => prev.filter(x => x !== s)); setSelectedStatus(""); }} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Priorities */}
            {(selectedPriorities.length > 0 ? selectedPriorities : (selectedPriority ? [selectedPriority] : [])).map(p => (
              <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Priority: {p}
                <button type="button" aria-label={`Remove priority ${p}`} onClick={() => { setSelectedPriorities(prev => prev.filter(x => x !== p)); setSelectedPriority(""); }} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Departments */}
            {selectedDepartmentNames.map(d => (
              <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Dept: {d}
                <button type="button" aria-label={`Remove department ${d}`} onClick={() => setSelectedDepartmentNames(prev => prev.filter(x => x !== d))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Assignees */}
            {selectedAssigneeIds.map(id => {
              const u = masterAssignees.find((a: any) => a.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                  Assignee: {u?.full_name || id}
                  <button type="button" aria-label={`Remove assignee ${u?.full_name || id}`} onClick={() => setSelectedAssigneeIds(prev => prev.filter(x => x !== id))} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Escalated */}
            {showEscalatedOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger-soft text-danger-text border border-danger-border">
                Escalated only
                <button type="button" aria-label="Remove escalated filter" onClick={() => setShowEscalatedOnly(false)} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Date Range */}
            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
                Due: {dateFrom || "…"} to {dateTo || "…"}
                <button type="button" aria-label="Remove due date filter" onClick={() => { setDateFrom(""); setDateTo(""); }} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs text-accent-soft-text hover:underline font-medium ml-auto"
            >
              Reset all
            </button>
          </div>
        )}

        <DynamicReportBuilder 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
          layout={layout} 
          availableFields={availableFields} 
          onSave={saveLayout} 
          onReset={resetToDefault} 
          reportName="Workspace Tasks"
        />

        {successToast && (
          <div role="status" className="fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-2 rounded-[10px] border border-border border-l-[3px] border-l-success bg-elevated px-4 py-3 text-foreground shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            <span className="text-[13.5px]">{successToast}</span>
          </div>
        )}

      {viewMode === "list" ? (
        <>
          {/* Mobile / Tablet Card View (<1024px) */}
          <div className="block lg:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="theme-card-structural">
                <EmptyState kind="no-results" compact title="No tasks match these filters" description="Clear filters or switch the scope to Entire organisation." />
              </div>
            ) : (
              filtered.map((task) => {
                const isSelected = selectedTaskIds.has(task.id);
                const subName = getSubWorkspaceName(task);
                const wsName = (task.workspace?.name || task.workspace?.code || '—').split(' - ')[0];
                const isMenuOpen = openMenuTaskId === task.id;

                return ( // ui-audit-ignore-next-line mobile card: whole card opens the task, title is also a link
                  <div 
                    key={task.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      "theme-card-structural relative cursor-pointer select-none space-y-3 p-4 transition-[border-color,box-shadow] hover:border-border-active hover:shadow-md",
                      isSelected && "border-primary ring-1 ring-primary"
                    )}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    {/* Top Row: Checkbox, Code, Status & Priority Badges, 3-Dots Menu */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                            className="rounded border-border text-theme-icon focus:ring-theme-btn-primary w-4 h-4 block"
                          />
                        </div>
                        <span className="shrink-0 font-mono text-[12px] font-medium text-accent-soft-text">
                          {task.code || `TSK-${task.id.substring(0,4).toUpperCase()}`}
                        </span>
                        {task.priority?.name && <PriorityIndicator priority={task.priority.name} className="text-[12.5px]" />}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={task.status?.name || "Open"} size="sm" />

                        {/* 3-Dots Action Popover */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuTaskId(isMenuOpen ? null : task.id);
                            }}
                            aria-label={`Actions for ${task.title || "task"}`}
                            aria-expanded={isMenuOpen}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden />
                          </button>
                          {isMenuOpen && (
                            <div className="absolute right-0 top-8 z-[var(--z-popover)] w-40 space-y-0.5 rounded-[10px] border border-border bg-elevated p-1 shadow-lg">
                              <Link
                                href={`/tasks/${task.id}?mode=view`}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-foreground hover:bg-surface-hover"
                                onClick={() => setOpenMenuTaskId(null)}
                              >
                                <Eye className="h-3.5 w-3.5 text-muted" aria-hidden />
                                <span>View</span>
                              </Link>
                              {canUpdateRow(task) && (
                                <Link
                                  href={`/tasks/${task.id}`}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-foreground hover:bg-surface-hover"
                                  onClick={() => setOpenMenuTaskId(null)}
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-muted" aria-hidden />
                                  <span>Edit</span>
                                </Link>
                              )}
                              {canDeleteRow(task) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setOpenMenuTaskId(null);
                                    handleDeleteTask(e, task.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger-text hover:bg-danger-soft"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Title & Attachment */}
                    <div>
                      <h3 className="line-clamp-2 text-[14px] font-semibold text-foreground">
                        {task.title || 'Untitled task'}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        <span className="max-w-[140px] truncate text-subtle">{wsName}</span>
                        {subName !== '—' && (
                          <>
                            <span>›</span>
                            <span className="truncate max-w-[120px]">{subName}</span>
                          </>
                        )}
                        {task.attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-sunken px-1.5 text-subtle tabular" title={`${task.attachmentCount} attachment(s)`}>
                            <Paperclip className="h-3 w-3" aria-hidden /> {task.attachmentCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar (if exists) */}
                    {task.custom_fields?.progress_percentage !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[12px] text-muted">
                          <span>Progress</span>
                          <span>{task.custom_fields.progress_percentage}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full bg-success" style={{ width: `${task.custom_fields.progress_percentage}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Bottom row: assignee, department, due date */}
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-[12.5px]">
                      <div className="flex min-w-0 items-center gap-2">
                        {(() => {
                          const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                          return <UserCell name={a?.full_name} photo={a?.profile_photo} />;
                        })()}
                        {task.department?.name && (
                          <span className="max-w-[110px] truncate rounded bg-sunken px-1.5 text-[12px] text-subtle">{task.department.name}</span>
                        )}
                      </div>
                      <DueDateCell value={task.end_date} done={isTaskCompleted(task)} className="shrink-0 text-right" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (>=1024px) */}
          <div className="hidden lg:block">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div ref={parentRef} className="relative h-[calc(100dvh-220px)] min-h-[420px] overflow-auto rounded-[10px] border border-border bg-surface shadow-sm">
                <AppTable className="w-full min-w-max border-separate border-spacing-0 table-fixed">
                  <AppTableHeader className="sticky top-0 z-[var(--z-sticky)] bg-sunken">
                    <AppTableRow>
                      <AppTableHead className="sticky left-0 top-0 z-[calc(var(--z-sticky)+2)] w-[40px] min-w-[40px] max-w-[40px] bg-sunken p-0 text-center">
                        <input 
                          type="checkbox" 
                          checked={filtered.length > 0 && selectedTaskIds.size === filtered.length}
                          ref={input => {
                            if (input) {
                              input.indeterminate = selectedTaskIds.size > 0 && selectedTaskIds.size < filtered.length;
                            }
                          }}
                          onChange={handleSelectAll}
                          aria-label="Select all tasks"
                          className="mx-auto block h-4 w-4"
                        />
                      </AppTableHead>
                      <SortableContext items={visibleColumns.map(c => c.field_id)} strategy={horizontalListSortingStrategy}>
                        {visibleColumns.map((col, index) => (
                          <DraggableTableHead 
                            key={col.field_id} 
                            col={col} 
                            isFirst={index === 0} 
                            filterValues={columnFilters[col.field_id || col.field_key] || []}
                            onFilterChange={(vals) => handleColumnFilterChange(col.field_id || col.field_key, vals)}
                            options={columnOptions[col.field_id || col.field_key]}
                          />
                        ))}
                      </SortableContext>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                  {virtualizer.getVirtualItems().length > 0 && virtualizer.getVirtualItems()[0].start > 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} style={{ height: `${virtualizer.getVirtualItems()[0].start}px` }} />
                    </tr>
                  )}
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const task = filtered[virtualRow.index];
                    return (
                      <AppTableRow 
                        key={task.id} 
                        data-state={selectedTaskIds.has(task.id) ? "selected" : undefined}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="cursor-pointer"
                      >
                        <AppTableCell className="sticky left-0 z-[2] w-[40px] min-w-[40px] max-w-[40px] bg-surface p-0 text-center group-hover:bg-surface-hover group-data-[state=selected]:bg-selected" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedTaskIds.has(task.id)}
                            onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                            aria-label={`Select ${task.title || "task"}`}
                            className="mx-auto block h-4 w-4"
                          />
                        </AppTableCell>
                        {visibleColumns.map((col, index) => {
                          const renderCell = () => {
                            switch(col.field_key) {
                            case "code": return (
                              <AppTableCell className="whitespace-nowrap font-mono text-[12.5px] font-medium text-accent-soft-text">{task.code || `TSK-${task.id.substring(0,4).toUpperCase()}`}</AppTableCell>
                            );
                            case "title_description": return (
                              <AppTableCell className="text-left">
                                <div className="flex items-center gap-2 max-w-[320px] md:max-w-none">
                                  <div className="min-w-0 flex-1 whitespace-normal break-words text-[13.5px] font-medium leading-snug text-foreground" title={task.title || ''}>{task.title || '—'}</div>
                                  {task.attachmentCount > 0 && (
                                    <div className="flex shrink-0 items-center justify-center rounded px-1 py-0.5 text-muted" title={`${task.attachmentCount} attachment(s)`}>
                                      <Paperclip className="h-3.5 w-3.5" aria-label={`${task.attachmentCount} attachment(s)`} />
                                    </div>
                                  )}
                                </div>
                                {task.custom_fields?.progress_percentage !== undefined && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                                      <div className="h-full rounded-full bg-success" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                                    </div>
                                    <span className="text-[11.5px] text-muted tabular">{task.custom_fields.progress_percentage}%</span>
                                  </div>
                                )}
                              </AppTableCell>
                            );
                            case "workspace": {
                              const wsName = task.workspace?.name || task.workspace?.code || '—';
                              const parts = wsName.split(' - ');
                              const mainWorkspace = parts[0];
                              return (
                                <AppTableCell className="px-3 text-subtle" title={mainWorkspace}>
                                  <div className="max-w-[160px] truncate">{mainWorkspace}</div>
                                </AppTableCell>
                              );
                            }
                            case "sub_workspace": {
                              const finalSubName = getSubWorkspaceName(task);
                              return (
                                <AppTableCell className="px-3 text-subtle" title={finalSubName}>
                                  <div className="max-w-[160px] truncate">{finalSubName}</div>
                                </AppTableCell>
                              );
                            }
                            case "department": return (
                              <AppTableCell className="whitespace-nowrap px-3">
                                <Popover.Root>
                                  <Popover.Trigger asChild disabled={!canUpdateRow(task)}>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); }}
                                      disabled={!canUpdateRow(task)}
                                      aria-label={canUpdateRow(task) ? `Change department, currently ${task.department?.name || "none"}` : undefined}
                                      title={canUpdateRow(task) ? "Change department" : undefined}
                                      className="group/cell -mx-1.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left enabled:hover:bg-sunken disabled:cursor-default"
                                    >
                                      <span className={cn("truncate", task.department?.name ? "text-subtle" : "text-muted")}>{task.department?.name || '—'}</span>
                                      {canUpdateRow(task) && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100" aria-hidden />}
                                    </button>
                                  </Popover.Trigger>
                                  {canUpdateRow(task) && (
                                    <Popover.Portal>
                                      <Popover.Content align="start" sideOffset={4} className="z-[var(--z-popover)] flex w-56 flex-col gap-1 rounded-[10px] border border-border bg-elevated p-1.5 text-foreground shadow-lg outline-none" onClick={(e) => e.stopPropagation()}>
                                        <div className="theme-label mb-0.5 border-b border-border px-2 pb-1.5 pt-1">Change department</div>
                                        <div className="max-h-60 overflow-y-auto pr-1">
                                          {departments.map(d => (
                                            <AppButton 
                                              key={d.id}
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (d.id === task.department_id) return;
                                                setInlineTask(task);
                                                setInlineNewDepartment(d.id);
                                                setInlineRemark("");
                                                setDepartmentModalOpen(true);
                                              }}
                                              className={cn("flex h-auto w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px]", d.id === task.department_id ? "bg-accent-soft font-semibold text-accent-soft-text" : "text-foreground hover:bg-surface-hover")}
                                            >
                                              <span className="truncate">{d.name}</span>
                                              {d.id === task.department_id && <CheckCircle2 className="h-3.5 w-3.5" aria-label="Current" />}
                                            </AppButton>
                                          ))}
                                        </div>
                                      </Popover.Content>
                                    </Popover.Portal>
                                  )}
                                </Popover.Root>
                              </AppTableCell>
                            );
                            case "priority": return (
                              <AppTableCell className="px-3">
                                <PriorityIndicator priority={task.priority?.name} />
                              </AppTableCell>
                            );
                            case "due_date": return (
                              <AppTableCell className="whitespace-nowrap px-3"><DueDateCell value={task.end_date} done={isTaskCompleted(task)} /></AppTableCell>
                            );
                            case "status": return (
                              <AppTableCell className="px-3">
                                <div className="flex min-w-0 items-center">
                                  <Popover.Root>
                                    <Popover.Trigger asChild disabled={!canUpdateRow(task)}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); }}
                                        disabled={!canUpdateRow(task)}
                                        aria-label={canUpdateRow(task) ? `Change status, currently ${task.status?.name || "none"}` : undefined}
                                        title={canUpdateRow(task) ? "Change status" : undefined}
                                        className="group/cell -mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 enabled:hover:bg-sunken disabled:cursor-default"
                                      >
                                        <StatusBadge status={task.status?.name || null} className="max-w-full truncate" />
                                        {canUpdateRow(task) && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100" aria-hidden />}
                                      </button>
                                    </Popover.Trigger>
                                  {canUpdateRow(task) && (
                                    <Popover.Portal>
                                      <Popover.Content align="start" sideOffset={4} className="z-[var(--z-popover)] flex w-56 flex-col gap-1 rounded-[10px] border border-border bg-elevated p-1.5 text-foreground shadow-lg outline-none" onClick={(e) => e.stopPropagation()}>
                                        <div className="mb-0.5 flex items-center justify-between border-b border-border px-2 pb-1.5 pt-1">
                                          <span className="theme-label">Change status</span>
                                          <Link href={`/tasks/${task.id}`} className="text-[12px] font-medium text-accent-soft-text hover:underline">Open task</Link>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto pr-1">
                                          {masterStatuses.map(s => (
                                            <AppButton 
                                              variant="ghost" 
                                              key={s.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (s.id === task.status_id) return;
                                                setInlineTask(task);
                                                setInlineNewStatus(s.id);
                                                setInlineRemark("");
                                                setStatusModalOpen(true);
                                              }}
                                              className={cn("flex h-auto w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px]", s.id === task.status_id ? "bg-accent-soft font-semibold text-accent-soft-text" : "text-foreground hover:bg-surface-hover")}
                                            >
                                              <StatusBadge status={s.name} size="sm" />
                                              {s.id === task.status_id && <CheckCircle2 className="h-3.5 w-3.5" aria-label="Current" />}
                                            </AppButton>
                                          ))}
                                        </div>
                                      </Popover.Content>
                                    </Popover.Portal>
                                  )}
                                </Popover.Root>
                              </div>
                            </AppTableCell>
                          );
                          case "assignee": return (
                            <AppTableCell className="px-3">
                              {(() => {
                                const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                                return <UserCell name={a?.full_name} photo={a?.profile_photo} />;
                              })()}
                            </AppTableCell>
                          );
                          case "creator_name": return (
                            <AppTableCell className="px-3"><UserCell name={task.creator?.full_name} emptyLabel="—" /></AppTableCell>
                          );
                          case "start_date": return (
                            <AppTableCell className="whitespace-nowrap px-3"><DateCell value={task.start_date} /></AppTableCell>
                          );
                          case "duration": {
                            let text = "—";
                            if (task.start_date && task.end_date) {
                              const diff = Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24));
                              text = `${diff} ${diff === 1 ? "day" : "days"}`;
                            }
                            return <AppTableCell className="px-3 text-subtle tabular">{text}</AppTableCell>;
                          }
                          case "progress": return (
                            <AppTableCell className="w-[120px]">
                              {task.progress_percentage !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                                    <div className="h-full rounded-full bg-success" style={{ width: `${task.progress_percentage}%` }}></div>
                                  </div>
                                  <span className="w-8 text-right text-[11.5px] text-muted tabular">{task.progress_percentage}%</span>
                                </div>
                              ) : "—"}
                            </AppTableCell>
                          );
                          case "executors": return (
                            <AppTableCell className="px-3">
                              <UserStack users={(task.executors || []).map((u: any) => ({ name: u.full_name || u.name, photo: u.profile_photo }))} />
                            </AppTableCell>
                          );
                          case "reviewers":
                          case "watchers": return (
                            <AppTableCell className="px-3">
                              <UserStack users={(task.watchers || task.reviewers || task.task_watchers || []).map((u: any) => ({ name: u.full_name || u.name, photo: u.profile_photo }))} />
                            </AppTableCell>
                          );
                          case "attachments": return (
                            <AppTableCell className="px-3">
                              {task.attachmentCount > 0 ? (
                                <div className="inline-flex items-center gap-1.5 text-[12.5px] text-subtle tabular">
                                  <Paperclip className="h-3.5 w-3.5 text-muted" aria-hidden />
                                  {task.attachmentCount}
                                </div>
                              ) : <span className="text-muted text-xs">—</span>}
                            </AppTableCell>
                          );
                          case "comments": return (
                            <AppTableCell className="px-3">
                              {task.commentCount > 0 ? (
                                <div className="inline-flex items-center gap-1.5 text-[12.5px] text-subtle tabular">
                                  <MessageSquare className="h-3.5 w-3.5 text-muted" aria-hidden />
                                  {task.commentCount}
                                </div>
                              ) : <span className="text-muted text-xs">—</span>}
                            </AppTableCell>
                          );
                          case "external_link": return (
                            <AppTableCell >
                              {task.custom_fields?.link_url ? (
                                <a href={getSafeExternalUrl(task.custom_fields.link_url)} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[200px] items-center gap-1 truncate text-accent-soft-text hover:underline" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{task.custom_fields.link_url}</span>
                                </a>
                              ) : <span className="text-muted">—</span>}
                            </AppTableCell>
                          );
                          case "created_at": return (
                            <AppTableCell className="whitespace-nowrap px-3"><DateCell value={task.created_at} /></AppTableCell>
                          );
                          case "updated_at": return (
                            <AppTableCell className="whitespace-nowrap px-3"><DateCell value={task.updated_at} /></AppTableCell>
                          );
                          case "actions": return (
                            <AppTableCell className="px-2">
                              <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <Link
                                  href={`/tasks/${task.id}?mode=view`}
                                  className={ROW_ICON_BTN}
                                  title="View"
                                  aria-label={`View ${task.title || "task"}`}
                                >
                                  <Eye className="h-4 w-4" aria-hidden />
                                </Link>
                                {canUpdateRow(task) && (
                                  <Link
                                    href={`/tasks/${task.id}`}
                                    className={ROW_ICON_BTN}
                                    title="Edit"
                                    aria-label={`Edit ${task.title || "task"}`}
                                  >
                                    <Edit2 className="h-4 w-4" aria-hidden />
                                  </Link>
                                )}
                                {canDeleteRow(task) && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTask(e, task.id)}
                                    disabled={deleteLoadingId === task.id}
                                    className={cn(ROW_ICON_BTN, "hover:bg-danger-soft hover:text-danger-text disabled:opacity-50")}
                                    title="Delete"
                                    aria-label={`Delete ${task.title || "task"}`}
                                  >
                                    {deleteLoadingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                                  </button>
                                )}
                              </div>
                            </AppTableCell>
                          );
                          default: {
                            let val = undefined;
                            if (col.field_key === "watchers") {
                              val = (task.watchers || task.reviewers || task.task_watchers || []).map((u: any) => u.full_name || u.name).filter(Boolean).join(", ");
                            } else if (col.field_key === "executors") {
                              val = (task.executors || []).map((u: any) => u.full_name || u.name).filter(Boolean).join(", ");
                            } else if (task.custom_fields && task.custom_fields[col.field_key] !== undefined) {
                              val = task.custom_fields[col.field_key];
                            } else if (task[col.field_key] !== undefined) {
                              val = task[col.field_key];
                            }
                            
                            if (val === undefined || val === null || val === "") val = "—";
                            else if (col.data_type === "boolean") val = val ? "Yes" : "No";
                            else if (col.data_type === "date") val = formatDate(val);
                            else if (Array.isArray(val)) {
                              val = val.map((v: any) => typeof v === "object" ? (v?.full_name || v?.name || v?.label || JSON.stringify(v)) : String(v)).join(", ");
                            }
                            else if (typeof val === "object") {
                              val = val.full_name || val.name || val.label || JSON.stringify(val);
                            }
                            
                            return (
                              <AppTableCell className="px-3 text-subtle">
                                <div className="max-w-[200px] truncate" title={String(val)}>
                                  {col.data_type === "link" && val !== "—" ? (
                                    <a href={getSafeExternalUrl(val)} target="_blank" rel="noreferrer" className="text-accent-soft-text hover:underline" onClick={(e) => e.stopPropagation()}>{val}</a>
                                  ) : col.data_type === "badge" && val !== "—" ? (
                                    <AppBadge variant="neutral">{val}</AppBadge>
                                  ) : (
                                    String(val)
                                  )}
                                </div>
                              </AppTableCell>
                            );
                          }
                        }
                        };
                        const cellNode = renderCell() as React.ReactElement<any>;
                        const isFirst = index === 0;
                        const isActions = col.field_key === "actions";
                        return React.cloneElement(cellNode, {
                          key: col.field_id,
                          className: cn(
                            cellNode.props.className, 
                            isFirst ? "sticky left-[40px] z-[2] bg-surface group-hover:bg-surface-hover group-data-[state=selected]:bg-selected" : "",
                            isActions ? "sticky right-0 z-[2] bg-surface shadow-[inset_1px_0_0_var(--border-subtle)] group-hover:bg-surface-hover group-data-[state=selected]:bg-selected" : ""
                          ),
                        });
                      })}
                    </AppTableRow>
                  );
                })}
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td 
                      colSpan={visibleColumns.length + 1} 
                      style={{ 
                        height: `${virtualizer.getTotalSize() - virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1].end}px` 
                      }} 
                    />
                  </tr>
                )}
              </AppTableBody>
            </AppTable>
          </div>
        </DndContext>
      </div>
    </>
  ) : viewMode === "board" ? (
    <div className="h-[calc(100vh-200px)]">
      <TaskBoardView 
        tasks={filtered} 
        statuses={masterStatuses} 
        canUpdateTask={canUpdateRow}
        onStatusChange={async (taskId, newStatusId) => {
          const t = filtered.find(x => x.id === taskId) || tasks.find(x => x.id === taskId);
          if (!t) return;
          if (!canUpdateRow(t)) {
            toast.error("You aren't allowed to update this task.");
            return;
          }
          setInlineTask(t);
          setInlineNewStatus(newStatusId);
          setInlineRemark("");
          setStatusModalOpen(true);
        }}
        onTaskClick={(task) => {
          setSelectedTask(task);
        }}
      />
    </div>
  ) : (
    <div className="h-[calc(100vh-200px)]">
      <TaskTimelineView 
        tasks={filtered}
        onTaskClick={(task) => {
          setSelectedTask(task);
        }}
      />
    </div>
  )}

        {filtered.length === 0 && !loading && viewMode !== "list" && (
          <EmptyState kind="no-results" title="No tasks match these filters" description="Clear filters or switch the scope to Entire organisation." />
        )}
        

      {/* Side Drawer Component */}
      {selectedTask && (
        <>
          {/* ui-audit-ignore-next-line backdrop: click-outside closes the drawer; Close button is the keyboard path */}
          <div className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)]" onClick={() => setSelectedTask(null)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label={selectedTask.title || "Task"} className="fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full flex-col border-l border-border bg-elevated text-foreground shadow-lg md:w-[460px]">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <div className="font-mono text-[12px] font-medium text-accent-soft-text">{selectedTask.code}</div>
                <h2 className="mt-0.5 truncate text-[16px] font-semibold text-heading">{selectedTask.title}</h2>
                <div className="mt-0.5 text-[12.5px] text-muted">{selectedTask.workspace?.name}</div>
              </div>
              <AppButton variant="ghost" size="icon" onClick={() => setSelectedTask(null)} className="shrink-0" aria-label="Close"><X className="h-4 w-4" aria-hidden /></AppButton>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-2">
                <h4 className="theme-label">Description</h4>
                <div className="text-[13px] text-foreground  leading-relaxed">
                  <SafeHtml html={selectedTask.description || 'No description added.'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col rounded-md border border-border bg-surface p-3">
                  <span className="mb-1 text-[12.5px] text-muted">Priority</span>
                  <PriorityIndicator priority={selectedTask.priority?.name} />
                </div>
                <div className="flex flex-col rounded-md border border-border bg-surface p-3">
                  <span className="mb-1 text-[12.5px] text-muted">Department</span>
                  <div className="truncate text-[13.5px] text-foreground">{selectedTask.department?.name || '—'}</div>
                </div>
                <div className="flex flex-col rounded-md border border-border bg-surface p-3">
                  <span className="mb-1 text-[12.5px] text-muted">Status</span>
                  <div><StatusBadge status={selectedTask.status?.name || null} /></div>
                </div>
                <div className="flex flex-col rounded-md border border-border bg-surface p-3">
                  <span className="mb-1 text-[12.5px] text-muted">Due</span>
                  <DueDateCell value={selectedTask.end_date} done={isTaskCompleted(selectedTask)} />
                </div>
              </div>
              
              {/* Checklists and Custom Fields */}
              {selectedTask.custom_fields && Object.keys(selectedTask.custom_fields).length > 0 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="theme-label mb-2">Checklist and details</h4>
                  
                  {selectedTask.custom_fields.checklist && Array.isArray(selectedTask.custom_fields.checklist) && (
                    <div className="space-y-2 mb-4">
                      {selectedTask.custom_fields.checklist.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-surface p-2">
                          <input type="checkbox" checked={item.completed} readOnly aria-label={item.title} className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className={`text-[13px] ${item.completed ? 'line-through text-muted' : 'text-foreground '}`}>{item.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3">
                    {Object.entries(selectedTask.custom_fields).filter(([k]) => k !== 'checklist' && k !== 'progress_percentage').map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[12.5px] text-muted">{(() => { const t = key.replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); })()}</span>
                        <div className="text-[13px] text-foreground ">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <Link href={`/tasks/${selectedTask.id}`} className="w-full flex-1">
                <AppButton variant="primary" className="w-full">Open task</AppButton>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>

      {/* Floating Action Bar for Bulk Actions */}
      {selectedTaskIds.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-toast)] flex -translate-x-1/2 items-center gap-4 rounded-[10px] border border-border bg-elevated px-4 py-2.5 shadow-lg md:bottom-6">
          <div className="flex items-center gap-2 text-[13.5px]">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-soft px-1.5 text-[12px] font-semibold text-accent-soft-text tabular">
              {selectedTaskIds.size}
            </span>
            <span className="text-subtle">selected</span>
          </div>
          <div className="h-6 w-px bg-border" aria-hidden></div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <AppButton variant="secondary" size="sm" onClick={() => setBulkStatusModalOpen(true)}>Update</AppButton>
            )}
            {canDelete && (
              <AppButton variant="secondary" size="sm" onClick={handleBulkDelete} className="text-danger-text hover:bg-danger-soft">Delete</AppButton>
            )}
            <AppButton variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())}>Clear selection</AppButton>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Update {selectedTaskIds.size} tasks</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-[13px] text-muted">Only the fields you change are updated.</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-subtle">Current status</label>
                <select
                  value={bulkOldStatus}
                  onChange={(e) => setBulkOldStatus(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">Any status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-subtle">New status</label>
                <select
                  value={bulkNewStatus}
                  onChange={(e) => setBulkNewStatus(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">Leave unchanged</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-subtle">Current department</label>
                <select
                  value={bulkOldDepartment}
                  onChange={(e) => setBulkOldDepartment(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">Any department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-subtle">New department</label>
                <select
                  value={bulkNewDepartment}
                  onChange={(e) => setBulkNewDepartment(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">Leave unchanged</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="text-[13px] font-medium text-subtle">Remark (optional)</label>
              <textarea
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                placeholder="Why are you updating these tasks?"
                className="min-h-[88px] w-full resize-y px-3 py-2 text-[13.5px]"
              />
            </div>
            <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-[12.5px] text-warning-text">Tasks you don't own are skipped unless you're a Super Admin.</div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setBulkStatusModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleBulkStatusSave}
              disabled={inlineLoading || (!bulkNewStatus && !bulkNewDepartment)}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update tasks
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-[13.5px] text-foreground"><span className="text-muted">Task:</span> {inlineTask?.title || '—'}</div>
            
            {canChangeFields ? (
              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-subtle">
                  New status <span className="text-danger-text" aria-hidden>*</span>
                </label>
                <select
                  value={inlineNewStatus}
                  onChange={(e) => setInlineNewStatus(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="" disabled>Select a status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-[12.5px] text-warning-text">
                You're not the assignee of this task, so you can only add a remark.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-[13px] font-medium text-subtle">Remark <span className="text-danger-text" aria-hidden>*</span></label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="min-h-[88px] w-full resize-y px-3 py-2 text-[13.5px]"
              />
            </div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setStatusModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleStatusSave}
              disabled={inlineLoading || !inlineRemark.trim() || (canChangeFields && !inlineNewStatus)}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {canChangeFields ? "Change status" : "Add remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Department Update Modal */}
      <Dialog open={departmentModalOpen} onOpenChange={setDepartmentModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Change department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-[13.5px] text-foreground"><span className="text-muted">Task:</span> {inlineTask?.title || '—'}</div>
            
            {canChangeFields ? (
              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-subtle">New department</label>
                <select
                  value={inlineNewDepartment}
                  onChange={(e) => setInlineNewDepartment(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">No department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-[12.5px] text-warning-text">
                You're not the assignee of this task, so you can only add a remark.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-[13px] font-medium text-subtle">Remark <span className="text-danger-text" aria-hidden>*</span></label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="min-h-[88px] w-full resize-y px-3 py-2 text-[13.5px]"
              />
            </div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setDepartmentModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleDepartmentSave}
              disabled={inlineLoading || !inlineRemark.trim()}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {canChangeFields && inlineNewDepartment !== inlineTask?.department_id ? "Change department" : "Add remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Where should the task go?</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">Workspace <span className="text-danger-text" aria-hidden>*</span></label>
              <select
                value={creationWorkspaceId}
                onChange={(e) => {
                  setCreationWorkspaceId(e.target.value);
                  setCreationSubWorkspaceId("");
                }}
                className="h-9 w-full px-3 text-[13.5px]"
              >
                <option value="">Select a workspace</option>
                {allWorkspaces.filter(w => !w.parent_workspace_id).map(w => (
                  <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>
                ))}
              </select>
            </div>
            
            {creationWorkspaceId && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-subtle">Sub-workspace (optional)</label>
                <select
                  value={creationSubWorkspaceId}
                  onChange={(e) => setCreationSubWorkspaceId(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">None</option>
                  {allWorkspaces.filter(sw => sw.parent_workspace_id === creationWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name || sw.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border px-6 py-3">
            <AppButton variant="ghost" onClick={() => setShowWorkspaceSelector(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              disabled={!creationWorkspaceId} 
              onClick={() => {
                setShowWorkspaceSelector(false);
                setIsCreatingTask(true);
              }}
            >
              Continue
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        tone="danger"
        title={`Delete “${pendingDelete?.title ?? ""}”?`}
        description="The task, its checklist and remarks are removed. This can't be undone from here."
        confirmLabel="Delete task"
        onConfirm={async () => { if (pendingDelete) await performDeleteTask(pendingDelete.id); }}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        tone="danger"
        title={`Delete ${selectedTaskIds.size} ${selectedTaskIds.size === 1 ? "task" : "tasks"}?`}
        description="Selected tasks, their checklists and remarks are removed. This can't be undone from here."
        confirmLabel={`Delete ${selectedTaskIds.size === 1 ? "task" : "tasks"}`}
        onConfirm={performBulkDelete}
      />

      {isCreatingTask && (
        <TaskCreationWizard 
          workspaceId={creationSubWorkspaceId || creationWorkspaceId || ""} 
          onClose={() => setIsCreatingTask(false)}
          onSuccess={async (data) => {
            try {
              setIsCreatingTask(false);
              await createTask({ ...data, workspace_id: creationSubWorkspaceId || creationWorkspaceId });
              // Force refresh of tasks after creating
              fetchTasksData(selectedWorkspaceId);
            } catch (e: any) {
              console.error("[TaskListViewClient] Error creating task:", e);
              if (e.message && e.message.includes("was not found on the server")) {
                 window.location.reload();
                 return;
              }
              toast.error(e.message || "Failed to create task");
            }
          }}
        />
      )}
    </ExperienceProvider>
  );
}

