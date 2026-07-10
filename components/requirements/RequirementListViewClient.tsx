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
import { Loader2, Eye, Search, LayoutList, Layers, CheckCircle2, Download, Upload, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalReportConfig, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import DynamicReportBuilder from "@/components/reports/DynamicReportBuilder";
import { Settings2 } from "lucide-react";
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAllReportCustomFields } from "@/lib/actions/workspace_reports";

type Requirement = any;

function DraggableTableHead({ col, isFirst }: { col: any, isFirst?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.field_id });
  const w = col.column_width || col.default_width || 150;
  const isTitle = col.field_key === "title";
  const style = { 
    transform: CSS.Translate.toString(transform), 
    transition, 
    minWidth: `${w}px`,
    width: `${w}px`,
    opacity: isDragging ? 0.5 : 1,
    position: 'sticky' as any,
    top: 0,
    left: isFirst ? '0px' : undefined,
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
        ["code", "due_date", "created_at", "updated_at", "status_name", "priority_name", "department_name"].includes(col.field_key) ? "whitespace-nowrap" : ""
      )}
      {...attributes} 
      {...listeners}
    >
      {col.display_name}
    </AppTableHead>
  );
}

const INITIAL_REQ_FIELDS: UIFieldDefinition[] = [
  { field_key: "code", display_name: "Req #", data_type: "text", is_default: true, default_width: 100 },
  { field_key: "title", display_name: "Title", data_type: "text", is_default: true, default_width: 300 },
  { field_key: "department_name", display_name: "Department", data_type: "badge", is_default: true, default_width: 150 },
  { field_key: "system_name", display_name: "System", data_type: "text", is_default: true, default_width: 150 },
  { field_key: "module_name", display_name: "Module", data_type: "text", is_default: true, default_width: 150 },
  { field_key: "priority_name", display_name: "Priority", data_type: "badge", is_default: true, default_width: 120 },
  { field_key: "status_name", display_name: "Approval Status", data_type: "badge", is_default: true, default_width: 150 },
  { field_key: "due_date", display_name: "Due Date", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "due_days", display_name: "Due Days", data_type: "text", is_default: true, default_width: 140 },
  { field_key: "task_count", display_name: "Tasks Count", data_type: "number", is_default: true, default_width: 120 },
  { field_key: "task_summary", display_name: "Task Statuses", data_type: "text", is_default: true, default_width: 200 },
  { field_key: "requester_name", display_name: "Requester", data_type: "user", is_default: true, default_width: 150 },
  { field_key: "assignee_name", display_name: "Approver/Assignee", data_type: "user", is_default: true, default_width: 150 },
  { field_key: "actions", display_name: "Actions", data_type: "custom", is_default: true, default_width: 80 },
  { field_key: "created_at", display_name: "Created At", data_type: "date", is_default: false, default_width: 120 },
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

export default function RequirementListViewClient({ initialReqs }: { initialReqs: Requirement[] }) {
  const [reqs, setReqs] = useState<Requirement[]>(initialReqs || []);
  const [scope, setScope] = useState<"ALL" | "REQUESTER" | "APPROVER">("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      } catch (e) {}
    }
    getUser();
  }, []);

  const [dynamicFields, setDynamicFields] = useState<UIFieldDefinition[]>([]);

  const combinedFields = useMemo(() => {
    return [...INITIAL_REQ_FIELDS, ...dynamicFields];
  }, [dynamicFields]);

  const { layout, availableFields, loading: configLoading, saveLayout, resetToDefault } = useLocalReportConfig('REQUIREMENT_REPORTS', combinedFields);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const visibleColumns = useMemo(() => layout.filter(l => l.is_visible).sort((a, b) => a.display_order - b.display_order), [layout]);

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // currentUserId is defined above in useState

  useEffect(() => {
    getAllReportCustomFields().then(setDynamicFields).catch(console.error);
  }, []);

  const uniqueStatuses = useMemo(() => Array.from(new Set(reqs.map((r: any) => r.status_name).filter((s:any) => s !== "—"))) as string[], [reqs]);
  const uniquePriorities = useMemo(() => Array.from(new Set(reqs.map((r: any) => r.priority_name).filter((s:any) => s !== "—"))) as string[], [reqs]);
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return reqs.filter(r => {
      if (scope === "REQUESTER") {
        if (r.requester_id !== currentUserId) return false;
      }
      if (scope === "APPROVER") {
        if (r.current_assignee_id !== currentUserId) return false;
      }
      
      if (selectedStatus && r.status_name !== selectedStatus) return false;
      if (selectedPriority && r.priority_name !== selectedPriority) return false;
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime();
        const reqDate = new Date(r.created_at).getTime();
        if (reqDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + 86400000;
        const reqDate = new Date(r.created_at).getTime();
        if (reqDate >= toDate) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        if (!(
          (r.title || "").toLowerCase().includes(q) ||
          (r.code || "").toLowerCase().includes(q) ||
          (r.department_name || "").toLowerCase().includes(q)
        )) return false;
      }

      return true;
    });
  }, [reqs, scope, query, currentUserId, selectedStatus, selectedPriority, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter(r => r.status_name?.toLowerCase().includes('pending')).length;
    const approved = filtered.filter(r => r.status_name?.toLowerCase().includes('approved') || r.status_name?.toLowerCase() === 'closed').length;
    
    let totalTasks = 0;
    let closedTasks = 0;
    filtered.forEach(r => {
       if (r.task_count) {
          totalTasks += r.task_count;
          const closedStr = (r.task_summary || "").match(/(\d+) Closed/);
          if (closedStr && closedStr[1]) {
             closedTasks += parseInt(closedStr[1], 10);
          }
       }
    });

    return [
      { label: "Total Reqs", value: total, icon: <LayoutList className="h-5 w-5" />, iconBgClass: "bg-accent/10", iconColorClass: "text-accent" },
      { label: "Pending", value: pending, icon: <Layers className="h-5 w-5" />, iconBgClass: "bg-amber-500/10", iconColorClass: "text-amber-600" },
      { label: "Approved", value: approved, icon: <CheckCircle2 className="h-5 w-5" />, iconBgClass: "bg-emerald-500/10", iconColorClass: "text-emerald-600" },
      { label: "Linked Tasks Progress", value: totalTasks > 0 ? `${Math.round((closedTasks / totalTasks) * 100)}%` : "0%", icon: <CheckCircle2 className="h-5 w-5" />, iconBgClass: "bg-accent/10", iconColorClass: "text-accent" },
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

  const getExportCellValue = (col: any, r: any) => {
    switch(col.field_key) {
      case "code": return r.code || r.id;
      case "title": return r.title || "—";
      case "department_name": return r.department_name;
      case "system_name": return r.system_name;
      case "module_name": return r.module_name;
      case "priority_name": return r.priority_name;
      case "status_name": return r.status_name;
      case "due_date": return formatDate(r.due_date);
      case "due_days": return r.due_days;
      case "task_count": return r.task_count;
      case "task_summary": return r.task_summary;
      case "requester_name": return r.requester_name;
      case "assignee_name": return r.assignee_name;
      case "created_at": return formatDate(r.created_at);
      case "updated_at": return formatDate(r.updated_at);
      default: {
        let val = undefined;
        if (r.custom_fields && r.custom_fields[col.field_key] !== undefined) {
          val = r.custom_fields[col.field_key];
        } else if (r[col.field_key] !== undefined) {
          val = r[col.field_key];
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
    const worksheet = workbook.addWorksheet("Requirements Analysis");

    const exportCols = visibleColumns.filter(c => c.field_key !== "actions");

    worksheet.columns = exportCols.map(col => ({
      header: col.display_name,
      key: col.field_key,
      width: col.field_key === "title" ? 40 : 20,
    }));

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    filtered.forEach((r) => {
      const row: any = {};
      exportCols.forEach(col => {
        row[col.field_key] = getExportCellValue(col, r);
      });
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Requirement_Analysis_Report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("Requirement Analysis Report", 14, 15);
    
    const exportCols = visibleColumns.filter(c => c.field_key !== "actions");
    const tableData = filtered.map(r => exportCols.map(col => getExportCellValue(col, r)));

    autoTable(doc, {
      head: [exportCols.map(col => col.display_name)],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [243, 244, 246] }
    });

    doc.save("Requirement_Analysis_Report.pdf");
  };

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  if (permsLoading) {
    return <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto my-12" />;
  }

  if (!hasPermission("REQUIREMENTS_REPORTS_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Requirement Analytics.</p>
      </div>
    );
  }

  return (
    <ExperienceProvider mode="operational">
      <div className="space-y-6">
        <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 shrink-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Requirement Analysis & Report</h1>
            <p className="text-sm font-medium text-muted">
              Deep dive analytics and reporting for all requirements
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ReportKPIBar kpis={kpis} variant="compact" className="mb-0 shrink-0" />
            <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>
            <AppButton variant="outline" size="sm" onClick={exportToExcel} leftIcon={<Upload className="h-4 w-4" />} className="h-9 px-4 font-semibold border-border shadow-sm">
              Export Excel
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={exportToPDF} leftIcon={<Download className="h-4 w-4" />} className="h-9 px-4 font-semibold border-border shadow-sm">
              Export PDF
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={() => setIsConfigOpen(true)} leftIcon={<Settings2 className="h-4 w-4" />} className="h-9 px-4 font-semibold border-border shadow-sm">
              Columns
            </AppButton>
          </div>
        </header>

        <div className="bg-surface rounded-2xl border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 pt-2">
            <div className="flex items-center gap-6 self-end">
              {(["ALL","REQUESTER","APPROVER"] as const).map(sc => (
                <button
                  key={sc}
                  onClick={() => setScope(sc)}
                  className={`pb-3 text-[13px] font-bold transition-all border-b-2 relative top-[1px] ${scope === sc ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
                >
                  {sc === "ALL" ? "All Requirements" : sc === "REQUESTER" ? "My Requests" : "Pending My Approval"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 pb-2">
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02]">
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="text-sm font-medium h-9 px-3 w-40 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="">All Priorities</option>
              {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <div className="flex items-center gap-2 mx-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <span className="text-sm text-muted">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm font-medium h-9 px-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                placeholder="Search requirements, code, department..." 
                value={query} 
                onChange={(e:any) => setQuery(e.target.value)} 
                className="w-full text-sm font-medium h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted" 
              />
            </div>
          </div>

          <DynamicReportBuilder 
            isOpen={isConfigOpen} 
            onClose={() => setIsConfigOpen(false)} 
            layout={layout} 
            availableFields={availableFields} 
            onSave={saveLayout} 
            onReset={resetToDefault} 
            reportName="Requirement Analysis"
          />

          <AppTableContainer ref={parentRef} className="h-[600px] rounded-b-2xl">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <AppTable style={{ minWidth: visibleColumns.reduce((acc, col) => acc + (col.column_width || (col as any).default_width || 150), 0) + 100 }}>
                <AppTableHeader>
                  <AppTableRow>
                    <SortableContext items={visibleColumns.map(c => c.field_id)} strategy={horizontalListSortingStrategy}>
                      {visibleColumns.map((col, i) => (
                        <DraggableTableHead key={col.field_id} col={col} isFirst={i === 0} />
                      ))}
                    </SortableContext>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const r = filtered[virtualRow.index];
                    return (
                      <AppTableRow 
                        key={r.id} 
                        style={{ height: `${virtualRow.size}px` }} 
                        className="hover:bg-accent/10/50 dark:hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => router.push(`/requirements/${r.id}?tab=analysis`)}
                      >
                        {visibleColumns.map((col, i) => {
                          const w = col.column_width || (col as any).default_width || 150;
                          return (
                            <AppTableCell 
                              key={col.field_id} 
                              style={{ width: `${w}px`, minWidth: `${w}px` }}
                              className={cn(
                                !["title", "task_summary"].includes(col.field_key) && "text-center",
                                "text-[13px]",
                                i === 0 && "sticky left-0 bg-white dark:bg-[#06080f] z-20"
                              )}
                            >
                              {col.field_key === "actions" ? (
                                <AppButton 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  onClick={(e) => { e.stopPropagation(); router.push(`/requirements/${r.id}?tab=analysis`); }}
                                >
                                  <Eye className="h-4 w-4" />
                                </AppButton>
                              ) : col.field_key === "status_name" ? (
                                <AppBadge variant={r.status_name === 'Approved' ? 'success' : r.status_name === 'Rejected' ? 'danger' : r.status_name === 'Closed' ? 'success' : r.status_name?.includes('Pending') ? 'warning' : 'neutral'}>
                                  {r.status_name}
                                </AppBadge>
                              ) : col.field_key === "priority_name" ? (
                                <span 
                                  className="px-2 py-1 rounded text-[10px] font-bold text-foreground shadow-sm"
                                  style={{ backgroundColor: r.priority?.priority_color || '#6B7280' }}
                                >
                                  {r.priority_name !== "—" ? r.priority_name : "-"}
                                </span>
                              ) : col.field_key === "code" ? (
                                <span className="font-mono font-bold text-amber-500">{r.code || r.id}</span>
                              ) : col.field_key === "title" ? (
                                <div className="font-medium truncate" title={r.title}>{r.title}</div>
                              ) : col.field_key === "task_count" ? (
                                <div className="font-bold text-accent bg-accent/10 dark:bg-accent/10 px-2 py-1 rounded w-fit mx-auto">{r.task_count}</div>
                              ) : col.field_key === "due_days" ? (
                                <div className={cn("font-semibold", r.due_days?.includes("Overdue") ? "text-rose-500" : "text-emerald-500")}>
                                  {r.due_days}
                                </div>
                              ) : (
                                <div className="truncate text-muted-foreground" title={String(getExportCellValue(col, r))}>
                                  {getExportCellValue(col, r)}
                                </div>
                              )}
                            </AppTableCell>
                          );
                        })}
                      </AppTableRow>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </DndContext>
          </AppTableContainer>
        </div>
      </div>
    </ExperienceProvider>
  );
}
