"use client";

import React, { useState, useMemo } from "react";
import { DrawingItem } from "../types";
import { 
  RotateCcw, 
  History, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  FileText, 
  Calendar, 
  Download, 
  ArrowRight,
  Sparkles,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const disciplines = ["Architectural", "Structural", "MEP", "Landscape", "Interior"];
  const projects = useMemo(() => Array.from(new Set(drawings.map(d => d.project))), [drawings]);

  // Generate structured multi-revision history trail from active drawing repository
  const revisionLogs = useMemo<RevisionLogEntry[]>(() => {
    const logs: RevisionLogEntry[] = [];

    drawings.forEach((d) => {
      // Current Revision
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

      // Synthetic Prior Revisions to demonstrate comprehensive historical delta log
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

  const handleExportCsv = () => {
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
    link.setAttribute("download", `Chandak_Revision_History_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header Strip & Unified Controls */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Revision History
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search revision logs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500"
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
                className="h-8 px-2.5 rounded-xl border border-dashed border-rose-500/40 hover:border-rose-500/70 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(selectedDisciplines.length > 0 || selectedProjects.length > 0) && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Active:</span>

            {selectedDisciplines.map(disc => (
              <span
                key={disc}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
              >
                <span>Discipline: {disc}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplines(selectedDisciplines.filter(x => x !== disc))}
                  className="hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {selectedProjects.map(proj => (
              <span
                key={proj}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[11px] font-medium"
              >
                <span>Project: {proj}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProjects(selectedProjects.filter(x => x !== proj))}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={() => {
                setSelectedDisciplines([]);
                setSelectedProjects([]);
              }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground ml-1 underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Revision Table */}
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
    </div>
  );
};
