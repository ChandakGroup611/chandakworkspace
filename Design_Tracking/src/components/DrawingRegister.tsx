"use client";

import React, { useState, useMemo } from "react";
import { DrawingItem, DrawingStatus } from "../types";
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building, 
  ShieldCheck,
  Calendar,
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
  Printer,
  Compass,
  Maximize2,
  Sparkles,
  Trash2
} from "lucide-react";
import { DesignMasterStore } from "../services/designMasterStore";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";

interface DrawingRegisterProps {
  drawings: DrawingItem[];
  onOpenReviewModal: (drawing: DrawingItem) => void;
  onOpenUploadModal: () => void;
}

export const DrawingRegister: React.FC<DrawingRegisterProps> = ({
  drawings,
  onOpenReviewModal,
  onOpenUploadModal
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDisciplineFilters, setSelectedDisciplineFilters] = useState<string[]>([]);
  const [selectedProjectFilters, setSelectedProjectFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [previewDrawing, setPreviewDrawing] = useState<DrawingItem | null>(null);

  const disciplines = ["Architectural", "Structural", "MEP", "Landscape", "Interior"];
  const uniqueProjects = useMemo(() => Array.from(new Set(drawings.map(d => d.project))), [drawings]);

  const filteredDrawings = useMemo(() => {
    return drawings.filter(item => {
      if (selectedDisciplineFilters.length > 0 && !selectedDisciplineFilters.includes(item.discipline)) return false;
      if (selectedProjectFilters.length > 0 && !selectedProjectFilters.includes(item.project)) return false;
      if (selectedStatusFilters.length > 0 && !selectedStatusFilters.includes(item.status)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.code.toLowerCase().includes(q) || 
          item.title.toLowerCase().includes(q) || 
          item.project.toLowerCase().includes(q) || 
          item.consultant.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [drawings, selectedDisciplineFilters, selectedProjectFilters, selectedStatusFilters, searchQuery]);

  // Dropdown options
  const disciplineOptions = useMemo<DropdownOption[]>(() => {
    return disciplines.map(d => {
      const cnt = drawings.filter(item => item.discipline === d).length;
      return {
        value: d,
        label: d,
        count: cnt,
        subtitle: `${cnt} drawing sheet${cnt === 1 ? "" : "s"}`
      };
    });
  }, [disciplines, drawings]);

  const projectOptions = useMemo<DropdownOption[]>(() => {
    return uniqueProjects.map(p => {
      const cnt = drawings.filter(item => item.project === p).length;
      return {
        value: p,
        label: p,
        count: cnt,
        subtitle: `${cnt} sheet${cnt === 1 ? "" : "s"}`
      };
    });
  }, [uniqueProjects, drawings]);

  const statusOptions = useMemo<DropdownOption[]>(() => {
    return [
      {
        value: "Approved (GFC)",
        label: "Approved (GFC)",
        count: drawings.filter(d => d.status === "Approved (GFC)").length,
        colorDot: "#10b981",
        subtitle: "Issued for site construction"
      },
      {
        value: "Under Review",
        label: "Under Review",
        count: drawings.filter(d => d.status === "Under Review").length,
        colorDot: "#f59e0b",
        subtitle: "Awaiting engineering review"
      },
      {
        value: "Revision Requested",
        label: "Revision Requested",
        count: drawings.filter(d => d.status === "Revision Requested").length,
        colorDot: "#f43f5e",
        subtitle: "Consultant action pending"
      },
      {
        value: "Site Handed Over",
        label: "Site Handed Over",
        count: drawings.filter(d => d.status === "Site Handed Over").length,
        colorDot: "#0ea5e9",
        subtitle: "Civil team acknowledged"
      }
    ];
  }, [drawings]);

  const totalActiveFilterCount =
    selectedDisciplineFilters.length +
    selectedProjectFilters.length +
    selectedStatusFilters.length;

  const handleClearAllFilters = () => {
    setSelectedDisciplineFilters([]);
    setSelectedProjectFilters([]);
    setSelectedStatusFilters([]);
    setSearchQuery("");
  };

  const getStatusBadge = (status: DrawingStatus) => {
    switch (status) {
      case "Approved (GFC)":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "Under Review":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "Revision Requested":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "Site Handed Over":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    }
  };

  const getDisciplineBadge = (disc: string) => {
    switch (disc) {
      case "Architectural": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Structural": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "MEP": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Landscape": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Interior": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default: return "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border";
    }
  };

  const handleExportCsv = () => {
    const headers = ["Drawing Code", "Discipline", "Sheet Title", "Project", "Revision", "Status", "Consultant Firm", "Submission Date", "GFC Release Date"];
    const rows = filteredDrawings.map(d => [
      `"${d.code}"`,
      `"${d.discipline}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.project}"`,
      `"${d.revision}"`,
      `"${d.status}"`,
      `"${d.consultant.replace(/"/g, '""')}"`,
      `"${d.submittedDate}"`,
      `"${d.approvedDate || "PENDING"}"`
    ].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chandak_Drawing_Register_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Control Header Strip */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Drawing Register
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Multi-Selection Dropdowns Filter Row */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 1. Discipline Dropdown */}
            <DesignMultiSelectDropdown
              label="Discipline"
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              options={disciplineOptions}
              selectedValues={selectedDisciplineFilters}
              onChange={setSelectedDisciplineFilters}
              colorTheme="emerald"
              placeholder={`All Disciplines (${disciplines.length})`}
              searchPlaceholder="Search discipline..."
            />

            {/* 2. Projects Dropdown */}
            <DesignMultiSelectDropdown
              label="Projects"
              icon={<Building className="h-3.5 w-3.5" />}
              options={projectOptions}
              selectedValues={selectedProjectFilters}
              onChange={setSelectedProjectFilters}
              colorTheme="blue"
              placeholder={`All Projects (${uniqueProjects.length})`}
              searchPlaceholder="Search project..."
            />

            {/* 3. Status Dropdown */}
            <DesignMultiSelectDropdown
              label="Status"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              options={statusOptions}
              selectedValues={selectedStatusFilters}
              onChange={setSelectedStatusFilters}
              colorTheme="amber"
              placeholder="All Statuses"
              searchPlaceholder="Filter status..."
              showSearch={false}
            />

            {/* Clear All Filters Button */}
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Reset all active filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters ({totalActiveFilterCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-xs">
            <span>Showing <strong className="text-foreground">{filteredDrawings.length}</strong> of {drawings.length} sheets</span>
          </div>
        </div>

        {/* 🏷️ Active Selected Filter Badges */}
        {totalActiveFilterCount > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1 shrink-0">
              Active Filters:
            </span>

            {/* Discipline Badges */}
            {selectedDisciplineFilters.map(d => (
              <span
                key={`disc-${d}`}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <SlidersHorizontal className="h-2.5 w-2.5" />
                <span>{d}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplineFilters(prev => prev.filter(x => x !== d))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Project Badges */}
            {selectedProjectFilters.map(p => (
              <span
                key={`proj-${p}`}
                className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Building className="h-2.5 w-2.5" />
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProjectFilters(prev => prev.filter(x => x !== p))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Status Badges */}
            {selectedStatusFilters.map(st => (
              <span
                key={`st-${st}`}
                className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>{st}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilters(prev => prev.filter(x => x !== st))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

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

      {/* Table with Horizontal Scroll Container */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="p-3.5 whitespace-nowrap min-w-[260px]">Drawing Code & Discipline</th>
                <th className="p-3.5 whitespace-nowrap min-w-[320px]">Sheet Title & Description</th>
                <th className="p-3.5 whitespace-nowrap min-w-[160px]">Project</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[90px]">Revision</th>
                <th className="p-3.5 whitespace-nowrap min-w-[170px]">Status</th>
                <th className="p-3.5 whitespace-nowrap min-w-[200px]">Consultant</th>
                <th className="p-3.5 whitespace-nowrap min-w-[160px]">Dates</th>
                <th className="p-3.5 text-right whitespace-nowrap min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredDrawings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground">
                    No drawing sheets match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredDrawings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 whitespace-nowrap min-w-[260px]">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0 ${getDisciplineBadge(item.discipline)}`}>
                          {item.discipline}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-foreground block text-xs whitespace-nowrap select-all tracking-tight">
                            {item.code}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap block mt-0.5">
                            {item.fileSize}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 min-w-[320px] max-w-[420px]">
                      <div className="font-semibold text-foreground leading-snug">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap min-w-[160px]">
                      <span className="font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{item.project}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap min-w-[90px]">
                      <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 border border-border text-foreground inline-block whitespace-nowrap">
                        {item.revision}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap min-w-[170px]">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 whitespace-nowrap ${getStatusBadge(item.status)}`}>
                        {item.status === "Approved (GFC)" && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                        {item.status === "Under Review" && <Clock className="h-3 w-3 shrink-0" />}
                        {item.status === "Revision Requested" && <AlertCircle className="h-3 w-3 shrink-0" />}
                        {item.status === "Site Handed Over" && <ShieldCheck className="h-3 w-3 shrink-0" />}
                        <span className="whitespace-nowrap">{item.status}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-foreground font-medium whitespace-nowrap min-w-[200px]">
                      {item.consultant}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap min-w-[160px]">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-muted-foreground/80">Sub:</span>
                        <span className="text-foreground">{item.submittedDate}</span>
                      </div>
                      {item.approvedDate && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap mt-0.5">
                          <span>GFC:</span>
                          <span>{item.approvedDate}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap min-w-[180px]">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewDrawing(item)}
                          className="h-7 px-2.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          title="Blueprint CAD Preview"
                        >
                          <Maximize2 className="h-3 w-3 shrink-0" />
                          <span>Blueprint</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenReviewModal(item)}
                          className="h-7 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-xs inline-flex items-center gap-1 transition-colors hover:bg-emerald-500/20 cursor-pointer whitespace-nowrap"
                          title="Review / GFC Stamp"
                        >
                          <Eye className="h-3 w-3 shrink-0" />
                          <span>Review</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete drawing ${item.code} from register?`)) {
                              DesignMasterStore.deleteDrawing(item.id);
                            }
                          }}
                          className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete drawing"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blueprint CAD Sheet Preview Modal */}
      {previewDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  <span>CAD Architectural Blueprint Inspection</span>
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {previewDrawing.code}: {previewDrawing.title}
                </h4>
                <p className="text-xs text-slate-400">
                  {previewDrawing.project} • {previewDrawing.discipline} • Revision {previewDrawing.revision}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDrawing(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CAD Blueprint Canvas Simulation */}
            <div className="h-80 w-full rounded-xl bg-slate-900 border border-cyan-500/30 relative overflow-hidden flex flex-col justify-between p-4 font-mono select-none"
              style={{
                backgroundImage: "radial-gradient(#0ea5e9 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }}
            >
              {/* Engineering Coordinate Grid Markers */}
              <div className="flex items-center justify-between text-[10px] text-cyan-500/60">
                <span>GRID: A1-F8 | SCALE: 1:100</span>
                <span>CHANDAK DESIGN & ENGINEERING COCKPIT</span>
              </div>

              {/* Center Wireframe Graphics simulation */}
              <div className="flex flex-col items-center justify-center space-y-2 opacity-80">
                <div className="w-56 h-36 border-2 border-dashed border-cyan-400/50 rounded-lg flex items-center justify-center relative">
                  <div className="w-44 h-24 border border-cyan-300/40 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-cyan-300 tracking-wider">
                      {previewDrawing.title}
                    </span>
                  </div>
                  <div className="absolute -top-3 bg-slate-950 px-2 text-[10px] text-cyan-400 font-bold border border-cyan-500/40 rounded">
                    SECTION X-X' ELEVATION
                  </div>
                </div>
              </div>

              {/* Title Block Bottom Right */}
              <div className="flex items-end justify-between">
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div>AUTHOR: <strong className="text-white">{previewDrawing.consultant}</strong></div>
                  <div>SHEET NO: <strong className="text-white">{previewDrawing.code}</strong></div>
                  <div>STATUS: <strong className="text-emerald-400">{previewDrawing.status}</strong></div>
                </div>

                {previewDrawing.status === "Approved (GFC)" && (
                  <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-950/60 text-emerald-400 text-center uppercase font-black text-xs tracking-widest shadow-lg rotate-[-5deg]">
                    ✓ GOOD FOR CONSTRUCTION
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Blueprint</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDrawing(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

