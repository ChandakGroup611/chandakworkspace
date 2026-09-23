"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DrawingItem, DrawingStatus } from "../types";
import { X, CheckCircle2, AlertCircle, Clock, ShieldCheck, Download, FileText } from "lucide-react";

interface ReviewApprovalModalProps {
  drawing: DrawingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (drawingId: string, status: DrawingStatus) => void;
}

export const ReviewApprovalModal: React.FC<ReviewApprovalModalProps> = ({
  drawing,
  isOpen,
  onClose,
  onStatusUpdated
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DrawingStatus>(drawing?.status || "Under Review");
  const [reviewComments, setReviewComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (drawing) {
      setSelectedStatus(drawing.status || "Under Review");
      setReviewComments("");
    }
  }, [drawing]);

  if (!isOpen || !drawing || !mounted) return null;

  const handleSaveReview = () => {
    setSubmitting(true);
    setTimeout(() => {
      onStatusUpdated(drawing.id, selectedStatus);
      setSubmitting(false);
      onClose();
    }, 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 sm:p-5 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">Stage-Gate Review & GFC Stamp</h3>
              <p className="text-xs text-muted-foreground">{drawing.code} • {drawing.project}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs custom-scrollbar">
          {/* Drawing Profile Card */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {drawing.discipline} Discipline Sheet
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground font-bold border border-border">
                Revision: {drawing.revision}
              </span>
            </div>
            <div className="text-sm font-bold text-foreground leading-snug">
              {drawing.title}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border text-[11px]">
              <div>
                <span className="text-muted-foreground block">Consultant:</span>
                <span className="font-semibold text-foreground">{drawing.consultant}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Submitted Date:</span>
                <span className="font-mono font-semibold text-foreground">{drawing.submittedDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">File Size:</span>
                <span className="font-mono font-semibold text-foreground">{drawing.fileSize}</span>
              </div>
            </div>
          </div>

          {/* Decision Selector */}
          <div>
            <label className="font-bold block mb-2 text-foreground">
              Review Decision / Certification Action:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { 
                  id: "Approved (GFC)", 
                  label: "Approve (GFC)", 
                  desc: "Certify Good For Construction",
                  badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                },
                { 
                  id: "Revision Requested", 
                  label: "Request Revision", 
                  desc: "Markups / clashes require rework",
                  badge: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                },
                { 
                  id: "Under Review", 
                  label: "Under Review", 
                  desc: "Internal design team check pending",
                  badge: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }
              ].map((st) => {
                const isSel = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatus(st.id as DrawingStatus)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSel ? `${st.badge} ring-2 ring-primary font-bold shadow-xs` : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className="text-xs">{st.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 font-normal">{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comments and Observations */}
          <div>
            <label className="font-semibold block mb-1 text-foreground">
              Reviewer Observations & Clashes Detected
            </label>
            <textarea
              rows={3}
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {selectedStatus === "Approved (GFC)" && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                <strong>GFC Release Authorization:</strong> Approving this revision will digitally seal this sheet as <strong>Good For Construction</strong> and authorize physical print release to the site contractor.
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveReview}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
          >
            {submitting ? "Saving..." : "Commit Review Decision"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
