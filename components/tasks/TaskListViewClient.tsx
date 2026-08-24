"use client";
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
import { Loader2, Eye, Filter, Search, Users, Calendar, ArrowLeft, Download, FileText, FileSpreadsheet, Edit2, Trash2, Paperclip, Shield } from "lucide-react";
import Link from "next/link";
import { deleteTask, getTaskStatuses, updateTaskStatusInline, getDepartments, executeTaskBatchOperation, createTask } from "@/lib/actions/tasks";
import { fetchTasksByWorkspace, fetchAllTasks, fetchWorkspaces } from "@/lib/actions/workspaces";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
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
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";
import TaskBoardView from "@/components/tasks/TaskBoardView";
import TaskTimelineView from "@/components/tasks/TaskTimelineView";
import { LayoutGrid, List as ListIcon, CalendarDays } from "lucide-react";
import { useSavedFilters, SavedFilter } from "@/hooks/useSavedFilters";
import { SavedFiltersDropdown } from "@/components/ui/SavedFiltersDropdown";

type Task = any;

interface TaskFilterPayload {
  scope: "ALL" | "ASSIGNEE" | "ENROLLED";
  query: string;
  columnFilters: Record<string, string[]>;
  kpiFilter: string | null;
  selectedWorkspaceId: string | null;
  selectedStatus: string;
  selectedPriority: string;
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
  const w = isActions ? Math.max(col.column_width || col.default_width || 120, 110) : (col.column_width || col.default_width || 150);
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
    zIndex: isDragging ? 50 : (isFirst ? 30 : 25),
  };
  return (
    <AppTableHead 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "select-none bg-elevated border-b border-border font-bold text-xs uppercase text-foreground px-3 py-2 cursor-grab active:cursor-grabbing hover:opacity-90/10 transition-colors align-middle group/header relative", 
        !isTitle ? "text-center" : "text-left",
        ["code", "due_date", "created_at", "updated_at", "status", "priority", "department"].includes(col.field_key) ? "whitespace-nowrap" : ""
      )}
      {...attributes} 
      {...listeners}
    >
      <div className={cn("flex items-center gap-2 w-full", isTitle ? "justify-between" : "justify-center")}>
        <span className="truncate flex-1">{isTitle ? "Title" : col.display_name}</span>
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

