"use client";

import React from "react";
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
  Calendar
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
  const getStatusBadge = (status: DrawingStatus) => {
    switch (status) {
      case "Approved (GFC)":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Under Review":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Revision Requested":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "Site Handed Over":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
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

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
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
            {drawings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  No drawing sheets match the selected filter.
                </td>
              </tr>
            ) : (
              drawings.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getDisciplineIcon(item.discipline)}</span>
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
                    <div className="font-semibold text-foreground leading-snug">
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
                      <Building className="h-3 w-3 text-muted-foreground" />
                      <span>{item.project}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 border border-border text-foreground">
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
                        onClick={() => onOpenReviewModal(item)}
                        className="h-7 px-2.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                        title="Review / GFC Stamp"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Review</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`Downloading CAD Drawing Sheet: ${item.code}.dwg`)}
                        className="h-7 w-7 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
                        title="Download DWG / PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
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
  );
};
