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
import { formatDate } from "@/components/ui/data";

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

  const disciplines = useMemo(() => {
    const fromMasters = (DesignMasterStore.getState().disciplines || []).map(d => d.name);
    const fromDrawings = drawings.map(d => d.discipline);
    return Array.from(new Set([...fromMasters, ...fromDrawings])).filter(Boolean);
  }, [drawings]);
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
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-danger-soft text-danger-text border border-danger-border inline-flex items-center gap-1 shadow-2xs">
            <AlertTriangle className="h-3 w-3 text-danger-text" />
            <span>Cascade delete</span>
          </span>
        );
      case "DELETE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-danger-soft text-danger-text border border-danger-border inline-flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-danger-text" />
            <span>Delete</span>
          </span>
        );
      case "UPDATE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-info-soft text-info-text border border-info-border inline-flex items-center gap-1">
            <Edit2 className="h-3 w-3 text-info-text" />
            <span>Update</span>
          </span>
        );
      case "CREATE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-success-soft text-success-text border border-success-border inline-flex items-center gap-1">
            <Plus className="h-3 w-3 text-success-text" />
            <span>Create</span>
          </span>
        );
      case "STATUS_CHANGE":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-surface text-accent-soft-text dark:text-muted-foreground border border-border inline-flex items-center gap-1">
            <Layers className="h-3 w-3 text-accent-soft-text" />
            <span>Status change</span>
          </span>
        );
    }
  };

  const getEntityTypeBadge = (entityType?: string) => {
    switch (entityType) {
      case "PROJECT":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-sunken text-foreground border border-border">Master project</span>;
      case "SUB_PROJECT":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-warning-soft text-warning-text border border-warning-border">Sub-Project</span>;
      case "TOWER":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-info-soft text-info-text border border-info-border">Tower / wing</span>;
      case "PACKAGE":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-success-soft text-success-text border border-success-border">Work package</span>;
      case "CONSULTANT":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-surface text-foreground dark:text-muted-foreground border border-border">Consultant</span>;
      case "AUTHORITY":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-surface text-foreground dark:text-muted-foreground border border-border">Authority</span>;
      case "MATRIX_CELL":
      default:
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-sunken text-muted-foreground border border-border">Matrix cell</span>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header & Tab Switcher Strip */}
      <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-surface text-accent-soft-text dark:text-muted-foreground flex items-center justify-center border border-border shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Revision history & audit logs
              </h2>
            </div>
          </div>

          {/* Sub-Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("AUDIT_TRAIL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "AUDIT_TRAIL"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Master & transaction audit ({auditLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("DRAWING_REVISIONS")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "DRAWING_REVISIONS"
                  ? "bg-info text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Drawing revisions ({revisionLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Master & Transaction Audit Logs */}
        {activeTab === "AUDIT_TRAIL" && (
          <div className="space-y-4 pt-1">
            {/* Fast Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-[11px] font-semibold text-muted-foreground block">Total audit events</span>
                <span className="text-lg font-semibold text-foreground font-mono">{auditStats.total}</span>
              </div>
              <div className="p-3 rounded-lg bg-danger-soft border border-danger-border">
                <span className="text-[11px] font-semibold text-danger-text block">Deletions & cascades</span>
                <span className="text-lg font-semibold text-danger-text font-mono">{auditStats.deletes}</span>
              </div>
              <div className="p-3 rounded-lg bg-info-soft border border-info-border">
                <span className="text-[11px] font-semibold text-info-text block">Master updates</span>
                <span className="text-lg font-semibold text-info-text font-mono">{auditStats.updates}</span>
              </div>
              <div className="p-3 rounded-lg bg-success-soft border border-success-border">
                <span className="text-[11px] font-semibold text-success-text block">Status / matrix fills</span>
                <span className="text-lg font-semibold text-success-text font-mono">{auditStats.statusChanges + auditStats.creates}</span>
              </div>
            </div>

            {/* Audit Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search audit trail by entity, project, operator, or remarks…"
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Action Filter */}
              <select
                value={selectedActionFilter}
                onChange={e => setSelectedActionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">All actions</option>
                <option value="CASCADE_DELETE">Cascade delete</option>
                <option value="DELETE">Deleted</option>
                <option value="UPDATE">Updated</option>
                <option value="CREATE">Created</option>
                <option value="STATUS_CHANGE">Status changed</option>
              </select>

              {/* Entity Type Filter */}
              <select
                value={selectedEntityTypeFilter}
                onChange={e => setSelectedEntityTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">All entity types</option>
                <option value="PROJECT">Master project</option>
                <option value="SUB_PROJECT">Sub-project / phase</option>
                <option value="TOWER">Tower / wing</option>
                <option value="PACKAGE">Work package</option>
                <option value="CONSULTANT">Consultant partner</option>
                <option value="AUTHORITY">Statutory authority</option>
                <option value="MATRIX_CELL">Matrix cell</option>
              </select>

              {/* Project Filter */}
              <select
                value={selectedAuditProject}
                onChange={e => setSelectedAuditProject(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">All projects</option>
                {masterProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.isSubProject ? `${p.name}` : `${p.name}`}</option>
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
                  className="px-3 py-1.5 rounded-lg border border-danger-border text-danger-text hover:bg-danger-soft text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all ml-auto"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export audit CSV</span>
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
                placeholder="Search drawings by code, title, consultant…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-info-border"
              />
            </div>

            <DesignMultiSelectDropdown
              label="Discipline"
              options={disciplineFilterOptions}
              selectedValues={selectedDisciplines}
              onChange={setSelectedDisciplines}
              colorTheme="emerald"
              placeholder="All disciplines"
            />

            <DesignMultiSelectDropdown
              label="Project"
              options={projectFilterOptions}
              selectedValues={selectedProjects}
              onChange={setSelectedProjects}
              colorTheme="blue"
              placeholder="All projects"
            />

            {(selectedDisciplines.length > 0 || selectedProjects.length > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDisciplines([]);
                  setSelectedProjects([]);
                  setSearchQuery("");
                }}
                className="h-8 px-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportDrawingCsv}
              className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ml-auto"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-info-text" />
              <span>Export drawing CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* View 1: Master & Transaction Audit Logs Table */}
      {activeTab === "AUDIT_TRAIL" && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-sunken border-b border-border text-[11px] text-muted-foreground font-semibold">
                  <th className="p-3.5 whitespace-nowrap min-w-[160px]">Timestamp & operator</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[130px]">Action</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[200px]">Target entity</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[240px]">Foreign key context</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[240px]">Impact & cascade summary</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[200px]">Remarks / reason</th>
                  <th className="p-3.5 text-right whitespace-nowrap min-w-[80px]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="space-y-1.5">
                        <History className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <p className="font-semibold text-xs">No audit trail events found</p>
                        
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-sunken transition-colors">
                          {/* Timestamp & Operator */}
                          <td className="p-3.5 whitespace-nowrap min-w-[160px]">
                            <div>
                              <span className="font-mono text-[11px] font-semibold text-foreground block">
                                {formatDate(log.timestamp)}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground block">
                                {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                              <span className="text-[11px] font-semibold text-accent-soft-text dark:text-muted-foreground block mt-0.5">
                                {log.changedBy || "Design Manager"}
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
                              <span className="font-semibold text-foreground block text-xs truncate max-w-[220px]">
                                {log.entityName || log.packageName || log.projectName || log.entryKey || "Transaction Record"}
                              </span>
                            </div>
                          </td>

                          {/* Foreign Key Context */}
                          <td className="p-3.5 whitespace-nowrap min-w-[240px]">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {log.projectName && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] bg-info-soft text-info-text border border-info-border font-medium truncate max-w-[130px]">
                                  {log.projectName}
                                </span>
                              )}
                              {log.towerName && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] bg-sunken text-foreground border border-border font-medium">
                                  {log.towerName}
                                </span>
                              )}
                              {log.packageName && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] bg-success-soft text-success-text border border-success-border font-medium truncate max-w-[130px]">
                                  {log.packageName}
                                </span>
                              )}
                              {log.consultantName && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] bg-surface text-foreground dark:text-muted-foreground border border-border font-medium truncate max-w-[130px]">
                                  {log.consultantName}
                                </span>
                              )}
                              {!log.projectName && !log.towerName && !log.packageName && !log.consultantName && (
                                <span className="text-[11px] text-muted-foreground italic">— Standalone —</span>
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
                                  <span key={idx} className="px-1.5 py-0.2 rounded text-[11px] bg-warning-soft text-warning-text font-mono">
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
                              className="px-2 py-1 rounded-lg border border-border hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
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
                              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2.5">
                                <div className="flex items-center justify-between border-b border-border pb-2">
                                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-accent-soft-text" />
                                    <span>Audit snapshot & foreign key relationship inspection</span>
                                  </span>
                                  <span className="font-mono text-[11px] text-muted-foreground">ID: {log.id}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* Previous State Snapshot */}
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-danger-text block">
                                      Previous state snapshot (before change):
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-sunken border border-border text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 custom-scrollbar">
                                      {log.previousValue 
                                        ? JSON.stringify(log.previousValue, null, 2) 
                                        : (log.previousStatus ? `Status: ${log.previousStatus}\nPlanned Date: ${log.previousPlannedDate || "—"}\nActual Date: ${log.previousActualDate || "—"}` : "None / Initial State")}
                                    </pre>
                                  </div>

                                  {/* New State Snapshot */}
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-success-text block">
                                      New state snapshot (after change):
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-sunken border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-48 custom-scrollbar">
                                      {log.newValue 
                                        ? JSON.stringify(log.newValue, null, 2) 
                                        : (log.action === "DELETE" || log.action === "CASCADE_DELETE" ? "DELETED (Purged from active dataset)" : `Status: ${log.newStatus || "—"}\nPlanned Date: ${log.newPlannedDate || "—"}\nActual Date: ${log.newActualDate || "—"}`)}
                                    </pre>
                                  </div>
                                </div>

                                {log.reason && (
                                  <div className="pt-2 border-t border-border flex items-center gap-2 text-xs">
                                    <span className="font-semibold text-foreground">Deletion / change reason:</span>
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
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
              <thead>
                <tr className="bg-sunken border-b border-border text-[11px] text-muted-foreground font-semibold">
                  <th className="p-3.5 whitespace-nowrap min-w-[260px]">Drawing code & discipline</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[160px]">Project</th>
                  <th className="p-3.5 text-center whitespace-nowrap min-w-[140px]">Version delta</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[320px]">Change summary & remarks</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[180px]">Consultant firm</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[140px]">Submission date</th>
                  <th className="p-3.5 text-right whitespace-nowrap min-w-[110px]">File size</th>
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
                    <tr key={entry.id} className="hover:bg-sunken transition-colors">
                      <td className="p-3.5 whitespace-nowrap min-w-[260px]">
                        <div>
                          <span className="font-mono font-semibold text-foreground block text-xs whitespace-nowrap select-all">
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
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-info-soft text-info-text font-mono font-semibold text-xs border border-info-border whitespace-nowrap">
                          {entry.previousRevision && (
                            <>
                              <span className="text-muted-foreground">{entry.previousRevision}</span>
                              <ArrowRight className="h-3 w-3 text-info-text shrink-0" />
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
                          <span className="text-[11px] text-success-text font-semibold inline-flex items-center gap-1 mt-1 whitespace-nowrap">
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
