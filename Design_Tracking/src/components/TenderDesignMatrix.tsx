"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DesignMasterStore, MasterStoreState } from "../services/designMasterStore";
import { exportTenderMatrixToExcel } from "../services/excelExportService";
import { WorkPackageMaster, TowerMaster, ProjectMaster, PackageStatusEntry, MatrixAuditLog } from "../types/masterTypes";
import { recordMatrixAuditAction } from "@/lib/actions/designTracking";
import { DesignRbacModal } from "./DesignRbacModal";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";
import { 
  Search, 
  Download, 
  Layers, 
  Building, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info,
  X,
  Edit2,
  Calendar,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Check,
  FileSpreadsheet,
  Zap,
  CheckSquare,
  Square,
  Users,
  Mail,
  ShieldCheck,
  History,
  Tag,
  Send,
  AlertCircle,
  Filter,
  MessageSquare
} from "lucide-react";

interface MatrixColumn {
  colKey: string;
  projectId: string;
  projectName: string;
  towerId: string;
  towerName: string;
  towerType: string;
}

export const TenderDesignMatrix: React.FC = () => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  
  // Multi-Selection Dropdown Filter Dimensions
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Inspector & Edit Modal State
  const [activeCell, setActiveCell] = useState<{
    pkg: WorkPackageMaster;
    col: MatrixColumn;
    entry?: PackageStatusEntry;
  } | null>(null);

  const [inspectorTab, setInspectorTab] = useState<"EDIT" | "AUDIT">("EDIT");
  const [cellStatus, setCellStatus] = useState<PackageStatusEntry["status"]>("Received");
  const [cellPlannedDate, setCellPlannedDate] = useState<string>("");
  const [cellActualDate, setCellActualDate] = useState<string>("");
  const [cellConsultantId, setCellConsultantId] = useState<string>("");
  const [cellRemarks, setCellRemarks] = useState<string>("");
  const [cellFormError, setCellFormError] = useState<string>("");

  // Batch Update Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProjectId, setBatchProjectId] = useState<string>("");
  const [batchSelectedTowers, setBatchSelectedTowers] = useState<string[]>([]);
  const [batchDiscipline, setBatchDiscipline] = useState<string>("ALL");
  const [batchStatus, setBatchStatus] = useState<PackageStatusEntry["status"]>("Received");
  const [batchPlannedDate, setBatchPlannedDate] = useState<string>("");
  const [batchActualDate, setBatchActualDate] = useState<string>("");
  const [batchConsultantName, setBatchConsultantName] = useState<string>("");
  const [batchRemarks, setBatchRemarks] = useState<string>("");

  // Audit Logs History Drawer State
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  // RBAC Modal State
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);

  // Subscribe to real-time master store updates
  useEffect(() => {
    const unsub = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
    });
    return () => unsub();
  }, []);

  // Compute dynamic project tower columns based on multi-selected projects
  const visibleColumns = useMemo<MatrixColumn[]>(() => {
    const projectMap = new Map(storeState.projects.map(p => [p.id, p.name]));
    let towers = storeState.towers;

    if (selectedProjects.length > 0) {
      towers = towers.filter(t => selectedProjects.includes(t.projectId));
    }

    return towers.map(t => ({
      colKey: t.id,
      projectId: t.projectId,
      projectName: projectMap.get(t.projectId) || "Development",
      towerId: t.id,
      towerName: t.towerName,
      towerType: t.towerType
    }));
  }, [storeState.projects, storeState.towers, selectedProjects]);

  // Unique disciplines across all packages
  const categories = useMemo(() => {
    const set = new Set(storeState.packages.map(p => p.disciplineName).filter(Boolean));
    return Array.from(set);
  }, [storeState.packages]);

  // Filtered packages based on search query, disciplines, consultant, and status
  const filteredPackages = useMemo(() => {
    return storeState.packages.filter(pkg => {
      // 1. Discipline Filter (Multi-select)
      if (selectedDisciplines.length > 0 && !selectedDisciplines.includes(pkg.disciplineName)) {
        return false;
      }

      // 2. Search Query (Package name, discipline)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          pkg.packageName.toLowerCase().includes(q) || 
          pkg.disciplineName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 3. Consultant Filter (Multi-select)
      if (selectedConsultants.length > 0) {
        const hasMatchingConsultant = visibleColumns.some(col => {
          const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
          return entry && entry.consultantName && selectedConsultants.includes(entry.consultantName);
        });
        if (!hasMatchingConsultant) return false;
      }

      // 4. Status Filter (Multi-select)
      if (selectedStatuses.length > 0) {
        const hasMatchingStatus = visibleColumns.some(col => {
          const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
          const val = (entry ? (entry.status || entry.targetDate) : "NA").toLowerCase();
          return selectedStatuses.some(st => {
            if (st === "RECEIVED" && val.includes("received")) return true;
            if (st === "PENDING" && (val.includes("pending") || val.includes("not onboard"))) return true;
            if (st === "IN_PROGRESS" && (val.includes("progress") || val.includes("onboard") || val.includes("track"))) return true;
            if (st === "TARGET_DATE" && !val.includes("received") && !val.includes("pending") && !val.includes("na") && val.trim().length > 0 && val !== "-") return true;
            return false;
          });
        });
        if (!hasMatchingStatus) return false;
      }

      return true;
    });
  }, [storeState.packages, storeState.packageStatuses, selectedDisciplines, searchQuery, selectedConsultants, selectedStatuses, visibleColumns]);

  // Statistical calculations across currently visible matrix
  const matrixStats = useMemo(() => {
    let received = 0;
    let inProgress = 0;
    let pending = 0;
    let targetDates = 0;
    let totalCells = 0;

    for (const pkg of filteredPackages) {
      for (const col of visibleColumns) {
        const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
        const val = (entry ? (entry.status || entry.targetDate) : "NA").toLowerCase();
        if (val === "na" || val === "-") continue;
        totalCells++;
        if (val.includes("received")) received++;
        else if (val.includes("pending") || val.includes("not onboard")) pending++;
        else if (val.includes("progress") || val.includes("onboard") || val.includes("track")) inProgress++;
        else targetDates++;
      }
    }

    const rate = totalCells > 0 ? Math.round((received / totalCells) * 100) : 0;
    return { received, inProgress, pending, targetDates, totalCells, rate };
  }, [filteredPackages, visibleColumns, storeState.packageStatuses]);

  // Helper for cell badge styling with Planned & Actual Dates
  const renderCellBadge = (entry?: PackageStatusEntry) => {
    const rawVal = entry ? (entry.status || entry.targetDate || "NA") : "NA";
    const val = (rawVal || "NA").trim();
    const lower = val.toLowerCase();

    if (lower === "na" || lower === "not applicable" || lower === "-") {
      return (
        <span className="text-[11px] font-mono text-muted-foreground/30 select-none">
          —
        </span>
      );
    }

    let badgeClass = "bg-slate-100 dark:bg-slate-800 text-foreground border-border";
    let dotClass = "bg-slate-400";

    if (lower.includes("received")) {
      badgeClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      dotClass = "bg-emerald-500 animate-pulse";
    } else if (lower.includes("pending") || lower.includes("not onboard")) {
      badgeClass = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      dotClass = "bg-rose-500";
    } else if (lower.includes("progress") || lower.includes("onboard") || lower.includes("track")) {
      badgeClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      dotClass = "bg-amber-500";
    } else {
      badgeClass = "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
      dotClass = "bg-sky-500";
    }

    return (
      <div className="flex flex-col items-center gap-0.5 max-w-[130px] mx-auto">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 shadow-2xs whitespace-nowrap ${badgeClass}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} shrink-0`} />
          <span className="truncate max-w-[100px]" title={val}>{val}</span>
        </span>
        
        {/* Planned and Actual Date mini tags */}
        {(entry?.plannedDate || entry?.actualDate) && (
          <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground mt-0.5">
            {entry.plannedDate && (
              <span title={`Planned Date: ${entry.plannedDate}`}>
                P: {entry.plannedDate.slice(5)}
              </span>
            )}
            {entry.actualDate && entry.actualDate !== "-" && (
              <>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold" title={`Actual Date: ${entry.actualDate}`}>
                  A: {entry.actualDate.slice(5)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Remarks Tag if present */}
        {entry?.remarks && (
          <div className="flex items-center gap-0.5 text-[8.5px] text-muted-foreground max-w-[110px] truncate mt-0.5" title={`Remark: ${entry.remarks}`}>
            <MessageSquare className="h-2.5 w-2.5 shrink-0 text-slate-400" />
            <span className="truncate italic">{entry.remarks}</span>
          </div>
        )}
      </div>
    );
  };

  // Open Cell Inspector Modal
  const handleOpenInspector = (pkg: WorkPackageMaster, col: MatrixColumn) => {
    const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
    setActiveCell({ pkg, col, entry });
    setInspectorTab("EDIT");

    const today = new Date().toISOString().split("T")[0];
    setCellStatus(entry?.status || "Received");
    setCellPlannedDate(entry?.plannedDate || today);
    setCellActualDate(entry?.actualDate || (entry?.status === "Received" ? today : "-"));
    setCellConsultantId(entry?.consultantId || "");
    setCellRemarks(entry?.remarks || "");
    setCellFormError("");
  };

  // Save Cell Updates with Mandatory Planned & Actual Dates + Audit Trail Email Dispatch
  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;

    if (!cellPlannedDate.trim()) {
      setCellFormError("Planned Date is mandatory.");
      return;
    }

    if (!cellActualDate.trim()) {
      setCellFormError("Actual Date is mandatory (use '-' if not yet executed).");
      return;
    }

    const { pkg, col } = activeCell;
    const selectedConsultant = storeState.consultants.find(c => c.id === cellConsultantId);

    // 1. Record status and create local audit log
    DesignMasterStore.recordPackageStatus(
      col.projectId,
      col.towerId,
      pkg.id,
      cellStatus,
      cellPlannedDate.trim(),
      cellActualDate.trim(),
      cellPlannedDate.trim(),
      cellConsultantId || undefined,
      selectedConsultant?.name || undefined,
      cellRemarks.trim() || undefined,
      "Senior Design Manager"
    );

    // 2. Dispatch audit email notification via server action
    const key = `${col.projectId}__${col.towerId}__${pkg.id}`;
    const latestAudit = DesignMasterStore.getAuditLogs({ entryKey: key })[0];
    if (latestAudit) {
      await recordMatrixAuditAction(latestAudit);
    }

    setActiveCell(null);
  };

  // Open Batch Update Modal
  const handleOpenBatchModal = () => {
    const pId = selectedProjects.length > 0 ? selectedProjects[0] : (storeState.projects[0]?.id || "");
    setBatchProjectId(pId);
    const twrs = storeState.towers.filter(t => t.projectId === pId).map(t => t.id);
    setBatchSelectedTowers(twrs);
    setBatchDiscipline(selectedDisciplines.length > 0 ? selectedDisciplines[0] : "ALL");
    setBatchStatus("Received");
    const today = new Date().toISOString().split("T")[0];
    setBatchPlannedDate(today);
    setBatchActualDate(today);
    setBatchConsultantName("");
    setBatchRemarks("");
    setIsBatchModalOpen(true);
  };

  // Execute Batch Update with Mandatory Dates
  const handleExecuteBatchUpdate = async () => {
    if (!batchProjectId || batchSelectedTowers.length === 0) {
      alert("Please select at least one Tower Wing to update.");
      return;
    }

    if (!batchPlannedDate.trim() || !batchActualDate.trim()) {
      alert("Both Planned Date and Actual Date are mandatory for batch updates.");
      return;
    }

    let targetPkgs = storeState.packages;
    if (batchDiscipline !== "ALL") {
      targetPkgs = targetPkgs.filter(p => p.disciplineName === batchDiscipline);
    }

    if (targetPkgs.length === 0) {
      alert("No packages found matching the selected discipline.");
      return;
    }

    const updates: Array<{
      projectId: string;
      towerId: string;
      packageId: string;
      status: PackageStatusEntry["status"];
      plannedDate?: string;
      actualDate?: string;
      targetDate?: string;
      consultantName?: string;
      remarks?: string;
    }> = [];

    batchSelectedTowers.forEach(twrId => {
      targetPkgs.forEach(pkg => {
        updates.push({
          projectId: batchProjectId,
          towerId: twrId,
          packageId: pkg.id,
          status: batchStatus,
          plannedDate: batchPlannedDate.trim(),
          actualDate: batchActualDate.trim(),
          targetDate: batchPlannedDate.trim(),
          consultantName: batchConsultantName || undefined,
          remarks: batchRemarks || undefined
        });
      });
    });

    DesignMasterStore.bulkRecordPackageStatus(updates, "Senior Design Manager");
    alert(`⚡ Batch Updated ${updates.length} cells successfully with mandatory dates & audit logging!`);
    setIsBatchModalOpen(false);
  };

  // Excel (.XLSX) Export
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportTenderMatrixToExcel(storeState, filteredPackages, visibleColumns);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel file. Please try CSV export.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["Discipline Category", "Work Package Name", ...visibleColumns.map(c => `${c.projectName} - ${c.towerName} (Status)`)];
    const rows = filteredPackages.map(pkg => {
      const rowVals = visibleColumns.map(col => {
        const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
        const status = entry ? entry.status : "NA";
        const dates = entry ? ` [P: ${entry.plannedDate || "-"}, A: ${entry.actualDate || "-"}]` : "";
        return `"${(status + dates).replace(/"/g, '""')}"`;
      });
      return [`"${pkg.disciplineName}"`, `"${pkg.packageName.replace(/"/g, '""')}"`, ...rowVals].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Design_Matrix_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    const logs = storeState.auditLogs || [];
    if (!auditSearchQuery.trim()) return logs;
    const q = auditSearchQuery.toLowerCase();
    return logs.filter(l => 
      l.projectName.toLowerCase().includes(q) ||
      l.packageName.toLowerCase().includes(q) ||
      l.newStatus.toLowerCase().includes(q) ||
      l.changedBy.toLowerCase().includes(q) ||
      (l.remarks && l.remarks.toLowerCase().includes(q))
    );
  }, [storeState.auditLogs, auditSearchQuery]);

  // Multi-select Dropdown Options
  const projectOptions = useMemo<DropdownOption[]>(() => {
    return storeState.projects.map(p => {
      const towerCount = storeState.towers.filter(t => t.projectId === p.id).length;
      return {
        value: p.id,
        label: p.name,
        count: towerCount,
        subtitle: `${towerCount} tower${towerCount === 1 ? "" : "s"}`
      };
    });
  }, [storeState.projects, storeState.towers]);

  const disciplineOptions = useMemo<DropdownOption[]>(() => {
    return categories.map(cat => {
      const pkgCount = storeState.packages.filter(p => p.disciplineName === cat).length;
      return {
        value: cat,
        label: cat,
        count: pkgCount,
        subtitle: `${pkgCount} package${pkgCount === 1 ? "" : "s"}`
      };
    });
  }, [categories, storeState.packages]);

  const consultantOptions = useMemo<DropdownOption[]>(() => {
    return storeState.consultants.map(c => {
      return {
        value: c.name,
        label: c.name,
        badge: c.onboardingStatus,
        subtitle: c.category
      };
    });
  }, [storeState.consultants]);

  const statusOptions = useMemo<DropdownOption[]>(() => {
    return [
      {
        value: "RECEIVED",
        label: "Received",
        count: matrixStats.received,
        colorDot: "#10b981",
        subtitle: "Drawings approved & received"
      },
      {
        value: "IN_PROGRESS",
        label: "In Progress / Onboard",
        count: matrixStats.inProgress,
        colorDot: "#f59e0b",
        subtitle: "Drawings in production"
      },
      {
        value: "PENDING",
        label: "Pending / Not Onboard",
        count: matrixStats.pending,
        colorDot: "#f43f5e",
        subtitle: "Consultant / drawing pending"
      },
      {
        value: "TARGET_DATE",
        label: "Target Dates",
        count: matrixStats.targetDates,
        colorDot: "#0ea5e9",
        subtitle: "Scheduled target timeline"
      }
    ];
  }, [matrixStats]);

  const totalActiveFilterCount =
    selectedProjects.length +
    selectedDisciplines.length +
    selectedConsultants.length +
    selectedStatuses.length;

  const handleClearAllFilters = () => {
    setSelectedProjects([]);
    setSelectedDisciplines([]);
    setSelectedConsultants([]);
    setSelectedStatuses([]);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      {/* 🌟 Top Filter & Control Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5">
        {/* Row 1: Search & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search packages"
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Audit Trail Button */}
            <button
              type="button"
              onClick={() => setIsAuditDrawerOpen(true)}
              className="h-9 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="View live audit trail and mail notification logs"
            >
              <History className="h-3.5 w-3.5 text-purple-500" />
              <span>Audit Trail ({storeState.auditLogs?.length || 0})</span>
            </button>

            {/* RBAC Policies Button */}
            <button
              type="button"
              onClick={() => setIsRbacModalOpen(true)}
              className="h-9 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Configure Role-Based and Project-Wise CRUD permissions"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>RBAC Policies</span>
            </button>

            {/* Batch Fill */}
            <button
              type="button"
              onClick={handleOpenBatchModal}
              className="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Batch Fill</span>
            </button>

            {/* Export XLSX */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>{isExportingExcel ? "Generating..." : "Export .XLSX"}</span>
            </button>

            {/* CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 🎯 Multi-Selection Dropdowns Filter Row */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
          {/* 1. Projects Dropdown */}
          <DesignMultiSelectDropdown
            label="Projects"
            icon={<Building className="h-3.5 w-3.5" />}
            options={projectOptions}
            selectedValues={selectedProjects}
            onChange={setSelectedProjects}
            colorTheme="blue"
            placeholder={`All Projects (${storeState.projects.length})`}
            searchPlaceholder="Search project name..."
          />

          {/* 2. Disciplines / Work Packages Dropdown */}
          <DesignMultiSelectDropdown
            label="Disciplines"
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            options={disciplineOptions}
            selectedValues={selectedDisciplines}
            onChange={setSelectedDisciplines}
            colorTheme="emerald"
            placeholder={`All Disciplines (${categories.length})`}
            searchPlaceholder="Search discipline..."
          />

          {/* 3. Consultants Dropdown */}
          <DesignMultiSelectDropdown
            label="Consultants"
            icon={<Users className="h-3.5 w-3.5" />}
            options={consultantOptions}
            selectedValues={selectedConsultants}
            onChange={setSelectedConsultants}
            colorTheme="purple"
            placeholder={`All Consultants (${storeState.consultants.length})`}
            searchPlaceholder="Search consultant firm..."
          />

          {/* 4. Status Dropdown */}
          <DesignMultiSelectDropdown
            label="Status"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            options={statusOptions}
            selectedValues={selectedStatuses}
            onChange={setSelectedStatuses}
            colorTheme="amber"
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
          />

          {/* Clear All Filters Button */}
          {totalActiveFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Reset all active multi-selection filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters ({totalActiveFilterCount})</span>
            </button>
          )}
        </div>

        {/* 🏷️ Active Selected Filter Badges (Removable Tags Bar) */}
        {totalActiveFilterCount > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1 shrink-0">
              Active Filters:
            </span>

            {/* Project Badges */}
            {selectedProjects.map(pId => {
              const p = storeState.projects.find(x => x.id === pId);
              return (
                <span
                  key={`proj-${pId}`}
                  className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
                >
                  <Building className="h-2.5 w-2.5" />
                  <span>{p?.name || pId}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProjects(prev => prev.filter(x => x !== pId))}
                    className="hover:text-rose-500 cursor-pointer p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}

            {/* Discipline Badges */}
            {selectedDisciplines.map(d => (
              <span
                key={`disc-${d}`}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <SlidersHorizontal className="h-2.5 w-2.5" />
                <span>{d}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplines(prev => prev.filter(x => x !== d))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Consultant Badges */}
            {selectedConsultants.map(cName => (
              <span
                key={`cons-${cName}`}
                className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Users className="h-2.5 w-2.5" />
                <span>{cName}</span>
                <button
                  type="button"
                  onClick={() => setSelectedConsultants(prev => prev.filter(x => x !== cName))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Status Badges */}
            {selectedStatuses.map(st => {
              const opt = statusOptions.find(o => o.value === st);
              return (
                <span
                  key={`st-${st}`}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: opt?.colorDot || "#f59e0b" }}
                  />
                  <span>{opt?.label || st}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses(prev => prev.filter(x => x !== st))}
                    className="hover:text-rose-500 cursor-pointer p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-muted-foreground hover:text-rose-500 underline ml-1 cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* 📊 Main Matrix Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
          <table className="w-full text-left text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border shadow-xs">
              <tr>
                <th 
                  className="p-3.5 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border min-w-[280px] max-w-[320px] font-black text-foreground uppercase tracking-wider text-[11px] shadow-sm whitespace-nowrap"
                >
                  Work Package & Discipline
                </th>
                {visibleColumns.map((col, idx) => (
                  <th
                    key={idx}
                    className="p-2.5 text-center font-bold text-foreground border-r border-border/40 text-[10px] uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 min-w-[140px] whitespace-nowrap"
                  >
                    <div className="truncate font-black text-foreground">{col.projectName}</div>
                    <div className="text-muted-foreground font-mono font-semibold text-[9px] mt-0.5 px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 inline-block">
                      {col.towerName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-16 text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Info className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                      <p className="font-semibold text-foreground">No matching packages found</p>
                      <p className="text-xs">Adjust filters or add packages in Masters Setup</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    {/* Frozen Package Name Column */}
                    <td className="p-3.5 sticky left-0 z-10 bg-surface group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-border font-medium text-foreground shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {pkg.disciplineName}
                        </span>
                      </div>
                      <div className="font-bold text-foreground text-xs leading-snug">
                        {pkg.packageName}
                      </div>
                    </td>

                    {/* Status & Date Cells */}
                    {visibleColumns.map((col, colIdx) => {
                      const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
                      return (
                        <td
                          key={colIdx}
                          onClick={() => handleOpenInspector(pkg, col)}
                          className="p-2 border-r border-border/30 text-center cursor-pointer hover:bg-emerald-500/5 transition-colors group/cell"
                          title={`Click to inspect & edit: ${pkg.packageName} • ${col.projectName} (${col.towerName})`}
                        >
                          {renderCellBadge(entry)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔍 Interactive Cell Status Inspector Modal with Mandatory Dates & Audit Trail Tab */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Edit2 className="h-3 w-3" />
                  <span>Deliverable Inspector</span>
                </span>
                <h4 className="text-base font-bold text-foreground">
                  {activeCell.pkg.packageName}
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-semibold text-foreground">{activeCell.col.projectName}</span>
                  <span>•</span>
                  <span>Wing: <strong>{activeCell.col.towerName}</strong></span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Segmented Tab: Edit vs. Audit Trail */}
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setInspectorTab("EDIT")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  inspectorTab === "EDIT" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Status & Mandatory Dates</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("AUDIT")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  inspectorTab === "AUDIT" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3.5 w-3.5 text-purple-500" />
                <span>Audit Trail & Mail History</span>
              </button>
            </div>

            {/* Tab 1: Edit Form */}
            {inspectorTab === "EDIT" && (
              <form onSubmit={handleSaveCell} className="space-y-4 text-xs">
                {cellFormError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{cellFormError}</span>
                  </div>
                )}

                {/* Status Selector */}
                <div>
                  <label className="block font-bold text-foreground mb-1.5">Deliverable Status *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCellStatus("Received")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "Received"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                          : "border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Received</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellStatus("In progress")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "In progress"
                          ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500"
                          : "border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>In Progress</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellStatus("Pending")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "Pending"
                          ? "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500"
                          : "border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      <span>Pending</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellStatus("NA")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "NA"
                          ? "border-slate-500 bg-slate-500/20 text-foreground ring-1 ring-slate-500"
                          : "border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>Not Applicable (NA)</span>
                    </button>
                  </div>
                </div>

                {/* 📅 Mandatory Planned & Actual Dates */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
                  <div>
                    <label className="block font-bold text-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      <span>Planned Date * (Mandatory)</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={cellPlannedDate}
                      onChange={e => setCellPlannedDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-surface text-foreground font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Actual Date * (Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={cellActualDate}
                      onChange={e => setCellActualDate(e.target.value)}
                      aria-label="Actual date"
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-surface text-foreground font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Assigned Consultant */}
                <div>
                  <label className="block font-bold text-foreground mb-1 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    <span>Assign Consultant Partner</span>
                  </label>
                  <select
                    value={cellConsultantId}
                    onChange={e => setCellConsultantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">Select Consultant</option>
                    {storeState.consultants.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category}) - {c.onboardingStatus}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block font-bold text-foreground mb-1">Audit Remarks / Delivery Reason</label>
                  <input
                    type="text"
                    value={cellRemarks}
                    onChange={e => setCellRemarks(e.target.value)}
                    aria-label="Audit remarks or delivery reason"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Mail className="h-3 w-3 text-teal-600" />
                    <span>Audit email will be queued on save</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCell(null)}
                      className="px-4 py-2 rounded-xl border border-border bg-surface text-foreground text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      Save & Log Audit Trail
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Tab 2: Cell Audit Trail History */}
            {inspectorTab === "AUDIT" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Change Audit History for this Deliverable
                  </h5>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {DesignMasterStore.getAuditLogs({ entryKey: `${activeCell.col.projectId}__${activeCell.col.towerId}__${activeCell.pkg.id}` }).length} Logs Recorded
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                  {DesignMasterStore.getAuditLogs({ entryKey: `${activeCell.col.projectId}__${activeCell.col.towerId}__${activeCell.pkg.id}` }).length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                      No prior audit history recorded for this cell yet.
                    </div>
                  ) : (
                    DesignMasterStore.getAuditLogs({ entryKey: `${activeCell.col.projectId}__${activeCell.col.towerId}__${activeCell.pkg.id}` }).map((log) => (
                      <div key={log.id} className="p-3.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/60 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Status: <strong>{log.newStatus}</strong> (was: {log.previousStatus})</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <div>Planned: <strong className="text-foreground">{log.newPlannedDate}</strong></div>
                          <div>Actual: <strong className="text-foreground">{log.newActualDate}</strong></div>
                        </div>

                        {log.remarks && (
                          <div className="text-[11px] text-muted-foreground italic bg-surface p-2 rounded-lg border border-border">
                            &ldquo;{log.remarks}&rdquo;
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                          <span>Changed by: <strong className="text-foreground">{log.changedBy}</strong></span>
                          <span className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>Mail Dispatched</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📜 Audit Trail & Mail Logs Drawer / Modal */}
      {isAuditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-3xl rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Master Design Matrix: Audit Trail & Mail Dispatch Ledger
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Immutable revision history of deliverable dates, status modifications & email notices
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen(false)}
                className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Audit Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                aria-label="Search audit trail by project, package, or user"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Audit List */}
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
                  No audit logs match your search.
                </div>
              ) : (
                filteredAuditLogs.map(log => (
                  <div key={log.id} className="p-4 rounded-2xl border border-border bg-surface shadow-2xs space-y-2.5 text-xs hover:border-purple-500/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{log.projectName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
                          {log.towerName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {log.newStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                      </span>
                    </div>

                    <div className="font-semibold text-foreground">
                      Package: {log.packageName}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Planned Date:</span>
                        <strong className="text-foreground font-mono">{log.newPlannedDate}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Actual Date:</span>
                        <strong className="text-foreground font-mono">{log.newActualDate}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Consultant:</span>
                        <strong className="text-purple-600 dark:text-purple-400">{log.consultantName || "Not tagged"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Changed By:</span>
                        <strong className="text-foreground">{log.changedBy}</strong>
                      </div>
                    </div>

                    {log.remarks && (
                      <div className="text-[11px] text-muted-foreground italic">
                        &ldquo;{log.remarks}&rdquo;
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border text-[11px]">
                      <span className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>Audit Email Dispatched ({log.mailRecipientCount || 3} recipients)</span>
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        ID: {log.id}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen(false)}
                className="px-5 py-2 rounded-xl bg-surface border border-border text-foreground font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close Audit Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Batch Update Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                  <Zap className="h-4 w-4" />
                </div>
                <h4 className="text-base font-bold text-foreground">
                  Batch Status Update
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Project and Discipline Selection (2-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  <span>Target Project</span>
                </label>
                <select
                  value={batchProjectId}
                  onChange={e => {
                    const pId = e.target.value;
                    setBatchProjectId(pId);
                    const twrs = storeState.towers.filter(t => t.projectId === pId).map(t => t.id);
                    setBatchSelectedTowers(twrs);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {storeState.projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Discipline Scope</span>
                </label>
                <select
                  value={batchDiscipline}
                  onChange={e => setBatchDiscipline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="ALL">All Disciplines ({storeState.packages.length} Packages)</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat} ({storeState.packages.filter(p => p.disciplineName === cat).length} Packages)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tower Wings Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-500" />
                  <span>Target Wings</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground font-mono font-bold">
                    {batchSelectedTowers.length} of {storeState.towers.filter(t => t.projectId === batchProjectId).length}
                  </span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const all = storeState.towers.filter(t => t.projectId === batchProjectId).map(t => t.id);
                      setBatchSelectedTowers(all);
                    }}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={() => setBatchSelectedTowers([])}
                    className="text-muted-foreground hover:text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-border max-h-28 overflow-y-auto custom-scrollbar">
                {storeState.towers.filter(t => t.projectId === batchProjectId).map(twr => {
                  const isChecked = batchSelectedTowers.includes(twr.id);
                  return (
                    <button
                      key={twr.id}
                      type="button"
                      onClick={() => {
                        setBatchSelectedTowers(prev => 
                          isChecked ? prev.filter(id => id !== twr.id) : [...prev, twr.id]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                        isChecked 
                          ? "bg-teal-600 text-white shadow-xs" 
                          : "bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-3.5 w-3.5 text-white" /> : <Square className="h-3.5 w-3.5 text-muted-foreground/60" />}
                      <span>{twr.towerName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Dates Grid (Planned & Actual) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  <span>Planned Date <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={batchPlannedDate}
                  onChange={e => setBatchPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-foreground font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Actual Date <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={batchActualDate}
                  onChange={e => setBatchActualDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-foreground font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                <span>New Status</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "Received", label: "Received", dotColor: "#10b981", activeClass: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40 font-bold" },
                  { id: "In progress", label: "In Progress", dotColor: "#f59e0b", activeClass: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40 font-bold" },
                  { id: "Pending", label: "Pending", dotColor: "#f43f5e", activeClass: "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/40 font-bold" },
                  { id: "Target Date", label: "Target Date", dotColor: "#0ea5e9", activeClass: "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/40 font-bold" },
                ].map(st => {
                  const isSelected = batchStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setBatchStatus(st.id as PackageStatusEntry["status"])}
                      className={`p-2 rounded-xl text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? st.activeClass
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: st.dotColor }} />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks / Audit Notes Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                <span>Remark / Notes</span>
              </label>
              <textarea
                rows={2}
                value={batchRemarks}
                onChange={e => setBatchRemarks(e.target.value)}
                aria-label="Batch remarks or justification"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-foreground focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchUpdate}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Apply Batch Update</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ RBAC Policies Modal */}
      <DesignRbacModal
        isOpen={isRbacModalOpen}
        onClose={() => setIsRbacModalOpen(false)}
      />
    </div>
  );
};
