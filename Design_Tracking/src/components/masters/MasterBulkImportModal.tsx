"use client";

import React, { useState, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Layers, 
  Building2, 
  Users, 
  Tag, 
  FolderTree, 
  ArrowRight, 
  RefreshCw,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { DesignMasterStore } from "../../services/designMasterStore";
import { 
  MasterImportExportService, 
  MasterImportType, 
  ImportValidationResult,
  MASTER_SCHEMAS 
} from "../../services/masterImportExportService";

interface MasterBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMasterType?: MasterImportType;
  onImportComplete?: () => void;
}

export const MasterBulkImportModal: React.FC<MasterBulkImportModalProps> = ({
  isOpen,
  onClose,
  initialMasterType = "PACKAGES",
  onImportComplete
}) => {
  const [selectedMaster, setSelectedMaster] = useState<MasterImportType>(initialMasterType);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"SKIP" | "OVERWRITE">("SKIP");
  const [activePreviewTab, setActivePreviewTab] = useState<"ALL" | "VALID" | "ERRORS" | "DUPLICATES">("ALL");
  const [activeSheetTab, setActiveSheetTab] = useState<string>("PACKAGES");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialMasterType if modal opens with a different one
  React.useEffect(() => {
    if (initialMasterType) {
      setSelectedMaster(initialMasterType);
    }
  }, [initialMasterType]);

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setIsParsing(false);
    setIsImporting(false);
    setActivePreviewTab("ALL");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    try {
      const result = await MasterImportExportService.parseImportFile(selectedFile, selectedMaster);
      setValidationResult(result);
      if (result.multiSheetResults) {
        const firstSheet = Object.keys(result.multiSheetResults)[0];
        if (firstSheet) setActiveSheetTab(firstSheet);
      }
      toast.info(`Parsed ${result.totalRows} records from ${selectedFile.name}`);
    } catch (err: any) {
      console.error("Failed to parse file:", err);
      toast.error(`Error parsing file: ${err.message || "Invalid spreadsheet format"}`);
      setValidationResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = async (format: "xlsx" | "csv") => {
    try {
      await MasterImportExportService.downloadSampleTemplate(selectedMaster, format);
      toast.success(`Sample ${format.toUpperCase()} template downloaded!`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to generate sample template.");
    }
  };

  const handleExecuteImport = async () => {
    if (!validationResult) return;
    setIsImporting(true);
    try {
      const outcome = await MasterImportExportService.executeImport(validationResult, duplicateStrategy);
      toast.success(
        `Import complete! ${outcome.added} added, ${outcome.updated} updated, ${outcome.skipped} skipped.`
      );
      if (onImportComplete) {
        onImportComplete();
      }
      handleClose();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(`Import failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const currentResult = validationResult?.multiSheetResults
    ? validationResult.multiSheetResults[activeSheetTab] || validationResult
    : validationResult;

  const filteredRows = (currentResult?.rows || []).filter(r => {
    if (activePreviewTab === "VALID") return r.isValid && !r.isDuplicate;
    if (activePreviewTab === "ERRORS") return !r.isValid;
    if (activePreviewTab === "DUPLICATES") return r.isValid && r.isDuplicate;
    return true;
  });

  const masterTabOptions: Array<{ id: MasterImportType; label: string; icon: any; color: string }> = [
    { id: "PACKAGES", label: "Package Master", icon: Tag, color: "text-theme-icon bg-surface border-border" },
    { id: "SUB_PACKAGES", label: "Sub-package master", icon: Layers, color: "text-info-text bg-info-soft border-border" },
    { id: "PROJECTS", label: "Project Master", icon: Building2, color: "text-info-text bg-info-soft border-info-border" },
    { id: "SUB_PROJECTS", label: "Sub-project / wings", icon: FolderTree, color: "text-theme-icon bg-surface border-border" },
    { id: "CONSULTANTS", label: "Consultant Master", icon: Users, color: "text-success-text bg-success-soft border-success-border" },
    { id: "AUTHORITIES", label: "Statutory Authorities", icon: ShieldCheck, color: "text-warning-text bg-warning-soft border-warning-border" },
    { id: "ALL", label: "All masters (consolidated)", icon: FileSpreadsheet, color: "text-info-text bg-info-soft border-border" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--overlay)] animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-surface border border-border rounded-3xl shadow-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-sunken flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-info-soft text-info-text flex items-center justify-center border border-info-border shrink-0">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Bulk import & template center</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-info-soft text-info-text border border-info-border">
                  Excel & CSV
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bulk upload packages, sub-packages, projects, towers, and consultants with auto-validation
              </p>
            </div>
          </div>

          <button aria-label="Close"
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-xl hover:bg-sunken text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {/* Step 1: Master Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              1. Select master domain to import
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {masterTabOptions.map(tab => {
                const Icon = tab.icon;
                const isSelected = selectedMaster === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedMaster(tab.id);
                      handleReset();
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-info-soft border-info-border ring-2 ring-info-border shadow-xs"
                        : "bg-surface border-border hover:bg-sunken"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center border ${tab.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {isSelected && (
                        <div className="h-4 w-4 rounded-full bg-info text-white flex items-center justify-center text-[11px]">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground leading-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Download Template & File Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Download Template Box */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-border bg-sunken flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <Download className="h-4 w-4 text-info-text" />
                  <span>Download sample template</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the pre-formatted Chandak template with standard column headers, validation notes, and sample rows.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("xlsx")}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-success hover:bg-success text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  {selectedMaster !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate("csv")}
                      className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-sunken text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-info-text" />
                      <span>CSV</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const outcome = DesignMasterStore.loadEyTenderMasterData();
                    toast.success(`Import complete! Loaded ${outcome.projects} Projects, ${outcome.towers} Towers, ${outcome.packages} Sub-Packages, ${outcome.consultants} Consultants, ${outcome.matrixEntries} Matrix Entries.`);
                    if (onImportComplete) onImportComplete();
                    handleClose();
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-warning hover:bg-warning text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>1-Click load Chandak tender tracker (r2)</span>
                </button>
              </div>
            </div>

            {/* Upload Drag & Drop Area */}
            <div className="lg:col-span-7">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                className={`h-full min-h-[160px] p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  file
                    ? "border-info-border bg-info-soft"
                    : "border-border hover:border-info-border hover:bg-sunken"
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-2xl bg-info-soft text-info-text flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{file.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {(file.size / 1024).toFixed(1)} KB • click or drop another file to replace
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Click to browse or drag & drop spreadsheet
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Parsing Spinner */}
          {isParsing && (
            <div className="p-8 rounded-2xl border border-border bg-sunken text-center space-y-2">
              <RefreshCw className="h-6 w-6 text-info-text animate-spin mx-auto" />
              <div className="text-xs font-bold text-foreground">Parsing spreadsheet & validating schema…</div>
            </div>
          )}

          {/* Step 4: Validation Summary KPIs & Preview */}
          {validationResult && !isParsing && (
            <div className="space-y-4 pt-2">
              {/* Multi-Sheet Selector Tabs if applicable */}
              {validationResult.multiSheetResults && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
                  <span className="text-xs font-bold text-muted-foreground mr-1">Sheets:</span>
                  {Object.entries(validationResult.multiSheetResults).map(([key, sResult]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveSheetTab(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeSheetTab === key
                          ? "bg-info text-white shadow-xs"
                          : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{key.replace("_", " ")}</span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-sunken font-mono">
                        {sResult.totalRows}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground block">Total rows</span>
                    <span className="text-lg font-semibold text-foreground">{currentResult?.totalRows || 0}</span>
                  </div>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="p-3.5 rounded-2xl bg-success-soft border border-success-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-success-text block">Valid new</span>
                    <span className="text-lg font-semibold text-success-text">
                      {currentResult?.validCount || 0}
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-success-text" />
                </div>

                <div className="p-3.5 rounded-2xl bg-warning-soft border border-warning-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-warning-text block">Existing duplicates</span>
                    <span className="text-lg font-semibold text-warning-text">
                      {currentResult?.duplicateCount || 0}
                    </span>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-warning-text" />
                </div>

                <div className="p-3.5 rounded-2xl bg-danger-soft border border-danger-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-danger-text block">Errors / issues</span>
                    <span className="text-lg font-semibold text-danger-text">
                      {currentResult?.invalidCount || 0}
                    </span>
                  </div>
                  <AlertCircle className="h-4 w-4 text-danger-text" />
                </div>
              </div>

              {/* Duplicate Strategy & Preview Tabs Bar */}
              <div className="p-3.5 rounded-2xl border border-border bg-sunken flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Duplicate Strategy Radio */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-foreground text-[11px]">Duplicate Action:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === "SKIP"}
                      onChange={() => setDuplicateStrategy("SKIP")}
                      className="accent-primary"
                    />
                    <span className="text-foreground font-medium">Skip existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === "OVERWRITE"}
                      onChange={() => setDuplicateStrategy("OVERWRITE")}
                      className="accent-primary"
                    />
                    <span className="text-foreground font-medium">Update & overwrite</span>
                  </label>
                </div>

                {/* Filter preview pills */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      activePreviewTab === "ALL"
                        ? "bg-foreground text-background font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({currentResult?.totalRows || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("VALID")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      activePreviewTab === "VALID"
                        ? "bg-success text-white font-bold"
                        : "text-success-text hover:underline"
                    }`}
                  >
                    Valid ({currentResult?.validCount || 0})
                  </button>
                  {(currentResult?.duplicateCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("DUPLICATES")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        activePreviewTab === "DUPLICATES"
                          ? "bg-warning text-white font-bold"
                          : "text-warning-text hover:underline"
                      }`}
                    >
                      Duplicates ({currentResult?.duplicateCount || 0})
                    </button>
                  )}
                  {(currentResult?.invalidCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("ERRORS")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        activePreviewTab === "ERRORS"
                          ? "bg-danger-solid text-white font-bold"
                          : "text-danger-text hover:underline"
                      }`}
                    >
                      Errors ({currentResult?.invalidCount || 0})
                    </button>
                  )}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="rounded-2xl border border-border overflow-hidden bg-surface shadow-xs">
                <div className="overflow-x-auto max-h-64 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-sunken border-b border-border z-10">
                      <tr>
                        <th className="p-2.5 font-bold text-foreground text-[11px] w-12 text-center">Row</th>
                        <th className="p-2.5 font-bold text-foreground text-[11px] w-24">Status</th>
                        {(currentResult?.columns || []).map((col, idx) => (
                          <th key={idx} className="p-2.5 font-bold text-foreground text-[11px] whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={((currentResult?.columns || []).length) + 2} className="p-8 text-center text-muted-foreground">
                            No rows matching the selected view filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((r, rIdx) => {
                          const isErr = !r.isValid;
                          const isDup = r.isValid && r.isDuplicate;

                          return (
                            <tr 
                              key={rIdx}
                              className={`transition-colors ${
                                isErr 
                                  ? "bg-danger-soft" 
                                  : isDup 
                                  ? "bg-warning-soft" 
                                  : "hover:bg-sunken"
                              }`}
                            >
                              <td className="p-2.5 text-center font-mono text-[11px] text-muted-foreground font-semibold">
                                {r.rowNumber}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {isErr ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-danger-soft text-danger-text border border-danger-border inline-flex items-center gap-1" title={r.errors.join("; ")}>
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Error ({r.errors.length})</span>
                                  </span>
                                ) : isDup ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-warning-soft text-warning-text border border-warning-border inline-flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Duplicate</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-success-soft text-success-text border border-success-border inline-flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    <span>Valid</span>
                                  </span>
                                )}
                              </td>
                              {/* Display column cell values */}
                              {Object.entries(r.data).map(([key, val], cIdx) => (
                                <td key={cIdx} className="p-2.5 text-foreground truncate max-w-xs text-xs">
                                  {String(val || "-")}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 border-t border-border bg-sunken flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-info-text" />
            <span>
              {validationResult 
                ? `${(currentResult?.validCount || 0) + (duplicateStrategy === "OVERWRITE" ? (currentResult?.duplicateCount || 0) : 0)} records eligible for import.`
                : "Select a master type and upload file to continue."}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-sunken text-xs font-semibold text-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult || (currentResult?.validCount === 0 && currentResult?.duplicateCount === 0) || isImporting}
              onClick={handleExecuteImport}
              className={`px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                !validationResult || (currentResult?.validCount === 0 && currentResult?.duplicateCount === 0) || isImporting
                  ? "bg-border-active cursor-not-allowed opacity-60"
                  : "bg-info hover:bg-info"
              }`}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing…</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    Commit import ({validationResult ? (currentResult?.validCount || 0) + (duplicateStrategy === "OVERWRITE" ? (currentResult?.duplicateCount || 0) : 0) : 0})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
