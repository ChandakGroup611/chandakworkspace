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
  Sparkles
} from "lucide-react";

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
  const [disciplineFilter, setDisciplineFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [previewDrawing, setPreviewDrawing] = useState<DrawingItem | null>(null);

  const disciplines = ["Architectural", "Structural", "MEP", "Landscape", "Interior"];

  const filteredDrawings = useMemo(() => {
    return drawings.filter(item => {
      if (disciplineFilter !== "ALL" && item.discipline !== disciplineFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
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
  }, [drawings, disciplineFilter, statusFilter, searchQuery]);

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

  const getDisciplineIcon = (disc: string) => {
    switch (disc) {
      case "Architectural": return "🏛️";
      case "Structural": return "🏗️";
      case "MEP": return "⚡";
      case "Landscape": return "🌿";
      case "Interior": return "🛋️";
      default: return "📄";
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
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/25">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground">
                  Drawing Sheet Master Register
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {filteredDrawings.length} Sheets
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Official CAD repository, revision history logs, and GFC certification transmittals
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search code, title, consultant..."
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

        {/* Filter Pills */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" />
              <span>Discipline:</span>
            </span>
            <button
              type="button"
              onClick={() => setDisciplineFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                disciplineFilter === "ALL" ? "bg-emerald-600 text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {disciplines.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDisciplineFilter(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  disciplineFilter === d ? "bg-emerald-600 text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-7 px-2 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Approved (GFC)">Approved (GFC)</option>
              <option value="Under Review">Under Review</option>
              <option value="Revision Requested">Revision Requested</option>
              <option value="Site Handed Over">Site Handed Over</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="p-3.5">Drawing Code & Discipline</th>
                <th className="p-3.5">Sheet Title & Description</th>
                <th className="p-3.5">Project</th>
                <th className="p-3.5 text-center">Revision</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Consultant</th>
                <th className="p-3.5">Dates</th>
                <th className="p-3.5 text-right">Actions</th>
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
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{getDisciplineIcon(item.discipline)}</span>
                        <div>
                          <span className="font-mono font-bold text-foreground block text-xs">
                            {item.code}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.discipline} • {item.fileSize}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 max-w-sm">
                      <div className="font-bold text-foreground leading-snug">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.project}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-slate-100 dark:bg-slate-800 border border-border text-foreground">
                        {item.revision}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${getStatusBadge(item.status)}`}>
                        {item.status === "Approved (GFC)" && <CheckCircle2 className="h-3 w-3" />}
                        {item.status === "Under Review" && <Clock className="h-3 w-3" />}
                        {item.status === "Revision Requested" && <AlertCircle className="h-3 w-3" />}
                        {item.status === "Site Handed Over" && <ShieldCheck className="h-3 w-3" />}
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-foreground font-medium truncate max-w-[160px]">
                      {item.consultant}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Sub:</span>
                        <span className="text-foreground">{item.submittedDate}</span>
                      </div>
                      {item.approvedDate && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <span>GFC:</span>
                          <span>{item.approvedDate}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDrawing(item)}
                          className="h-7 px-2.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Blueprint CAD Preview"
                        >
                          <Maximize2 className="h-3 w-3" />
                          <span>Blueprint</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenReviewModal(item)}
                          className="h-7 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-xs inline-flex items-center gap-1 transition-colors hover:bg-emerald-500/20 cursor-pointer"
                          title="Review / GFC Stamp"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Review</span>
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

