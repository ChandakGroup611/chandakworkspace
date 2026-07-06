"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAllReportCustomFields } from "@/lib/actions/workspace_reports";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";

type Task = any;

function DraggableTableHead({ col, isFirst }: { col: any, isFirst?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.field_id });
  const w = col.column_width || col.default_width || 150;
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
        "select-none bg-white dark:bg-[#06080f] border-b border-border font-bold text-xs uppercase text-foreground px-4 py-3 cursor-grab active:cursor-grabbing hover:bg-accent/10 transition-colors", 
        col.field_key === "actions" ? "w-[50px]" : "", 
        !isTitle ? "text-center" : "text-left",
        ["code", "due_date", "created_at", "updated_at", "status", "priority", "department"].includes(col.field_key) ? "whitespace-nowrap" : ""
      )}
      {...attributes} 
      {...listeners}
    >
      {isTitle ? "Title" : col.display_name}
    </AppTableHead>
  );
}

const INITIAL_TASK_FIELDS: UIFieldDefinition[] = [
  { field_key: "code", display_name: "Code", data_type: "text", is_default: true, default_width: 80 },
  { field_key: "title_description", display_name: "Title", data_type: "custom", is_default: true, default_width: 300 },
  { field_key: "workspace", display_name: "Workspace", data_type: "text", is_default: true, default_width: 150 },
  { field_key: "sub_workspace", display_name: "Sub-Workspace", data_type: "text", is_default: true, default_width: 150 },
  { field_key: "department", display_name: "Department", data_type: "badge", is_default: true, default_width: 150 },
  { field_key: "priority", display_name: "Priority", data_type: "badge", is_default: true, default_width: 120 },
  { field_key: "due_date", display_name: "Due Date", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "status", display_name: "Status", data_type: "badge", is_default: true, default_width: 150 },
  { field_key: "assignee", display_name: "Assignee", data_type: "user", is_default: true, default_width: 100 },
  { field_key: "created_at", display_name: "Created At", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "actions", display_name: "Actions", data_type: "custom", is_default: true, default_width: 80 },
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
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [showEscalatedOnly, setShowEscalatedOnly] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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

  useEffect(() => {
    import('@/lib/actions/workspaces').then(({ fetchWorkspaces }) => {
      fetchWorkspaces().then(setAllWorkspaces).catch(console.error);
    });
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

  const filtered = useMemo(() => {
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

      return true;
    });
  }, [tasks, scope, query, currentUserId, selectedWorkspaceId, selectedStatus, selectedPriority, showEscalatedOnly, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter(t => !t.status?.is_closed && !t.status?.name?.toLowerCase().includes('progress')).length;
    const inProgress = filtered.filter(t => t.status?.name?.toLowerCase().includes('progress')).length;
    const completed = filtered.filter(t => t.status?.is_closed || t.status?.name?.toLowerCase().includes('done')).length;
    
    return [
      { label: "Total", value: total, icon: <LayoutList className="h-5 w-5" />, iconBgClass: "bg-blue-500/10", iconColorClass: "text-blue-600" },
      { label: "Open", value: open, icon: <Layers className="h-5 w-5" />, iconBgClass: "bg-purple-500/10", iconColorClass: "text-purple-600" },
      { label: "In Progress", value: inProgress, icon: <Loader2 className="h-5 w-5" />, iconBgClass: "bg-amber-500/10", iconColorClass: "text-amber-600" },
      { label: "Completed", value: completed, icon: <CheckCircle2 className="h-5 w-5" />, iconBgClass: "bg-emerald-500/10", iconColorClass: "text-emerald-600" },
    ];
  }, [filtered]);

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

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchTasksData = async (pageNum: number, isLoadMore = false, overrideWsId?: string | null) => {
    setLoading(true);
    const currentWsId = overrideWsId !== undefined ? overrideWsId : selectedWorkspaceId;

    try {
      const { fetchTasksByWorkspace, fetchAllTasks } = await import('@/lib/actions/workspaces');
      
      let newTasks: any[] = [];
      if (currentWsId) {
        newTasks = await fetchTasksByWorkspace(currentWsId, pageNum, 50, true);
        if (newTasks.length < 50) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        if (isLoadMore) {
          setLoading(false);
          return;
        }
        newTasks = await fetchAllTasks();
        setHasMore(false);
      }

      setTasks(prev => isLoadMore ? [...prev, ...newTasks] : newTasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setPage(1);
    await fetchTasksData(1, false);
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchTasksData(nextPage, true);
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
      alert("Status update failed: " + e.message);
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
      alert("Bulk delete failed: " + e.message);
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
      alert("Bulk update failed: " + e.message);
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

  const handleStatusSave = async () => {
    if (!inlineTask) return;
    if (!inlineRemark || inlineRemark.trim().length === 0) {
      alert("A remark is required.");
      return;
    }

    setInlineLoading(true);
    const { error } = await updateTaskStatusInline(inlineTask.id, inlineNewStatus, inlineRemark);
    if (error) {
      alert("Failed to update: " + error);
      setInlineLoading(false);
      return;
    }

    const stMaster = masterStatuses.find(s => s.id === inlineNewStatus);
    const mappedStatus = stMaster ? { name: stMaster.name, code: stMaster.code, status_color: stMaster.color } : undefined;

    setTasks(prev => prev.map(t => t.id === inlineTask.id ? { ...t, status_id: inlineNewStatus, status: mappedStatus || t.status } : t));
    setStatusModalOpen(false);
    setInlineLoading(false);
    triggerToast(`Status updated successfully.`);
  };

  const handleDepartmentSave = async () => {
    if (!inlineTask) return;
    if (!inlineRemark || inlineRemark.trim().length === 0) {
      alert("A remark is required.");
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
      alert("Failed to update: " + error.message);
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
    
    fetchTasksData(1, false, wsId);
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
        let subName = "—";
        if (t.sub_workspace) {
          subName = t.sub_workspace.name || t.sub_workspace.code || "—";
        } else {
          const wsName = t.workspace?.name || t.workspace?.code || "—";
          const parts = wsName.split(' - ');
          if (parts.length > 1) {
            subName = parts.slice(1).join(' - ');
          }
        }
        const subParts = subName.split(' - ');
        return subParts[subParts.length - 1]?.trim() || subName;
      }
      case "department": return t.department?.name || "—";
      case "priority": return t.priority?.name || "—";
      case "due_date": return t.end_date || "—";
      case "status": return t.status?.name || "—";
      case "start_date": return formatDate(t.start_date);
      case "duration": {
        if (!t.start_date || !t.end_date) return "—";
        const diff = Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24));
        return `${diff} day(s)`;
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
    return <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto my-12" />;
  }

  if (!hasPermission("TASKS_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Workspace Tasks.</p>
      </div>
    );
  }

  return (
    <ExperienceProvider mode="operational">
      <div className="space-y-6">
        <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 shrink-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Workspace Tasks</h1>
            <p className="text-sm font-medium text-muted">
              Internal Audit • {selectedWorkspaceId ? allWorkspaces.find(w => w.id === selectedWorkspaceId)?.workspace_name || allWorkspaces.find(w => w.id === selectedWorkspaceId)?.name || 'Selected Workspace' : 'All Workspaces'} • {filtered.length} total tasks
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ReportKPIBar kpis={kpis} variant="compact" className="mb-0 shrink-0" />
            <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>
            <AppButton variant="outline" size="sm" onClick={exportToExcel} leftIcon={<Upload className="h-4 w-4" />} className="h-9 px-4 font-semibold border-border shadow-sm">
              Export
            </AppButton>
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
            }} leftIcon={<Plus className="h-4 w-4" />} className="h-9 px-4 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              New Task
            </AppButton>
          </div>
        </header>

        <div className="bg-surface rounded-2xl border border-border shadow-sm flex flex-col">
          {/* Top Row: Tabs, Workspace, Status */}
          <div className="flex items-center justify-between border-b border-border px-4 pt-2">
            <div className="flex items-center gap-6 self-end">
              {(["ALL","ASSIGNEE","ENROLLED"] as const).map(sc => (
                <button
                  key={sc}
                  onClick={() => setScope(sc)}
                  className={`pb-3 text-[13px] font-bold transition-all border-b-2 relative top-[1px] ${scope === sc ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted hover:text-foreground"}`}
                >
                  {sc === "ALL" ? "All Tasks" : sc === "ASSIGNEE" ? "Assigned To Me" : "Enrolled Tasks"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Workspace</span>
                <select
                  value={selectedWorkspaceId || ""}
                  onChange={(e) => {
                    const newWsId = e.target.value || null;
                    setSelectedWorkspaceId(newWsId);
                    fetchTasksData(1, false, newWsId);
                  }}
                  className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">All Workspaces</option>
                  {allWorkspaces.map((ws: any) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.workspace_name || ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Bottom Row: Priority, Escalated, Date Range, Search, Actions */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02]">
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="text-sm font-medium h-9 px-3 w-40 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="">All Priorities</option>
              {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer hover:opacity-80 transition-opacity">
              <input type="checkbox" checked={showEscalatedOnly} onChange={e => setShowEscalatedOnly(e.target.checked)} className="rounded border-border text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
              Escalated
            </label>

            <div className="flex items-center gap-2 mx-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <span className="text-sm text-muted">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                placeholder="Search tasks, code..." 
                value={query} 
                onChange={(e:any) => setQuery(e.target.value)} 
                className="w-full text-sm font-medium h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted" 
              />
            </div>

            <AppButton 
              variant="outline"
              onClick={() => { setSelectedStatus(""); setSelectedPriority(""); setShowEscalatedOnly(false); setDateFrom(""); setDateTo(""); setQuery(""); }}
              className="h-9 px-3 font-medium text-muted border-border hover:bg-surface hover:text-foreground shadow-sm"
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Reset
            </AppButton>
            <AppButton 
              variant="outline"
              onClick={() => setIsConfigOpen(true)}
              className="h-9 px-3 font-medium text-muted border-border hover:bg-surface hover:text-foreground shadow-sm"
              leftIcon={<Settings2 className="h-4 w-4" />}
            >
              Columns
            </AppButton>
          </div>
        </div>

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
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
            <span className="text-xs font-semibold">{successToast}</span>
          </div>
        )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div ref={parentRef} className="h-[calc(100vh-160px)] overflow-auto rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#06080f] shadow-sm relative">
          <AppTable className="w-full min-w-max border-separate border-spacing-0 table-fixed">
            <AppTableHeader className="sticky top-0 z-40 bg-white dark:bg-[#06080f]">
              <AppTableRow>
                <AppTableHead className="text-center p-0 w-[40px] min-w-[40px] max-w-[40px] sticky left-0 top-0 z-50 bg-white dark:bg-[#06080f]">
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && selectedTaskIds.size === filtered.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedTaskIds.size > 0 && selectedTaskIds.size < filtered.length;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-border text-indigo-600 focus:ring-indigo-600 w-3.5 h-3.5 mx-auto block"
                  />
                </AppTableHead>
                <SortableContext items={visibleColumns.map(c => c.field_id)} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.map((col, index) => (
                    <DraggableTableHead key={col.field_id} col={col} isFirst={index === 0} />
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
                >
                  <AppTableCell className="p-0 text-center w-[40px] min-w-[40px] max-w-[40px] sticky left-0 z-20 bg-surface group-hover:bg-surface transition-colors" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedTaskIds.has(task.id)}
                      onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-600 w-3.5 h-3.5 mx-auto block"
                    />
                  </AppTableCell>
                  {visibleColumns.map((col, index) => {
                    const renderCell = () => {
                      switch(col.field_key) {
                      case "code": return (
                        <AppTableCell className="font-mono text-[13px] font-bold text-accent whitespace-nowrap text-center">{task.code || `TSK-${task.id.substring(0,4).toUpperCase()}`}</AppTableCell>
                      );
                      case "title_description": return (
                        <AppTableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-[13px] font-semibold text-foreground whitespace-normal break-words w-full">{task.title || '-'}</div>
                            {task.attachmentCount > 0 && (
                              <div className="flex items-center justify-center p-0.5 px-1 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400" title={`${task.attachmentCount} Attachment(s)`}>
                                <Paperclip className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          {task.custom_fields?.progress_percentage !== undefined && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-500">{task.custom_fields.progress_percentage}%</span>
                            </div>
                          )}
                        </AppTableCell>
                      );
                      case "workspace": {
                        const wsName = task.workspace?.name || task.workspace?.code || '—';
                        const parts = wsName.split(' - ');
                        const mainWorkspace = parts[0];
                        return (
                          <AppTableCell className="text-[13px] text-subtle text-center" title={mainWorkspace}>{mainWorkspace}</AppTableCell>
                        );
                      }
                      case "sub_workspace": {
                        let subName = '—';
                        if (task.sub_workspace) {
                          subName = task.sub_workspace.name || task.sub_workspace.code || '—';
                        } else {
                          const fullName = task.workspace?.name || task.workspace?.code || '—';
                          const parts = fullName.split(' - ');
                          if (parts.length > 1) {
                            subName = parts.slice(1).join(' - ');
                          }
                        }
                        const subParts = subName.split(' - ');
                        const finalSubName = subParts[subParts.length - 1]?.trim() || subName;
                        return (
                          <AppTableCell className="text-[13px] text-subtle text-center" title={finalSubName}>{finalSubName}</AppTableCell>
                        );
                      }
                      case "department": return (
                        <AppTableCell className="text-[13px] text-subtle whitespace-nowrap text-center">
                          <button 
                            onClick={(e) => canUpdate && handleDepartmentClick(e, task)} 
                            className={`${canUpdate ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity focus:outline-none`} 
                            title={canUpdate ? "Update Department" : "Department"}
                          >
                            <AppBadge variant="neutral" className={canUpdate ? "border-dashed" : ""}>
                              {task.department?.name || '—'}
                            </AppBadge>
                          </button>
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
                        <AppTableCell className="text-[13px] text-subtle whitespace-nowrap text-center">{task.end_date || '—'}</AppTableCell>
                      );
                      case "status": return (
                        <AppTableCell className="whitespace-nowrap text-center">
                          <button 
                            onClick={(e) => canUpdate && handleStatusClick(e, task)} 
                            className={`${canUpdate ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity focus:outline-none`} 
                            title={canUpdate ? "Update Status" : "Status"}
                          >
                            <AppBadge variant={task.status?.status_color ? "custom" : "neutral"} customColor={task.status?.status_color || null} className={canUpdate ? "border-dashed" : ""} isOutline={true}>
                              {task.status?.name || '—'}
                            </AppBadge>
                          </button>
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
                                       <img src={a.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover bg-gray-200" />
                                     ) : (
                                       <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
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
                        <AppTableCell className="text-[13px] text-subtle text-center">{task.creator?.full_name || '—'}</AppTableCell>
                      );
                      case "start_date": return (
                        <AppTableCell className="text-[13px] text-subtle whitespace-nowrap text-center">{formatDate(task.start_date)}</AppTableCell>
                      );
                      case "duration": {
                        let text = "—";
                        if (task.start_date && task.end_date) {
                          const diff = Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24));
                          text = `${diff} day(s)`;
                        }
                        return <AppTableCell className="text-xs text-gray-600 dark:text-gray-400">{text}</AppTableCell>;
                      }
                      case "progress": return (
                        <AppTableCell className="w-[120px]">
                          {task.progress_percentage !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${task.progress_percentage}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 w-6 text-right">{task.progress_percentage}%</span>
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
                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-gray-100 text-gray-500 text-[8px] font-bold z-10">
                                  +{task.executors.length - 3}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-gray-400 text-xs">—</span>}
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
                                  <div key={u.id} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-indigo-100 text-indigo-700 text-[8px] font-bold" title={u.full_name}>
                                    {u.full_name?.substring(0, 2).toUpperCase() || "W"}
                                  </div>
                                )
                              ))}
                              {task.reviewers.length > 3 && (
                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-gray-100 text-gray-500 text-[8px] font-bold z-10">
                                  +{task.reviewers.length - 3}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "attachments": return (
                        <AppTableCell className="text-center">
                          {task.attachmentCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 font-medium text-[11px]">
                              <Paperclip className="h-3 w-3" />
                              {task.attachmentCount}
                            </div>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "comments": return (
                        <AppTableCell className="text-center">
                          {task.commentCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-medium text-[11px]">
                              <MessageSquare className="h-3 w-3" />
                              {task.commentCount}
                            </div>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "external_link": return (
                        <AppTableCell className="text-xs">
                          {task.custom_fields?.link_url ? (
                            <a href={task.custom_fields.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1 max-w-[180px] truncate" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{task.custom_fields.link_url}</span>
                            </a>
                          ) : <span className="text-gray-400">—</span>}
                        </AppTableCell>
                      );
                      case "created_at": return (
                        <AppTableCell className="text-right text-gray-500 text-[13px] whitespace-nowrap">{formatDate(task.created_at)}</AppTableCell>
                      );
                      case "updated_at": return (
                        <AppTableCell className="text-right text-gray-500 text-[13px] whitespace-nowrap">{formatDate(task.updated_at)}</AppTableCell>
                      );
                      case "actions": return (
                        <AppTableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                              href={`/tasks/${task.id}?mode=view`}
                              className="text-blue-500 hover:text-blue-600 transition-colors active:scale-95"
                              title="View Task"
                            >
                              <Eye className="h-[15px] w-[15px]" />
                            </Link>
                            {canUpdate && (
                              <Link 
                                href={`/tasks/${task.id}`}
                                className="text-amber-500 hover:text-amber-600 transition-colors active:scale-95"
                                title="Edit Task"
                              >
                                <Edit2 className="h-[15px] w-[15px]" />
                              </Link>
                            )}
                            {canDelete && (
                              <button 
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                disabled={deleteLoadingId === task.id}
                                className="text-rose-500 hover:text-rose-600 transition-colors active:scale-95 disabled:opacity-50"
                                title="Delete Task"
                              >
                                {deleteLoadingId === task.id ? (
                                  <Loader2 className="h-[15px] w-[15px] animate-spin" />
                                ) : (
                                  <Trash2 className="h-[15px] w-[15px]" />
                                )}
                              </button>
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
                          <AppTableCell className="text-[13px] text-gray-600 dark:text-gray-400">
                            <div className="truncate max-w-[200px]" title={String(val)}>
                              {col.data_type === "link" && val !== "—" ? (
                                <a href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{val}</a>
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

        {filtered.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-500">No tasks found for this filter.</div>
        )}
        
        {hasMore && filtered.length > 0 && (
          <div className="flex justify-center py-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0B0F19]">
            <AppButton variant="outline" size="sm" onClick={loadMore} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load More Tasks
            </AppButton>
          </div>
        )}

      {/* Side Drawer Component */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTask(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[450px] bg-white dark:bg-[#0B0F19] shadow-2xl border-l border-gray-200 dark:border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900 dark:text-white truncate pr-4">{selectedTask.title}</h2>
                <div className="text-[11px] font-mono text-gray-500 mt-1">{selectedTask.code} • {selectedTask.workspace?.name}</div>
              </div>
              <AppButton variant="ghost" size="sm" onClick={() => setSelectedTask(null)} className="h-8 w-8 p-0 shrink-0">✕</AppButton>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-2">
                <h4 className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Description</h4>
                <p className="text-[13px] text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Priority</span>
                  <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{selectedTask.priority?.name || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Department</span>
                  <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{selectedTask.department?.name || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Status</span>
                  <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{selectedTask.status?.name || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Due Date</span>
                  <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{selectedTask.end_date || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex items-center gap-2">
              <Link href={`/tasks/${selectedTask.id}`} className="w-full flex-1">
                <AppButton variant="primary" className="w-full bg-blue-600 hover:bg-blue-700">Open Execution Workspace</AppButton>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>

      {/* Floating Action Bar for Bulk Actions */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center">
              {selectedTaskIds.size}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tasks Selected</span>
          </div>
          <div className="h-6 w-px bg-gray-300 dark:bg-white/20"></div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <AppButton variant="outline" size="sm" onClick={() => setBulkStatusModalOpen(true)}>Update Tasks</AppButton>
            )}
            {canDelete && (
              <AppButton variant="outline" size="sm" onClick={handleBulkDelete} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">Delete Tasks</AppButton>
            )}
            <AppButton variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())}>Cancel</AppButton>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Bulk Update Tasks</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Updating {selectedTaskIds.size} Tasks</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Status (Current)</label>
                <select
                  value={bulkOldStatus}
                  onChange={(e) => setBulkOldStatus(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Any Status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Status (New)</label>
                <select
                  value={bulkNewStatus}
                  onChange={(e) => setBulkNewStatus(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Department (Current)</label>
                <select
                  value={bulkOldDepartment}
                  onChange={(e) => setBulkOldDepartment(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Any Department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Department (New)</label>
                <select
                  value={bulkNewDepartment}
                  onChange={(e) => setBulkNewDepartment(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Leave Unchanged</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remark (Optional)</label>
              <textarea
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                placeholder="Why are you updating these tasks?"
                className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none"
              />
            </div>
            <div className="text-[10px] text-amber-600">Note: Tasks you don't own will fail to update unless you are a super admin.</div>
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
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Update Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Task: {inlineTask?.title || 'Unknown'}</div>
            
            {true ? (
              <div className="grid gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Status</label>
                <select
                  value={inlineNewStatus}
                  onChange={(e) => setInlineNewStatus(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                You are not the assignee for this task. You can only leave a remark/comment.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remark (Required)</label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none"
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
              {(inlineTask?.assigned_to === currentUserId || hasPermission("WORKSPACES_MANAGE")) && inlineNewStatus !== inlineTask?.status_id ? "Change Status" : "Add Remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Department Update Modal */}
      <Dialog open={departmentModalOpen} onOpenChange={setDepartmentModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Update Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Task: {inlineTask?.title || 'Unknown'}</div>
            
            {true ? (
              <div className="grid gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Department</label>
                <select
                  value={inlineNewDepartment}
                  onChange={(e) => setInlineNewDepartment(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- No Department --</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                You are not the assignee for this task. You can only leave a remark/comment.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remark (Required)</label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none"
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
              {(inlineTask?.assigned_to === currentUserId || hasPermission("WORKSPACES_MANAGE")) && inlineNewDepartment !== inlineTask?.department_id ? "Change Department" : "Add Remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#0a0d14] border border-gray-200 dark:border-gray-800 shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <DialogTitle>Select Workspace for Task</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Workspace <span className="text-red-500">*</span></label>
              <select
                value={creationWorkspaceId}
                onChange={(e) => {
                  setCreationWorkspaceId(e.target.value);
                  setCreationSubWorkspaceId("");
                }}
                className="w-full text-sm p-2.5 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#0a0d14] text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Select Workspace --</option>
                {allWorkspaces.filter(w => !w.parent_workspace_id).map(w => (
                  <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>
                ))}
              </select>
            </div>
            
            {creationWorkspaceId && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sub-Workspace (Optional)</label>
                <select
                  value={creationSubWorkspaceId}
                  onChange={(e) => setCreationSubWorkspaceId(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#0a0d14] text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">-- None --</option>
                  {allWorkspaces.filter(sw => sw.parent_workspace_id === creationWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name || sw.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
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
              fetchTasksData(1, false, selectedWorkspaceId);
            } catch (e: any) {
              console.error("[TaskListViewClient] Error creating task:", e);
              alert(e.message || "Failed to create task");
            }
          }}
        />
      )}
    </ExperienceProvider>
  );
}
