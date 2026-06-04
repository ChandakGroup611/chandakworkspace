"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
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
import { Loader2, Eye, Filter, Search, Users, Calendar, ArrowLeft, Download, FileText, FileSpreadsheet, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteTask, getTaskStatuses, updateTaskStatusInline } from "@/lib/actions/tasks";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePermissions } from "@/hooks/usePermissions";

type Task = any;

// Format date consistently without locale-based variations
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
  const [scope, setScope] = useState<"ALL" | "CREATOR" | "MANAGER">("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Inline Status Update State
  const [masterStatuses, setMasterStatuses] = useState<any[]>([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [inlineTask, setInlineTask] = useState<Task | null>(null);
  const [inlineNewStatus, setInlineNewStatus] = useState<string>("");
  const [inlineRemark, setInlineRemark] = useState<string>("");
  const [inlineLoading, setInlineLoading] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>("");
  const [bulkRemark, setBulkRemark] = useState<string>("");
  const { hasPermission, roleCode } = usePermissions();
  const canDelete = hasPermission("TASKS_DELETE");

  useEffect(() => {
    getTaskStatuses().then(setMasterStatuses).catch(console.error);
  }, []);

  const uniqueStatuses = useMemo(() => Array.from(new Set(tasks.map((t: any) => t.status?.name).filter(Boolean))) as string[], [tasks]);
  const uniquePriorities = useMemo(() => Array.from(new Set(tasks.map((t: any) => t.priority?.name).filter(Boolean))) as string[], [tasks]);
  const router = useRouter();

  const parentRef = useRef<HTMLDivElement>(null);

  const uniqueWorkspaces = useMemo(() => {
    const map = new Map();
    tasks.forEach(t => {
      if (t.workspace) {
        map.set(t.workspace.id || t.workspace_id, t.workspace);
      }
    });
    return Array.from(map.values()) as any[];
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (selectedWorkspaceId && t.workspace_id !== selectedWorkspaceId) return false;
      if (scope === "CREATOR" && t.created_by !== currentUserId) return false;
      if (scope === "MANAGER" && t.creator?.manager_id !== currentUserId) return false;
      
      if (selectedStatus && t.status?.name !== selectedStatus) return false;
      if (selectedPriority && t.priority?.name !== selectedPriority) return false;
      if (showEscalatedOnly && t.status?.name?.toLowerCase() !== "escalated") return false;

      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime();
        const taskDate = new Date(t.created_at).getTime();
        if (taskDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + 86400000; // include full day
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

  const refresh = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("tasks").select(`
        *, title:subject, status:status_master(name:status_name,code:status_code,status_color), priority:priority_master(name:priority_name,code:priority_code)`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Supabase Error fetching tasks:", error);
      }
        
      if (data && data.length > 0) {
        // Fetch Workspaces
        const wsIds = Array.from(new Set(data.map((t: any) => t.workspace_id).filter(Boolean)));
        const { data: workspaces } = await supabase.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds);
        
        // Fetch Creators
        const creatorIds = Array.from(new Set(data.map((t: any) => t.created_by).filter(Boolean)));
        const { data: users } = await supabase.from("user_master").select("id, manager_id").in("id", creatorIds);

        // Fetch Assignees
        const assigneeIds = Array.from(new Set(data.map((t: any) => t.assigned_to).filter(Boolean)));
        let assignees: any[] = [];
        if (assigneeIds.length > 0) {
          const { data: usersData } = await supabase.from("user_master").select("id, full_name, profile_photo, user_code").in("id", assigneeIds);
          if (usersData) assignees = usersData;
        }

        data.forEach((t: any) => {
          t.workspace = workspaces?.find((w: any) => w.id === t.workspace_id) || null;
          t.creator = users?.find((u: any) => u.id === t.created_by) || null;
          t.assignee = assignees.find((a: any) => a.id === t.assigned_to) || null;
        });
      }
      
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    if (!bulkNewStatus) return;
    try {
      setInlineLoading(true);
      // NOTE: updateTaskStatusInline requires the user to be the assignee, some might fail if they are not.
      await Promise.all(Array.from(selectedTaskIds).map(id => updateTaskStatusInline(id, bulkNewStatus, bulkRemark || "Bulk Status Update")));
      
      const stMaster = masterStatuses.find(s => s.id === bulkNewStatus);
      setTasks(prev => prev.map(t => selectedTaskIds.has(t.id) ? { ...t, status_id: bulkNewStatus, status: stMaster } : t));
      setSelectedTaskIds(new Set());
      setBulkStatusModalOpen(false);
      triggerToast(`Successfully updated tasks.`);
    } catch (e: any) {
      alert("Bulk status update failed: " + e.message);
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

    triggerToast("Task updated successfully!");
    setInlineLoading(false);
    setStatusModalOpen(false);
    refresh();
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

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wsId = params.get("workspaceId");
      setSelectedWorkspaceId(wsId || null);
    }
    
    // Always refresh on mount since we removed server-side fetching for speed
    refresh();
  }, []);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks");

    worksheet.columns = [
      { header: "Code", key: "code", width: 15 },
      { header: "Title", key: "title", width: 40 },
      { header: "Workspace", key: "workspace", width: 25 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Due Date", key: "due", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Created At", key: "created", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    filtered.forEach((t) => {
      worksheet.addRow({
        code: t.code || `TSK-${t.id.substring(0,4).toUpperCase()}`,
        title: t.title || "—",
        workspace: t.workspace?.name || t.workspace?.code || "—",
        priority: t.priority?.name || "—",
        due: t.end_date || "—",
        status: t.status?.name || "—",
        created: formatDate(t.created_at),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Workspace_Tasks_Export.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("All Workspace Tasks", 14, 15);
    
    const tableData = filtered.map(t => [
      t.code || `TSK-${t.id.substring(0,4).toUpperCase()}`,
      t.title || "—",
      t.workspace?.name || t.workspace?.code || "—",
      t.priority?.name || "—",
      t.end_date || "—",
      t.status?.name || "—",
      formatDate(t.created_at)
    ]);

    autoTable(doc, {
      head: [["Code", "Title", "Workspace", "Priority", "Due Date", "Status", "Created At"]],
      body: tableData,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [243, 244, 246] }
    });

    doc.save("Workspace_Tasks_Export.pdf");
  };

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate row height in pixels
    overscan: 10,
  });

  return (
    <ExperienceProvider mode="operational">
      <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppButton variant="outline" size="sm" onClick={() => router.push(selectedWorkspaceId ? `/workspaces?workspace=${selectedWorkspaceId}` : "/workspaces")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </AppButton>
          <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
            {(["ALL","CREATOR","MANAGER"] as const).map(sc => (
              <button
                key={sc}
                onClick={() => setScope(sc)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${scope === sc ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10"}`}
              >
                {sc === "ALL" ? "All Operations" : sc === "CREATOR" ? "Created By Me" : "Managed By Me"}
              </button>
            ))}
          </div>
        </div>

        {/* Toast Notification */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
            <span className="text-xs font-semibold">{successToast}</span>
          </div>
        )}

        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
            <AppButton variant="outline" size="sm" onClick={exportToExcel} leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-400" />}>
              Excel
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={exportToPDF} leftIcon={<FileText className="h-4 w-4 text-rose-400" />}>
              PDF
            </AppButton>
          </div>
          {/* Workspace Filter Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Workspace:</span>
            <select
              value={selectedWorkspaceId || ""}
              onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="" className="bg-white dark:bg-[#0f111a] text-gray-900 dark:text-gray-300">All Workspaces</option>
              {uniqueWorkspaces.map((ws: any) => (
                <option key={ws.id} value={ws.id} className="bg-white dark:bg-[#0f111a] text-gray-900 dark:text-gray-300">
                  {ws.code} - {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <AppInput placeholder="Search tasks, code, workspace..." value={query} onChange={(e:any) => setQuery(e.target.value)} className="w-72 text-sm" />
            <AppButton variant="outline" size="sm" onClick={refresh} leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}>
              Refresh
            </AppButton>
          </div>
        </div>
      </div>

            {/* Advanced Filters Row */}
      <div className="flex items-center flex-wrap gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5">
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="text-[11px] px-2 py-1.5 rounded-[var(--radius-input,4px)] border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="text-[11px] px-2 py-1.5 rounded-[var(--radius-input,4px)] border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">All Priorities</option>
          {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showEscalatedOnly} onChange={e => setShowEscalatedOnly(e.target.checked)} className="rounded border-gray-300 text-rose-500 focus:ring-rose-500" />
          Escalated Only
        </label>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 ml-auto">
          <span>Date Between:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-[11px] px-2 py-1 rounded-[var(--radius-input,4px)] border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <span>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-[11px] px-2 py-1 rounded-[var(--radius-input,4px)] border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          
          {(selectedStatus || selectedPriority || showEscalatedOnly || dateFrom || dateTo) && (
            <button 
              onClick={() => {
                setSelectedStatus("");
                setSelectedPriority("");
                setShowEscalatedOnly(false);
                setDateFrom("");
                setDateTo("");
              }}
              className="ml-2 text-[10px] uppercase text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <style>{`
        .task-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .task-table tbody tr {
          border-bottom: 1px solid #e5e7eb;
        }
        .task-table tbody tr:last-child {
          border-bottom: none;
        }
        .task-table tbody tr:nth-child(odd) {
          background-color: #ffffff;
        }
        .task-table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .task-table tbody tr:hover {
          background-color: #f3f4f6 !important;
        }
        .task-table thead {
          background-color: #f3f4f6;
        }
        .task-table thead th {
          font-weight: 600;
          color: #1f2937;
          letter-spacing: 0.025em;
          border-bottom: 2px solid #d1d5db;
          padding: 8px 12px;
          background-color: #f3f4f6;
          font-size: 11px;
          text-transform: uppercase;
        }
        .task-table tbody td {
          color: #374151;
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
      
      <AppTableContainer>
        <div ref={parentRef} className="max-h-[600px] overflow-auto relative">
          <AppTable className="task-table w-full">
            <AppTableHeader className="sticky top-0 z-10 bg-[#06080f]">
              <AppTableRow>
                <AppTableHead className="w-[40px] px-2 text-center">
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && selectedTaskIds.size === filtered.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedTaskIds.size > 0 && selectedTaskIds.size < filtered.length;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </AppTableHead>
                <AppTableHead className="min-w-[100px] whitespace-nowrap">Code</AppTableHead>
                <AppTableHead className="min-w-[300px]">Title & Description</AppTableHead>
                <AppTableHead className="min-w-[180px]">Workspace</AppTableHead>
                <AppTableHead className="min-w-[120px]">Priority</AppTableHead>
                <AppTableHead className="min-w-[120px] whitespace-nowrap">Due</AppTableHead>
                <AppTableHead className="min-w-[120px] whitespace-nowrap">Status</AppTableHead>
                <AppTableHead className="min-w-[160px]">Assignee</AppTableHead>
                <AppTableHead className="text-right min-w-[100px] whitespace-nowrap">Created</AppTableHead>
                <AppTableHead className="text-right min-w-[120px]">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {virtualizer.getVirtualItems().length > 0 && virtualizer.getVirtualItems()[0].start > 0 && (
                <tr>
                  <td colSpan={8} style={{ height: `${virtualizer.getVirtualItems()[0].start}px` }} />
                </tr>
              )}
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const task = filtered[virtualRow.index];
                return (
                  <AppTableRow 
                    key={task.id} 
                    className={`transition-colors duration-150 ${selectedTaskIds.has(task.id) ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-800/20"}`}
                  >
                    <AppTableCell className="w-[40px] px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedTaskIds.has(task.id)}
                        onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </AppTableCell>
                    <AppTableCell className="font-mono text-[11px] text-blue-600 font-bold min-w-[100px] whitespace-nowrap">{task.code || `TSK-${task.id.substring(0,4).toUpperCase()}`}</AppTableCell>
                    <AppTableCell className="min-w-[300px]">
                      <div className="font-semibold break-words text-gray-900">{task.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{task.description}</div>
                      {typeof task.custom_fields?.progress_percentage === 'number' && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">{task.custom_fields.progress_percentage}%</span>
                        </div>
                      )}
                    </AppTableCell>
                    <AppTableCell className="text-gray-700 min-w-[180px] break-words">{task.workspace?.name || task.workspace?.code}</AppTableCell>
                    <AppTableCell className="min-w-[120px]">
                      <AppBadge variant={task.priority?.priority_color ? "custom" : "info"} customColor={task.priority?.priority_color || null}>
                        {task.priority?.name || '—'}
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell className="text-gray-600 text-sm min-w-[120px] whitespace-nowrap">{task.end_date || '—'}</AppTableCell>
                    <AppTableCell className="min-w-[120px] whitespace-nowrap">
                      <button 
                        onClick={(e) => handleStatusClick(e, task)} 
                        className="hover:opacity-80 transition-opacity focus:outline-none" 
                        title="Update Status"
                      >
                        <AppBadge variant={task.status?.status_color ? "custom" : "neutral"} customColor={task.status?.status_color || null} className="cursor-pointer border-dashed">
                          {task.status?.name || '—'}
                        </AppBadge>
                      </button>
                    </AppTableCell>
                    <AppTableCell className="min-w-[160px]">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          {task.assignee.profile_photo ? (
                            <img src={task.assignee.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover bg-gray-200" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                              {task.assignee.full_name?.substring(0, 2).toUpperCase() || "U"}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-800 break-words">{task.assignee.full_name}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </AppTableCell>
                    <AppTableCell className="text-right text-gray-500 text-xs min-w-[100px] whitespace-nowrap">{formatDate(task.created_at)}</AppTableCell>
                    <AppTableCell className="text-right min-w-[120px]">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link 
                          href={`/tasks/${task.id}`}
                          className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="View Task"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link 
                          href={`/tasks/${task.id}`}
                          className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        {canDelete && (
                          <button 
                            onClick={(e) => handleDeleteTask(e, task.id)}
                            disabled={deleteLoadingId === task.id}
                            className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                            title="Delete Task"
                          >
                            {deleteLoadingId === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </AppTableCell>
                  </AppTableRow>
                );
              })}
              {virtualizer.getVirtualItems().length > 0 && virtualizer.getTotalSize() - virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1].end > 0 && (
                <tr>
                  <td colSpan={8} style={{ height: `${virtualizer.getTotalSize() - virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1].end}px` }} />
                </tr>
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppTableContainer>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">No tasks found for this filter.</div>
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
            <AppButton variant="outline" size="sm" onClick={() => setBulkStatusModalOpen(true)}>Update Status</AppButton>
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
            <DialogTitle className="text-gray-900 dark:text-gray-100">Bulk Update Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Updating {selectedTaskIds.size} Tasks</div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Status</label>
              <select
                value={bulkNewStatus}
                onChange={(e) => setBulkNewStatus(e.target.value)}
                className="w-full text-[13px] bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>Select Status</option>
                {masterStatuses.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
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
              disabled={inlineLoading || !bulkNewStatus}
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
            
            {(inlineTask?.assigned_to === currentUserId || hasPermission("WORKSPACES_MANAGE")) ? (
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
    </ExperienceProvider>
  );
}
