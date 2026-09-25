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
  ShieldCheck
} from "lucide-react";
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
    { id: "PACKAGES", label: "Package Master", icon: Tag, color: "text-purple-600 bg-purple-500/10 border-purple-500/30" },
    { id: "SUB_PACKAGES", label: "Sub-Package Master", icon: Layers, color: "text-teal-600 bg-teal-500/10 border-teal-500/30" },
    { id: "PROJECTS", label: "Project Master", icon: Building2, color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
    { id: "SUB_PROJECTS", label: "Sub-Project / Wings", icon: FolderTree, color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/30" },
    { id: "CONSULTANTS", label: "Consultant Master", icon: Users, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
    { id: "AUTHORITIES", label: "Statutory Authorities", icon: ShieldCheck, color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
    { id: "ALL", label: "All Masters (Consolidated)", icon: FileSpreadsheet, color: "text-teal-600 bg-teal-500/10 border-teal-500/30" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/25 shrink-0">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Bulk Import & Template Center</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  Excel & CSV
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bulk upload packages, sub-packages, projects, towers, and consultants with auto-validation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {/* Step 1: Master Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              1. Select Master Domain to Import
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
                        ? "bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                        : "bg-surface border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center border ${tab.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {isSelected && (
                        <div className="h-4 w-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
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
            <div className="lg:col-span-5 p-5 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <Download className="h-4 w-4 text-teal-600" />
                  <span>Download Sample Template</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the pre-formatted Chandak template with standard column headers, validation notes, and sample rows.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
                {selectedMaster !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("csv")}
                    className="px-3.5 py-2.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>CSV</span>
                  </button>
                )}
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
                    ? "border-teal-500 bg-teal-50/30 dark:bg-teal-950/20"
                    : "border-border hover:border-teal-500/60 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-2xl bg-teal-500/20 text-teal-600 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{file.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace
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
            <div className="p-8 rounded-2xl border border-border bg-slate-50 dark:bg-slate-900/40 text-center space-y-2">
              <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-foreground">Parsing spreadsheet & validating schema...</div>
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
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{key.replace("_", " ")}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
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
                    <span className="text-[11px] font-semibold text-muted-foreground block">Total Rows</span>
                    <span className="text-lg font-black text-foreground">{currentResult?.totalRows || 0}</span>
                  </div>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">Valid New</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {currentResult?.validCount || 0}
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">Existing Duplicates</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {currentResult?.duplicateCount || 0}
                    </span>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 block">Errors / Issues</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {currentResult?.invalidCount || 0}
                    </span>
                  </div>
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                </div>
              </div>

              {/* Duplicate Strategy & Preview Tabs Bar */}
              <div className="p-3.5 rounded-2xl border border-border bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Duplicate Strategy Radio */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-foreground text-[11px]">Duplicate Action:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === "SKIP"}
                      onChange={() => setDuplicateStrategy("SKIP")}
                      className="accent-teal-600"
                    />
                    <span className="text-foreground font-medium">Skip Existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === "OVERWRITE"}
                      onChange={() => setDuplicateStrategy("OVERWRITE")}
                      className="accent-teal-600"
                    />
                    <span className="text-foreground font-medium">Update & Overwrite</span>
                  </label>
                </div>

                {/* Filter preview pills */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      activePreviewTab === "ALL"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
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
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-emerald-600 dark:text-emerald-400 hover:underline"
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
                          ? "bg-amber-600 text-white font-bold"
                          : "text-amber-600 dark:text-amber-400 hover:underline"
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
                          ? "bg-rose-600 text-white font-bold"
                          : "text-rose-600 dark:text-rose-400 hover:underline"
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
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-border z-10">
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
                                  ? "bg-rose-50/40 dark:bg-rose-950/20" 
                                  : isDup 
                                  ? "bg-amber-50/30 dark:bg-amber-950/15" 
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              <td className="p-2.5 text-center font-mono text-[10px] text-muted-foreground font-semibold">
                                {r.rowNumber}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {isErr ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1" title={r.errors.join("; ")}>
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Error ({r.errors.length})</span>
                                  </span>
                                ) : isDup ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Duplicate</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
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
        <div className="px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-teal-600" />
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
              className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult || (currentResult?.validCount === 0 && currentResult?.duplicateCount === 0) || isImporting}
              onClick={handleExecuteImport}
              className={`px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                !validationResult || (currentResult?.validCount === 0 && currentResult?.duplicateCount === 0) || isImporting
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-teal-600 hover:bg-teal-500 shadow-teal-500/20"
              }`}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    Commit Import ({validationResult ? (currentResult?.validCount || 0) + (duplicateStrategy === "OVERWRITE" ? (currentResult?.duplicateCount || 0) : 0) : 0})
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
