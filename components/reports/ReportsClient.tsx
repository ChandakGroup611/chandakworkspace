"use client";
/* eslint-disable no-restricted-syntax */
import { toast } from 'react-toastify';
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
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
import { Loader2, Filter, FileSpreadsheet, FileText, Briefcase, LayoutList, Layers, AlignLeft, X, RotateCcw } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateWorkspaceReportData, getAllReportCustomFields, ReportEntityType, ReportScope } from "@/lib/actions/workspace_reports";
import { fetchWorkspaces } from "@/lib/actions/workspaces";
import { WorkspaceFilterMultiSelect } from "@/components/workspaces/WorkspaceFilterMultiSelect";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalReportConfig, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import DynamicReportBuilder from "@/components/reports/DynamicReportBuilder";
import { Settings2 } from "lucide-react";
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmptyState } from "@/components/ui/feedback/States";

const getSafeExternalUrl = (url: string | undefined | null) => {
  if (!url) return '#';
  const str = String(url).trim();
  if (/^(https?|file|ftp|smb|mailto|tel):/i.test(str)) return str;
  return `https://${str}`;
};

function DraggableTableHead({ col, isFirst, filterValue, onFilterChange }: { col: any; isFirst?: boolean; filterValue?: string; onFilterChange?: (v: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.field_id });
  const isCode = col.field_key === "code" || isFirst;
  const style = { 
    transform: CSS.Translate.toString(transform), 
    transition, 
    minWidth: col.column_width ? `${col.column_width}px` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : (isCode ? 35 : 25),
    position: 'sticky' as any,
    top: 0,
    left: isCode ? 0 : undefined,
  };
  return (
    <AppTableHead 
      ref={setNodeRef} 
      style={style}
      className={`bg-elevated border-b border-border theme-label text-foreground px-4 py-2 hover:bg-surface/50 transition-colors ${isCode ? "shadow-[4px_0_8px_rgba(0,0,0,0.06)]" : ""} ${["code", "due_date", "created_at", "start_date"].includes(col.field_key) ? "whitespace-nowrap" : ""} ${["created_at", "start_date"].includes(col.field_key) ? "text-right" : ""}`} 
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
            className="w-full text-[11px] font-normal px-2 py-1 rounded theme-card-structural dark:bg-surface/40 border-border dark:border-border text-foreground focus:outline-none focus:border-primary placeholder:text-muted"
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
  { field_key: "executors", display_name: "Executors", data_type: "text", is_default: true, default_width: 180 },
  { field_key: "watchers", display_name: "Watchers", data_type: "text", is_default: true, default_width: 180 },
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

const WORKSPACE_REPORT_STATE_KEY = "chandak_workspace_reports_filter_state_v1";

export default function ReportsClient() {
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, roleCode } = usePermissions();
  const canExport = roleCode === "SUPER_ADMIN" || hasPermission("REPORTS_EXPORT");

  const [entityType, setEntityType] = useState<ReportEntityType>("WORKSPACE");
  const [scope, setScope] = useState<ReportScope>("ALL");
  const isHydratedRef = useRef(false);
  const prevEntityScopeRef = useRef<{ entityType: ReportEntityType; scope: ReportScope } | null>(null);
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [selectedSubWorkspaceIds, setSelectedSubWorkspaceIds] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    fetchWorkspaces().then(ws => {
      if (Array.isArray(ws)) setAllWorkspaces(ws);
    }).catch(console.error);
  }, []);

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
      toast.error("Failed to load report data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Restore saved report filters on mount (so navigating back from a record preserves filters)
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(WORKSPACE_REPORT_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.entityType) setEntityType(saved.entityType);
        if (saved.scope) setScope(saved.scope);
        if (typeof saved.query === "string") setQuery(saved.query);
        if (typeof saved.selectedStatus === "string") setSelectedStatus(saved.selectedStatus);
        if (Array.isArray(saved.selectedStatuses)) setSelectedStatuses(saved.selectedStatuses);
        if (Array.isArray(saved.selectedWorkspaceIds)) setSelectedWorkspaceIds(saved.selectedWorkspaceIds);
        if (Array.isArray(saved.selectedSubWorkspaceIds)) setSelectedSubWorkspaceIds(saved.selectedSubWorkspaceIds);
        if (typeof saved.dateFrom === "string") setDateFrom(saved.dateFrom);
        if (typeof saved.dateTo === "string") setDateTo(saved.dateTo);
        if (saved.columnFilters && typeof saved.columnFilters === "object") setColumnFilters(saved.columnFilters);
        prevEntityScopeRef.current = {
          entityType: saved.entityType || "WORKSPACE",
          scope: saved.scope || "ALL",
        };
      }
    } catch { /* ignore */ }
    isHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      window.sessionStorage.setItem(
        WORKSPACE_REPORT_STATE_KEY,
        JSON.stringify({
          entityType,
          scope,
          query,
          selectedStatus,
          selectedStatuses,
          selectedWorkspaceIds,
          selectedSubWorkspaceIds,
          dateFrom,
          dateTo,
          columnFilters,
        })
      );
    } catch { /* ignore */ }
  }, [entityType, scope, query, selectedStatus, selectedStatuses, selectedWorkspaceIds, selectedSubWorkspaceIds, dateFrom, dateTo, columnFilters]);

  useEffect(() => {
    refreshData();
    // Only reset filters when the user switches entity/scope after initial hydration
    if (
      prevEntityScopeRef.current &&
      (prevEntityScopeRef.current.entityType !== entityType || prevEntityScopeRef.current.scope !== scope)
    ) {
      setQuery("");
      setSelectedStatus("");
      setSelectedStatuses([]);
      setSelectedWorkspaceIds([]);
      setSelectedSubWorkspaceIds([]);
      setDateFrom("");
      setDateTo("");
      setColumnFilters({});
    }
    prevEntityScopeRef.current = { entityType, scope };
  }, [entityType, scope]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(data.map(d => d.status).filter(s => s !== "—"))) as string[], [data]);

  // Root workspaces options
  const rootWorkspaces = useMemo(() => {
    const map = new Map<string, { id: string; label: string; sublabel?: string }>();
    allWorkspaces.forEach(w => {
      if (!w.parent_workspace_id) {
        map.set(w.id, {
          id: w.id,
          label: w.workspace_name || w.name || "Workspace",
          sublabel: w.workspace_code || w.code ? `(${w.workspace_code || w.code})` : undefined
        });
      }
    });
    data.forEach(d => {
      if (d.workspace_id && !d.parent_workspace_id && !map.has(d.workspace_id)) {
        map.set(d.workspace_id, {
          id: d.workspace_id,
          label: d.workspace || "Workspace"
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allWorkspaces, data]);

  // Sub-workspaces catalog
  const allSubWorkspaces = useMemo(() => {
    const list: Array<{ id: string; label: string; parentId?: string; sublabel?: string }> = [];
    const seen = new Set<string>();

    allWorkspaces.forEach(w => {
      if (w.parent_workspace_id) {
        seen.add(w.id);
        const parent = allWorkspaces.find(p => p.id === w.parent_workspace_id);
        list.push({
          id: w.id,
          label: w.workspace_name || w.name || "Sub-workspace",
          parentId: w.parent_workspace_id,
          sublabel: parent?.workspace_name || parent?.name ? `(${parent.workspace_name || parent.name})` : undefined
        });
      }
    });

    data.forEach(d => {
      if (d.sub_workspace && d.sub_workspace !== "—") {
        const id = d.workspace_id;
        if (id && !seen.has(id)) {
          seen.add(id);
          list.push({
            id,
            label: d.sub_workspace,
            parentId: d.parent_workspace_id,
            sublabel: d.workspace ? `(${d.workspace})` : undefined
          });
        }
      }
    });

    return list;
  }, [allWorkspaces, data]);

  const subWorkspaceOptions = useMemo(() => {
    const filteredSubs = selectedWorkspaceIds.length > 0
      ? allSubWorkspaces.filter(sw => sw.parentId && selectedWorkspaceIds.includes(sw.parentId))
      : allSubWorkspaces;

    return filteredSubs.sort((a, b) => a.label.localeCompare(b.label));
  }, [allSubWorkspaces, selectedWorkspaceIds]);

  const statusOptions = useMemo(() => {
    return uniqueStatuses.map(s => ({ id: s, label: s }));
  }, [uniqueStatuses]);

  const totalActiveFilterCount = useMemo(() => {
    let count = 0;
    count += selectedWorkspaceIds.length;
    count += selectedSubWorkspaceIds.length;
    count += selectedStatuses.length > 0 ? selectedStatuses.length : (selectedStatus ? 1 : 0);
    if (dateFrom || dateTo) count++;
    if (query) count++;
    count += Object.keys(columnFilters).filter(k => columnFilters[k]).length;
    return count;
  }, [selectedWorkspaceIds, selectedSubWorkspaceIds, selectedStatuses, selectedStatus, dateFrom, dateTo, query, columnFilters]);

  const handleClearAllFilters = () => {
    setSelectedStatus("");
    setSelectedStatuses([]);
    setSelectedWorkspaceIds([]);
    setSelectedSubWorkspaceIds([]);
    setDateFrom("");
    setDateTo("");
    setQuery("");
    setColumnFilters({});
    setOpenDropdown(null);
  };

  const filtered = useMemo(() => {
    return data.filter(item => {
      // Status single or multi
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;

      // Workspace filter
      if (selectedWorkspaceIds.length > 0) {
        const matchWs = selectedWorkspaceIds.some(wsId => 
          item.workspace_id === wsId || 
          item.parent_workspace_id === wsId || 
          item.workspace === wsId
        );
        if (!matchWs) return false;
      }

      // Sub-workspace filter
      if (selectedSubWorkspaceIds.length > 0) {
        const matchSub = selectedSubWorkspaceIds.some(subId => 
          item.workspace_id === subId || 
          item.sub_workspace === subId
        );
        if (!matchSub) return false;
      }

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
          (item.sub_workspace || "").toLowerCase().includes(q) ||
          (item.assigned_to || "").toLowerCase().includes(q)
        )) return false;
      }

      // Column-specific filters
      for (const key of Object.keys(columnFilters)) {
        const filterVal = columnFilters[key]?.toLowerCase();
        if (!filterVal) continue;
        
        let itemVal = key === "due_date" ? item.end_date : item[key];
        if (itemVal === undefined && item.custom_fields) {
          itemVal = item.custom_fields[key];
        }
        
        if (itemVal === undefined || itemVal === null) return false;
        
        const itemStr = String(itemVal).toLowerCase();
        if (!itemStr.includes(filterVal)) return false;
      }

      return true;
    });
  }, [data, query, selectedStatus, selectedStatuses, selectedWorkspaceIds, selectedSubWorkspaceIds, dateFrom, dateTo, columnFilters]);

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
      case "executors": return t.executors || "—";
      case "watchers":
      case "reviewers": return t.watchers || t.reviewers || "—";
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar flex-nowrap sm:flex-wrap">
          <AppButton variant="secondary" onClick={() => setEntityType("WORKSPACE")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${entityType === "WORKSPACE" ? "bg-accent-soft text-accent-soft-text" : "text-muted hover:bg-elevated"}`}>
            <Briefcase className="h-3.5 w-3.5" /> Workspaces
          </AppButton>
          <AppButton variant="secondary" onClick={() => setEntityType("SUB_WORKSPACE")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${entityType === "SUB_WORKSPACE" ? "bg-accent-soft text-accent-soft-text" : "text-muted hover:bg-elevated"}`}>
            <Layers className="h-3.5 w-3.5" /> Sub-Workspaces
          </AppButton>
          <AppButton variant="secondary" onClick={() => setEntityType("TASK")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${entityType === "TASK" ? "bg-accent-soft text-accent-soft-text" : "text-muted hover:bg-elevated"}`}>
            <LayoutList className="h-3.5 w-3.5" /> Tasks
          </AppButton>
          <AppButton variant="secondary" onClick={() => setEntityType("SUB_TASK")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${entityType === "SUB_TASK" ? "bg-accent-soft text-accent-soft-text" : "text-muted hover:bg-elevated"}`}>
            <AlignLeft className="h-3.5 w-3.5" /> Sub-Tasks
          </AppButton>
        </div>

        {/* Scope Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border overflow-x-auto shrink-0">
          {(["ALL", "ASSIGNED_TO_ME", "ENROLLED_TASKS"] as ReportScope[]).map(sc => (
            <AppButton variant="secondary"
              key={sc}
              onClick={() => setScope(sc)}
              className={`whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${ scope === sc ? "theme-card-structural text-accent-soft-text shadow-sm " : "text-muted hover:text-foreground" }`}
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
          <div className="flex items-center gap-2 text-xs font-semibold text-subtle theme-card-structural p-2 rounded-lg">
            <span>Date Range:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg theme-card-structural focus:outline-none focus:ring-2 focus:ring-ring`} />
            <span>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg theme-card-structural focus:outline-none focus:ring-2 focus:ring-ring`} />
            
            {(selectedStatus || dateFrom || dateTo || query || Object.keys(columnFilters).some(k => columnFilters[k])) && (
              <AppButton variant="secondary" 
                onClick={() => {
                  setSelectedStatus("");
                  setDateFrom("");
                  setDateTo("");
                  setQuery("");
                  setColumnFilters({});
                }}
                className="ml-2 px-2 py-1 theme-label font-semibold text-danger-text hover:bg-danger-soft rounded transition-colors"
              >
                Clear filters
              </AppButton>
            )}
          </div>

          {/* Workspace Filter Multi-Select */}
          <div className="w-48">
            <WorkspaceFilterMultiSelect
              label="Workspace"
              placeholder="All workspaces"
              options={rootWorkspaces}
              selectedIds={selectedWorkspaceIds}
              onChange={(ids) => {
                setSelectedWorkspaceIds(ids);
                if (ids.length > 0) {
                  setSelectedSubWorkspaceIds(prev => prev.filter(swId => {
                    const sw = allSubWorkspaces.find(s => s.id === swId);
                    return sw?.parentId && ids.includes(sw.parentId);
                  }));
                }
              }}
              isOpen={openDropdown === 'workspace'}
              onToggle={() => setOpenDropdown(prev => prev === 'workspace' ? null : 'workspace')}
              onClose={() => setOpenDropdown(null)}
            />
          </div>

          {/* Sub-workspace Filter Multi-Select */}
          {subWorkspaceOptions.length > 0 && (
            <div className="w-48">
              <WorkspaceFilterMultiSelect
                label="Sub-workspace"
                placeholder="All sub-workspaces"
                options={subWorkspaceOptions}
                selectedIds={selectedSubWorkspaceIds}
                onChange={(ids) => setSelectedSubWorkspaceIds(ids)}
                isOpen={openDropdown === 'subworkspace'}
                onToggle={() => setOpenDropdown(prev => prev === 'subworkspace' ? null : 'subworkspace')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
          )}

          {/* Status Multi-Select */}
          {(entityType === "TASK" || entityType === "SUB_TASK" || uniqueStatuses.length > 0) && (
            <div className="w-44">
              <WorkspaceFilterMultiSelect
                label="Status"
                placeholder="All statuses"
                options={statusOptions}
                selectedIds={selectedStatuses}
                onChange={(ids) => setSelectedStatuses(ids)}
                isOpen={openDropdown === 'status'}
                onToggle={() => setOpenDropdown(prev => prev === 'status' ? null : 'status')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
          )}
        </div>

        {/* Exports, Search & Refresh */}
        <div className="flex items-center flex-wrap gap-3">
          {canExport && (
            <div className="flex items-center gap-2 border-r border-border pr-3 mr-1">
              <AppButton variant="outline" size="sm" onClick={exportToExcel} leftIcon={<FileSpreadsheet className="h-4 w-4 text-success-text" />}>
                Export Excel
              </AppButton>
              <AppButton variant="outline" size="sm" onClick={exportToPDF} leftIcon={<FileText className="h-4 w-4 text-danger-text" />}>
                Export PDF
              </AppButton>
            </div>
          )}

          <div className="flex items-center gap-2">
            <AppInput placeholder="Search records…" value={query} onChange={(e:any) => setQuery(e.target.value)} className="w-64 text-sm" />
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

      {/* Active Filter Chips Bar */}
      {totalActiveFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-surface/60 rounded-lg border border-border text-xs">
          <span className="text-[11px] font-semibold text-muted mr-1">Active filters:</span>

          {/* Workspaces */}
          {selectedWorkspaceIds.map(id => {
            const ws = rootWorkspaces.find(w => w.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent-soft-text border border-border">
                Workspace: {ws?.label || id}
                <button type="button" aria-label={`Remove workspace ${ws?.label || id}`} onClick={() => setSelectedWorkspaceIds(prev => prev.filter(x => x !== id))} className="hover:text-danger">
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
                Sub-workspace: {sw?.label || id}
                <button type="button" aria-label={`Remove sub-workspace ${sw?.label || id}`} onClick={() => setSelectedSubWorkspaceIds(prev => prev.filter(x => x !== id))} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {/* Statuses */}
          {selectedStatuses.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
              Status: {s}
              <button type="button" aria-label={`Remove status ${s}`} onClick={() => setSelectedStatuses(prev => prev.filter(x => x !== s))} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {/* Date Range */}
          {(dateFrom || dateTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
              Date: {dateFrom || "…"} to {dateTo || "…"}
              <button type="button" aria-label="Remove date range filter" onClick={() => { setDateFrom(""); setDateTo(""); }} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Query */}
          {query && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-foreground border border-border">
              Query: "{query}"
              <button type="button" aria-label="Clear query filter" onClick={() => setQuery("")} className="hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAllFilters}
            className="ml-auto text-[11px] font-semibold text-muted hover:text-danger flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Clear all
          </button>
        </div>
      )}

      {/* Results Summary */}
      <ReportKPIBar kpis={[
        { label: "Total records", value: filtered.length },
        { label: "Entity Type", value: getEntityDisplayName() },
      ]} className="mb-2" />

      {/* Mobile / Tablet Report Cards (<1024px) */}
      <div className="block lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm border border-border rounded-lg bg-surface/50">
            {loading ? "Loading report data..." : "No records found matching the current filters."}
          </div>
        ) : (
          filtered.map((item) => (
            <div 
              key={item.id} 
              className="rounded-lg border border-border bg-surface/90 p-4 shadow-xs hover:border-border-active transition-all select-none space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-accent-soft-text bg-accent-soft px-2 py-0.5 rounded-md shrink-0">
                  {item.code || `ID-${item.id.substring(0,4).toUpperCase()}`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.priority && item.priority !== "—" && (
                    <AppBadge variant={item.priority_color ? "custom" : "info"} customColor={item.priority_color} isOutline={true} className="text-[11px] py-0 px-1.5">
                      {item.priority}
                    </AppBadge>
                  )}
                  {item.status && item.status !== "—" && (
                    <AppBadge 
                      variant={item.status_color ? "custom" : (item.status === "Closed" || item.status === "Completed" ? "success" : "neutral")}
                      customColor={item.status_color}
                      isOutline={true}
                      className="text-[11px] py-0.5 px-2"
                    >
                      {item.status}
                    </AppBadge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground line-clamp-2">
                  {item.title || item.name || 'Untitled Record'}
                </h4>
                {item.description && (
                  <p className="text-xs text-muted mt-1 line-clamp-2">
                    {item.description.replace(/<[^>]*>?/gm, '')}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted flex-wrap">
                <div className="flex items-center gap-2 truncate">
                  {item.workspace && (
                    <span className="font-semibold text-foreground/80 truncate max-w-[120px]">{item.workspace}</span>
                  )}
                  {item.department && (
                    <span className="bg-elevated px-1.5 py-0.5 rounded text-[11px] font-semibold">{item.department}</span>
                  )}
                </div>
                <div className="text-[11px] font-medium shrink-0">
                  {item.end_date ? `Due: ${formatDate(item.end_date)}` : (item.created_at ? formatDate(item.created_at) : '')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Data Table (>=1024px) */}
      <div className="hidden lg:block">
        <AppTableContainer>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="max-h-[600px] overflow-auto relative">
              <AppTable className="w-full border-separate border-spacing-0">
                <AppTableHeader className="sticky top-0 z-40 bg-elevated">
                  <AppTableRow>
                    <SortableContext items={visibleColumns.map(c => c.field_id)} strategy={horizontalListSortingStrategy}>
                      {visibleColumns.map((col, index) => (
                        <DraggableTableHead 
                          key={col.field_id} 
                          col={col} 
                          isFirst={index === 0}
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
                    <AppTableCell colSpan={visibleColumns.length} className={loading ? "h-32 text-center text-muted" : "p-0"}>
                      {loading ? "Loading report data…" : <EmptyState compact kind="no-results" title="No records match these filters" description="Change or clear the filters to see more." />}
                    </AppTableCell>
                  </AppTableRow>
                ) : (
                  filtered.map((item) => {
                    const recordHref =
                      entityType === "TASK" || entityType === "SUB_TASK"
                        ? `/tasks/${item.id}`
                        : `/workspaces?workspace=${encodeURIComponent(item.id)}`;
                    return (
                    <AppTableRow key={item.id}>
                      {visibleColumns.map((col, index) => {
                        const isCode = col.field_key === "code" || index === 0;
                        switch(col.field_key) {
                          case "code": return (
                            <AppTableCell key={col.field_id} className="font-mono font-semibold text-accent-soft-text whitespace-nowrap sticky left-0 bg-surface z-20 shadow-[4px_0_8px_rgba(0,0,0,0.06)]">
                              <Link href={recordHref} className="hover:underline text-primary">
                                {item.code || `ID-${item.id.substring(0,4).toUpperCase()}`}
                              </Link>
                            </AppTableCell>
                          );
                          case "title": return (
                            <AppTableCell key={col.field_id}>
                              <Link href={recordHref} className="text-[13px] font-semibold text-foreground hover:text-primary hover:underline whitespace-normal break-words w-full block">
                                {item.title}
                              </Link>
                            </AppTableCell>
                          );
                          case "description": return (
                            <AppTableCell key={col.field_id} className="text-subtle">
                              <div className="truncate max-w-[300px]" title={item.description ? item.description.replace(/<[^>]*>?/gm, '') : ''}>
                                {item.description ? item.description.replace(/<[^>]*>?/gm, '') : '—'}
                              </div>
                            </AppTableCell>
                          );
                          case "workspace": return (
                            <AppTableCell key={col.field_id} className="text-subtle" title={item.workspace}>
                              <div className="truncate max-w-[150px]">{item.workspace}</div>
                            </AppTableCell>
                          );
                          case "department": return (
                            <AppTableCell key={col.field_id} className="text-subtle">
                              <div className="truncate max-w-[150px]" title={item.department}>{item.department}</div>
                            </AppTableCell>
                          );
                          case "priority": return (
                            <AppTableCell key={col.field_id} className="whitespace-nowrap">
                              {item.priority !== "—" ? <AppBadge variant={item.priority_color ? "custom" : "info"} customColor={item.priority_color}>{item.priority}</AppBadge> : "—"}
                            </AppTableCell>
                          );
                          case "due_date": return (
                            <AppTableCell key={col.field_id} className="text-subtle whitespace-nowrap">
                              {formatDate(item.end_date)}
                            </AppTableCell>
                          );
                          case "start_date": return (
                            <AppTableCell key={col.field_id} className="text-right  text-subtle whitespace-nowrap">
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
                            <AppTableCell key={col.field_id} className="font-medium text-foreground whitespace-nowrap">
                              {item.creator_name}
                            </AppTableCell>
                          );
                          case "assigned_to": return (
                            <AppTableCell key={col.field_id} className="text-subtle whitespace-nowrap" title={item.assigned_to}>
                              {item.assigned_to}
                            </AppTableCell>
                          );
                          case "executors": return (
                            <AppTableCell key={col.field_id} className="text-subtle whitespace-nowrap" title={item.executors}>
                              {item.executors || "—"}
                            </AppTableCell>
                          );
                          case "watchers":
                          case "reviewers": return (
                            <AppTableCell key={col.field_id} className="text-subtle whitespace-nowrap" title={item.watchers || item.reviewers}>
                              {item.watchers || item.reviewers || "—"}
                            </AppTableCell>
                          );
                          case "created_at": return (
                            <AppTableCell key={col.field_id} className="text-right  text-muted whitespace-nowrap">
                              {formatDate(item.created_at)}
                            </AppTableCell>
                          );
                          case "updated_at": return (
                            <AppTableCell key={col.field_id} className="text-right  text-muted whitespace-nowrap">
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
                            else if (Array.isArray(val)) {
                              val = val.map((v: any) => typeof v === "object" ? (v?.full_name || v?.name || v?.label || JSON.stringify(v)) : String(v)).join(", ");
                            }
                            else if (typeof val === "object") {
                              val = val.full_name || val.name || val.label || JSON.stringify(val);
                            }
                            
                            return (
                              <AppTableCell key={col.field_id} className="text-subtle">
                                <div className="truncate max-w-[200px]" title={String(val)}>
                                  {col.data_type === "link" && val !== "—" ? (
                                    <a href={getSafeExternalUrl(val)} target="_blank" rel="noreferrer" className="text-accent-soft-text hover:underline">{val}</a>
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
                    );
                  })
                )}
              </AppTableBody>
            </AppTable>
          </div>
        </DndContext>
      </AppTableContainer>
    </div>
  </div>
);
}
