"use client";

import React, { useState, useRef } from "react";
import { DesignDiscipline, DrawingItem } from "../types";
import { DesignMasterStore } from "../services/designMasterStore";
import { 
  Upload, 
  FileText, 
  Building2, 
  Tag, 
  Save, 
  Eye, 
  Download, 
  Trash2, 
  Paperclip,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { uploadDesignDrawingFileAction } from "@/lib/actions/design";

interface UploadDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrawingUploaded: (drawing: Omit<DrawingItem, "id">) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
  const [fileSize, setFileSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Staged local file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    setUploadError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!file) {
      setSelectedFile(null);
      setFileSize("");
      return;
    }
    setSelectedFile(file);
    const formatted = formatBytes(file.size);
    setFileSize(formatted);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    // Auto-fill drawing sheet title if empty
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(baseName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handlePreviewFile = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadStagedFile = () => {
    if (previewUrl && selectedFile) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim() || !title.trim()) return;

    setSubmitting(true);
    setUploadError(null);

    let storageUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileType: string | undefined = undefined;
    let finalFileSize = fileSize || "N/A";

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("project", project || (projects[0]?.name || "General"));
        formData.append("code", code.trim().toUpperCase());

        const uploadRes = await uploadDesignDrawingFileAction(formData);
        if (!uploadRes.success) {
          throw new Error(uploadRes.error || "Failed to upload drawing file to secure storage");
        }
        storageUrl = uploadRes.storageUrl;
        fileName = uploadRes.fileName;
        fileType = uploadRes.fileType;
        finalFileSize = uploadRes.fileSize || finalFileSize;
      }

      onDrawingUploaded({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        discipline,
        project: project || (projects[0]?.name || "Unassigned"),
        revision,
        status: "Under Review",
        consultant: consultant.trim() || "Design Consultant",
        submittedDate: new Date().toISOString().split("T")[0],
        fileSize: finalFileSize,
        fileUrl: storageUrl,
        fileName: fileName || selectedFile?.name,
        fileType: fileType || selectedFile?.type,
        description: description.trim() || undefined
      });

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error("Drawing upload error:", err);
      setUploadError(err.message || "An error occurred while uploading drawing.");
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setCode("");
    setTitle("");
    setDiscipline("Architectural");
    setRevision("R0");
    setConsultant("");
    setDescription("");
    setFileSize("");
    setUploadError(null);
  };

  return (
    <TransactionFormLayout
      title="Upload Drawing Sheet"
      badge="Drawing Register Transaction"
      category="Design Tracking"
      icon={Upload}
      iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
      description="Register new CAD, DWG, DXF, STEP, or PDF revision into the official drawing control register."
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
        {uploadError && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

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
                <label className="text-xs font-bold text-foreground">File Size Indicator</label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="Auto-calculated on attachment (e.g. 18.4 MB)"
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

        {/* Section 3: Interactive File Attachment Dropzone with Zero Blind Uploads */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
            <AppCardTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Digital CAD / PDF File Attachment</span>
              </div>
              <span className="text-[11px] font-normal text-muted-foreground">
                Supported: PDF, DWG, DXF, STEP, STP, STL, ZIP, PNG, JPG
              </span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.dwg,.dxf,.step,.stp,.stl,.zip,.png,.jpg,.jpeg,.xlsx,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-3 cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/10 bg-muted/5"
                }`}
              >
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    Click to browse or drag and drop drawing file
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Direct-to-storage upload pipeline • Up to 250 MB per CAD file
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate select-all">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                      <span>{fileSize}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Ready for Upload
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staged File Action Buttons (Mandatory Zero Blind Upload Verification) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePreviewFile}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="View staged document in preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStagedFile}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Download staged document"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </div>
    </TransactionFormLayout>
  );
};

