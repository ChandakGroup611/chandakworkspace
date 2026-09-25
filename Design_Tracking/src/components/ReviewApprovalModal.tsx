"use client";

import React, { useState, useEffect } from "react";
import { DrawingItem, DrawingStatus } from "../types";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  FileText, 
  Building2, 
  Tag, 
  Calendar,
  Save,
  Check,
  AlertTriangle
} from "lucide-react";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";

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

  useEffect(() => {
    if (drawing) {
      setSelectedStatus(drawing.status || "Under Review");
      setReviewComments("");
    }
  }, [drawing]);

  if (!isOpen || !drawing) return null;

  const handleSaveReview = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onStatusUpdated(drawing.id, selectedStatus);
      setSubmitting(false);
      onClose();
    }, 300);
  };

  const handleReset = () => {
    if (drawing) {
      setSelectedStatus(drawing.status || "Under Review");
      setReviewComments("");
    }
  };

  return (
    <TransactionFormLayout
      title={`Stage-Gate Review & GFC Stamping: ${drawing.code}`}
      badge={drawing.discipline}
      category="Drawing Control"
      icon={ShieldCheck}
      iconBg="bg-primary/15 text-primary border-primary/25"
      description={`Perform technical compliance review, record clash observations, and authorize GFC digital seal for ${drawing.project}.`}
      breadcrumbs={[
        { label: "Drawing Register", onClick: onClose },
        { label: `Stage-Gate Review: ${drawing.code}` }
      ]}
      onBack={onClose}
      backLabel="Back to Drawing Register"
      onReset={handleReset}
      onSave={handleSaveReview}
      saveLabel="Commit Review Decision"
      saveIcon={Save}
      isSubmitting={submitting}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Section 1: Drawing Sheet Specification Profile */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
            <AppCardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-theme-btn-primary" />
              <span>Drawing Sheet Dossier</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {drawing.discipline} Discipline Sheet
                </span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  {drawing.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-muted text-foreground font-bold border border-border">
                  Revision: {drawing.revision}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                  drawing.status === "Approved (GFC)" 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : drawing.status === "Revision Requested" 
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20" 
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}>
                  {drawing.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Project:</span>
                <span className="font-bold text-foreground">{drawing.project}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Consultant Author:</span>
                <span className="font-semibold text-foreground">{drawing.consultant}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Submission Date:</span>
                <span className="font-mono font-semibold text-foreground">{drawing.submittedDate}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">CAD File Size:</span>
                <span className="font-mono font-semibold text-foreground">{drawing.fileSize}</span>
              </div>
            </div>

            {drawing.description && (
              <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-border text-xs space-y-1">
                <span className="text-muted-foreground text-[11px] font-bold">Revision Summary:</span>
                <p className="text-foreground">{drawing.description}</p>
              </div>
            )}
          </AppCardContent>
        </AppCard>

        {/* Section 2: Stage-Gate Decision Matrix */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
            <AppCardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-theme-btn-primary" />
              <span>Review Decision & Certification Action</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                { 
                  id: "Approved (GFC)", 
                  label: "Approve (GFC)", 
                  desc: "Certify Good For Construction and authorize site release",
                  badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                },
                { 
                  id: "Revision Requested", 
                  label: "Request Revision", 
                  desc: "Markups / structural clashes require consultant rework",
                  badge: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                },
                { 
                  id: "Under Review", 
                  label: "Under Review", 
                  desc: "Internal design team audit and cross-check pending",
                  badge: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }
              ].map((st) => {
                const isSel = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatus(st.id as DrawingStatus)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSel 
                        ? `${st.badge} ring-2 ring-primary font-bold shadow-xs` 
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className="text-sm font-bold">{st.label}</div>
                    <div className="text-xs opacity-80 mt-1 font-normal">{st.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Reviewer Observations, Clash Notes & Redlines
              </label>
              <textarea
                rows={4}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Log design considerations, coordinate check notes, or site execution instructions..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {selectedStatus === "Approved (GFC)" && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <strong>GFC Release Authorization:</strong> Approving this revision will digitally seal this sheet as <strong>Good For Construction (GFC)</strong>, increment the certified drawings index, and authorize physical print issuance to the General Civil Contractor.
                </div>
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </div>
    </TransactionFormLayout>
  );
};
