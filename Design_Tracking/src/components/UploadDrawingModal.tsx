"use client";

import React, { useState } from "react";
import { DesignDiscipline, DrawingItem } from "../types";
import { DesignMasterStore } from "../services/designMasterStore";
import { Upload, FileText, Sparkles, Building2, Layers, Tag, Save } from "lucide-react";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";

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

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    }, 300);
  };

  const handleReset = () => {
    setCode("");
    setTitle("");
    setDiscipline("Architectural");
    setRevision("R0");
    setConsultant("");
    setDescription("");
  };

  return (
    <TransactionFormLayout
      title="Upload Drawing Sheet"
      badge="Drawing Register Transaction"
      category="Design Tracking"
      icon={Upload}
      iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
      description="Register new CAD, DWG, DXF, or PDF revision into the official drawing control register."
      breadcrumbs={[
        { label: "Drawing Register", onClick: onClose },
        { label: "Upload Drawing Sheet" }
      ]}
      onBack={onClose}
      backLabel="Back to Drawing Register"
      onReset={handleReset}
      onSave={handleSubmit}
      saveLabel="Register Drawing"
      saveIcon={Save}
      isSubmitting={submitting}
      isSaveDisabled={!code.trim() || !title.trim()}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Section 1: Project & Discipline Specs */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
            <AppCardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Project & Discipline Classification</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Target Project *</label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Engineering Discipline *</label>
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as DesignDiscipline)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold cursor-pointer"
                >
                  <option value="Architectural">Architectural (General Arrangement)</option>
                  <option value="Structural">Structural (RCC & Steel)</option>
                  <option value="MEP">MEP (Mech / Elec / Plumbing / HVAC)</option>
                  <option value="Civil">Civil / Infrastructure & Site Grading</option>
                  <option value="Façade">Façade & Curtain Wall Detailing</option>
                  <option value="Landscape">Landscape & Hardscape Works</option>
                  <option value="Interior">Interior / Common Area Finishes</option>
                  <option value="BIM">BIM & 3D Clash Coordination</option>
                </select>
              </div>
            </div>
          </AppCardContent>
        </AppCard>

        {/* Section 2: Drawing Identity & Revision Details */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
            <AppCardTitle className="text-sm font-bold flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Drawing Sheet Identification</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground">Drawing Sheet Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. AR-T1-TYP-101"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Revision *</label>
                <input
                  type="text"
                  required
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="e.g. R0, R1"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Drawing Title / Description *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tower 1 - Typical Floor Architectural General Arrangement Plan"
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Consultant / Firm Author</label>
                <input
                  type="text"
                  value={consultant}
                  onChange={(e) => setConsultant(e.target.value)}
                  placeholder="e.g. Hafeez Contractor / MEP Design Partners"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">CAD / PDF File Size</label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="e.g. 18.4 MB"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Revision Change Summary & Markup Notes</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail key structural revisions, grid changes, clash resolution fixes..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </AppCardContent>
        </AppCard>

        {/* Section 3: Attachment Dropzone Simulation */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
            <AppCardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Digital File Attachment</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5">
            <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-muted/20 text-center space-y-2">
              <FileText className="h-9 w-9 text-muted-foreground mx-auto" />
              <div className="text-sm text-foreground font-bold">
                CAD Drawing Sheet / DWG / DXF / PDF Attached
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Auto-scanned: {fileSize} • Clean Checksum • Ready for Revision Control
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </TransactionFormLayout>
  );
};
