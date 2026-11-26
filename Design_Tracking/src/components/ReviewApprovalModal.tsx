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
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Drawing sheet dossier</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {drawing.discipline} Discipline sheet
                </span>
                <h2 className="text-base font-semibold text-foreground mt-0.5">
                  {drawing.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-sunken text-foreground font-semibold border border-border">
                  Revision: {drawing.revision}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                  drawing.status === "Approved (GFC)" 
                    ? "bg-success-soft text-success-text border-success-border" 
                    : drawing.status === "Revision Requested" 
                    ? "bg-danger-soft text-danger-text border-danger-border" 
                    : "bg-warning-soft text-warning-text border-warning-border"
                }`}>
                  {drawing.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Project:</span>
                <span className="font-semibold text-foreground">{drawing.project}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Consultant Author:</span>
                <span className="font-semibold text-foreground">{drawing.consultant}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Submission Date:</span>
                <span className="font-mono font-semibold text-foreground">{drawing.submittedDate}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">CAD file size:</span>
                <span className="font-mono font-semibold text-foreground">{drawing.fileSize}</span>
              </div>
            </div>

            {drawing.description && (
              <div className="p-3.5 rounded-lg bg-sunken border border-border text-xs space-y-1">
                <span className="text-muted-foreground text-[11px] font-semibold">Revision Summary:</span>
                <p className="text-foreground">{drawing.description}</p>
              </div>
            )}
          </AppCardContent>
        </AppCard>

        {/* Section 2: Stage-Gate Decision Matrix */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Review decision & certification action</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                { 
                  id: "Approved (GFC)", 
                  label: "Approve (GFC)", 
                  desc: "Certify Good For Construction and authorize site release",
                  badge: "border-success-border bg-success-soft text-success-text"
                },
                { 
                  id: "Revision Requested", 
                  label: "Request revision", 
                  desc: "Markups / structural clashes require consultant rework",
                  badge: "border-danger-border bg-danger-soft text-danger-text"
                },
                { 
                  id: "Under Review", 
                  label: "Under Review", 
                  desc: "Internal design team audit and cross-check pending",
                  badge: "border-warning-border bg-warning-soft text-warning-text"
                }
              ].map((st) => {
                const isSel = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatus(st.id as DrawingStatus)}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                      isSel 
                        ? `${st.badge} ring-2 ring-primary font-semibold shadow-xs` 
                        : "border-border bg-background text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <div className="text-sm font-semibold">{st.label}</div>
                    <div className="text-xs opacity-80 mt-1 font-normal">{st.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reviewer observations, clash notes & redlines
              </label>
              <textarea
                rows={4}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Log design considerations, coordinate cheque notes, or site execution instructions…"
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {selectedStatus === "Approved (GFC)" && (
              <div className="p-4 rounded-lg border border-success-border bg-success-soft flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success-text shrink-0 mt-0.5" />
                <div className="text-xs text-success-text leading-relaxed">
                  <strong>GFC release authorization:</strong> Approving this revision will digitally seal this sheet as <strong>Good for construction (GFC)</strong>, increment the certified drawings index, and authorise physical print issuance to the General Civil Contractor.
                </div>
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </div>
    </TransactionFormLayout>
  );
};
