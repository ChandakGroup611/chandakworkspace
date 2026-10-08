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
  Database
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import {
  DmsDocTypeItem,
  DmsFolderNode,
  saveDocumentWithIndexingAction,
  fetchDocTypesAndFieldsAction
} from "@/lib/actions/dms-core";

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

  // Commit Indexing Action
  const handleCommitIndexing = async () => {
    if (!activeStagedFile || !targetFolder) {
      alert("Please select a valid folder and staged file.");
      return;
    }
    if (!docTitle.trim()) {
      alert("Document title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate/perform SHA-256 and storage key generation
      const checksum = `sha256-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const storageKey = `dms/${workspaceId}/${targetFolder.id}/${activeStagedFile.file.name}`;

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
        alert(res.error || "Failed to index document");
      }
    } catch (err: any) {
      console.error("Indexing error:", err);
      alert(err.message || "Failed to index document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xs flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* 1. TOP HEADER & MODE SWITCHER */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/25 flex items-center justify-center text-theme-btn-primary shrink-0">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Split-Screen Document Indexing Studio</span>
              <span className="text-xs font-normal text-muted-foreground">
                in <strong className="font-semibold text-foreground">{targetFolder?.name || "Root"}</strong>
              </span>
            </h2>
            <p className="text-[11px] font-mono text-muted-foreground">{targetFolder?.path || "chandak.root"}</p>
          </div>
        </div>

        {/* 3-Mode Pill Selector */}
        <div className="flex items-center bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => setMode("SINGLE")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              mode === "SINGLE"
                ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Single File</span>
          </button>
          <button
            onClick={() => setMode("BATCH")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              mode === "BATCH"
                ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Files className="h-3.5 w-3.5" />
            <span>Batch Queue</span>
          </button>
          <button
            onClick={() => setMode("SPLIT_PDF")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              mode === "SPLIT_PDF"
                ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Split className="h-3.5 w-3.5" />
            <span>Split PDF Set</span>
          </button>
        </div>

        <button
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
                className="border-2 border-dashed border-border hover:border-theme-btn-primary/60 rounded-xl p-8 text-center cursor-pointer bg-surface/50 hover:bg-theme-btn-primary/5 transition-all group"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground group-hover:text-theme-btn-primary transition-colors" />
                <h4 className="text-xs font-bold text-foreground mt-2">
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
              <div className="p-3.5 bg-surface border border-border rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/25 flex items-center justify-center text-theme-btn-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {activeStagedFile?.file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {((activeStagedFile?.file.size || 0) / (1024 * 1024)).toFixed(2)} MB • Staged
                      {mode === "BATCH" && ` (${activeFileIndex + 1} of ${stagedFiles.length})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {mode === "BATCH" && (
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        onClick={() => setActiveFileIndex((i) => Math.max(0, i - 1))}
                        disabled={activeFileIndex === 0}
                        className="p-1 hover:bg-surface rounded-md disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
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
                  <button
                    onClick={() => {
                      setStagedFiles([]);
                      setActiveFileIndex(0);
                    }}
                    className="p-1.5 hover:bg-surface text-muted-foreground hover:text-rose-500 rounded-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SPLIT PDF SETTINGS (If mode === 'SPLIT_PDF') */}
            {mode === "SPLIT_PDF" && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Split className="h-3.5 w-3.5" />
                    <span>Page Range Specification</span>
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Document Type Set
                </label>
                <select
                  value={selectedDocTypeId}
                  onChange={(e) => setSelectedDocTypeId(e.target.value)}
                  className="w-full mt-1.5 text-xs font-medium rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                >
                  {docTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name} ({dt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Document Title / Dossier Label *
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Tower A - G+10 Structural General Arrangement"
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                />
              </div>

              {/* Dynamic Field Group Generated Schema */}
              {currentDocType?.fieldDefinitions && currentDocType.fieldDefinitions.length > 0 && (
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Extended Metadata Attributes
                    </span>
                    <span className="text-[10px] font-mono text-theme-btn-primary">
                      {currentDocType.fieldDefinitions.length} Dynamic Fields
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentDocType.fieldDefinitions.map((field) => (
                      <div key={field.id}>
                        <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                          <span>{field.fieldLabel}</span>
                          {field.isRequired && <span className="text-rose-500">*</span>}
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
                            <option value="">Select option...</option>
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
                  <div className="text-xs font-bold text-foreground">Require QC Verification Gate</div>
                  <p className="text-[11px] text-muted-foreground">
                    Document will remain unapproved until verified by Quality Control Lead.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requiresQc}
                  onChange={(e) => setRequiresQc(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-theme-btn-primary focus:ring-theme-btn-primary"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-auto p-4 bg-surface border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitIndexing}
              disabled={!activeStagedFile || isSubmitting || !docTitle.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs disabled:opacity-50 flex items-center gap-2"
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
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              <span>Real-Time Document Preview</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.15))}
                className="p-1 hover:bg-surface rounded-sm text-muted-foreground"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1 text-foreground">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(2.5, z + 0.15))}
                className="p-1 hover:bg-surface rounded-sm text-muted-foreground"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPreviewZoom(1)}
                className="p-1 hover:bg-surface rounded-sm text-muted-foreground"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            {activeStagedFile ? (
              <div
                className="bg-white rounded-lg shadow-xl border border-border overflow-hidden transition-transform duration-100 origin-center"
                style={{
                  transform: `scale(${previewZoom})`,
                  width: "750px",
                  height: "950px",
                }}
              >
                <iframe
                  src={activeStagedFile.previewUrl}
                  className="w-full h-full border-none"
                  title="Staged Document Preview"
                />
              </div>
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
    </div>
  );
};