const INITIAL_TASK_FIELDS: UIFieldDefinition[] = [
  { field_key: "code", display_name: "Code", data_type: "text", is_default: true, default_width: 100 },
  { field_key: "title_description", display_name: "Title", data_type: "custom", is_default: true, default_width: 300 },
  { field_key: "workspace", display_name: "Workspace", data_type: "text", is_default: true, default_width: 160 },
  { field_key: "sub_workspace", display_name: "Sub-Workspace", data_type: "text", is_default: true, default_width: 160 },
  { field_key: "department", display_name: "Department", data_type: "badge", is_default: true, default_width: 160 },
  { field_key: "priority", display_name: "Priority", data_type: "badge", is_default: true, default_width: 120 },
  { field_key: "due_date", display_name: "Due Date", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "status", display_name: "Status", data_type: "badge", is_default: true, default_width: 150 },
  { field_key: "assignee", display_name: "Assignee", data_type: "user", is_default: true, default_width: 120 },
  { field_key: "created_at", display_name: "Created At", data_type: "date", is_default: true, default_width: 130 },
  { field_key: "actions", display_name: "Actions", data_type: "custom", is_default: true, default_width: 120 },
  { field_key: "start_date", display_name: "Start Date", data_type: "date", is_default: false, default_width: 120 },
  { field_key: "duration", display_name: "Duration", data_type: "custom", is_default: false, default_width: 100 },
  { field_key: "progress", display_name: "Checklist Progress", data_type: "custom", is_default: false, default_width: 130 },
  { field_key: "executors", display_name: "Executors", data_type: "custom", is_default: false, default_width: 150 },
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

export default function TaskListViewClient({ initialTasks }: { initialTasks: Task[] }) {
  const [viewMode, setViewMode] = useState<"list" | "board" | "timeline">("list");
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [scope, setScope] = useState<"ALL" | "ASSIGNEE" | "ENROLLED">("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const canDelete = roleCode === "SUPER_ADMIN" || hasPermission("TASKS_DELETE");
  const canUpdate = roleCode === "SUPER_ADMIN" || hasPermission("TASKS_UPDATE");

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
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const handleColumnFilterChange = (fieldId: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [fieldId]: values }));
  };

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [showEscalatedOnly, setShowEscalatedOnly] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [viewState, setViewState] = useState<any>(null);
  
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  const {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    applySavedFilter,
    deleteSavedFilter
  } = useSavedFilters<TaskFilterPayload>("chandak_tasks", currentUserId, (payload) => {
    setScope(payload.scope);
    setQuery(payload.query);
    setColumnFilters(payload.columnFilters || {});
    setKpiFilter(payload.kpiFilter);
    setSelectedWorkspaceId(payload.selectedWorkspaceId || "");
    setSelectedStatus(payload.selectedStatus || "");
    setSelectedPriority(payload.selectedPriority || "");
  });

  const handleSaveCurrentFilter = () => {
    saveCurrentFilter({
      scope, query, columnFilters, kpiFilter, selectedWorkspaceId, selectedStatus, selectedPriority
    }, () => triggerToast("Filter saved successfully!"));
  };

  const applyFilter = (f: SavedFilter<TaskFilterPayload>) => {
    applySavedFilter(
      f,
      (payload) => {
        setScope(payload.scope);
        setQuery(payload.query);
        setColumnFilters(payload.columnFilters || {});
        setKpiFilter(payload.kpiFilter);
        setSelectedWorkspaceId(payload.selectedWorkspaceId || "");
        setSelectedStatus(payload.selectedStatus || "");
        setSelectedPriority(payload.selectedPriority || "");
      },
      () => {
        setScope("ALL");
        setQuery("");
        setColumnFilters({});
        setKpiFilter(null);
        setSelectedWorkspaceId("");
        setSelectedStatus("");
        setSelectedPriority("");
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
  }, []);

  const uniqueStatuses = useMemo(() => Array.from(new Set(tasks.map((t: any) => t.status?.name).filter(Boolean))) as string[], [tasks]);
  const uniquePriorities = useMemo(() => Array.from(new Set(tasks.map((t: any) => t.priority?.name).filter(Boolean))) as string[], [tasks]);
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
        else if (t.custom_fields && t.custom_fields[key] !== undefined) val = t.custom_fields[key];
        else val = t[key];

        if (val !== undefined && val !== null && val !== "") {
          uniqueVals.add(String(val));
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

  const [kpiFilter, setKpiFilter] = useState<string | null>(null);

  const baseFiltered = useMemo(() => {
    return tasks.filter(t => {
      if (scope === "ASSIGNEE") {
        const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
        if (a?.id !== currentUserId && t.assigned_to !== currentUserId) return false;
      }
      if (scope === "ENROLLED") {
        const isExecutor = t.executors?.some((e: any) => e.id === currentUserId);
        const isReviewer = t.reviewers?.some((r: any) => r.id === currentUserId);
        if (!isExecutor && !isReviewer) return false;
      }
      
      if (selectedStatus && t.status?.name !== selectedStatus) return false;
      if (selectedPriority && t.priority?.name !== selectedPriority) return false;
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
        
        const stringVal = String(val);
        if (!filterVals.includes(stringVal)) return false;
      }

      return true;
    });
  }, [tasks, scope, query, currentUserId, selectedWorkspaceId, selectedStatus, selectedPriority, showEscalatedOnly, dateFrom, dateTo, columnFilters, combinedFields]);

  const kpis = useMemo(() => {
    const total = baseFiltered.length;
    const open = baseFiltered.filter(t => !t.status?.is_closed && !t.status?.name?.toLowerCase().includes('progress') && !t.status?.name?.toLowerCase().includes('done')).length;
    const inProgress = baseFiltered.filter(t => t.status?.name?.toLowerCase().includes('progress')).length;
    const completed = baseFiltered.filter(t => t.status?.is_closed || t.status?.name?.toLowerCase().includes('done')).length;
    
    return [
      { label: "Total", value: total, icon: <LayoutList className="h-5 w-5" />, iconBgClass: "bg-sky-500/10", iconColorClass: "text-sky-600 dark:text-sky-400", onClick: () => setKpiFilter(null), isActive: kpiFilter === null },
      { label: "Open", value: open, icon: <Layers className="h-5 w-5" />, iconBgClass: "bg-theme-btn-primary/10", iconColorClass: "text-theme-icon", onClick: () => setKpiFilter(kpiFilter === 'Open' ? null : 'Open'), isActive: kpiFilter === 'Open' },
      { label: "In Progress", value: inProgress, icon: <Loader2 className="h-5 w-5" />, iconBgClass: "bg-warning/10", iconColorClass: "text-warning dark:text-warning", onClick: () => setKpiFilter(kpiFilter === 'In Progress' ? null : 'In Progress'), isActive: kpiFilter === 'In Progress' },
      { label: "Completed", value: completed, icon: <CheckCircle2 className="h-5 w-5" />, iconBgClass: "bg-success/10", iconColorClass: "text-success dark:text-success", onClick: () => setKpiFilter(kpiFilter === 'Completed' ? null : 'Completed'), isActive: kpiFilter === 'Completed' },
    ];
  }, [baseFiltered, kpiFilter]);

  const filtered = useMemo(() => {
    if (!kpiFilter) return baseFiltered;
    return baseFiltered.filter(t => {
      if (kpiFilter === 'Open') return !t.status?.is_closed && !t.status?.name?.toLowerCase().includes('progress') && !t.status?.name?.toLowerCase().includes('done');
      if (kpiFilter === 'In Progress') return t.status?.name?.toLowerCase().includes('progress');
      if (kpiFilter === 'Completed') return t.status?.is_closed || t.status?.name?.toLowerCase().includes('done');
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
        newTasks = await fetchTasksByWorkspace(currentWsId, 1, 10000, true);
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

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    
    try {
      setDeleteLoadingId(taskId);
      const res = await deleteTask(taskId);
      if (res?.error) {
        throw new Error(res.error);
      }
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e: any) {
      toast.error("Status update failed: " + e.message);
    } finally {
      setInlineLoading(false);
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

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTaskIds.size} tasks?`)) return;
    try {
      setLoading(true);
      const results = await Promise.all(Array.from(selectedTaskIds).map(id => deleteTask(id)));
      const failed = results.find(r => r?.error);
      if (failed) {
        throw new Error(failed.error);
      }
      setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
      setSelectedTaskIds(new Set());
      triggerToast(`Successfully deleted tasks.`);
    } catch (e: any) {
      toast.error("Bulk delete failed: " + e.message);
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
    setInlineNewStatus(task.status_id || "");
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

  const isOwner = inlineTask?.assigned_to === currentUserId;
  const isSuperAdmin = hasPermission("WORKSPACES_MANAGE");
  const isExecutive = inlineTask?.participants?.some((p: any) => p.user_id === currentUserId && p.participation_role === 'EXECUTOR');
  const canChangeFields = isOwner || isSuperAdmin || isExecutive;

  const handleStatusSave = async () => {
    if (!inlineTask) return;
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
    async function whoami() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (e) {
        setCurrentUserId(null);
      }
    }
    whoami();

    let wsId: string | null = null;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      wsId = params.get("workspaceId");
      setSelectedWorkspaceId(wsId || null);
    }
    
    fetchTasksData(wsId);
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
      case "executors": return t.executors?.map((u: any) => u.full_name).join(", ") || "—";
      case "reviewers": return t.reviewers?.map((u: any) => u.full_name).join(", ") || "—";
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
    return <div className="animate-spin h-8 w-8 border-2 border-theme-btn-primary border-t-transparent rounded-full mx-auto my-12" />;
  }

  if (!hasPermission("TASKS_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-danger/10 border border-rose-500/20 text-danger">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-muted">You do not have capabilities to view Workspace Tasks.</p>
      </div>
    );
  }

  return (
    <ExperienceProvider mode="operational">
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
          <div className="flex flex-col gap-1.5 shrink-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-clip-text">
              Workspace Tasks
            </h1>
            <p className="text-[13px] font-medium text-muted flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 theme-card-structural /50 dark:/10 px-2 py-0.5 rounded-md /50 shadow-sm">
                <Layers className="h-3 w-3" />
                {selectedWorkspaceId ? allWorkspaces.find(w => w.id === selectedWorkspaceId)?.workspace_name || allWorkspaces.find(w => w.id === selectedWorkspaceId)?.name || 'Selected Workspace' : 'All Workspaces'}
              </span>
              <span>•</span>
              <span>{filtered.length} total tasks</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <ReportKPIBar kpis={kpis} variant="compact" className="mb-0 shrink-0 shadow-sm border border-border/50 rounded-xl" />
            <div className="hidden sm:block h-8 w-[1px] bg-border mx-2"></div>
            
            <AppButton size="sm" onClick={() => {
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
            }} leftIcon={<Plus className="h-4 w-4" />} className="h-10 px-5 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_14px_0_rgba(0,182,212,0.3)] transition-all active:scale-[0.98]">
              New Task
            </AppButton>
          </div>
        </header>

        {/* Command Bar */}
        <div className="sticky top-0 z-30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-2 theme-card-structural /80 /50 rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {/* View Toggles */}
            <div className="flex bg-elevated/50 p-1 rounded-xl border border-border/50">
              <AppButton variant="ghost" 
                onClick={() => setViewMode("list")} 
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground hover:bg-surface/50"}`}
                title="List View"
              >
                <ListIcon className="h-4 w-4" />
              </AppButton>
              <AppButton variant="ghost" 
                onClick={() => setViewMode("board")} 
                className={`p-2 rounded-lg transition-all ${viewMode === "board" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground hover:bg-surface/50"}`}
                title="Board View"
              >
                <LayoutGrid className="h-4 w-4" />
              </AppButton>
              <AppButton variant="ghost" 
                onClick={() => setViewMode("timeline")} 
                className={`p-2 rounded-lg transition-all ${viewMode === "timeline" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground hover:bg-surface/50"}`}
                title="Timeline View"
              >
                <CalendarDays className="h-4 w-4" />
              </AppButton>
            </div>

            <div className="h-6 w-[1px] bg-border mx-1"></div>

            {/* Scope Toggles & Saved Filter Tabs */}
            <div className="flex items-center gap-1 bg-elevated/50 p-1 rounded-xl border border-border/50 overflow-x-auto custom-scrollbar">
              {(["ALL","ASSIGNEE","ENROLLED"] as const).map(sc => (
                <AppButton
                  key={sc}
                  variant="ghost"
                  onClick={() => setScope(sc)}
                  className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all whitespace-nowrap ${!activeSavedFilterId && scope === sc ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground hover:bg-surface/50"}`}
                >
                  {sc === "ALL" ? "All" : sc === "ASSIGNEE" ? "Assigned to Me" : "Enrolled"}
                </AppButton>
              ))}
              
              {savedFilters.length > 0 && <div className="h-4 w-[1px] bg-border/80 mx-1 shrink-0"></div>}
              
              {savedFilters.map(f => (
                <AppButton
                  key={f.id}
                  variant="ghost"
                  onClick={() => applyFilter(f)}
                  className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${activeSavedFilterId === f.id ? "bg-primary/10 text-primary shadow-sm" : "text-muted hover:text-foreground hover:bg-surface/50"}`}
                >
                  {f.name}
                </AppButton>
              ))}
            </div>

            <div className="h-6 w-[1px] bg-border mx-1"></div>

            {/* Saved Filters */}
            <SavedFiltersDropdown
              savedFilters={savedFilters}
              activeSavedFilterId={activeSavedFilterId}
              onSaveCurrent={handleSaveCurrentFilter}
              onApplyFilter={applyFilter}
              onDeleteFilter={deleteSavedFilter}
            />

          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                placeholder="Search tasks..." 
                value={query} 
                onChange={(e:any) => setQuery(e.target.value)} 
                className="w-full text-sm font-medium h-10 pl-9 pr-3 rounded-xl bg-elevated/50 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted" 
              />
            </div>
            
            <Popover.Root>
              <Popover.Trigger asChild>
                <AppButton variant="outline" className="h-10 px-4 rounded-xl /50 bg-elevated/50 shadow-sm font-semibold hover:theme-card-structural relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(selectedStatus || selectedPriority || showEscalatedOnly || dateFrom || dateTo || selectedWorkspaceId) && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center border-2 border-surface">
                      !
                    </span>
                  )}
                </AppButton>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={8} className="z-50 w-80 p-4 rounded-2xl theme-card-structural /95 /50 shadow-2xl animate-in zoom-in-95 data-[state=closed]:zoom-out-95 outline-none space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-foreground">Advanced Filters</h4>
                    <AppButton onClick={() => { setSelectedStatus(""); setSelectedPriority(""); setShowEscalatedOnly(false); setDateFrom(""); setDateTo(""); setColumnFilters({}); setSelectedWorkspaceId(""); fetchTasksData(null); }} className="text-xs font-semibold text-muted hover:text-foreground flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Reset
                    </AppButton>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Workspace</label>
                      <select value={selectedWorkspaceId || ""} onChange={(e) => { const v = e.target.value || null; setSelectedWorkspaceId(v); fetchTasksData(v); }} className="w-full h-9 px-3 text-sm rounded-lg bg-elevated/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">All Workspaces</option>
                        {allWorkspaces.map((ws: any) => <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Status</label>
                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg bg-elevated/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="">All</option>
                          {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Priority</label>
                        <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg bg-elevated/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="">All</option>
                          {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Date Range</label>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full h-9 px-2 text-sm rounded-lg bg-elevated/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
                        <span className="text-muted text-xs">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full h-9 px-2 text-sm rounded-lg bg-elevated/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer p-2 rounded-lg hover:bg-elevated/50 transition-colors">
                      <input type="checkbox" checked={showEscalatedOnly} onChange={e => setShowEscalatedOnly(e.target.checked)} className="rounded border-border text-primary focus:ring-primary w-4 h-4" />
                      Show Escalated Only
                    </label>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <Popover.Root>
              <Popover.Trigger asChild>
                <AppButton variant="outline" className="h-10 px-3 rounded-xl /50 bg-elevated/50 shadow-sm font-semibold hover:theme-card-structural">
                  <span className="flex items-center gap-1"><Upload className="h-4 w-4" /><span className="hidden sm:inline">Export</span></span>
                </AppButton>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={8} className="z-50 p-1 rounded-xl theme-card-structural /95 /50 shadow-xl min-w-[140px]">
                  <AppButton onClick={exportToExcel} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated/80 rounded-lg transition-colors">
                    <FileSpreadsheet className="h-4 w-4 text-success" /> Export to Excel
                  </AppButton>
                  <AppButton onClick={exportToPDF} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated/80 rounded-lg transition-colors">
                    <FileText className="h-4 w-4 text-danger" /> Export to PDF
                  </AppButton>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <AppButton 
              variant="outline"
              onClick={() => setIsConfigOpen(true)}
              className="h-10 px-3 rounded-xl /50 bg-elevated/50 shadow-sm font-semibold hover:theme-card-structural"
              title="Configure Columns"
            >
              <Settings2 className="h-4 w-4" />
            </AppButton>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedTaskIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center gap-3 bg-foreground dark:theme-card-structural /95 dark:text-background dark:text-foreground px-5 py-3 rounded-full shadow-2xl /10 dark:">
              <span className="text-sm font-bold bg-background/20 dark:bg-white/10 px-2.5 py-0.5 rounded-full">
                {selectedTaskIds.size} Selected
              </span>
              <div className="h-5 w-[1px] bg-background/20 dark:bg-border mx-1"></div>
              
              <AppButton 
                onClick={() => setBulkStatusModalOpen(true)}
                className="text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1.5 px-2"
              >
                <Edit2 className="h-4 w-4" /> Update
              </AppButton>
              
              <AppButton 
                onClick={handleBulkDelete}
                className="text-sm font-semibold text-danger hover:text-rose-300 transition-opacity flex items-center gap-1.5 px-2"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </AppButton>
              
              <AppButton 
                onClick={() => setSelectedTaskIds(new Set())}
                className="text-background/50 hover:text-background dark:text-muted dark:hover:text-foreground p-1 ml-2 transition-colors"
                title="Clear Selection"
              >
                <RotateCcw className="h-4 w-4" />
              </AppButton>
            </div>
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
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-theme-btn-primary text-theme-btn-primary-text px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
            <span className="text-xs font-semibold">{successToast}</span>
          </div>
        )}

      {viewMode === "list" ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div ref={parentRef} className="h-[calc(100vh-160px)] overflow-auto rounded-xl border border-border dark:border-border bg-elevated shadow-sm relative">
          <AppTable className="w-full min-w-max border-separate border-spacing-0 table-fixed">
            <AppTableHeader className="sticky top-0 z-40 bg-elevated">
              <AppTableRow>
                <AppTableHead className="text-center p-0 w-[40px] min-w-[40px] max-w-[40px] sticky left-0 top-0 z-50 bg-elevated">
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && selectedTaskIds.size === filtered.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedTaskIds.size > 0 && selectedTaskIds.size < filtered.length;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-border text-theme-icon focus:ring-theme-btn-primary w-3.5 h-3.5 mx-auto block"
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
                  className="cursor-pointer hover:bg-surface dark:hover:bg-surface/50"
                >
                  <AppTableCell className="p-0 text-center w-[40px] min-w-[40px] max-w-[40px] sticky left-0 z-20 bg-surface group-hover:bg-surface transition-colors" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedTaskIds.has(task.id)}
                      onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                      className="rounded border-border text-theme-icon focus:ring-theme-btn-primary w-3.5 h-3.5 mx-auto block"
                    />
                  </AppTableCell>
                  {visibleColumns.map((col, index) => {
                    const renderCell = () => {
                      switch(col.field_key) {
                      case "code": return (
                        <AppTableCell className="font-mono font-bold text-theme-icon whitespace-nowrap text-center">{task.code || `TSK-${task.id.substring(0,4).toUpperCase()}`}</AppTableCell>
                      );
                      case "title_description": return (
                        <AppTableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-[13px] font-semibold text-foreground whitespace-normal break-words w-full">{task.title || '-'}</div>
                            {task.attachmentCount > 0 && (
                              <div className="flex items-center justify-center p-0.5 px-1 rounded-md bg-theme-btn-primary/10 dark:bg-theme-btn-primary/20 text-theme-icon dark:text-theme-icon" title={`${task.attachmentCount} Attachment(s)`}>
                                <Paperclip className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          {task.custom_fields?.progress_percentage !== undefined && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-elevated dark:bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-success rounded-full" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-muted">{task.custom_fields.progress_percentage}%</span>
                            </div>
                          )}
                        </AppTableCell>
                      );
                      case "workspace": {
                        const wsName = task.workspace?.name || task.workspace?.code || '—';
                        const parts = wsName.split(' - ');
                        const mainWorkspace = parts[0];
                        return (
                          <AppTableCell className="text-subtle text-center px-2" title={mainWorkspace}>
                            <div className="max-w-[120px] truncate mx-auto">{mainWorkspace}</div>
                          </AppTableCell>
                        );
                      }
                      case "sub_workspace": {
                        const finalSubName = getSubWorkspaceName(task);
                        return (
                          <AppTableCell className="text-subtle text-center px-2" title={finalSubName}>
                            <div className="max-w-[120px] truncate mx-auto">{finalSubName}</div>
                          </AppTableCell>
                        );
                      }
                      case "department": return (
                        <AppTableCell className="text-subtle whitespace-nowrap text-center px-2">
                          <Popover.Root>
                            <Popover.Trigger asChild>
                              <AppButton variant="secondary" 
                                onClick={(e) => { e.stopPropagation(); }}
                                className={`${canUpdate ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity focus:outline-none max-w-full`} 
                                title={canUpdate ? "Update Department" : "Department"}
                              >
                                <AppBadge variant="neutral" className={`max-w-full truncate block ${canUpdate ? "border-dashed" : ""}`}>
                                  {task.department?.name || '—'}
                                </AppBadge>
                              </AppButton>
                            </Popover.Trigger>
                            {canUpdate && (
                              <Popover.Portal>
                                <Popover.Content align="center" sideOffset={4} className="z-[100] w-48 p-2 theme-card-structural dark:bg-[#0B0F19] border-border rounded-xl shadow-xl flex flex-col gap-1 outline-none animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 py-1 mb-1 border-b border-border/50">Update Department</div>
                                  <div className="max-h-60 overflow-y-auto pr-1">
                                    {departments.map(d => (
                                      <AppButton 
                                        key={d.id}
                                        onClick={async () => {
                                          if (d.id === task.department_id) return;
                                          try {
                                            setInlineLoading(true);
                                            const res = await executeTaskBatchOperation({
                                              taskId: task.id,
                                              departmentChange: { old_id: task.department_id, new_id: d.id, old_name: task.department?.name, new_name: d.name },
                                              remarks: "Inline update"
                                            });
                                            if (res?.error) throw new Error(res.error);
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, department_id: d.id, department: d } : t));
                                            triggerToast("Department updated");
                                          } catch (e: any) { toast.error("Failed: " + e.message); }
                                          finally { setInlineLoading(false); }
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${d.id === task.department_id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-surface/50 font-medium'}`}
                                      >
                                        <span className="truncate">{d.name}</span>
                                        {d.id === task.department_id && <CheckCircle2 className="h-3 w-3" />}
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
                        <AppTableCell className="text-center">
                          <AppBadge variant={task.priority?.priority_color ? "custom" : "info"} customColor={task.priority?.priority_color || null} isOutline={true}>
                            {task.priority?.name || '—'}
                          </AppBadge>
                        </AppTableCell>
                      );
                      case "due_date": return (
                        <AppTableCell className="text-subtle whitespace-nowrap text-center">{task.end_date || '—'}</AppTableCell>
                      );
                      case "status": return (
                        <AppTableCell className="whitespace-nowrap text-center">
                          <Popover.Root>
                            <Popover.Trigger asChild>
                              <AppButton variant="secondary" 
                                onClick={(e) => { e.stopPropagation(); }}
                                className={`${canUpdate ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity focus:outline-none`} 
                                title={canUpdate ? "Update Status" : "Status"}
                              >
                                <AppBadge variant={task.status?.status_color ? "custom" : "neutral"} customColor={task.status?.status_color || null} className={canUpdate ? "border-dashed" : ""} isOutline={true}>
                                  {task.status?.name || '—'}
                                </AppBadge>
                              </AppButton>
                            </Popover.Trigger>
                            {canUpdate && (
                              <Popover.Portal>
                                <Popover.Content align="center" sideOffset={4} className="z-[100] w-48 p-2 theme-card-structural dark:bg-[#0B0F19] border-border rounded-xl shadow-xl flex flex-col gap-1 outline-none animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/50">
                                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Update Status</span>
                                    <Link href={`/tasks/${task.id}`} className="text-[10px] font-bold text-primary hover:underline">View</Link>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto pr-1">
                                    {masterStatuses.map(s => (
                                      <AppButton 
                                        key={s.id}
                                        onClick={async () => {
                                          if (s.id === task.status_id) return;
                                          try {
                                            setInlineLoading(true);
                                            const { error } = await updateTaskStatusInline(task.id, s.id, "Inline update");
                                            if (error) throw new Error(error);
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status_id: s.id, status: { name: s.name, code: s.code, status_color: s.color } } : t));
                                            triggerToast("Status updated");
                                          } catch (e: any) { toast.error("Failed: " + e.message); }
                                          finally { setInlineLoading(false); }
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${s.id === task.status_id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-surface/50 font-medium'}`}
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || '#ccc' }} />
                                          <span className="truncate">{s.name}</span>
                                        </div>
                                        {s.id === task.status_id && <CheckCircle2 className="h-3 w-3" />}
                                      </AppButton>
                                    ))}
                                  </div>
                                </Popover.Content>
                              </Popover.Portal>
                            )}
                          </Popover.Root>
                        </AppTableCell>
                      );
                      case "assignee": return (
                        <AppTableCell className="text-center">
                          {task.assignee ? (
                            <div className="flex items-center justify-center gap-2">
                              {(() => {
                                 const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                                 if (!a) return null;
                                 return (
                                   <>
                                     {a.profile_photo ? (
                                       <img src={a.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover bg-elevated" />
                                     ) : (
                                       <div className="w-5 h-5 rounded-full bg-theme-btn-primary/10 text-theme-icon flex items-center justify-center text-[10px] font-bold shrink-0">
                                         {a.full_name?.substring(0, 2).toUpperCase() || "U"}
                                       </div>
                                     )}
                                     <span className="text-[13px] font-medium text-foreground whitespace-nowrap">{a.full_name}</span>
                                   </>
                                 );
                              })()}
                            </div>
                          ) : (
                            <span className="text-[13px] text-subtle italic">Unassigned</span>
                          )}
                        </AppTableCell>
                      );
                      case "creator_name": return (
                        <AppTableCell className="text-subtle text-center">{task.creator?.full_name || '—'}</AppTableCell>
                      );
                      case "start_date": return (
                        <AppTableCell className="text-subtle whitespace-nowrap text-center">{formatDate(task.start_date)}</AppTableCell>
                      );
                      case "duration": {
                        let text = "—";
                        if (task.start_date && task.end_date) {
                          const diff = Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24));
                          text = `${diff} day(s)`;
                        }
                        return <AppTableCell className="text-subtle ">{text}</AppTableCell>;
                      }
                      case "progress": return (
                        <AppTableCell className="w-[120px]">
                          {task.progress_percentage !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-elevated dark:bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-success rounded-full" style={{ width: `${task.progress_percentage}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-muted w-6 text-right">{task.progress_percentage}%</span>
                            </div>
                          ) : "—"}
                        </AppTableCell>
                      );
                      case "executors": return (
                        <AppTableCell>
                          {task.executors && task.executors.length > 0 ? (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {task.executors.slice(0, 3).map((u: any) => (
                                u.profile_photo ? (
                                  <img key={u.id} src={u.profile_photo} alt="" className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-[#0f111a]" title={u.full_name} />
                                ) : (
                                  <div key={u.id} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-emerald-100 text-emerald-700 text-[8px] font-bold" title={u.full_name}>
                                    {u.full_name?.substring(0, 2).toUpperCase() || "E"}
                                  </div>
                                )
                              ))}
                              {task.executors.length > 3 && (
                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-surface text-muted text-[8px] font-bold z-10">
                                  +{task.executors.length - 3}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "reviewers": return (
                        <AppTableCell>
                          {task.reviewers && task.reviewers.length > 0 ? (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {task.reviewers.slice(0, 3).map((u: any) => (
                                u.profile_photo ? (
                                  <img key={u.id} src={u.profile_photo} alt="" className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-[#0f111a]" title={u.full_name} />
                                ) : (
                                  <div key={u.id} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-theme-btn-primary/10 text-theme-icon text-[8px] font-bold" title={u.full_name}>
                                    {u.full_name?.substring(0, 2).toUpperCase() || "W"}
                                  </div>
                                )
                              ))}
                              {task.reviewers.length > 3 && (
                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-surface text-muted text-[8px] font-bold z-10">
                                  +{task.reviewers.length - 3}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "attachments": return (
                        <AppTableCell className="text-center">
                          {task.attachmentCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-theme-btn-primary/10 text-theme-icon dark:bg-theme-btn-primary/10 dark:text-theme-icon font-medium text-[11px]">
                              <Paperclip className="h-3 w-3" />
                              {task.attachmentCount}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "comments": return (
                        <AppTableCell className="text-center">
                          {task.commentCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-theme-btn-primary/10 text-theme-icon dark:bg-theme-btn-primary/10 dark:text-theme-icon font-medium text-[11px]">
                              <MessageSquare className="h-3 w-3" />
                              {task.commentCount}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "external_link": return (
                        <AppTableCell >
                          {task.custom_fields?.link_url ? (
                            <a href={getSafeExternalUrl(task.custom_fields.link_url)} target="_blank" rel="noopener noreferrer" className="text-theme-icon hover:underline inline-flex items-center gap-1 max-w-[180px] truncate" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{task.custom_fields.link_url}</span>
                            </a>
                          ) : <span className="text-muted">—</span>}
                        </AppTableCell>
                      );
                      case "created_at": return (
                        <AppTableCell className="text-right text-muted whitespace-nowrap">{formatDate(task.created_at)}</AppTableCell>
                      );
                      case "updated_at": return (
                        <AppTableCell className="text-right text-muted whitespace-nowrap">{formatDate(task.updated_at)}</AppTableCell>
                      );
                      case "actions": return (
                        <AppTableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                              href={`/tasks/${task.id}?mode=view`}
                              className="text-theme-icon hover:text-theme-icon transition-colors active:scale-95"
                              title="View Task"
                            >
                              <Eye className="h-[15px] w-[15px]" />
                            </Link>
                            {canUpdate && (
                              <Link 
                                href={`/tasks/${task.id}`}
                                className="text-warning hover:text-warning transition-colors active:scale-95"
                                title="Edit Task"
                              >
                                <Edit2 className="h-[15px] w-[15px]" />
                              </Link>
                            )}
                            {canDelete && (
                              <AppButton variant="secondary" 
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                disabled={deleteLoadingId === task.id}
                                className="text-danger hover:text-danger transition-colors active:scale-95 disabled:opacity-50"
                                title="Delete Task"
                              >
                                {deleteLoadingId === task.id ? (
                                  <Loader2 className="h-[15px] w-[15px] animate-spin" />
                                ) : (
                                  <Trash2 className="h-[15px] w-[15px]" />
                                )}
                              </AppButton>
                            )}
                          </div>
                        </AppTableCell>
                      );
                      default: {
                        let val = undefined;
                        if (task.custom_fields && task.custom_fields[col.field_key] !== undefined) {
                          val = task.custom_fields[col.field_key];
                        } else if (task[col.field_key] !== undefined) {
                          val = task[col.field_key];
                        }
                        
                        if (val === undefined || val === null || val === "") val = "—";
                        else if (col.data_type === "boolean") val = val ? "Yes" : "No";
                        else if (col.data_type === "date") val = formatDate(val);
                        
                        return (
                          <AppTableCell className="text-subtle ">
                            <div className="truncate max-w-[200px]" title={String(val)}>
                              {col.data_type === "link" && val !== "—" ? (
                                <a href={getSafeExternalUrl(val)} target="_blank" rel="noreferrer" className="text-theme-icon hover:underline">{val}</a>
                              ) : col.data_type === "badge" && val !== "—" ? (
                                <AppBadge variant="neutral">{val}</AppBadge>
                              ) : (
                                val
                              )}
                            </div>
                          </AppTableCell>
                        );
                      }
                    }
                    };
                    const cellNode = renderCell() as React.ReactElement<any>;
                    const isFirst = index === 0;
                    return React.cloneElement(cellNode, {
                      key: col.field_id,
                      className: cn(cellNode.props.className, isFirst ? "sticky left-[40px] z-20 bg-surface transition-colors" : ""),
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
  ) : viewMode === "board" ? (
    <div className="h-[calc(100vh-200px)]">
      <TaskBoardView 
        tasks={filtered} 
        statuses={masterStatuses} 
        onStatusChange={async (taskId, newStatusId) => {
          setInlineTask({ id: taskId } as any);
          setInlineNewStatus(newStatusId);
          setInlineRemark("Moved via Kanban Board");
          // Perform inline save
          const stMaster = masterStatuses.find(s => s.id === newStatusId);
          const mappedStatus = stMaster ? { name: stMaster.name, code: stMaster.code, status_color: stMaster.color } : undefined;
          
          await updateTaskStatusInline(taskId, newStatusId, "Moved via Kanban Board");
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: newStatusId, status: mappedStatus || t.status } : t));
          triggerToast(`Status updated successfully.`);
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

        {filtered.length === 0 && !loading && (
          <div className="text-center py-10 text-muted">No tasks found for this filter.</div>
        )}
        

      {/* Side Drawer Component */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 z-40 bg-surface/40 transition-opacity" onClick={() => setSelectedTask(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[450px] theme-card-structural dark:bg-[#0B0F19] shadow-2xl border-l border-border dark:border-border flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-border dark:border-border flex items-center justify-between bg-surface dark:theme-card-structural /[0.02]">
              <div>
                <h2 className="text-[14px] font-bold text-theme-heading truncate pr-4">{selectedTask.title}</h2>
                <div className="text-[11px] font-mono text-muted mt-1">{selectedTask.code} • {selectedTask.workspace?.name}</div>
              </div>
              <AppButton variant="ghost" size="sm" onClick={() => setSelectedTask(null)} className="h-8 w-8 p-0 shrink-0">✕</AppButton>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-2">
                <h4 className="text-[11px] uppercase font-bold text-muted tracking-wider">Description</h4>
                <div className="text-[13px] text-foreground  leading-relaxed">
                  <SafeHtml html={selectedTask.description || 'No description provided.'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col p-3 rounded-lg theme-card-structural /50 dark:/10 /60 dark: shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Priority</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.priority?.name || 'N/A'}</div>
                </div>
                <div className="flex flex-col p-3 rounded-lg theme-card-structural /50 dark:/10 /60 dark: shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Department</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.department?.name || 'N/A'}</div>
                </div>
                <div className="flex flex-col p-3 rounded-lg theme-card-structural /50 dark:/10 /60 dark: shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Status</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.status?.name || 'N/A'}</div>
                </div>
                <div className="flex flex-col p-3 rounded-lg theme-card-structural /50 dark:/10 /60 dark: shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Due Date</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.end_date || 'N/A'}</div>
                </div>
              </div>
              
              {/* Checklists and Custom Fields */}
              {selectedTask.custom_fields && Object.keys(selectedTask.custom_fields).length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/50 dark:border-border">
                  <h4 className="text-[11px] uppercase font-bold text-theme-icon tracking-wider mb-2">Checklists & Details</h4>
                  
                  {selectedTask.custom_fields.checklist && Array.isArray(selectedTask.custom_fields.checklist) && (
                    <div className="space-y-2 mb-4">
                      {selectedTask.custom_fields.checklist.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 bg-surface dark:theme-card-structural /[0.02] p-2 rounded-lg border-border/50 dark:border-border">
                          <input type="checkbox" checked={item.completed} readOnly className="mt-1 shrink-0 rounded border-border text-theme-icon focus:ring-theme-btn-primary" />
                          <span className={`text-[13px] ${item.completed ? 'line-through text-muted' : 'text-foreground '}`}>{item.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3">
                    {Object.entries(selectedTask.custom_fields).filter(([k]) => k !== 'checklist' && k !== 'progress_percentage').map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[11px] uppercase font-bold text-muted tracking-wider">{key.replace(/_/g, ' ')}</span>
                        <div className="text-[13px] text-foreground ">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border dark:border-border bg-surface dark:theme-card-structural /[0.02] flex items-center gap-2">
              <Link href={`/tasks/${selectedTask.id}`} className="w-full flex-1">
                <AppButton variant="primary" className="w-full bg-theme-btn-primary hover:opacity-90">Open Execution Workspace</AppButton>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>

      {/* Floating Action Bar for Bulk Actions */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 theme-card-structural dark:bg-[#0f111a] border-border dark:border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-2">
            <div className="bg-theme-btn-primary/10 text-theme-icon dark:bg-theme-btn-primary/20 dark:text-theme-icon font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center">
              {selectedTaskIds.size}
            </div>
            <span className="theme-data-value text-subtle ">Tasks Selected</span>
          </div>
          <div className="h-6 w-px bg-elevated dark:bg-surface/20"></div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <AppButton variant="outline" size="sm" onClick={() => setBulkStatusModalOpen(true)}>Update Tasks</AppButton>
            )}
            {canDelete && (
              <AppButton variant="outline" size="sm" onClick={handleBulkDelete} className="text-danger hover:text-danger hover:bg-rose-50 dark:hover:bg-danger/10">Delete Tasks</AppButton>
            )}
            <AppButton variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())}>Cancel</AppButton>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px] theme-card-structural dark:bg-[#0B0F19] border-border dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-theme-heading">Bulk Update Tasks</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Updating {selectedTaskIds.size} Tasks</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">From Status (Current)</label>
                <select
                  value={bulkOldStatus}
                  onChange={(e) => setBulkOldStatus(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Any Status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">To Status (New)</label>
                <select
                  value={bulkNewStatus}
                  onChange={(e) => setBulkNewStatus(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Leave Unchanged</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">From Department (Current)</label>
                <select
                  value={bulkOldDepartment}
                  onChange={(e) => setBulkOldDepartment(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Any Department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">To Department (New)</label>
                <select
                  value={bulkNewDepartment}
                  onChange={(e) => setBulkNewDepartment(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Leave Unchanged</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider">Remark (Optional)</label>
              <textarea
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                placeholder="Why are you updating these tasks?"
                className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary min-h-[80px] resize-none"
              />
            </div>
            <div className="text-[10px] text-warning">Note: Tasks you don't own will fail to update unless you are a super admin.</div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setBulkStatusModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleBulkStatusSave}
              disabled={inlineLoading || (!bulkNewStatus && !bulkNewDepartment)}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Tasks
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px] theme-card-structural dark:bg-[#0B0F19] border-border dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-theme-heading">Update Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Task: {inlineTask?.title || 'Unknown'}</div>
            
            {canChangeFields ? (
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">New Status</label>
                <select
                  value={inlineNewStatus}
                  onChange={(e) => setInlineNewStatus(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="" disabled>Select Status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-warning bg-amber-50 p-2 rounded border border-amber-200">
                You are not the assignee for this task. You can only leave a remark/comment.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider">Remark (Required)</label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setStatusModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleStatusSave}
              disabled={inlineLoading || !inlineRemark.trim()}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {canChangeFields && inlineNewStatus !== inlineTask?.status_id ? "Change Status" : "Add Remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Department Update Modal */}
      <Dialog open={departmentModalOpen} onOpenChange={setDepartmentModalOpen}>
        <DialogContent className="sm:max-w-[425px] theme-card-structural dark:bg-[#0B0F19] border-border dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-theme-heading">Update Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Task: {inlineTask?.title || 'Unknown'}</div>
            
            {canChangeFields ? (
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">New Department</label>
                <select
                  value={inlineNewDepartment}
                  onChange={(e) => setInlineNewDepartment(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">-- No Department --</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-warning bg-amber-50 p-2 rounded border border-amber-200">
                You are not the assignee for this task. You can only leave a remark/comment.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider">Remark (Required)</label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary min-h-[80px] resize-none"
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
              {canChangeFields && inlineNewDepartment !== inlineTask?.department_id ? "Change Department" : "Add Remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden theme-card-structural dark:bg-[#0a0d14] border-border dark:border-border shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-border">
            <DialogTitle>Select Workspace for Task</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-subtle  mb-1">Target Workspace <span className="text-danger">*</span></label>
              <select
                value={creationWorkspaceId}
                onChange={(e) => {
                  setCreationWorkspaceId(e.target.value);
                  setCreationSubWorkspaceId("");
                }}
                className="w-full text-sm p-2.5 border-border dark:border-border rounded-md theme-card-structural dark:bg-[#0a0d14] text-theme-heading focus:ring-theme-btn-primary focus:border-theme-btn-primary"
              >
                <option value="">-- Select Workspace --</option>
                {allWorkspaces.filter(w => !w.parent_workspace_id).map(w => (
                  <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>
                ))}
              </select>
            </div>
            
            {creationWorkspaceId && (
              <div>
                <label className="block theme-data-value text-subtle  mb-1">Sub-Workspace (Optional)</label>
                <select
                  value={creationSubWorkspaceId}
                  onChange={(e) => setCreationSubWorkspaceId(e.target.value)}
                  className="w-full text-sm p-2.5 border-border dark:border-border rounded-md theme-card-structural dark:bg-[#0a0d14] text-theme-heading focus:ring-theme-btn-primary focus:border-theme-btn-primary"
                >
                  <option value="">-- None --</option>
                  {allWorkspaces.filter(sw => sw.parent_workspace_id === creationWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name || sw.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 dark:border-border bg-surface dark:theme-card-structural /5">
            <AppButton variant="outline" onClick={() => setShowWorkspaceSelector(false)}>Cancel</AppButton>
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

