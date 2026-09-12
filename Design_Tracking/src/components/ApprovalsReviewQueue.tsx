"use client";

import React, { useState, useMemo } from "react";
import { DrawingItem, DrawingStatus } from "../types";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  FileCheck, 
  ShieldCheck, 
  Search, 
  Building2, 
  SlidersHorizontal,
  Sparkles,
  Download,
  Stamp,
  MessageSquare
} from "lucide-react";

interface ApprovalsReviewQueueProps {
  drawings: DrawingItem[];
  onOpenReviewModal: (drawing: DrawingItem) => void;
  onQuickStatusUpdate: (drawingId: string, status: DrawingStatus) => void;
}

export const ApprovalsReviewQueue: React.FC<ApprovalsReviewQueueProps> = ({
  drawings,
  onOpenReviewModal,
  onQuickStatusUpdate
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("ALL");

  const disciplines = ["Architectural", "Structural", "MEP", "Landscape", "Interior"];

  const filteredDrawings = useMemo(() => {
    return drawings.filter(d => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (disciplineFilter !== "ALL" && d.discipline !== disciplineFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.code.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.project.toLowerCase().includes(q) ||
          d.consultant.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [drawings, statusFilter, disciplineFilter, searchQuery]);

  const underReviewCount = drawings.filter(d => d.status === "Under Review").length;
  const revisionReqCount = drawings.filter(d => d.status === "Revision Requested").length;
  const approvedGfcCount = drawings.filter(d => d.status === "Approved (GFC)").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Under Active Review</span>
            <h3 className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{underReviewCount}</h3>
            <span className="text-[10px] text-muted-foreground">Pending lead architect sign-off</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Revisions Requested</span>
            <h3 className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{revisionReqCount}</h3>
            <span className="text-[10px] text-muted-foreground">Sent back to consultant with remarks</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">GFC Certified & Approved</span>
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{approvedGfcCount}</h3>
            <span className="text-[10px] text-muted-foreground">Stamped for site execution</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-500" />
              <span>Drawing Quality Review & Certification Queue</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review CAD submissions, perform clash verification, and issue Good-for-Construction (GFC) certification
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search drawings or consultants..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface text-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Status:</span>
            {["ALL", "Under Review", "Revision Requested", "Approved (GFC)"].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL" ? "All Queue" : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">Discipline:</span>
            <select
              value={disciplineFilter}
              onChange={e => setDisciplineFilter(e.target.value)}
              className="h-7 px-2 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Disciplines</option>
              {disciplines.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Review Queue Cards */}
      <div className="space-y-3">
        {filteredDrawings.length === 0 ? (
          <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
            No drawing sheets found matching the current review filter.
          </div>
        ) : (
          filteredDrawings.map((drawing) => (
            <div 
              key={drawing.id} 
              className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs hover:border-emerald-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-border">
                    {drawing.code}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                    {drawing.discipline}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Rev {drawing.revision}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    drawing.status === "Approved (GFC)" 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : drawing.status === "Under Review"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  }`}>
                    {drawing.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-foreground">
                  {drawing.title}
                </h4>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{drawing.project}</span>
                  </span>
                  <span>Consultant: <strong className="text-foreground">{drawing.consultant}</strong></span>
                  <span>Submitted: <strong className="text-foreground font-mono">{drawing.submittedDate}</strong></span>
                  {drawing.approvedDate && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      GFC Date: {drawing.approvedDate}
                    </span>
                  )}
                </div>

                {drawing.description && (
                  <p className="text-xs text-muted-foreground italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-border/50">
                    "{drawing.description}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => onOpenReviewModal(drawing)}
                  className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Review & Certify</span>
                </button>

                {drawing.status !== "Approved (GFC)" && (
                  <button
                    type="button"
                    onClick={() => onQuickStatusUpdate(drawing.id, "Approved (GFC)")}
                    className="h-8 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                    title="Directly Stamp as GFC Approved"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Stamp GFC</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
