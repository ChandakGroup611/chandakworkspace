"use client";

import React, { useState } from "react";
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
  const [selectedStatus, setSelectedStatus] = useState<DrawingStatus>(drawing?.status || "Under Review");
  const [reviewComments, setReviewComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !drawing) return null;

  const handleSaveReview = () => {
    setSubmitting(true);
    setTimeout(() => {
      onStatusUpdated(drawing.id, selectedStatus);
      setSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Stage-Gate Review & GFC Stamp</h3>
              <p className="text-xs text-muted-foreground">{drawing.code} • {drawing.project}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Drawing Profile Card */}
          <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {drawing.discipline} Discipline Sheet
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold">
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
                      isSel ? `${st.badge} ring-2 ring-primary font-bold shadow-xs` : "border-border bg-surface text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
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
              placeholder="e.g. Verified against architectural grid lines. MEP duct passing clearance approved at 2.4m clear height."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
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

        <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveReview}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? "Saving..." : "Commit Review Decision"}
          </button>
        </div>
      </div>
    </div>
  );
};
