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
  AlertCircle,
  Pencil
} from "lucide-react";
import { RecordModeProvider, RecordFieldset, type RecordMode } from "@/components/ui/record";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { uploadDesignDrawingFileAction } from "@/lib/actions/design";

interface UploadDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrawingUploaded: (drawing: Omit<DrawingItem, "id">) => void;
  /** Record standard: the saved drawing, for view / edit in this same form. */
  drawing?: DrawingItem | null;
  /** create (default) · view (read-only) · edit (details only; file and revision change through Review) */
  recordMode?: RecordMode;
  onDrawingUpdated?: (drawing: DrawingItem) => void;
  /** View mode: switch to edit. */
  onEdit?: () => void;
  /** View / edit mode: open the attached source file. */
  onOpenFile?: (drawing: DrawingItem) => void;
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
  onDrawingUploaded,
  drawing = null,
  recordMode = "create",
  onDrawingUpdated,
  onEdit,
  onOpenFile
}) => {
  const projects = DesignMasterStore.getUserAccessibleProjects();
  const d = recordMode === "create" ? null : drawing;
  const isCreate = recordMode === "create";
  const [code, setCode] = useState(d?.code || "");
  const [title, setTitle] = useState(d?.title || "");
  const [discipline, setDiscipline] = useState<DesignDiscipline>((d?.discipline as DesignDiscipline) || "Architectural");
  const [project, setProject] = useState(d?.project || projects[0]?.name || "");
  const [revision, setRevision] = useState(d?.revision || "R0");
  const [consultant, setConsultant] = useState(d?.consultant || "");
  const [description, setDescription] = useState(d?.description || "");
  const [fileSize, setFileSize] = useState(d?.fileSize || "");
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
    if (recordMode === "view") { onEdit?.(); return; }
    if (!code.trim() || !title.trim()) return;

    // Edit: details only. The sheet code, revision and file change through Review / a new revision.
    if (recordMode === "edit" && d) {
      onDrawingUpdated?.({
        ...d,
        title: title.trim(),
        discipline,
        project: project || d.project,
        consultant: consultant.trim() || d.consultant,
        fileSize: fileSize || d.fileSize,
        description: description.trim() || undefined,
      });
      onClose();
      return;
    }

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
    <RecordModeProvider mode={recordMode}>
    <TransactionFormLayout
      title={isCreate ? "Upload drawing sheet" : recordMode === "edit" ? `Edit drawing · ${d?.code ?? ""}` : `${d?.code ?? "Drawing"} · ${d?.title ?? ""}`}
      badge={isCreate ? "Drawing Register Transaction" : recordMode === "edit" ? "Editing" : d?.status ?? "Viewing"}
      category="Design Tracking"
      icon={Upload}
      iconBg="bg-success-soft text-success-text border-success-border"
      description="Register new CAD, DWG, DXF, STEP, or PDF revision into the official drawing control register."
      breadcrumbs={[
        { label: "Drawing Register", onClick: onClose },
        { label: isCreate ? "Upload drawing sheet" : d?.code ?? "Drawing" }
      ]}
      onBack={onClose}
      backLabel="Back to Drawing Register"
      onReset={isCreate ? handleReset : undefined}
      onSave={recordMode === "view" && !onEdit ? undefined : handleSubmit}
      saveLabel={isCreate ? "Register Drawing" : recordMode === "edit" ? "Save changes" : "Edit"}
      saveIcon={recordMode === "view" ? Pencil : Save}
      isSubmitting={submitting}
      isSaveDisabled={!code.trim() || !title.trim()}
    >
      <RecordFieldset className="space-y-6 max-w-4xl">
        {uploadError && (
          <div className="p-3.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Section 1: Project & Discipline Specs */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-success-text" />
              <span>Project & discipline classification</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target project *</label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Engineering discipline *</label>
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as DesignDiscipline)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold cursor-pointer"
                >
                  <option value="Architectural">Architectural (General Arrangement)</option>
                  <option value="Structural">Structural (RCC & Steel)</option>
                  <option value="MEP">MEP (mech / elec / plumbing / HVAC)</option>
                  <option value="Civil">Civil / infrastructure & site grading</option>
                  <option value="Façade">Façade & curtain wall detailing</option>
                  <option value="Landscape">Landscape & hardscape works</option>
                  <option value="Interior">Interior / common area finishes</option>
                  <option value="BIM">BIM & 3d clash coordination</option>
                </select>
              </div>
            </div>
          </AppCardContent>
        </AppCard>

        {/* Section 2: Drawing Identity & Revision Details */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-success-text" />
              <span>Drawing sheet identification</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Drawing sheet code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  disabled={!isCreate}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. AR-T1-TYP-101"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Revision *</label>
                <input
                  type="text"
                  required
                  value={revision}
                  disabled={!isCreate}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="e.g. R0, R1"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-70"
                />
              </div>
            </div>
            {recordMode === "edit" && (
              <p className="text-[11px] text-muted-foreground">
                Sheet code and revision are fixed once registered. A new revision or file goes through Review.
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Drawing title / description *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tower 1 - typical floor architectural general arrangement plan"
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Consultant / firm author</label>
                <input
                  type="text"
                  value={consultant}
                  onChange={(e) => setConsultant(e.target.value)}
                  placeholder="e.g. Hafeez contractor / MEP design partners"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">File size indicator</label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="Auto-calculated on attachment (e.g. 18.4 MB)"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Revision change summary & markup notes</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail key structural revisions, grid changes, clash resolution fixes…"
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </AppCardContent>
        </AppCard>

        {/* Section 3: Interactive File Attachment Dropzone with Zero Blind Uploads */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-success-text" />
                <span>Digital CAD / PDF file attachment</span>
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

            {!isCreate ? (
              <div className="p-4 rounded-lg border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-success-soft text-success-text flex items-center justify-center shrink-0 border border-success-border">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {d?.fileName || (d?.fileUrl ? "Attached drawing file" : "No file attached")}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {d?.fileSize || "—"} · Rev {d?.revision} · submitted {d?.submittedDate}
                    </div>
                  </div>
                </div>
                {d?.fileUrl && onOpenFile && (
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); onOpenFile(d); }}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Open file</span>
                  </a>
                )}
              </div>
            ) : !selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                className={`p-8 rounded-lg border-2 border-dashed transition-all text-center space-y-3 cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/10 bg-muted/5"
                }`}
              >
                <div className="h-12 w-12 rounded-lg bg-success-soft text-success-text flex items-center justify-center mx-auto border border-success-border">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Click to browse or drag and drop drawing file
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Direct-to-storage upload pipeline • Up to 250 MB per CAD file
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-success-soft text-success-text flex items-center justify-center shrink-0 border border-success-border">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate select-all">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                      <span>{fileSize}</span>
                      <span>•</span>
                      <span className="text-success-text flex items-center gap-0.5 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Ready for upload
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staged File Action Buttons (Mandatory Zero Blind Upload Verification) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePreviewFile}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="View staged document in preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStagedFile}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Download staged document"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button aria-label="Remove selected file"
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="h-8 w-8 rounded-lg hover:bg-danger-soft text-muted-foreground hover:text-danger-text inline-flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </RecordFieldset>
    </TransactionFormLayout>
    </RecordModeProvider>
  );
};

