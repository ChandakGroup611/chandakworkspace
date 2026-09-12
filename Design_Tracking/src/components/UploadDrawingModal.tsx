"use client";

import React, { useState } from "react";
import { DesignDiscipline, DrawingItem } from "../types";
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
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<DesignDiscipline>("Architectural");
  const [project, setProject] = useState("Chandak Stella");
  const [revision, setRevision] = useState("R0");
  const [consultant, setConsultant] = useState("Morphogenesis Architects");
  const [description, setDescription] = useState("");
  const [fileSize, setFileSize] = useState("18.4 MB");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      onDrawingUploaded({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        discipline,
        project,
        revision,
        status: "Under Review",
        consultant,
        submittedDate: new Date().toISOString().split("T")[0],
        fileSize,
        description: description.trim() || undefined
      });
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Upload Drawing Sheet</h3>
              <p className="text-xs text-muted-foreground">Register new CAD or PDF revision into drawing control register</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Target Project *</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground"
              >
                <option value="Chandak Stella">Chandak Stella</option>
                <option value="Chandak Highscape City">Chandak Highscape City</option>
                <option value="Chandak GreenAir">Chandak GreenAir</option>
                <option value="Chandak 34 Park Estate">Chandak 34 Park Estate</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Discipline *</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as DesignDiscipline)}
                className="w-full h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground"
              >
                <option value="Architectural">Architectural</option>
                <option value="Structural">Structural</option>
                <option value="MEP">MEP (Mech / Elec / Plumb)</option>
                <option value="Landscape">Landscape</option>
                <option value="Interior">Interior</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Drawing Code / Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. CK-CHD-ARC-L05-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-mono font-bold text-foreground uppercase"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Drawing Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tower 1 Podium 2 Slab Reinforcement Details"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Revision Tag</label>
              <select
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground font-mono"
              >
                <option value="R0">R0 (Schematic Draft)</option>
                <option value="R1">R1 (First Review)</option>
                <option value="R2">R2 (Post-Clash Revision)</option>
                <option value="R3">R3 (Pre-GFC Final)</option>
                <option value="R-GFC">R-GFC (Certified GFC)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Author / Consultant</label>
              <input
                type="text"
                placeholder="e.g. Morphogenesis Architects"
                value={consultant}
                onChange={(e) => setConsultant(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Revision Change Summary & Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Incorporates revised plumbing shafts per MEP coordination review dated 08-Sep."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-foreground"
            />
          </div>

          {/* Drag and Drop Zone simulation */}
          <div className="p-4 rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-2">
            <FileText className="h-7 w-7 text-muted-foreground mx-auto" />
            <div className="text-xs text-foreground font-medium">
              CAD Sheet / DWG / DXF / PDF Attached
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Auto-scanned: {fileSize} • Clean Checksum
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? "Uploading..." : "Register Drawing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
