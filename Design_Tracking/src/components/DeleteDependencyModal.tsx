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
        return <Building2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
      case "SUB_PROJECT":
        return <Building className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "TOWER":
        return <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "PACKAGE":
        return <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case "CONSULTANT":
        return <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case "AUTHORITY":
        return <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case "CATEGORY":
        return <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-rose-500/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              {getEntityIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Foreign Key Referential Check
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {getEntityBadgeLabel()}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground truncate mt-0.5">
                Delete &ldquo;{entityName}&rdquo;
              </h3>
            </div>
          </div>

          <button
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
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">
                    Foreign Key Dependency Alert: {totalDependentRecords} Dependent Record{totalDependentRecords > 1 ? "s" : ""} Attached
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    This entity is currently referenced as a foreign key across multiple transaction and master records. Deleting it will trigger a safe cascade cleanup to prevent orphaned data.
                  </p>
                </div>
              </div>

              {/* Dependency Breakdown Table */}
              <div className="space-y-1.5 pt-1 border-t border-amber-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Referencing Foreign Key Entities:
                </span>
                <div className="space-y-1">
                  {dependencies.map((dep, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface/80 border border-amber-500/20 text-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-semibold text-xs truncate">
                          {dep.referencedEntityType}
                        </span>
                        {dep.previewItems.length > 0 && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[140px]">
                            ({dep.previewItems.join(", ")})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {dep.count} record{dep.count > 1 ? "s" : ""}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          {dep.canCascade ? "Cascade Purge" : "Untag"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs">Safe to Delete — No Active Foreign Key References</div>
                <p className="text-[11px] opacity-90 mt-0.5">
                  No other active sub-projects, drawings, matrix cells, or transmittals currently reference this entity. It can be safely removed without cascade effects.
                </p>
              </div>
            </div>
          )}

          {/* Audit Reason / Remarks Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center justify-between">
              <span>Reason for Deletion (Logged in Revision Audit Trail) *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Mandatory for Audit Compliance</span>
            </label>
            <textarea
              required
              rows={2}
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              This operation is irreversible and will be logged under <strong>Revision History & Audit Logs</strong> with the before snapshot and list of cascaded foreign keys.
            </span>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !deleteReason.trim()}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
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
