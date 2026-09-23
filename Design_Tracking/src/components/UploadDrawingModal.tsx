"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DesignDiscipline, DrawingItem } from "../types";
import { DesignMasterStore } from "../services/designMasterStore";
import { X, Upload, FileText, Check, Sparkles } from "lucide-react";

interface UploadDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrawingUploaded: (drawing: Omit<DrawingItem, "id">) => void;
}

export const UploadDrawingModal: React.FC<UploadDrawingModalProps> = ({
  isOpen,
  onClose,
  onDrawingUploaded
}) => {
  const [mounted, setMounted] = useState(false);
  const projects = DesignMasterStore.getUserAccessibleProjects();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<DesignDiscipline>("Architectural");
  const [project, setProject] = useState(projects[0]?.name || "");
  const [revision, setRevision] = useState("R0");
  const [consultant, setConsultant] = useState("");
  const [description, setDescription] = useState("");
  const [fileSize, setFileSize] = useState("18.4 MB");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      onDrawingUploaded({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        discipline,
        project: project || (projects[0]?.name || "Unassigned"),
        revision,
        status: "Under Review",
        consultant: consultant.trim() || "Design Consultant",
        submittedDate: new Date().toISOString().split("T")[0],
        fileSize,
        description: description.trim() || undefined
      });
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">Upload Drawing Sheet</h3>
              <p className="text-xs text-muted-foreground">Register new CAD or PDF revision into drawing control register</p>
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1 text-foreground">Target Project *</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1 text-foreground">Discipline *</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as DesignDiscipline)}
                className="w-full h-9 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="Architectural">Architectural</option>
                <option value="Structural">Structural</option>
                <option value="MEP">MEP (Mech / Elec / Plumb)</option>
                <option value="Civil">Civil / Infrastructure</option>
                <option value="Façade">Façade & Glazing</option>
                <option value="Landscape">Landscape & Hardscape</option>
                <option value="Interior">Interior / Common Areas</option>
                <option value="BIM">BIM & Clash Coordination</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1 text-foreground">Drawing Sheet Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. AR-T1-TYP-101"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-foreground">Revision *</label>
              <input
                type="text"
                required
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="e.g. R0, R1"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-foreground">Drawing Title / Description *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tower 1 - Typical Floor Architectural General Arrangement Plan"
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1 text-foreground">Consultant / Firm Author</label>
              <input
                type="text"
                value={consultant}
                onChange={(e) => setConsultant(e.target.value)}
                placeholder="e.g. Hafeez Contractor / MEP Design"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-foreground">File Size</label>
              <input
                type="text"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-foreground">Revision Change Summary & Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Drag and Drop Zone simulation */}
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
            <FileText className="h-7 w-7 text-muted-foreground mx-auto" />
            <div className="text-xs text-foreground font-medium">
              CAD Sheet / DWG / DXF / PDF Attached
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Auto-scanned: {fileSize} • Clean Checksum
            </div>
          </div>

          <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-end gap-2 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {submitting ? "Uploading..." : "Register Drawing"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
