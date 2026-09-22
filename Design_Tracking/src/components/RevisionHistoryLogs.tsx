"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DrawingItem } from "../types";
import { MatrixAuditLog } from "../types/masterTypes";
import { DesignMasterStore } from "../services/designMasterStore";
import { 
  RotateCcw, 
  History, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  Building,
  FileText, 
  Calendar, 
  Download, 
  ArrowRight,
  Sparkles,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Package,
  Users,
  Info,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { DesignMultiSelectDropdown } from "./DesignMultiSelectDropdown";

interface RevisionHistoryProps {
  drawings: DrawingItem[];
}

interface RevisionLogEntry {
  id: string;
  drawingCode: string;
  drawingTitle: string;
  project: string;
  discipline: string;
  revision: string;
  previousRevision?: string;
  changeSummary: string;
  consultant: string;
  submittedDate: string;
  certifiedGfcDate?: string;
  fileSize: string;
}

export const RevisionHistoryLogs: React.FC<RevisionHistoryProps> = ({
  drawings
}) => {
  const [activeTab, setActiveTab] = useState<"AUDIT_TRAIL" | "DRAWING_REVISIONS">("AUDIT_TRAIL");

  // State for Live Master Store Audit Logs
  const [auditLogs, setAuditLogs] = useState<MatrixAuditLog[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [selectedEntityTypeFilter, setSelectedEntityTypeFilter] = useState<string>("ALL");
  const [selectedAuditProject, setSelectedAuditProject] = useState<string>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // State for Drawing Revisions
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Subscribe to Master Store Audit Logs
  useEffect(() => {
    const updateLogs = () => {
      setAuditLogs([...DesignMasterStore.getState().auditLogs]);
    };
    updateLogs();
    const unsubscribe = DesignMasterStore.subscribe(updateLogs);
    return () => unsubscribe();
  }, []);

  const disciplines = ["Architectural", "Structural", "MEP", "Landscape", "Interior"];
  const projects = useMemo(() => Array.from(new Set(drawings.map(d => d.project))), [drawings]);

  // Master projects list for audit filter
  const masterProjects = useMemo(() => {
    return DesignMasterStore.getState().projects || [];
  }, [auditLogs]);

  // Drawing revision logs
  const revisionLogs = useMemo<RevisionLogEntry[]>(() => {
    const logs: RevisionLogEntry[] = [];

    drawings.forEach((d) => {
      logs.push({
        id: `${d.id}-current`,
        drawingCode: d.code,
        drawingTitle: d.title,
        project: d.project,
        discipline: d.discipline,
        revision: d.revision,
        previousRevision: d.revision === "R3" ? "R2" : d.revision === "R2" ? "R1" : d.revision === "R4" ? "R3" : "R0",
        changeSummary: d.description || "Updated specifications and coordinated MEP clashes.",
        consultant: d.consultant,
        submittedDate: d.submittedDate,
        certifiedGfcDate: d.approvedDate,
        fileSize: d.fileSize || "18.5 MB"
      });

      if (d.revision !== "R0" && d.revision !== "R1") {
        logs.push({
          id: `${d.id}-prior-1`,
          drawingCode: d.code,
          drawingTitle: d.title,
          project: d.project,
          discipline: d.discipline,
          revision: d.revision === "R4" ? "R3" : d.revision === "R3" ? "R2" : "R1",
          previousRevision: d.revision === "R4" ? "R2" : d.revision === "R3" ? "R1" : "R0",
          changeSummary: "Structural load calculations revised per peer review committee remarks.",
          consultant: d.consultant,
          submittedDate: "2026-07-15",
          fileSize: "16.8 MB"
        });

        logs.push({
          id: `${d.id}-prior-0`,
          drawingCode: d.code,
          drawingTitle: d.title,
          project: d.project,
          discipline: d.discipline,
          revision: "R0",
          changeSummary: "Initial Concept & Tender Release drawing submission.",
          consultant: d.consultant,
          submittedDate: "2026-06-01",
          fileSize: "14.2 MB"
        });
      }
    });

    return logs;
  }, [drawings]);

  // Filtered Master Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Action Filter
      if (selectedActionFilter !== "ALL" && log.action !== selectedActionFilter) {
        return false;
      }
      // Entity Type Filter
      if (selectedEntityTypeFilter !== "ALL" && log.entityType !== selectedEntityTypeFilter) {
        return false;
      }
      // Project Filter
      if (selectedAuditProject !== "ALL" && log.projectId !== selectedAuditProject && log.projectName !== selectedAuditProject) {
        return false;
      }
      // Search query
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const matches = 
          (log.entityName && log.entityName.toLowerCase().includes(q)) ||
          (log.projectName && log.projectName.toLowerCase().includes(q)) ||
          (log.towerName && log.towerName.toLowerCase().includes(q)) ||
          (log.packageName && log.packageName.toLowerCase().includes(q)) ||
          (log.consultantName && log.consultantName.toLowerCase().includes(q)) ||
          (log.changedBy && log.changedBy.toLowerCase().includes(q)) ||
          (log.remarks && log.remarks.toLowerCase().includes(q)) ||
          (log.reason && log.reason.toLowerCase().includes(q)) ||
          (log.impactSummary && log.impactSummary.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, selectedActionFilter, selectedEntityTypeFilter, selectedAuditProject, auditSearchQuery]);

  // Audit Statistics
  const auditStats = useMemo(() => {
    const total = auditLogs.length;
    const deletes = auditLogs.filter(l => l.action === "DELETE" || l.action === "CASCADE_DELETE").length;
    const updates = auditLogs.filter(l => l.action === "UPDATE").length;
    const creates = auditLogs.filter(l => l.action === "CREATE").length;
    const statusChanges = auditLogs.filter(l => l.action === "STATUS_CHANGE" || (!l.action && l.newStatus)).length;
    return { total, deletes, updates, creates, statusChanges };
  }, [auditLogs]);

  const disciplineFilterOptions = useMemo(() => {
    return disciplines.map(d => ({
      value: d,
      label: d,
      count: revisionLogs.filter(l => l.discipline === d).length
    }));
  }, [disciplines, revisionLogs]);

  const projectFilterOptions = useMemo(() => {
    return projects.map(p => ({
      value: p,
      label: p,
      count: revisionLogs.filter(l => l.project === p).length
    }));
  }, [projects, revisionLogs]);

  const filteredLogs = useMemo(() => {
    return revisionLogs.filter(l => {
      const matchesDiscipline = selectedDisciplines.length === 0 || selectedDisciplines.includes(l.discipline);
      const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(l.project);

      if (!matchesDiscipline || !matchesProject) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          l.drawingCode.toLowerCase().includes(q) ||
          l.drawingTitle.toLowerCase().includes(q) ||
          l.project.toLowerCase().includes(q) ||
          l.consultant.toLowerCase().includes(q) ||
          l.changeSummary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [revisionLogs, selectedDisciplines, selectedProjects, searchQuery]);

  const handleExportDrawingCsv = () => {
    const headers = ["Drawing Code", "Title", "Project", "Discipline", "Revision", "Prior Revision", "Change Description", "Consultant", "Submission Date", "GFC Date"];
    const rows = filteredLogs.map(l => [
      `"${l.drawingCode}"`,
      `"${l.drawingTitle.replace(/"/g, '""')}"`,
      `"${l.project}"`,
      `"${l.discipline}"`,
      `"${l.revision}"`,
      `"${l.previousRevision || "None"}"`,
      `"${l.changeSummary.replace(/"/g, '""')}"`,
      `"${l.consultant.replace(/"/g, '""')}"`,
      `"${l.submittedDate}"`,
      `"${l.certifiedGfcDate || "N/A"}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Drawing_Revisions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAuditCsv = () => {
    const headers = [
      "Timestamp",
      "Action",
      "Entity Type",
      "Entity Name",
      "Project Foreign Key",
      "Tower Foreign Key",
      "Package Foreign Key",
      "Consultant Foreign Key",
      "Operator",
      "Impact / Cascade Summary",
      "Audit Remarks / Reason"
    ];

    const rows = filteredAuditLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.action || "STATUS_CHANGE"}"`,
      `"${l.entityType || "MATRIX_CELL"}"`,
      `"${(l.entityName || l.entryKey || "Transaction").replace(/"/g, '""')}"`,
      `"${(l.projectName || l.projectId || "—").replace(/"/g, '""')}"`,
      `"${(l.towerName || l.towerId || "—").replace(/"/g, '""')}"`,
      `"${(l.packageName || l.packageId || "—").replace(/"/g, '""')}"`,
      `"${(l.consultantName || l.consultantId || "—").replace(/"/g, '""')}"`,
      `"${(l.changedBy || "Design Manager").replace(/"/g, '""')}"`,
      `"${(l.impactSummary || "—").replace(/"/g, '""')}"`,
      `"${(l.reason || l.remarks || "—").replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Audit_Trail_Foreign_Key_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action?: string) => {
    switch (action) {
      case "CASCADE_DELETE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 shadow-2xs">
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            <span>CASCADE DELETE</span>
          </span>
        );
      case "DELETE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-rose-500" />
            <span>DELETE</span>
          </span>
        );
      case "UPDATE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
            <Edit2 className="h-3 w-3 text-blue-500" />
            <span>UPDATE</span>
          </span>
        );
      case "CREATE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <Plus className="h-3 w-3 text-emerald-500" />
            <span>CREATE</span>
          </span>
        );
      case "STATUS_CHANGE":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
            <Layers className="h-3 w-3 text-purple-500" />
            <span>STATUS CHANGE</span>
          </span>
        );
    }
  };

  const getEntityTypeBadge = (entityType?: string) => {
    switch (entityType) {
      case "PROJECT":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">🏢 Master Project</span>;
      case "SUB_PROJECT":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">🏙️ Sub-Project</span>;
      case "TOWER":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">🏙️ Tower / Wing</span>;
      case "PACKAGE":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">📦 Work Package</span>;
      case "CONSULTANT":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">🤝 Consultant</span>;
      case "AUTHORITY":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">🛡️ Authority</span>;
      case "MATRIX_CELL":
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground border border-border">📊 Matrix Cell</span>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header & Tab Switcher Strip */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Revision History & Audit Logs
              </h2>
              <p className="text-xs text-muted-foreground">
                Full immutable audit trail with foreign key relationship tracking, delete/update cascades, and drawing delta logs
              </p>
            </div>
          </div>

          {/* Sub-Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("AUDIT_TRAIL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "AUDIT_TRAIL"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Master & Transaction Audit ({auditLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("DRAWING_REVISIONS")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "DRAWING_REVISIONS"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Drawing Revisions ({revisionLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Master & Transaction Audit Logs */}
        {activeTab === "AUDIT_TRAIL" && (
          <div className="space-y-4 pt-1">
            {/* Fast Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Audit Events</span>
                <span className="text-lg font-black text-foreground font-mono">{auditStats.total}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Deletions & Cascades</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{auditStats.deletes}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Master Updates</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">{auditStats.updates}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Status / Matrix Fills</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{auditStats.statusChanges + auditStats.creates}</span>
              </div>
            </div>

            {/* Audit Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search audit trail by entity, project, operator, or remarks..."
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Action Filter */}
              <select
                value={selectedActionFilter}
                onChange={e => setSelectedActionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">All Actions</option>
                <option value="CASCADE_DELETE">⚠️ CASCADE DELETE</option>
                <option value="DELETE">🗑️ DELETE</option>
                <option value="UPDATE">✏️ UPDATE</option>
                <option value="CREATE">➕ CREATE</option>
                <option value="STATUS_CHANGE">📊 STATUS CHANGE</option>
              </select>

              {/* Entity Type Filter */}
              <select
                value={selectedEntityTypeFilter}
                onChange={e => setSelectedEntityTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">All Entity Types</option>
                <option value="PROJECT">🏢 Master Project</option>
                <option value="SUB_PROJECT">🏙️ Sub-Project / Phase</option>
                <option value="TOWER">🏙️ Tower / Wing</option>
                <option value="PACKAGE">📦 Work Package</option>
                <option value="CONSULTANT">🤝 Consultant Partner</option>
                <option value="AUTHORITY">🛡️ Statutory Authority</option>
                <option value="MATRIX_CELL">📊 Matrix Cell</option>
              </select>

              {/* Project Filter */}
              <select
                value={selectedAuditProject}
                onChange={e => setSelectedAuditProject(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">All Projects</option>
                {masterProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.isSubProject ? `🏙️ ${p.name}` : `🏢 ${p.name}`}</option>
                ))}
              </select>

              {(selectedActionFilter !== "ALL" || selectedEntityTypeFilter !== "ALL" || selectedAuditProject !== "ALL" || auditSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActionFilter("ALL");
                    setSelectedEntityTypeFilter("ALL");
                    setSelectedAuditProject("ALL");
                    setAuditSearchQuery("");
                  }}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all ml-auto"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Audit CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Drawing Revisions Controls */}
        {activeTab === "DRAWING_REVISIONS" && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search drawings by code, title, consultant..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <DesignMultiSelectDropdown
              label="Discipline"
              options={disciplineFilterOptions}
              selectedValues={selectedDisciplines}
              onChange={setSelectedDisciplines}
              colorTheme="emerald"
              placeholder="All Disciplines"
            />

            <DesignMultiSelectDropdown
              label="Project"
              options={projectFilterOptions}
              selectedValues={selectedProjects}
              onChange={setSelectedProjects}
              colorTheme="blue"
              placeholder="All Projects"
            />

            {(selectedDisciplines.length > 0 || selectedProjects.length > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDisciplines([]);
                  setSelectedProjects([]);
                  setSearchQuery("");
                }}
                className="h-8 px-2.5 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportDrawingCsv}
              className="h-8 px-3 rounded-xl border border-border bg-surface hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ml-auto"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
              <span>Export Drawing CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* View 1: Master & Transaction Audit Logs Table */}
      {activeTab === "AUDIT_TRAIL" && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="p-3.5 whitespace-nowrap min-w-[160px]">Timestamp & Operator</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[130px]">Action</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[200px]">Target Entity</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[240px]">Foreign Key Context</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[240px]">Impact & Cascade Summary</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[200px]">Remarks / Reason</th>
                  <th className="p-3.5 text-right whitespace-nowrap min-w-[80px]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="space-y-1.5">
                        <History className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <p className="font-semibold text-xs">No Audit Trail Events Found</p>
                        <p className="text-[11px]">Audit records will be created automatically whenever entities or matrix cells are created, updated, or deleted.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Timestamp & Operator */}
                          <td className="p-3.5 whitespace-nowrap min-w-[160px]">
                            <div>
                              <span className="font-mono text-[11px] font-bold text-foreground block">
                                {new Date(log.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground block">
                                {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 block mt-0.5">
                                👤 {log.changedBy || "Design Manager"}
                              </span>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="p-3.5 whitespace-nowrap min-w-[130px]">
                            {getActionBadge(log.action)}
                          </td>

                          {/* Target Entity */}
                          <td className="p-3.5 whitespace-nowrap min-w-[200px]">
                            <div className="space-y-1">
                              <div>{getEntityTypeBadge(log.entityType)}</div>
                              <span className="font-bold text-foreground block text-xs truncate max-w-[220px]">
                                {log.entityName || log.packageName || log.projectName || log.entryKey || "Transaction Record"}
                              </span>
                            </div>
                          </td>

                          {/* Foreign Key Context */}
                          <td className="p-3.5 whitespace-nowrap min-w-[240px]">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {log.projectName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium truncate max-w-[130px]">
                                  🏢 {log.projectName}
                                </span>
                              )}
                              {log.towerName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 font-medium">
                                  🏙️ {log.towerName}
                                </span>
                              )}
                              {log.packageName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium truncate max-w-[130px]">
                                  📦 {log.packageName}
                                </span>
                              )}
                              {log.consultantName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-medium truncate max-w-[130px]">
                                  🤝 {log.consultantName}
                                </span>
                              )}
                              {!log.projectName && !log.towerName && !log.packageName && !log.consultantName && (
                                <span className="text-[10px] text-muted-foreground italic">— Standalone —</span>
                              )}
                            </div>
                          </td>

                          {/* Impact & Cascade Summary */}
                          <td className="p-3.5 min-w-[240px] max-w-[300px]">
                            <p className="text-xs font-semibold text-foreground leading-snug">
                              {log.impactSummary || (log.newStatus ? `Status updated to "${log.newStatus}"` : "Modified parameters")}
                            </p>
                            {log.foreignKeyDependencies && log.foreignKeyDependencies.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {log.foreignKeyDependencies.map((dep, idx) => (
                                  <span key={idx} className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono">
                                    {dep.count} {dep.referencedEntityType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Remarks / Reason */}
                          <td className="p-3.5 min-w-[200px] max-w-[260px]">
                            <p className="text-xs text-muted-foreground truncate">
                              {log.reason || log.remarks || "—"}
                            </p>
                          </td>

                          {/* Details Expand Toggle */}
                          <td className="p-3.5 text-right whitespace-nowrap min-w-[80px]">
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-2 py-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>{isExpanded ? "Hide" : "Diff"}</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Diff Drawer */}
                        {isExpanded && (
                          <tr className="bg-muted/30 border-b border-border">
                            <td colSpan={7} className="p-4 space-y-3">
                              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2.5">
                                <div className="flex items-center justify-between border-b border-border pb-2">
                                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-purple-500" />
                                    <span>Audit Snapshot & Foreign Key Relationship Inspection</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">ID: {log.id}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* Previous State Snapshot */}
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                                      Previous State Snapshot (Before Change):
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 custom-scrollbar">
                                      {log.previousValue 
                                        ? JSON.stringify(log.previousValue, null, 2) 
                                        : (log.previousStatus ? `Status: ${log.previousStatus}\nPlanned Date: ${log.previousPlannedDate || "—"}\nActual Date: ${log.previousActualDate || "—"}` : "None / Initial State")}
                                    </pre>
                                  </div>

                                  {/* New State Snapshot */}
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                      New State Snapshot (After Change):
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-48 custom-scrollbar">
                                      {log.newValue 
                                        ? JSON.stringify(log.newValue, null, 2) 
                                        : (log.action === "DELETE" || log.action === "CASCADE_DELETE" ? "DELETED (Purged from active dataset)" : `Status: ${log.newStatus || "—"}\nPlanned Date: ${log.newPlannedDate || "—"}\nActual Date: ${log.newActualDate || "—"}`)}
                                    </pre>
                                  </div>
                                </div>

                                {log.reason && (
                                  <div className="pt-2 border-t border-border flex items-center gap-2 text-xs">
                                    <span className="font-bold text-foreground">Deletion / Change Reason:</span>
                                    <span className="text-muted-foreground">{log.reason}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Drawing CAD Revision History Table */}
      {activeTab === "DRAWING_REVISIONS" && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="p-3.5 whitespace-nowrap min-w-[260px]">Drawing Code & Discipline</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[160px]">Project</th>
                  <th className="p-3.5 text-center whitespace-nowrap min-w-[140px]">Version Delta</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[320px]">Change Summary & Remarks</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[180px]">Consultant Firm</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[140px]">Submission Date</th>
                  <th className="p-3.5 text-right whitespace-nowrap min-w-[110px]">File Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      No revision logs found matching current search.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 whitespace-nowrap min-w-[260px]">
                        <div>
                          <span className="font-mono font-bold text-foreground block text-xs whitespace-nowrap select-all">
                            {entry.drawingCode}
                          </span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap block mt-0.5">
                            {entry.drawingTitle}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap min-w-[160px]">
                        <span className="font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{entry.project}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap min-w-[140px]">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-500/20 whitespace-nowrap">
                          {entry.previousRevision && (
                            <>
                              <span className="text-muted-foreground">{entry.previousRevision}</span>
                              <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                            </>
                          )}
                          <span>{entry.revision}</span>
                        </div>
                      </td>
                      <td className="p-3.5 min-w-[320px] max-w-[440px]">
                        <p className="text-xs text-foreground font-medium leading-snug">
                          {entry.changeSummary}
                        </p>
                        {entry.certifiedGfcDate && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 mt-1 whitespace-nowrap">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>Certified GFC on {entry.certifiedGfcDate}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-medium text-foreground whitespace-nowrap min-w-[180px]">
                        {entry.consultant}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap min-w-[140px]">
                        {entry.submittedDate}
                      </td>
                      <td className="p-3.5 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap min-w-[110px]">
                        {entry.fileSize}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
