"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { DesignMasterStore, MasterStoreState } from "../services/designMasterStore";
import { exportTenderMatrixToExcel } from "../services/excelExportService";
import { WorkPackageMaster, TowerMaster, ProjectMaster, PackageStatusEntry, MatrixAuditLog } from "../types/masterTypes";
import { recordMatrixAuditAction } from "@/lib/actions/designTracking";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";
import { TransactionFormLayout, WorkingDocumentLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
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
  MessageSquare,
  Plus
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
  const [mounted, setMounted] = useState(false);
  
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
  const [isReassigningConsultant, setIsReassigningConsultant] = useState(false);
  const [cellRemarks, setCellRemarks] = useState<string>("");
  const [cellFormError, setCellFormError] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const [batchTowerSearch, setBatchTowerSearch] = useState<string>("");

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

  // Accessible Projects Scoped to Active User
  const accessibleProjects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects();
  }, [storeState.projects, storeState.userAccessList]);

  const accessibleProjectIds = useMemo(() => new Set(accessibleProjects.map(p => p.id)), [accessibleProjects]);

  // Compute dynamic project tower columns based on multi-selected projects & accessible scope
  const visibleColumns = useMemo<MatrixColumn[]>(() => {
    const projectMap = new Map(accessibleProjects.map(p => [p.id, p.name]));
    let towers = storeState.towers.filter(t => accessibleProjectIds.has(t.projectId));

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
  }, [accessibleProjects, storeState.towers, selectedProjects, accessibleProjectIds]);

  // Unique disciplines across all packages
  const categories = useMemo(() => {
    const set = new Set<string>();
    storeState.packages.forEach(p => {
      if (p.disciplineName) set.add(p.disciplineName);
    });
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

  // Auto-resolve assigned consultant partner for active deliverable cell
  const resolvedCellConsultant = useMemo(() => {
    if (!activeCell) return null;
    const { pkg, col, entry } = activeCell;

    // 1. If explicitly selected or recorded on entry
    if (cellConsultantId) {
      const found = storeState.consultants.find(c => c.id === cellConsultantId);
      if (found) return found;
    }
    if (entry?.consultantId) {
      const found = storeState.consultants.find(c => c.id === entry.consultantId);
      if (found) return found;
    }
    if (entry?.consultantName) {
      const found = storeState.consultants.find(c => c.name.toLowerCase() === entry.consultantName?.toLowerCase());
      if (found) return found;
    }

    // 2. Project or Tower level tagged consultants matching package discipline category
    const proj = storeState.projects.find(p => p.id === col.projectId);
    const twr = storeState.towers.find(t => t.id === col.towerId);
    const taggedNames = [
      ...(twr?.taggedConsultants || []),
      ...(proj?.taggedConsultants || [])
    ];

    if (taggedNames.length > 0) {
      const matched = storeState.consultants.find(c => {
        const matchesProj = taggedNames.some(tn => tn.toLowerCase() === c.name.toLowerCase() || tn === c.id);
        const matchesCat = (c.categories || []).some(cat => cat.toLowerCase() === pkg.disciplineName.toLowerCase()) ||
                           (c.category && (c.category as string).toLowerCase() === pkg.disciplineName.toLowerCase());
        return matchesProj && matchesCat;
      });
      if (matched) return matched;

      const anyTagged = storeState.consultants.find(c => 
        taggedNames.some(tn => tn.toLowerCase() === c.name.toLowerCase() || tn === c.id)
      );
      if (anyTagged) return anyTagged;
    }

    // 3. Match consultant whose activeProjects includes project name and matches discipline category
    const activeProjMatch = storeState.consultants.find(c =>
      (c.activeProjects || []).some(ap => ap.toLowerCase() === (col.projectName || "").toLowerCase()) &&
      ((c.categories || []).some(cat => cat.toLowerCase() === pkg.disciplineName.toLowerCase()) ||
       (c.category && (c.category as string).toLowerCase() === pkg.disciplineName.toLowerCase()))
    );
    if (activeProjMatch) return activeProjMatch;

    // 4. Default to first consultant registered under this discipline category
    const categoryMatch = storeState.consultants.find(c =>
      (c.categories || []).some(cat => cat.toLowerCase() === pkg.disciplineName.toLowerCase()) ||
      (c.category && (c.category as string).toLowerCase() === pkg.disciplineName.toLowerCase())
    );
    return categoryMatch || null;
  }, [activeCell, cellConsultantId, storeState.consultants, storeState.projects, storeState.towers]);

  // Open Cell Inspector Modal
  const handleOpenInspector = (pkg: WorkPackageMaster, col: MatrixColumn) => {
    const entry = storeState.packageStatuses[`${col.projectId}__${col.towerId}__${pkg.id}`];
    setActiveCell({ pkg, col, entry });
    setInspectorTab("EDIT");
    setIsReassigningConsultant(false);

    // Auto-resolve assigned consultant partner if not explicitly recorded
    let initialConsultantId = entry?.consultantId || "";
    if (!initialConsultantId) {
      const proj = storeState.projects.find(p => p.id === col.projectId);
      const twr = storeState.towers.find(t => t.id === col.towerId);
      const taggedNames = [
        ...(twr?.taggedConsultants || []),
        ...(proj?.taggedConsultants || [])
      ];
      const matched = storeState.consultants.find(c => {
        const matchesProj = taggedNames.some(tn => tn.toLowerCase() === c.name.toLowerCase() || tn === c.id);
        const matchesCat = (c.categories || []).some(cat => cat.toLowerCase() === pkg.disciplineName.toLowerCase()) ||
                           (c.category && (c.category as string).toLowerCase() === pkg.disciplineName.toLowerCase());
        return matchesProj && matchesCat;
      }) || storeState.consultants.find(c =>
        (c.activeProjects || []).some(ap => ap.toLowerCase() === (col.projectName || "").toLowerCase()) &&
        ((c.categories || []).some(cat => cat.toLowerCase() === pkg.disciplineName.toLowerCase()) ||
         (c.category && (c.category as string).toLowerCase() === pkg.disciplineName.toLowerCase()))
      ) || storeState.consultants.find(c =>
        (c.categories || []).some(cat => cat.toLowerCase() === pkg.disciplineName.toLowerCase()) ||
        (c.category && (c.category as string).toLowerCase() === pkg.disciplineName.toLowerCase())
      );
      if (matched) {
        initialConsultantId = matched.id;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    setCellStatus(entry?.status || "Received");
    setCellPlannedDate(entry?.plannedDate || today);
    setCellActualDate(entry?.actualDate || (entry?.status === "Received" ? today : "-"));
    setCellConsultantId(initialConsultantId);
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
    const effectiveConsultantId = cellConsultantId || resolvedCellConsultant?.id || "";
    const selectedConsultant = storeState.consultants.find(c => c.id === effectiveConsultantId) || resolvedCellConsultant;

    // 1. Record status and create local audit log
    DesignMasterStore.recordPackageStatus(
      col.projectId,
      col.towerId,
      pkg.id,
      cellStatus,
      cellPlannedDate.trim(),
      cellActualDate.trim(),
      cellPlannedDate.trim(),
      effectiveConsultantId || undefined,
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

  // Related Wings and Sub-Projects computed line item-wise for selected Batch Project
  const batchRelatedTowers = useMemo(() => {
    if (!batchProjectId) return [];
    const currentProject = storeState.projects.find(p => p.id === batchProjectId);
    const directTowers = storeState.towers.filter(t => t.projectId === batchProjectId).map(t => ({
      ...t,
      parentProjectName: currentProject?.name || "Main Project",
      isSubProjectTower: !!currentProject?.isSubProject,
      subProjectName: currentProject?.isSubProject ? currentProject.name : undefined
    }));

    // Find any child subprojects belonging to this parent project
    const childSubProjects = storeState.projects.filter(p => p.parentProjectId === batchProjectId);
    const childTowers = childSubProjects.flatMap(sp => 
      storeState.towers.filter(t => t.projectId === sp.id).map(t => ({
        ...t,
        parentProjectName: sp.name,
        isSubProjectTower: true,
        subProjectName: sp.name
      }))
    );

    return [...directTowers, ...childTowers];
  }, [batchProjectId, storeState.projects, storeState.towers]);

  // Open Batch Update Modal
  const handleOpenBatchModal = () => {
    const pId = selectedProjects.length > 0 
      ? selectedProjects[0] 
      : (accessibleProjects[0]?.id || "");
    setBatchProjectId(pId);
    
    // Select all related towers & subproject towers line item-wise by default
    const directTowers = storeState.towers.filter(t => t.projectId === pId).map(t => t.id);
    const childSubProjects = storeState.projects.filter(p => p.parentProjectId === pId);
    const childTowers = childSubProjects.flatMap(sp => storeState.towers.filter(t => t.projectId === sp.id).map(t => t.id));
    const allTwrIds = [...directTowers, ...childTowers];

    setBatchSelectedTowers(allTwrIds);
    setBatchDiscipline(selectedDisciplines.length > 0 ? selectedDisciplines[0] : "ALL");
    setBatchStatus("Received");
    const today = new Date().toISOString().split("T")[0];
    setBatchPlannedDate(today);
    setBatchActualDate(today);
    setBatchConsultantName("");
    setBatchRemarks("");
    setBatchTowerSearch("");
    setIsBatchModalOpen(true);
  };

  // Execute Batch Update with Mandatory Dates
  const handleExecuteBatchUpdate = async () => {
    if (!batchProjectId || batchSelectedTowers.length === 0) {
      toast.error("Please select at least one Wing / Sub-Project line item to update.");
      return;
    }

    if (!batchPlannedDate.trim() || !batchActualDate.trim()) {
      toast.error("Both Planned Date and Actual Date are mandatory for batch updates.");
      return;
    }

    let targetPkgs = storeState.packages;
    if (batchDiscipline !== "ALL") {
      targetPkgs = targetPkgs.filter(p => p.disciplineName === batchDiscipline);
    }

    if (targetPkgs.length === 0) {
      toast.error("No packages found matching the selected discipline.");
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
      const twr = storeState.towers.find(t => t.id === twrId);
      const effectiveProjectId = twr ? twr.projectId : batchProjectId;
      targetPkgs.forEach(pkg => {
        updates.push({
          projectId: effectiveProjectId,
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
    toast.success(`⚡ Batch Updated ${updates.length} cells successfully across ${batchSelectedTowers.length} line items with mandatory dates & audit logging!`);
    setIsBatchModalOpen(false);
  };

  // Excel (.XLSX) Export
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportTenderMatrixToExcel(storeState, filteredPackages, visibleColumns);
      toast.success("Excel report exported successfully!");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel file. Please try CSV export.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["Package Master", "Sub-Package Scope", ...visibleColumns.map(c => `${c.projectName} - ${c.towerName} (Status)`)];
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
      (l.projectName && l.projectName.toLowerCase().includes(q)) ||
      (l.packageName && l.packageName.toLowerCase().includes(q)) ||
      (l.newStatus && l.newStatus.toLowerCase().includes(q)) ||
      (l.entityName && l.entityName.toLowerCase().includes(q)) ||
      (l.changedBy && l.changedBy.toLowerCase().includes(q)) ||
      (l.remarks && l.remarks.toLowerCase().includes(q))
    );
  }, [storeState.auditLogs, auditSearchQuery]);

  // Multi-select Dropdown Options
  const projectOptions = useMemo<DropdownOption[]>(() => {
    return accessibleProjects.map(p => {
      const towerCount = storeState.towers.filter(t => t.projectId === p.id).length;
      return {
        value: p.id,
        label: p.name,
        count: towerCount,
        subtitle: `${towerCount} tower${towerCount === 1 ? "" : "s"}`
      };
    });
  }, [accessibleProjects, storeState.towers]);

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
        colorDot: "#10b981"
      },
      {
        value: "IN_PROGRESS",
        label: "In Progress / Onboard",
        count: matrixStats.inProgress,
        colorDot: "#f59e0b"
      },
      {
        value: "PENDING",
        label: "Pending / Not Onboard",
        count: matrixStats.pending,
        colorDot: "#f43f5e"
      },
      {
        value: "TARGET_DATE",
        label: "Target Dates",
        count: matrixStats.targetDates,
        colorDot: "#0ea5e9"
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
      {!activeCell && !isAuditDrawerOpen && !isBatchModalOpen && (
        <>
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
            placeholder={accessibleProjects.length === storeState.projects.length ? `All Projects (${accessibleProjects.length})` : `Assigned Projects (${accessibleProjects.length})`}
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
            placeholder={`All Packages (${categories.length})`}
            searchPlaceholder="Search package..."
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
                  Package & Sub-Package Deliverables
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
        </>
      )}

      {/* 🔍 Deliverable Inspector & Edit Form Transaction Layout */}
      {activeCell && (
        <TransactionFormLayout
          title={"Deliverable Inspector: " + activeCell.pkg.packageName}
          category="Tender & Design Matrix"
          icon={Edit2}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          description={"Inspect deliverable readiness, update mandatory milestone dates, and review audit trail for " + activeCell.col.projectName + " • Wing " + activeCell.col.towerName + "."}
          breadcrumbs={[
            { label: "Design Tracking Desk" },
            { label: "Tender Design Matrix", onClick: () => setActiveCell(null) },
            { label: activeCell.pkg.packageName }
          ]}
          onBack={() => setActiveCell(null)}
          backLabel="Back to Tender Design Matrix"
          onReset={() => {
            setCellStatus("Received");
            setCellPlannedDate("");
            setCellActualDate("");
            setCellRemarks("");
          }}
          onSave={handleSaveCell}
          saveLabel="Save & Log Audit Trail"
        >
          <div className="max-w-4xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Deliverable Package Scope</span>
                    <AppCardTitle className="text-base font-bold text-foreground">{activeCell.pkg.packageName}</AppCardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeCell.col.projectName} • Wing {activeCell.col.towerName} • <span className="text-emerald-600 font-semibold">{activeCell.pkg.disciplineName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setInspectorTab("EDIT")}
                      className={"px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 " + (
                        inspectorTab === "EDIT" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Status & Dates</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab("AUDIT")}
                      className={"px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 " + (
                        inspectorTab === "AUDIT" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <History className="h-3.5 w-3.5 text-purple-500" />
                      <span>Audit Trail</span>
                    </button>
                  </div>
                </div>
              </AppCardHeader>
              <AppCardContent className="space-y-4">
            {/* Scrollable Body: Tab 1 (Edit Form) */}
            {inspectorTab === "EDIT" && (
              <form id="deliverable-inspector-form" onSubmit={handleSaveCell} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-5 text-xs">
                {cellFormError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{cellFormError}</span>
                  </div>
                )}

                {/* Status Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Deliverable Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCellStatus("Received")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "Received"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-2xs"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Received</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellStatus("In progress")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "In progress"
                          ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500 shadow-2xs"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span>In Progress</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellStatus("Pending")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "Pending"
                          ? "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500 shadow-2xs"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <span>Pending</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellStatus("NA")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        cellStatus === "NA"
                          ? "border-slate-500 bg-slate-500/20 text-foreground ring-1 ring-slate-500 shadow-2xs"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>Not Applicable (NA)</span>
                    </button>
                  </div>
                </div>

                {/* Mandatory Planned & Actual Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      <span>Planned Date <span className="text-rose-500">* (Mandatory)</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={cellPlannedDate}
                      onChange={e => setCellPlannedDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Actual Date <span className="text-rose-500">* (Mandatory)</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      value={cellActualDate}
                      onChange={e => setCellActualDate(e.target.value)}
                      aria-label="Actual date"
                      placeholder="YYYY-MM-DD or '-'"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Designated Consultant Partner (Auto-Resolved for this Project & Package) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>Designated Consultant Partner</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsReassigningConsultant(!isReassigningConsultant)}
                      className="h-6 px-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {isReassigningConsultant ? "Keep Designated Partner" : "Change / Reassign"}
                    </button>
                  </div>

                  {/* Highlighted Established Consultant Partner Card */}
                  {resolvedCellConsultant ? (
                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                          {resolvedCellConsultant.name?.charAt(0) || "C"}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {resolvedCellConsultant.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                              {resolvedCellConsultant.category || activeCell.pkg.disciplineName}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>Lead: <strong className="text-foreground">{resolvedCellConsultant.leadContact || "Lead Consultant"}</strong></span>
                            {resolvedCellConsultant.email && <span>• {resolvedCellConsultant.email}</span>}
                            {resolvedCellConsultant.phone && <span>• {resolvedCellConsultant.phone}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Assigned for {activeCell.col.projectName}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border text-xs text-muted-foreground flex items-center justify-between">
                      <span>No specific consultant tagged for this package.</span>
                      <button
                        type="button"
                        onClick={() => setIsReassigningConsultant(true)}
                        className="h-6 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        + Assign Partner
                      </button>
                    </div>
                  )}

                  {/* Optional Reassignment Dropdown */}
                  {isReassigningConsultant && (
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border animate-in fade-in duration-150 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground">
                        Select New Consultant Partner from Consultant Master:
                      </label>
                      <select
                        value={cellConsultantId}
                        onChange={e => setCellConsultantId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="">-- Retain Default / None --</option>
                        {storeState.consultants.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.category}) - {c.onboardingStatus}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Audit Remarks */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Audit Remarks / Delivery Notes
                  </label>
                  <input
                    type="text"
                    value={cellRemarks}
                    onChange={e => setCellRemarks(e.target.value)}
                    placeholder="Enter inspection remarks, drawing revision notes, or handover status..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </form>
            )}

            {/* Scrollable Body: Tab 2 (Audit Trail History) */}
            {inspectorTab === "AUDIT" && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Change Audit History for this Deliverable
                  </h5>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {DesignMasterStore.getAuditLogs({ entryKey: `${activeCell.col.projectId}__${activeCell.col.towerId}__${activeCell.pkg.id}` }).length} Logs Recorded
                  </span>
                </div>

                <div className="space-y-2.5">
                  {DesignMasterStore.getAuditLogs({ entryKey: `${activeCell.col.projectId}__${activeCell.col.towerId}__${activeCell.pkg.id}` }).length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                      No prior audit history recorded for this cell yet.
                    </div>
                  ) : (
                    DesignMasterStore.getAuditLogs({ entryKey: `${activeCell.col.projectId}__${activeCell.col.towerId}__${activeCell.pkg.id}` }).map((log) => (
                      <div key={log.id} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
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

              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}

      {/* 📜 Audit Trail & Mail Logs Working Document Canvas */}
      {isAuditDrawerOpen && (
        <WorkingDocumentLayout
          title="Master Design Matrix: Audit Trail & Mail Dispatch Ledger"
          badge={filteredAuditLogs.length + " Records"}
          badgeColor="bg-purple-500/10 text-purple-600 border border-purple-500/30"
          category="Audit & Compliance"
          icon={History}
          iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          description="Immutable revision history of deliverable dates, status modifications, and email notices."
          breadcrumbs={[
            { label: "Design Tracking Desk" },
            { label: "Tender Design Matrix", onClick: () => setIsAuditDrawerOpen(false) },
            { label: "Audit Ledger" }
          ]}
          onBack={() => setIsAuditDrawerOpen(false)}
          backLabel="Back to Tender Design Matrix"
        >
          <div className="max-w-5xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <AppCardTitle className="text-sm font-bold text-foreground">Audit Log History</AppCardTitle>
                </div>
              </AppCardHeader>
              <AppCardContent className="space-y-4">
            <div className="p-4 border-b border-border/60 bg-surface shrink-0">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  placeholder="Search audit trail by project, package, or user..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Audit List */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-3 text-xs">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
                  No audit logs match your search.
                </div>
              ) : (
                filteredAuditLogs.map(log => (
                  <div key={log.id} className="p-4 rounded-2xl border border-border bg-surface shadow-2xs space-y-2.5 text-xs hover:border-purple-500/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{log.projectName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border font-mono">
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-xl bg-muted/20 border border-border">
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
                      <div className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded-lg">
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

              </AppCardContent>
            </AppCard>
          </div>
        </WorkingDocumentLayout>
      )}

      {/* ⚡ Batch Update Transaction Layout */}
      {isBatchModalOpen && (
        <TransactionFormLayout
          title="Batch Status Update"
          category="Tender & Design Matrix"
          icon={Zap}
          iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          description="Bulk update package status and mandatory planned/actual milestone dates across multiple wings and towers."
          breadcrumbs={[
            { label: "Design Tracking Desk" },
            { label: "Tender Design Matrix", onClick: () => setIsBatchModalOpen(false) },
            { label: "Batch Update" }
          ]}
          onBack={() => setIsBatchModalOpen(false)}
          backLabel="Back to Tender Design Matrix"
          onReset={() => {
            const today = new Date().toISOString().split("T")[0];
            setBatchPlannedDate(today);
            setBatchActualDate(today);
            setBatchRemarks("");
          }}
          onSave={handleExecuteBatchUpdate}
          saveLabel="Apply Batch Update"
        >
          <div className="max-w-4xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-bold text-foreground">Batch Scope & Status Details</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-4 text-xs">
              {/* Project and Discipline Selection (2-Column Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-blue-500" />
                    <span>Target Project / Development</span>
                  </label>
                  <select
                    value={batchProjectId}
                    onChange={e => {
                      const pId = e.target.value;
                      setBatchProjectId(pId);
                      const directTowers = storeState.towers.filter(t => t.projectId === pId).map(t => t.id);
                      const childSubProjects = storeState.projects.filter(p => p.parentProjectId === pId);
                      const childTowers = childSubProjects.flatMap(sp => storeState.towers.filter(t => t.projectId === sp.id).map(t => t.id));
                      const allTwrIds = [...directTowers, ...childTowers];
                      setBatchSelectedTowers(allTwrIds);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {accessibleProjects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.isSubProject ? `🏙️ ${proj.name} (Sub-Project)` : `🏢 ${proj.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Parent Package Scope</span>
                  </label>
                  <select
                    value={batchDiscipline}
                    onChange={e => setBatchDiscipline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="ALL">All Packages ({storeState.packages.length} Sub-Packages)</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat} ({storeState.packages.filter(p => p.disciplineName === cat).length} Packages)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Zero-Packages Warning and Auto-Load helper */}
              {storeState.packages.length === 0 && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0 text-blue-500" />
                    <span>No Sub-Packages loaded. Load the standard template to populate all standard packages.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      DesignMasterStore.loadEyReferenceTemplate();
                      setTimeout(() => {
                        const updatedState = DesignMasterStore.getState();
                        const directTowers = updatedState.towers.filter(t => t.projectId === batchProjectId).map(t => t.id);
                        const childSubProjects = updatedState.projects.filter(p => p.parentProjectId === batchProjectId);
                        const childTowers = childSubProjects.flatMap(sp => updatedState.towers.filter(t => t.projectId === sp.id).map(t => t.id));
                        const allTwrIds = [...directTowers, ...childTowers];
                        if (allTwrIds.length > 0) setBatchSelectedTowers(allTwrIds);
                      }, 50);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Zap className="h-3 w-3" />
                    <span>Load Standard Template</span>
                  </button>
                </div>
              )}

              {/* Target Wings & Sub-Projects Line Item-Wise Selection */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Target Wings & Sub-Projects (Line Item Selection)</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {batchSelectedTowers.length} of {batchRelatedTowers.length} selected
                    </span>
                    {batchRelatedTowers.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBatchSelectedTowers(batchRelatedTowers.map(t => t.id))}
                          className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 font-bold cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setBatchSelectedTowers([])}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {batchRelatedTowers.length > 3 && (
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={batchTowerSearch}
                      onChange={e => setBatchTowerSearch(e.target.value)}
                      placeholder="Filter wings / sub-projects..."
                      aria-label="Filter wings or sub-projects"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {batchRelatedTowers.length === 0 ? (
                  <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      <span>No Wings or Sub-Projects configured for this project yet.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTwr = DesignMasterStore.addTower({
                          projectId: batchProjectId,
                          towerName: "Wing A",
                          towerType: "Sale"
                        });
                        setBatchSelectedTowers([newTwr.id]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Quick Add &ldquo;Wing A&rdquo;</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {batchRelatedTowers
                      .filter(twr => !batchTowerSearch.trim() || twr.towerName.toLowerCase().includes(batchTowerSearch.toLowerCase()) || (twr.subProjectName && twr.subProjectName.toLowerCase().includes(batchTowerSearch.toLowerCase())))
                      .map(twr => {
                        const isChecked = batchSelectedTowers.includes(twr.id);
                        return (
                          <div
                            key={twr.id}
                            onClick={() => {
                              setBatchSelectedTowers(prev => 
                                isChecked ? prev.filter(id => id !== twr.id) : [...prev, twr.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                              isChecked 
                                ? "bg-teal-500/10 border-teal-500/40 text-foreground ring-1 ring-teal-500/30 shadow-2xs" 
                                : "bg-surface border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`h-4.5 w-4.5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                isChecked ? "bg-teal-600 text-white border-teal-600" : "border-border bg-background"
                              }`}>
                                {isChecked ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-foreground">{twr.towerName}</span>
                                  {twr.isSubProjectTower && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                      🏙️ {twr.subProjectName || "Sub-Project"}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                    {twr.towerType || "Sale"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                  {twr.taggedConsultants && twr.taggedConsultants.length > 0 ? (
                                    <span>Assigned: <strong className="text-foreground">{twr.taggedConsultants.slice(0, 2).join(", ")}{twr.taggedConsultants.length > 2 ? ` +${twr.taggedConsultants.length - 2}` : ""}</strong></span>
                                  ) : (
                                    <span>Inherits project consultants</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                                isChecked 
                                  ? "bg-teal-600/20 text-teal-700 dark:text-teal-300 border border-teal-500/30" 
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}>
                                {isChecked ? "Included" : "Excluded"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Optional Consultant Partner Assignment */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                    <span>Assign Consultant Partner</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">Optional</span>
                </label>
                <select
                  value={batchConsultantName}
                  onChange={e => setBatchConsultantName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">-- Retain Existing / Default Consultant Partner --</option>
                  {storeState.consultants.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
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
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}
    </div>
  );
};
