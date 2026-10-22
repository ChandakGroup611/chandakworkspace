"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  Building, 
  Building2, 
  Package, 
  Users, 
  ShieldCheck, 
  FileText, 
  ArrowRight,
  Info,
  Tag
} from "lucide-react";
import { EntityDependencyReport } from "../types/masterTypes";

export interface DeleteDependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependencyReport?: EntityDependencyReport | null;
  report?: EntityDependencyReport | null;
  onConfirmDelete: (reason: string) => void;
  isSubmitting?: boolean;
}

export const DeleteDependencyModal: React.FC<DeleteDependencyModalProps> = ({
  isOpen,
  onClose,
  dependencyReport,
  report,
  onConfirmDelete,
  isSubmitting = false
}) => {
  const [mounted, setMounted] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const activeReport = dependencyReport || report;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !activeReport || !mounted) return null;

  const { entityType, entityName, totalDependentRecords, dependencies, isReferencedByOtherRecords } = activeReport;

  const getEntityIcon = () => {
    switch (entityType) {
      case "PROJECT":
        return <Building2 className="h-5 w-5 text-danger-text" />;
      case "SUB_PROJECT":
        return <Building className="h-5 w-5 text-warning-text" />;
      case "TOWER":
        return <Layers className="h-5 w-5 text-info-text" />;
      case "PACKAGE":
        return <Package className="h-5 w-5 text-success-text" />;
      case "CONSULTANT":
        return <Users className="h-5 w-5 text-accent-soft-text dark:text-muted-foreground" />;
      case "AUTHORITY":
        return <ShieldCheck className="h-5 w-5 text-accent-soft-text dark:text-muted-foreground" />;
      case "CATEGORY":
        return <Tag className="h-5 w-5 text-accent-soft-text dark:text-muted-foreground" />;
      default:
        return <Trash2 className="h-5 w-5 text-danger-text" />;
    }
  };

  const getEntityBadgeLabel = () => {
    switch (entityType) {
      case "PROJECT":
        return "Master Project";
      case "SUB_PROJECT":
        return "Sub-Project / Phase";
      case "TOWER":
        return "Tower / Wing";
      case "PACKAGE":
        return "Work Package";
      case "CONSULTANT":
        return "Consultant Partner";
      case "AUTHORITY":
        return "Statutory Authority";
      case "CATEGORY":
        return "Category / Discipline";
      default:
        return entityType;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmDelete(deleteReason.trim());
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-200 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg rounded-lg bg-surface border border-border shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-danger-soft shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-danger-soft border border-danger-border flex items-center justify-center shrink-0">
              {getEntityIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-danger-soft text-danger-text border border-danger-border">
                  Foreign key referential cheque
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {getEntityBadgeLabel()}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground truncate mt-0.5">
                Delete &ldquo;{entityName}&rdquo;
              </h3>
            </div>
          </div>

          <button aria-label="Close"
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Foreign Key Dependency Analysis Card */}
          {isReferencedByOtherRecords ? (
            <div className="p-3.5 rounded-lg bg-warning-soft border border-warning-border text-warning-text space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-text shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">
                    Foreign key dependency alert: {totalDependentRecords} Dependent record{totalDependentRecords > 1 ? "s" : ""} Attached
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    This entity is currently referenced as a foreign key across multiple transaction and master records. Deleting it will trigger a safe cascade cleanup to prevent orphaned data.
                  </p>
                </div>
              </div>

              {/* Dependency Breakdown Table */}
              <div className="space-y-1.5 pt-1 border-t border-warning-border">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Referencing foreign key entities:
                </span>
                <div className="space-y-1">
                  {dependencies.map((dep, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface/80 border border-warning-border text-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                        <span className="font-semibold text-xs truncate">
                          {dep.referencedEntityType}
                        </span>
                        {dep.previewItems.length > 0 && (
                          <span className="text-[11px] text-muted-foreground hidden sm:inline truncate max-w-[140px]">
                            ({dep.previewItems.join(", ")})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-warning-soft text-warning-text">
                          {dep.count} record{dep.count > 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-danger-soft text-danger-text">
                          {dep.canCascade ? "Cascade Purge" : "Untag"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-success-soft border border-success-border text-success-text flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success-text shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-xs">Safe to delete — no active foreign key references</div>
                <p className="text-[11px] opacity-90 mt-0.5">
                  No other active sub-projects, drawings, matrix cells, or transmittals currently reference this entity. It can be safely removed without cascade effects.
                </p>
              </div>
            </div>
          )}

          {/* Audit Reason / Remarks Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>Reason for deletion (logged in revision audit trail) *</span>
              <span className="text-[11px] text-muted-foreground font-normal">Mandatory for audit compliance</span>
            </label>
            <textarea
              required
              rows={2}
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-danger-border"
            />
          </div>

          {/* Security Notice */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              This operation is irreversible and will be logged under <strong>Revision history & audit logs</strong> with the before snapshot and list of cascaded foreign keys.
            </span>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !deleteReason.trim()}
              className="px-5 py-2 rounded-lg bg-danger-solid hover:bg-danger-solid disabled:opacity-50 text-white font-semibold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isReferencedByOtherRecords ? "Confirm & Cascade Delete" : "Confirm Delete"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
