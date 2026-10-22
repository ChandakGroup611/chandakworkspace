"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Layers,
  FolderTree,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Eye,
  Download,
  Split,
  Files,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  Calendar,
  Database,
  ExternalLink
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import {
  DmsDocTypeItem,
  DmsFolderNode,
  saveDocumentWithIndexingAction,
  fetchDocTypesAndFieldsAction,
  createDocTypeAction,
  uploadDmsDocumentFileAction
} from "@/lib/actions/dms-core";
import { toast } from "react-toastify";

export type IndexingMode = "SINGLE" | "BATCH" | "SPLIT_PDF";

export interface DmsSplitIndexingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  targetFolder: DmsFolderNode | null;
  onDocumentIndexed?: () => void;
}

interface StagedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  docTypeId: string;
  pageRanges?: string;
  fieldValues: Record<string, any>;
  isUploaded: boolean;
}

export const DmsSplitIndexingWizard: React.FC<DmsSplitIndexingWizardProps> = ({
  isOpen,
  onClose,
  workspaceId,
  targetFolder,
  onDocumentIndexed,
}) => {
  const [mode, setMode] = useState<IndexingMode>("SINGLE");
  const [docTypes, setDocTypes] = useState<DmsDocTypeItem[]>([]);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<StagedFileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // Quick Add Document Type Master Modal State
  const [showAddDocTypeModal, setShowAddDocTypeModal] = useState<boolean>(false);
  const [newDocTypeName, setNewDocTypeName] = useState<string>("");
  const [newDocTypeCode, setNewDocTypeCode] = useState<string>("");
  const [newDocTypeDesc, setNewDocTypeDesc] = useState<string>("");
  const [isCreatingDocType, setIsCreatingDocType] = useState<boolean>(false);

  // Dynamic Metadata Form State
  const [docTitle, setDocTitle] = useState<string>("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [requiresQc, setRequiresQc] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  // Page split ranges for SPLIT_PDF mode
  const [splitPageRanges, setSplitPageRanges] = useState<string>("1-5");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate doc types and custom field definitions
  useEffect(() => {
    if (isOpen) {
      const loadSchema = async () => {
        const res = await fetchDocTypesAndFieldsAction(workspaceId);
        if (res.success && res.docTypes && res.docTypes.length > 0) {
          setDocTypes(res.docTypes);
          setSelectedDocTypeId(res.docTypes[0].id);
        }
      };
      loadSchema();
    }
  }, [isOpen, workspaceId]);

  // Handle Quick Create Document Type Master
  const handleCreateDocTypeMaster = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDocTypeName.trim()) return;

    setIsCreatingDocType(true);
    try {
      const res = await createDocTypeAction({
        name: newDocTypeName.trim(),
        code: newDocTypeCode.trim() || undefined,
        description: newDocTypeDesc.trim() || undefined,
        workspaceId,
      });

      if (res.success && res.docType) {
        const created = res.docType;
        // 1. Immediately reflect in dropdown list
        setDocTypes((prev) => {
          const exists = prev.some((d) => d.id === created.id || d.code === created.code);
          return exists ? prev : [...prev, created];
        });
        // 2. Immediately select the newly created document type
        setSelectedDocTypeId(created.id);
        // 3. Update staged file if active
        setStagedFiles((prev) => {
          if (!prev[activeFileIndex]) return prev;
          const copy = [...prev];
          copy[activeFileIndex] = { ...copy[activeFileIndex], docTypeId: created.id };
          return copy;
        });

        // 4. Reset & Close
        setShowAddDocTypeModal(false);
        setNewDocTypeName("");
        setNewDocTypeCode("");
        setNewDocTypeDesc("");
      } else {
        toast.info(res.error || "Failed to create document type master");
      }
    } catch (err: any) {
      toast.info(err.message || "Failed to create document type master");
    } finally {
      setIsCreatingDocType(false);
    }
  };

  // Handle local file drop / staging
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: StagedFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      // Auto-extract title from filename (strip extension, convert underscores/dashes)
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();

      newItems.push({
        id: `staged-${Date.now()}-${i}`,
        file,
        previewUrl,
        title: cleanTitle,
        docTypeId: selectedDocTypeId || (docTypes[0]?.id ?? ""),
        fieldValues: {},
        isUploaded: false,
      });
    }

    setStagedFiles((prev) => (mode === "SINGLE" ? newItems.slice(0, 1) : [...prev, ...newItems]));
    setActiveFileIndex(0);
    if (newItems.length > 0) {
      setDocTitle(newItems[0].title);
    }
  };

  const activeStagedFile = stagedFiles[activeFileIndex] || null;
  const currentDocType = docTypes.find((dt) => dt.id === selectedDocTypeId);

  const handleDownloadActiveFile = () => {
    if (activeStagedFile?.file) {
      const a = document.createElement("a");
      a.href = activeStagedFile.previewUrl;
      a.download = activeStagedFile.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Commit Indexing Action
  const handleCommitIndexing = async () => {
    if (!activeStagedFile || !targetFolder) {
      toast.info("Please select a valid folder and staged file.");
      return;
    }
    if (!docTitle.trim()) {
      toast.info("Document title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload actual file to storage pipeline
      const formData = new FormData();
      formData.append("file", activeStagedFile.file);
      formData.append("workspaceId", workspaceId);
      formData.append("folderId", targetFolder.id);

      const uploadRes = await uploadDmsDocumentFileAction(formData);
      const storageKey =
        uploadRes.storageUrl ||
        `storage:ticket-attachments:dms/${workspaceId}/${targetFolder.id}/${activeStagedFile.file.name}`;
      const checksum = uploadRes.checksumSha256 || `sha256-${Date.now()}`;

      // 2. Save document record and index metadata
      const res = await saveDocumentWithIndexingAction({
        workspaceId,
        folderId: targetFolder.id,
        docTypeId: selectedDocTypeId,
        title: docTitle.trim(),
        originalFileName: activeStagedFile.file.name,
        storageKey,
        fileSizeBytes: activeStagedFile.file.size,
        checksumSha256: checksum,
        mimeType: activeStagedFile.file.type || "application/pdf",
        fieldValues: customFieldValues,
        requiresQc,
      });

      if (res.success) {
        // If in batch mode, move to next file or complete
        if (mode === "BATCH" && activeFileIndex < stagedFiles.length - 1) {
          const updated = [...stagedFiles];
          updated[activeFileIndex].isUploaded = true;
          setStagedFiles(updated);
          setActiveFileIndex((prev) => prev + 1);
          setDocTitle(updated[activeFileIndex + 1].title);
          setCustomFieldValues({});
        } else {
          if (onDocumentIndexed) onDocumentIndexed();
          onClose();
        }
      } else {
        toast.info(res.error || "Failed to index document");
      }
    } catch (err: any) {
      console.error("Indexing error:", err);
      toast.info(err.message || "Failed to index document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* 1. TOP HEADER & MODE SWITCHER */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent-soft border border-border-active flex items-center justify-center text-primary shrink-0">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Split-screen document indexing studio</span>
              <span className="text-xs font-normal text-muted-foreground">
                in <strong className="font-semibold text-foreground">{targetFolder?.name || "Root"}</strong>
              </span>
            </h2>
            <p className="text-[11px] font-mono text-muted-foreground">{targetFolder?.path || "chandak.root"}</p>
          </div>
        </div>

        {/* 3-Mode Pill Selector */}
        <div className="flex items-center bg-surface border border-border rounded-lg p-1">
          <button type="button"
            onClick={() => setMode("SINGLE")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "SINGLE"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Single file</span>
          </button>
          <button type="button"
            onClick={() => setMode("BATCH")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "BATCH"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Files className="h-3.5 w-3.5" />
            <span>Batch queue</span>
          </button>
          <button type="button"
            onClick={() => setMode("SPLIT_PDF")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "SPLIT_PDF"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Split className="h-3.5 w-3.5" />
            <span>Split PDF set</span>
          </button>
        </div>

        <button aria-label="Close" type="button"
          onClick={onClose}
          className="p-2 hover:bg-surface rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* 2. DUAL-LANE SPLIT SCREEN WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT LANE: DYNAMIC METADATA INDEXING FORM */}
        <div className="w-full md:w-[480px] lg:w-[520px] border-r border-border bg-surface flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* File Drop Stage / Queue Indicator */}
            {stagedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-border-active rounded-lg p-8 text-center cursor-pointer bg-surface/50 hover:bg-accent-soft transition-all group"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                <h4 className="text-xs font-semibold text-foreground mt-2">
                  Drop {mode === "BATCH" ? "multiple documents" : "drawing or document"} here
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  PDF, DWG CAD, XLSX, DOCX, PNG (up to 100MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={mode === "BATCH"}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-3.5 bg-surface border border-border rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-accent-soft border border-border-active flex items-center justify-center text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {activeStagedFile?.file.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {((activeStagedFile?.file.size || 0) / (1024 * 1024)).toFixed(2)} MB • staged
                      {mode === "BATCH" && ` (${activeFileIndex + 1} of ${stagedFiles.length})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {mode === "BATCH" && (
                    <div className="flex items-center gap-1 mr-2">
                      <button aria-label="Previous" type="button"
                        onClick={() => setActiveFileIndex((i) => Math.max(0, i - 1))}
                        disabled={activeFileIndex === 0}
                        className="p-1 hover:bg-surface rounded-md disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button aria-label="Next" type="button"
                        onClick={() =>
                          setActiveFileIndex((i) => Math.min(stagedFiles.length - 1, i + 1))
                        }
                        disabled={activeFileIndex === stagedFiles.length - 1}
                        className="p-1 hover:bg-surface rounded-md disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <button aria-label="Close" type="button"
                    onClick={() => {
                      setStagedFiles([]);
                      setActiveFileIndex(0);
                    }}
                    className="p-1.5 hover:bg-surface text-muted-foreground hover:text-danger-text rounded-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SPLIT PDF SETTINGS (If mode === 'SPLIT_PDF') */}
            {mode === "SPLIT_PDF" && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Split className="h-3.5 w-3.5" />
                    <span>Page range specification</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Specify page range for this document dossier (e.g., 1-5, 6-10, or 12).
                </p>
                <input
                  type="text"
                  value={splitPageRanges}
                  onChange={(e) => setSplitPageRanges(e.target.value)}
                  placeholder="e.g. 1-5"
                  className="w-full text-xs font-mono rounded-lg bg-surface border border-border px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Core Metadata Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Document type set *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDocTypeModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline hover:brightness-110 cursor-pointer"
                    title="Add new document type master"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    <span>Add master</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <select
                    value={selectedDocTypeId}
                    onChange={(e) => setSelectedDocTypeId(e.target.value)}
                    className="flex-1 text-xs font-medium rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                  >
                    {docTypes.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name} ({dt.code})
                      </option>
                    ))}
                  </select>
                  <button aria-label="Create new document type master"
                    type="button"
                    onClick={() => setShowAddDocTypeModal(true)}
                    className="p-2.5 rounded-lg border border-border bg-surface hover:bg-surface/80 text-foreground shrink-0 cursor-pointer"
                    title="Create new document type master"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Document title / dossier label *
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Tower a - g+10 structural general arrangement"
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Dynamic Field Group Generated Schema */}
              {currentDocType?.fieldDefinitions && currentDocType.fieldDefinitions.length > 0 && (
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Extended metadata attributes
                    </span>
                    <span className="text-[11px] font-mono text-primary">
                      {currentDocType.fieldDefinitions.length} Dynamic fields
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentDocType.fieldDefinitions.map((field) => (
                      <div key={field.id}>
                        <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                          <span>{field.fieldLabel}</span>
                          {field.isRequired && <span className="text-danger-text">*</span>}
                        </label>

                        {field.dataType === "DROPDOWN" && field.dropdownOptions ? (
                          <select
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            className="w-full mt-1 text-xs rounded-md bg-surface border border-border p-2 text-foreground"
                          >
                            <option value="">Select option…</option>
                            {field.dropdownOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.dataType === "DATE" ? (
                          <input
                            type="date"
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            className="w-full mt-1 text-xs rounded-md bg-surface border border-border p-2 text-foreground"
                          />
                        ) : field.dataType === "NUMBER" ? (
                          <input
                            type="number"
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [field.id]: Number(e.target.value),
                              }))
                            }
                            placeholder="0"
                            className="w-full mt-1 text-xs rounded-md bg-surface border border-border p-2 text-foreground"
                          />
                        ) : (
                          <input
                            type="text"
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            placeholder={field.defaultValue || "Enter value..."}
                            className="w-full mt-1 text-xs rounded-md bg-surface border border-border p-2 text-foreground"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Control Approval Gate */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">Require QC verification gate</div>
                  <p className="text-[11px] text-muted-foreground">
                    Document will remain unapproved until verified by Quality Control Lead.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requiresQc}
                  onChange={(e) => setRequiresQc(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-primary focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-auto p-4 bg-surface border-t border-border flex items-center justify-end gap-2">
            <button type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted-foreground"
            >
              Cancel
            </button>
            <button type="button"
              onClick={handleCommitIndexing}
              disabled={!activeStagedFile || isSubmitting || !docTitle.trim()}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? "Indexing..."
                  : mode === "BATCH" && activeFileIndex < stagedFiles.length - 1
                  ? "Index & Next File"
                  : "Save & Index Document"}
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT LANE: REAL-TIME DOCUMENT PREVIEW STAGE */}
        <div className="flex-1 bg-surface/50 flex flex-col overflow-hidden">
          {/* Preview Viewport Toolbar */}
          <div className="h-10 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>Real-time document preview</span>
              </span>
              {activeStagedFile && (
                <span className="text-[11px] font-mono text-foreground truncate max-w-[200px] border-l border-border pl-2">
                  {activeStagedFile.file.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeStagedFile && (
                <>
                  <a
                    href={activeStagedFile.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] px-2 font-medium"
                    title="Open document in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Popout</span>
                  </a>
                  <button type="button"
                    onClick={handleDownloadActiveFile}
                    className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] px-2 font-medium"
                    title="Download staged file"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <div className="h-3 w-px bg-border mx-1" />
                </>
              )}
              <button aria-label="Zoom out" type="button"
                onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                className="p-1 hover:bg-surface rounded-sm text-muted-foreground"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1 text-foreground min-w-[40px] text-center">
                {Math.round(previewZoom * 100)}%
              </span>
              <button aria-label="Zoom in" type="button"
                onClick={() => setPreviewZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                className="p-1 hover:bg-surface rounded-sm text-muted-foreground"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button aria-label="Reset zoom (100%)" type="button"
                onClick={() => setPreviewZoom(1)}
                className="p-1 hover:bg-surface rounded-sm text-muted-foreground"
                title="Reset zoom (100%)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10 relative">
            {activeStagedFile ? (
              (() => {
                const isImage =
                  activeStagedFile.file.type.startsWith("image/") ||
                  /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(activeStagedFile.file.name);
                const isPdf =
                  activeStagedFile.file.type === "application/pdf" ||
                  /\.pdf$/i.test(activeStagedFile.file.name);

                if (isImage) {
                  return (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                      <img
                        src={activeStagedFile.previewUrl}
                        alt={activeStagedFile.title}
                        style={{ transform: `scale(${previewZoom})` }}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-md border border-border bg-surface transition-transform duration-100 origin-center"
                      />
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <div
                      className="w-full h-full max-w-5xl bg-surface rounded-lg shadow-lg border border-border overflow-hidden transition-transform duration-100 origin-center flex flex-col"
                      style={{ transform: `scale(${previewZoom})` }}
                    >
                      <object
                        data={activeStagedFile.previewUrl}
                        type="application/pdf"
                        className="w-full h-full flex-1"
                      >
                        <iframe
                          src={activeStagedFile.previewUrl}
                          className="w-full h-full border-none"
                          title="PDF preview"
                        >
                          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                            <FileText className="h-12 w-12 text-muted-foreground stroke-1" />
                            <p className="text-xs font-semibold text-foreground">
                              PDF preview unavailable in embedded viewer.
                            </p>
                            <a
                              href={activeStagedFile.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Open PDF in new window</span>
                            </a>
                          </div>
                        </iframe>
                      </object>
                    </div>
                  );
                }

                // Other formats (Documents, Spreadsheets, Archives)
                return (
                  <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 text-center space-y-4 shadow-lg animate-in fade-in">
                    <div className="h-16 w-16 mx-auto rounded-full bg-accent-soft flex items-center justify-center text-primary">
                      <FileText className="h-8 w-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground truncate">{activeStagedFile.file.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(activeStagedFile.file.size / 1024).toFixed(1)} KB &bull; {activeStagedFile.file.type || "Document"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This file format does not support inline web rendering, but you can inspect or download it directly.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <a
                        href={activeStagedFile.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface/80 text-foreground inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View raw</span>
                      </a>
                      <button type="button"
                        onClick={handleDownloadActiveFile}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <FileText className="h-12 w-12 mx-auto stroke-1 opacity-40" />
                <p className="text-xs font-semibold">No document preview active.</p>
                <p className="text-[11px] opacity-75 max-w-sm mx-auto">
                  Stage a file on the left panel to immediately render page-by-page previews alongside your metadata fields.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ADD DOCUMENT TYPE MASTER MODAL */}
      {showAddDocTypeModal && (
        <div className="fixed inset-0 z-70 bg-[var(--overlay)] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Add document type master</h3>
              </div>
              <button aria-label="Close"
                type="button"
                onClick={() => setShowAddDocTypeModal(false)}
                className="p-1 hover:bg-surface rounded-md text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocTypeMaster} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Document type name *
                </label>
                <input
                  type="text"
                  value={newDocTypeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewDocTypeName(val);
                    if (
                      !newDocTypeCode ||
                      newDocTypeCode ===
                        newDocTypeName.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32)
                    ) {
                      setNewDocTypeCode(val.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32));
                    }
                  }}
                  placeholder="e.g. Facade engineering & details"
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Type code *
                </label>
                <input
                  type="text"
                  value={newDocTypeCode}
                  onChange={(e) =>
                    setNewDocTypeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))
                  }
                  placeholder="e.g. FACADE_ENG"
                  className="w-full mt-1.5 text-xs font-mono rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={newDocTypeDesc}
                  onChange={(e) => setNewDocTypeDesc(e.target.value)}
                  placeholder="Brief description of documents classified under this type…"
                  rows={2}
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddDocTypeModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDocType || !newDocTypeName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isCreatingDocType ? "Saving..." : "Save & Select Master"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
