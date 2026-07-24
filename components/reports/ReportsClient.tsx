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
import { generateWorkspaceReportData, getAllReportCustomFields, ReportEntityType, ReportScope } from "@/lib/actions/workspace_reports";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalReportConfig, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import DynamicReportBuilder from "@/components/reports/DynamicReportBuilder";
import { Settings2 } from "lucide-react";
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DraggableTableHead({ col, filterValue, onFilterChange }: { col: any; filterValue?: string; onFilterChange?: (v: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.field_id });
  const style = { 
    transform: CSS.Translate.toString(transform), 
    transition, 
    minWidth: col.column_width ? `${col.column_width}px` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 25,
    position: 'sticky' as any,
    top: 0,
  };
  return (
    <AppTableHead 
      ref={setNodeRef} 
      style={style}
      className={`bg-elevated border-b border-border font-bold text-xs uppercase text-foreground px-4 py-2 hover:bg-accent/10 transition-colors ${["code", "due_date", "created_at", "start_date"].includes(col.field_key) ? "whitespace-nowrap" : ""} ${["created_at", "start_date"].includes(col.field_key) ? "text-right" : ""}`} 
    >
      <div className="flex flex-col gap-2">
        <div className="cursor-grab active:cursor-grabbing select-none" {...attributes} {...listeners}>
          {col.display_name}
        </div>
        {onFilterChange && (
          <input 
            type="text" 
            value={filterValue || ""} 
            onChange={(e) => onFilterChange(e.target.value)} 
            placeholder={`Filter ${col.display_name}...`}
            className="w-full text-[10px] font-normal px-2 py-1 rounded bg-surface dark:bg-black/40 border border-gray-200 dark:border-white/10 text-foreground focus:outline-none focus:border-accent placeholder:text-gray-400"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </AppTableHead>
  );
}

const INITIAL_REPORT_FIELDS: UIFieldDefinition[] = [
  { field_key: "code", display_name: "Code", data_type: "text", is_default: true, default_width: 100 },
  { field_key: "title", display_name: "Title", data_type: "text", is_default: true, default_width: 250 },
  { field_key: "workspace", display_name: "Context", data_type: "text", is_default: true, default_width: 150 },
  { field_key: "department", display_name: "Department", data_type: "text", is_default: true, default_width: 120 },
  { field_key: "priority", display_name: "Priority", data_type: "badge", is_default: true, default_width: 120 },
  { field_key: "due_date", display_name: "Due Date", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "status", display_name: "Status", data_type: "badge", is_default: true, default_width: 120 },
  { field_key: "creator_name", display_name: "Created By", data_type: "text", is_default: true, default_width: 150 },
  { field_key: "assigned_to", display_name: "Assigned To", data_type: "text", is_default: true, default_width: 180 },
  { field_key: "created_at", display_name: "Created At", data_type: "date", is_default: true, default_width: 120 },
  { field_key: "updated_at", display_name: "Updated At", data_type: "date", is_default: false, default_width: 120 },
  { field_key: "description", display_name: "Description", data_type: "text", is_default: false, default_width: 300 },
  { field_key: "start_date", display_name: "Start Date", data_type: "date", is_default: false, default_width: 120 },
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

export default function ReportsClient() {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
  const { hasPermission, roleCode } = usePermissions();
  const canExport = roleCode === "SUPER_ADMIN" || hasPermission("REPORTS_EXPORT");

  const [entityType, setEntityType] = useState<ReportEntityType>("WORKSPACE");
  const [scope, setScope] = useState<ReportScope>("ALL");
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const [dynamicFields, setDynamicFields] = useState<UIFieldDefinition[]>([]);

  const combinedFields = useMemo(() => {
    return [...INITIAL_REPORT_FIELDS, ...dynamicFields];
  }, [dynamicFields]);

  const { layout, availableFields, loading: configLoading, saveLayout, resetToDefault } = useLocalReportConfig('REPORTS_ANALYTICS', combinedFields);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Filter layout based on entityType to omit task-only fields for workspaces
  const visibleColumns = useMemo(() => {
    let cols = layout.filter(l => l.is_visible).sort((a, b) => a.display_order - b.display_order);
    if (entityType === "WORKSPACE" || entityType === "SUB_WORKSPACE") {
      const dynamicKeys = dynamicFields.map(f => f.field_key);
      cols = cols.filter(c => !["department", "priority", "due_date", "status", "start_date", ...dynamicKeys].includes(c.field_key));
    }
    return cols;
  }, [layout, entityType]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [result, customFieldsResult] = await Promise.all([
        generateWorkspaceReportData(entityType, scope),
        getAllReportCustomFields()
      ]);
      setData(result);
      setDynamicFields(customFieldsResult);
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
    setColumnFilters({});
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

      // Column-specific filters
      for (const key of Object.keys(columnFilters)) {
        const filterVal = columnFilters[key]?.toLowerCase();
        if (!filterVal) continue;
        
        let itemVal = item[key];
        if (itemVal === undefined && item.custom_fields) {
          itemVal = item.custom_fields[key];
        }
        
        if (itemVal === undefined || itemVal === null) return false;
        
        const itemStr = String(itemVal).toLowerCase();
        if (!itemStr.includes(filterVal)) return false;
      }

      return true;
    });
  }, [data, query, selectedStatus, dateFrom, dateTo, columnFilters]);

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

  const getEntityDisplayName = () => {
    switch (entityType) {
      case "WORKSPACE": return "Workspace";
      case "SUB_WORKSPACE": return "Sub-Workspace";
      case "TASK": return "Task";
      case "SUB_TASK": return "Sub-Task";
    }
  };

  const getExportCellValue = (col: any, t: any) => {
    switch(col.field_key) {
      case "code": return t.code || `ID-${t.id.substring(0,4).toUpperCase()}`;
      case "title": return t.title || "—";
      case "description": return t.description || "—";
      case "workspace": return t.workspace || "—";
      case "department": return t.department || "—";
      case "priority": return t.priority !== "—" ? t.priority : "—";
      case "due_date": return formatDate(t.end_date);
      case "start_date": return formatDate(t.start_date);
      case "status": return t.status !== "—" ? t.status : "—";
      case "creator_name": return t.creator_name || "—";
      case "assigned_to": return t.assigned_to || "—";
      case "created_at": return formatDate(t.created_at);
      case "updated_at": return formatDate(t.updated_at);
      default: {
        let val = t[col.field_key];
        if (val === undefined && t.custom_fields) {
          val = t.custom_fields[col.field_key];
        }
        
        if (val !== undefined && val !== null && val !== "") {
          if (col.data_type === "boolean") return val ? "Yes" : "No";
          if (col.data_type === "date") return formatDate(val);
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        }
        return "—";
      }
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${getEntityDisplayName()} Report`);

    worksheet.columns = visibleColumns.map(col => ({
      header: col.display_name,
      key: col.field_key,
      width: col.field_key === "title" || col.field_key === "description" ? 40 : 20,
    }));

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };

    filtered.forEach((t) => {
      const row: any = {};
      visibleColumns.forEach(col => {
        row[col.field_key] = getExportCellValue(col, t);
      });
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${getEntityDisplayName()}_Report.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text(`${getEntityDisplayName()} Report - ${scope.replace(/_/g, " ")}`, 14, 15);
    
    const tableData = filtered.map(t => visibleColumns.map(col => getExportCellValue(col, t)));

    autoTable(doc, {
      head: [visibleColumns.map(col => col.display_name)],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${getEntityDisplayName()}_Report.pdf`);
  };

  return (
    <div className="space-y-3">
      
      {/* Top Row: Entity Selection & Scope Toggle */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Entity Selection Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <AppButton variant="secondary" onClick={() => setEntityType("WORKSPACE")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${entityType === "WORKSPACE" ? "bg-accent/20 text-accent" : "text-muted hover:bg-elevated"}`}>
            <Briefcase className="h-3.5 w-3.5" /> Workspaces
          </AppButton>
          <AppButton variant="secondary" onClick={() => setEntityType("SUB_WORKSPACE")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${entityType === "SUB_WORKSPACE" ? "bg-accent/20 text-accent" : "text-muted hover:bg-elevated"}`}>
            <Layers className="h-3.5 w-3.5" /> Sub-Workspaces
          </AppButton>
          <AppButton variant="secondary" onClick={() => setEntityType("TASK")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${entityType === "TASK" ? "bg-accent/20 text-accent" : "text-muted hover:bg-elevated"}`}>
            <LayoutList className="h-3.5 w-3.5" /> Tasks
          </AppButton>
          <AppButton variant="secondary" onClick={() => setEntityType("SUB_TASK")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${entityType === "SUB_TASK" ? "bg-accent/20 text-accent" : "text-muted hover:bg-elevated"}`}>
            <AlignLeft className="h-3.5 w-3.5" /> Sub-Tasks
          </AppButton>
        </div>

        {/* Scope Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border overflow-x-auto shrink-0">
          {(["ALL", "ASSIGNED_TO_ME", "ENROLLED_TASKS"] as ReportScope[]).map(sc => (
            <AppButton variant="secondary"
              key={sc}
              onClick={() => setScope(sc)}
              className={`whitespace-nowrap text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${ scope === sc ? "theme-card-structural text-accent shadow-sm " : "text-muted hover:text-foreground" }`}
            >
              {sc === "ALL" ? "All Records" : sc === "ASSIGNED_TO_ME" ? "Assigned To Me" : "Enrolled Tasks"}
            </AppButton>
          ))}
        </div>
      </div>

      {/* Second Row: Date Filters, Export, Search, Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Date Range & Clear Filters */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-subtle theme-card-structural p-2 rounded-xl">
            <span>Date Range:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg theme-card-structural focus:outline-none focus:ring-2 focus:ring-accent`} />
            <span>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg theme-card-structural focus:outline-none focus:ring-2 focus:ring-accent`} />
            
            {(selectedStatus || dateFrom || dateTo || query || Object.keys(columnFilters).some(k => columnFilters[k])) && (
              <AppButton variant="secondary" 
                onClick={() => {
                  setSelectedStatus("");
                  setDateFrom("");
                  setDateTo("");
                  setQuery("");
                  setColumnFilters({});
                }}
                className="ml-2 px-2 py-1 text-[10px] uppercase font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors"
              >
                Clear Filters
              </AppButton>
            )}
          </div>

          {(entityType === "TASK" || entityType === "SUB_TASK") && (
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={`text-xs font-bold px-3 py-2.5 rounded-xl theme-card-structural text-foreground focus:outline-none focus:ring-2 focus:ring-accent`}>
              <option value="">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Exports, Search & Refresh */}
        <div className="flex items-center flex-wrap gap-3">
          {canExport && (
            <div className="flex items-center gap-2 border-r border-border pr-3 mr-1">
              <AppButton variant="outline" size="sm" onClick={exportToExcel} leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-500" />}>
                Export Excel
              </AppButton>
              <AppButton variant="outline" size="sm" onClick={exportToPDF} leftIcon={<FileText className="h-4 w-4 text-rose-500" />}>
                Export PDF
              </AppButton>
            </div>
          )}

          <div className="flex items-center gap-2">
            <AppInput placeholder="Search records..." value={query} onChange={(e:any) => setQuery(e.target.value)} className="w-64 text-sm" />
            <div className="flex gap-2">
              <AppButton variant="outline" leftIcon={<Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />} onClick={refreshData} disabled={loading}>
                Refresh
              </AppButton>
              <AppButton variant="outline" leftIcon={<Settings2 className={`w-4 h-4 ${configLoading ? 'animate-spin' : ''}`} />} onClick={() => setIsConfigOpen(true)} disabled={configLoading}>
                Columns
              </AppButton>
            </div>
          </div>
        </div>

        {/* Dynamic Report Builder Modal */}
        <DynamicReportBuilder 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
          layout={layout} 
          availableFields={availableFields} 
          onSave={saveLayout} 
          onReset={resetToDefault} 
          reportName="Reports & Analytics"
        />

      </div>

      {/* Results Summary */}
      <ReportKPIBar kpis={[
        { label: "Total Records", value: filtered.length },
        { label: "Entity Type", value: getEntityDisplayName() },
      ]} className="mb-2" />

      {/* Data Table */}
      <AppTableContainer>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="max-h-[600px] overflow-auto relative">
            <AppTable className="w-full border-separate border-spacing-0">
              <AppTableHeader className="sticky top-0 z-40 bg-elevated">
                <AppTableRow>
                  <SortableContext items={visibleColumns.map(c => c.field_id)} strategy={horizontalListSortingStrategy}>
                    {visibleColumns.map(col => (
                      <DraggableTableHead 
                        key={col.field_id} 
                        col={col} 
                        filterValue={columnFilters[col.field_key]}
                        onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, [col.field_key]: v }))}
                      />
                    ))}
                  </SortableContext>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
              {filtered.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={visibleColumns.length} className="h-32 text-center text-muted">
                    {loading ? "Loading report data..." : "No records found matching the current filters."}
                  </AppTableCell>
                </AppTableRow>
              ) : (
                filtered.map((item) => (
                  <AppTableRow key={item.id}>
                    {visibleColumns.map(col => {
                      switch(col.field_key) {
                        case "code": return (
                          <AppTableCell key={col.field_id} className="font-mono text-[13px] font-bold text-accent whitespace-nowrap">
                            {item.code || `ID-${item.id.substring(0,4).toUpperCase()}`}
                          </AppTableCell>
                        );
                        case "title": return (
                          <AppTableCell key={col.field_id}>
                            <div className="text-[13px] font-semibold text-foreground whitespace-normal break-words w-full">{item.title}</div>
                          </AppTableCell>
                        );
                        case "description": return (
                          <AppTableCell key={col.field_id} className="text-[13px] text-subtle">
                            <div className="truncate max-w-[300px]" title={item.description}>{item.description}</div>
                          </AppTableCell>
                        );
                        case "workspace": return (
                          <AppTableCell key={col.field_id} className="text-[13px] text-subtle" title={item.workspace}>
                            <div className="truncate max-w-[150px]">{item.workspace}</div>
                          </AppTableCell>
                        );
                        case "department": return (
                          <AppTableCell key={col.field_id} className="text-[13px] text-subtle">
                            <div className="truncate max-w-[150px]" title={item.department}>{item.department}</div>
                          </AppTableCell>
                        );
                        case "priority": return (
                          <AppTableCell key={col.field_id} className="whitespace-nowrap">
                            {item.priority !== "—" ? <AppBadge variant={item.priority_color ? "custom" : "info"} customColor={item.priority_color}>{item.priority}</AppBadge> : "—"}
                          </AppTableCell>
                        );
                        case "due_date": return (
                          <AppTableCell key={col.field_id} className="text-[13px] text-subtle whitespace-nowrap">
                            {formatDate(item.end_date)}
                          </AppTableCell>
                        );
                        case "start_date": return (
                          <AppTableCell key={col.field_id} className="text-right text-[13px] text-subtle whitespace-nowrap">
                            {formatDate(item.start_date)}
                          </AppTableCell>
                        );
                        case "status": return (
                          <AppTableCell key={col.field_id} className="whitespace-nowrap">
                            {item.status !== "—" ? (
                              <AppBadge 
                                variant={item.status_color ? "custom" : (item.status === "Closed" || item.status === "Completed" ? "success" : "neutral")}
                                customColor={item.status_color}
                              >
                                {item.status}
                              </AppBadge>
                            ) : "—"}
                          </AppTableCell>
                        );
                        case "creator_name": return (
                          <AppTableCell key={col.field_id} className="text-[13px] font-medium text-foreground whitespace-nowrap">
                            {item.creator_name}
                          </AppTableCell>
                        );
                        case "assigned_to": return (
                          <AppTableCell key={col.field_id} className="text-[13px] text-subtle whitespace-nowrap" title={item.assigned_to}>
                            {item.assigned_to}
                          </AppTableCell>
                        );
                        case "created_at": return (
                          <AppTableCell key={col.field_id} className="text-right text-[13px] text-muted whitespace-nowrap">
                            {formatDate(item.created_at)}
                          </AppTableCell>
                        );
                        case "updated_at": return (
                          <AppTableCell key={col.field_id} className="text-right text-[13px] text-muted whitespace-nowrap">
                            {formatDate(item.updated_at)}
                          </AppTableCell>
                        );
                        default: {
                          let val = item[col.field_key];
                          if (val === undefined && item.custom_fields) {
                            val = item.custom_fields[col.field_key];
                          }
                          
                          if (val === undefined || val === null || val === "") val = "—";
                          else if (col.data_type === "boolean") val = val ? "Yes" : "No";
                          else if (col.data_type === "date") val = formatDate(val);
                          else if (typeof val === "object") val = JSON.stringify(val);
                          
                          return (
                            <AppTableCell key={col.field_id} className="text-[13px] text-gray-600 dark:text-gray-400">
                              <div className="truncate max-w-[200px]" title={String(val)}>
                                {col.data_type === "link" && val !== "—" ? (
                                  <a href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{val}</a>
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
                    })}
                  </AppTableRow>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </div>
        </DndContext>
      </AppTableContainer>
    </div>
  );
}


