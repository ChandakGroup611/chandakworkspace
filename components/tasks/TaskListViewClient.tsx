"use client";

import React, { useMemo, useState, useEffect } from "react";
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
import { Loader2, Eye, Filter, Search, Users, Calendar, ArrowLeft, Download, FileText, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const router = useRouter();

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
  }, []);

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
      // 1. Pre-filter by workspace selection if any
      if (selectedWorkspaceId && t.workspace_id !== selectedWorkspaceId) return false;

      // 2. All tasks shown to user are already visibility-checked by server
      // This filter is just for scope refinement
      if (scope === "ALL") return true;
      if (!currentUserId) return false;

      if (scope === "CREATOR") return t.created_by === currentUserId;

      if (scope === "MANAGER") {
        // Check if current user is the manager of the task creator (matches database RLS)
        return t.creator?.manager_id === currentUserId;
      }

      return true;
    }).filter(t => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (t.title || "").toLowerCase().includes(q) ||
        (t.code || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.workspace?.name || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, scope, query, currentUserId, selectedWorkspaceId]);

  const refresh = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from("tasks").select(`
        *, title:subject, status:status_master(name:status_name,code:status_code,status_color), priority:priority_master(name:priority_name,code:priority_code), creator:user_master!created_by(id,manager_id)`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
        
      if (data && data.length > 0) {
        const wsIds = Array.from(new Set(data.map((t: any) => t.workspace_id).filter(Boolean)));
        const { data: workspaces } = await supabase.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds);
        data.forEach((t: any) => {
          t.workspace = workspaces?.find((w: any) => w.id === t.workspace_id) || null;
        });
      }
      
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppButton variant="outline" size="sm" onClick={() => router.push("/workspaces")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </AppButton>
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/5">
            {(["ALL","CREATOR","MANAGER"] as const).map(sc => (
              <button
                key={sc}
                onClick={() => setScope(sc)}
                className={`text-[12px] font-semibold px-3 py-1 rounded-lg ${scope === sc ? "bg-indigo-600 text-white" : "text-gray-300 hover:text-white"}`}
              >
                {sc === "ALL" ? "All Operations" : sc === "CREATOR" ? "Created By Me" : "Managed By Me"}
              </button>
            ))}
          </div>
        </div>

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
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:border-white/20 focus:outline-none"
            >
              <option value="" className="bg-[#0f111a] text-gray-300">All Workspaces</option>
              {uniqueWorkspaces.map((ws: any) => (
                <option key={ws.id} value={ws.id} className="bg-[#0f111a] text-gray-300">
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
          padding: 12px;
          background-color: #f3f4f6;
        }
        .task-table tbody td {
          color: #374151;
        }
      `}</style>
      
      <AppTableContainer>
        <AppTable className="task-table">
          <AppTableHeader>
            <AppTableRow>
              <AppTableHead className="w-[120px]">Code</AppTableHead>
              <AppTableHead>Title & Description</AppTableHead>
              <AppTableHead>Workspace</AppTableHead>
              <AppTableHead>Priority</AppTableHead>
              <AppTableHead>Due</AppTableHead>
              <AppTableHead>Status</AppTableHead>
              <AppTableHead className="text-right">Created</AppTableHead>
              <AppTableHead className="text-right">Actions</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {filtered.map((task: any, index: number) => (
              <AppTableRow key={task.id} className="transition-colors duration-150">
                <AppTableCell className="font-mono text-xs text-purple-400 font-bold">{task.code || `TSK-${task.id.substring(0,4).toUpperCase()}`}</AppTableCell>
                <AppTableCell>
                  <div className="font-semibold truncate text-gray-100">{task.title}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{task.description}</div>
                </AppTableCell>
                <AppTableCell className="text-gray-300">{task.workspace?.name || task.workspace?.code}</AppTableCell>
                <AppTableCell>
                  <AppBadge variant="info">{task.priority?.name || '—'}</AppBadge>
                </AppTableCell>
                <AppTableCell className="text-gray-400 text-sm">{task.end_date || '—'}</AppTableCell>
                <AppTableCell>
                  <AppBadge variant="neutral">{task.status?.name || '—'}</AppBadge>
                </AppTableCell>
                <AppTableCell className="text-right text-gray-400 text-[12px]">{formatDate(task.created_at)}</AppTableCell>
                <AppTableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <AppButton size="sm" variant="outline" onClick={() => setSelectedTask(task)}>View</AppButton>
                    <Link href={`/tasks/${task.id}`} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Open</Link>
                  </div>
                </AppTableCell>
              </AppTableRow>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableContainer>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">No tasks found for this filter.</div>
      )}

      {/* Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 bg-black/50" onClick={() => setSelectedTask(null)}>
          <div className="w-full max-w-3xl bg-white/5 rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedTask.title}</h2>
                <p className="text-xs text-gray-400">{selectedTask.code} • {selectedTask.workspace?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <AppButton variant="outline" size="sm" onClick={() => setSelectedTask(null)}>Close</AppButton>
                <Link href={`/tasks/${selectedTask.id}`} className="text-xs font-bold text-indigo-500">Open Full</Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400">Description</h4>
                <p className="text-sm mt-2 text-gray-200">{selectedTask.description || 'No description'}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400">Metadata</h4>
                <div className="mt-2 text-sm text-gray-200 space-y-1">
                  <div><strong>Priority:</strong> {selectedTask.priority?.name || 'N/A'}</div>
                  <div><strong>Status:</strong> {selectedTask.status?.name || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
