"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { Loader2, Filter, FileSpreadsheet, FileText, Briefcase, LayoutList, Layers, AlignLeft } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateWorkspaceReportData, ReportEntityType, ReportScope } from "@/lib/actions/workspace_reports";
import { useTheme } from "@/components/theme/ThemeProvider";

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

export default function ReportsClient() {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  const [entityType, setEntityType] = useState<ReportEntityType>("WORKSPACE");
  const [scope, setScope] = useState<ReportScope>("CREATED_BY_ME");
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const refreshData = async () => {
    setLoading(true);
    try {
      const result = await generateWorkspaceReportData(entityType, scope);
      setData(result);
    } catch (e: any) {
      alert("Failed to load report data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Reset filters on entity change
    setQuery("");
    setSelectedStatus("");
    setDateFrom("");
    setDateTo("");
  }, [entityType, scope]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(data.map(d => d.status).filter(s => s !== "—"))) as string[], [data]);

  const filtered = useMemo(() => {
    return data.filter(item => {
      if (selectedStatus && item.status !== selectedStatus) return false;

      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime();
        const taskDate = new Date(item.created_at).getTime();
        if (taskDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + 86400000;
        const taskDate = new Date(item.created_at).getTime();
        if (taskDate >= toDate) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        if (!(
          (item.title || "").toLowerCase().includes(q) ||
          (item.code || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          (item.workspace || "").toLowerCase().includes(q) ||
          (item.assigned_to || "").toLowerCase().includes(q)
        )) return false;
      }

      return true;
    });
  }, [data, query, selectedStatus, dateFrom, dateTo]);

  const getEntityDisplayName = () => {
    switch (entityType) {
      case "WORKSPACE": return "Workspace";
      case "SUB_WORKSPACE": return "Sub-Workspace";
      case "TASK": return "Task";
      case "SUB_TASK": return "Sub-Task";
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${getEntityDisplayName()} Report`);

    worksheet.columns = [
      { header: "Code", key: "code", width: 15 },
      { header: "Title", key: "title", width: 40 },
      { header: "Context (Workspace/Company)", key: "workspace", width: 25 },
      { header: "Status", key: "status", width: 15 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Created By", key: "creator_name", width: 20 },
      { header: "Assigned To", key: "assigned_to", width: 30 },
      { header: "Start Date", key: "start_date", width: 15 },
      { header: "End Date", key: "end_date", width: 15 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };

    filtered.forEach((t) => {
      worksheet.addRow({
        code: t.code,
        title: t.title,
        workspace: t.workspace,
        status: t.status,
        priority: t.priority,
        creator_name: t.creator_name,
        assigned_to: t.assigned_to,
        start_date: formatDate(t.start_date),
        end_date: formatDate(t.end_date),
        created_at: formatDate(t.created_at),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${getEntityDisplayName()}_Report.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text(`${getEntityDisplayName()} Report - ${scope.replace(/_/g, " ")}`, 14, 15);
    
    const tableData = filtered.map(t => [
      t.code,
      t.title,
      t.workspace,
      t.status,
      t.creator_name,
      t.assigned_to,
      formatDate(t.created_at)
    ]);

    autoTable(doc, {
      head: [["Code", "Title", "Context", "Status", "Created By", "Assigned To", "Created At"]],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${getEntityDisplayName()}_Report.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Entity Selection Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-4">
        <button onClick={() => setEntityType("WORKSPACE")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${entityType === "WORKSPACE" ? (isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-400") : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
          <Briefcase className="h-4 w-4" /> Workspaces
        </button>
        <button onClick={() => setEntityType("SUB_WORKSPACE")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${entityType === "SUB_WORKSPACE" ? (isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-400") : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
          <Layers className="h-4 w-4" /> Sub-Workspaces
        </button>
        <button onClick={() => setEntityType("TASK")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${entityType === "TASK" ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
          <LayoutList className="h-4 w-4" /> Tasks
        </button>
        <button onClick={() => setEntityType("SUB_TASK")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${entityType === "SUB_TASK" ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
          <AlignLeft className="h-4 w-4" /> Sub-Tasks
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Scope Toggle */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 overflow-x-auto">
          {(["ALL", "CREATED_BY_ME", "ASSIGNED_TO_ME", "MANAGED_BY_ME"] as ReportScope[]).map(sc => (
            <button
              key={sc}
              onClick={() => setScope(sc)}
              className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                scope === sc 
                  ? "bg-white dark:bg-[#1C1C28] text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-white/10" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {sc.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Exports & Actions */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 border-r border-gray-200 dark:border-white/10 pr-3 mr-1">
            <AppButton variant="outline" size="sm" onClick={exportToExcel} leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-500" />}>
              Export Excel
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={exportToPDF} leftIcon={<FileText className="h-4 w-4 text-rose-500" />}>
              Export PDF
            </AppButton>
          </div>

          <div className="flex items-center gap-2">
            <AppInput placeholder="Search records..." value={query} onChange={(e:any) => setQuery(e.target.value)} className="w-64 text-sm" />
            <AppButton variant="primary" size="sm" onClick={refreshData} disabled={loading} leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}>
              {loading ? "Loading..." : "Refresh"}
            </AppButton>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex items-center flex-wrap gap-4 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-200 dark:border-white/5">
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={`text-xs font-bold px-3 py-2 rounded-lg border ${isLightMode ? "border-gray-300 bg-white text-gray-700" : "border-white/10 bg-[#0f111a] text-gray-300"} focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
          <option value="">All Statuses</option>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <span>Date Range:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${isLightMode ? "border-gray-300 bg-white" : "border-white/10 bg-[#0f111a]"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
          <span>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${isLightMode ? "border-gray-300 bg-white" : "border-white/10 bg-[#0f111a]"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
          
          {(selectedStatus || dateFrom || dateTo || query) && (
            <button 
              onClick={() => {
                setSelectedStatus("");
                setDateFrom("");
                setDateTo("");
                setQuery("");
              }}
              className="ml-2 text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 underline"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
        Showing {filtered.length} Results
      </div>

      {/* Data Table */}
      <AppTableContainer>
        <div className="max-h-[600px] overflow-auto relative rounded-xl border border-gray-200 dark:border-white/10">
          <AppTable className="w-full text-sm">
            <AppTableHeader className={`sticky top-0 z-10 ${isLightMode ? "bg-gray-100 border-b border-gray-200" : "bg-[#0A0D14] border-b border-white/10"}`}>
              <AppTableRow>
                <AppTableHead className="w-[100px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Code</AppTableHead>
                <AppTableHead className="w-[250px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Title</AppTableHead>
                <AppTableHead className="w-[150px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Context</AppTableHead>
                <AppTableHead className="w-[120px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Status</AppTableHead>
                <AppTableHead className="w-[150px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Created By</AppTableHead>
                <AppTableHead className="w-[180px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Assigned To</AppTableHead>
                <AppTableHead className="text-right w-[120px] font-bold text-xs uppercase text-gray-500 px-4 py-3">Created At</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filtered.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={7} className="h-32 text-center text-gray-500">
                    {loading ? "Loading report data..." : "No records found matching the current filters."}
                  </AppTableCell>
                </AppTableRow>
              ) : (
                filtered.map((item) => (
                  <AppTableRow key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <AppTableCell className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-4 py-3">
                      {item.code || `ID-${item.id.substring(0,4).toUpperCase()}`}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[220px]" title={item.title}>{item.title}</div>
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[140px]" title={item.workspace}>
                      {item.workspace}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3">
                      <AppBadge variant={item.status === "Closed" || item.status === "Completed" ? "success" : "neutral"}>
                        {item.status}
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.creator_name}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[170px]" title={item.assigned_to}>
                      {item.assigned_to}
                    </AppTableCell>
                    <AppTableCell className="text-right text-xs text-gray-500 px-4 py-3">
                      {formatDate(item.created_at)}
                    </AppTableCell>
                  </AppTableRow>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppTableContainer>
    </div>
  );
}
