"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Info,
  Database,
  Layers,
  Activity,
  Box,
  Cpu,
  Server,
  ShieldCheck,
  FolderTree,
  Hash
} from "lucide-react";
import { bulkImportMasterRecords } from "@/lib/actions/masters";

export interface MasterTableConfig {
  id: string;
  table: string;
  scopeId: string | null;
  label: string;
  category: string;
  icon: any;
  desc: string;
  parentTable: string | null;
  parentKey: string | null;
  parentRequired: boolean;
}

interface SystemMasterBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterTables: MasterTableConfig[];
  initialTabId?: string;
  existingRecords?: any[];
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export function SystemMasterBulkImportModal({
  isOpen,
  onClose,
  masterTables,
  initialTabId,
  existingRecords = [],
  onSuccess
}: SystemMasterBulkImportModalProps) {
  const [selectedMasterId, setSelectedMasterId] = useState<string>(initialTabId || masterTables[0]?.id || "infra_issue_types");
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"SKIP" | "OVERWRITE">("SKIP");
  const [activePreviewFilter, setActivePreviewFilter] = useState<"ALL" | "VALID" | "DUPLICATES" | "ERRORS">("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTabId) {
      setSelectedMasterId(initialTabId);
    }
  }, [initialTabId]);

  const activeConfig = useMemo(() => {
    return masterTables.find(t => t.id === selectedMasterId) || masterTables[0];
  }, [masterTables, selectedMasterId]);

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setIsParsing(false);
    setIsImporting(false);
    setActivePreviewFilter("ALL");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen || !activeConfig) return null;

  // 1. Download Sample Excel Template (.xlsx)
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Chandak Group Workspace & Tracking";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet(activeConfig.label.slice(0, 31));

      // Define columns based on master configuration
      const columns: Array<{ header: string; key: string; width: number; example: string }> = [
        { header: "Code (Required)*", key: "code", width: 22, example: `${activeConfig.category.slice(0, 3)}-001` },
        { header: "Name / Title (Required)*", key: "name", width: 32, example: `Sample ${activeConfig.label}` },
        { header: "Description", key: "description", width: 38, example: `Operational details for ${activeConfig.label}` }
      ];

      if (activeConfig.parentTable) {
        columns.push({
          header: "Parent Code or Name (Required)*",
          key: "parent_code",
          width: 32,
          example: "Parent Entity Code or Title"
        });
      }

      if (activeConfig.table === "priority_master") {
        columns.push(
          { header: "Standard SLA (Minutes)*", key: "sla_minutes", width: 25, example: "120" },
          { header: "Priority Color Hex", key: "priority_color", width: 20, example: "#EF4444" }
        );
      }

      if (activeConfig.table === "status_master") {
        columns.push(
          { header: "Status Color Hex", key: "status_color", width: 20, example: "#10B981" }
        );
      }

      if (activeConfig.table === "assets") {
        columns.push(
          { header: "Asset Tag (Required)*", key: "asset_tag", width: 25, example: "AST-2026-001" },
          { header: "Department Name / Code", key: "parent_name", width: 28, example: "Information Technology" }
        );
      }

      if (activeConfig.table === "fleet_insurance_vendors") {
        columns.push(
          { header: "Contact Person", key: "contact_person", width: 25, example: "Mr. Ramesh Sharma" },
          { header: "Phone", key: "phone", width: 20, example: "+91 98200 12345" },
          { header: "Email", key: "email", width: 28, example: "support@insuranceprovider.com" }
        );
      }

      sheet.columns = columns.map(col => ({ header: col.header, key: col.key, width: col.width }));

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D9488" } // Elegant Teal
      };
      headerRow.alignment = { vertical: "middle", horizontal: "left" };

      // Add 2 realistic sample rows
      for (let i = 1; i <= 2; i++) {
        const rowData: Record<string, any> = {};
        columns.forEach(c => {
          if (c.key === "code") rowData[c.key] = `${activeConfig.category.slice(0, 3)}-${String(i).padStart(3, "0")}`;
          else if (c.key === "name") rowData[c.key] = `${activeConfig.label} Example ${i}`;
          else rowData[c.key] = c.example;
        });
        const row = sheet.addRow(rowData);
        row.height = 22;
        row.font = { name: "Arial", size: 9 };
        row.alignment = { vertical: "middle" };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Chandak_${activeConfig.id}_Template.xlsx`);
      toast.success(`Template downloaded: Chandak_${activeConfig.id}_Template.xlsx`);
    } catch (err: any) {
      console.error("Template download error:", err);
      toast.error(`Failed to download template: ${err.message || "Unknown error"}`);
    }
  };

  // 2. Parse Uploaded Excel (.xlsx) / CSV File
  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParsedRows([]);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();

      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        const text = new TextDecoder().decode(buffer);
        await parseCsvContent(text);
      } else {
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error("No worksheets found in this Excel workbook.");
        }
        parseExcelWorksheet(worksheet);
      }

      toast.info(`Spreadsheet loaded. Review preview and click Import.`);
    } catch (err: any) {
      console.error("Error reading file:", err);
      toast.error(`Error parsing spreadsheet: ${err.message || "Invalid file"}`);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const normalizeHeaderKey = (raw: string): string => {
    const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.includes("code") && !clean.includes("parent")) return "code";
    if (clean.includes("name") && !clean.includes("parent") && !clean.includes("contact")) return "name";
    if (clean.includes("title")) return "name";
    if (clean.includes("desc") || clean.includes("remark") || clean.includes("note")) return "description";
    if (clean.includes("parent") || clean.includes("category") || clean.includes("system") || clean.includes("module") || clean.includes("dept") || clean.includes("department")) {
      return "parent_code";
    }
    if (clean.includes("tag") || clean.includes("assettag")) return "asset_tag";
    if (clean.includes("sla") || clean.includes("minute")) return "sla_minutes";
    if (clean.includes("color")) return "color";
    if (clean.includes("contact")) return "contact_person";
    if (clean.includes("phone") || clean.includes("mobile")) return "phone";
    if (clean.includes("email") || clean.includes("mail")) return "email";
    return clean;
  };

  const parseExcelWorksheet = (worksheet: ExcelJS.Worksheet) => {
    const headerRow = worksheet.getRow(1);
    const colMap: Record<number, string> = {};

    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value ? String(cell.value).trim() : "";
      if (val) {
        colMap[colNumber] = normalizeHeaderKey(val);
      }
    });

    const rows: ParsedRow[] = [];
    const existingCodeSet = new Set(
      existingRecords.map(r => (r.code || r.status_code || r.priority_code || "").trim().toUpperCase()).filter(Boolean)
    );
    const existingNameSet = new Set(
      existingRecords.map(r => (r.name || r.status_name || r.priority_name || "").trim().toLowerCase()).filter(Boolean)
    );

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip headers

      const rowData: Record<string, any> = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const key = colMap[colNumber];
        if (key) {
          let cellVal = cell.value;
          if (typeof cellVal === "object" && cellVal !== null) {
            if ("text" in cellVal) cellVal = (cellVal as any).text;
            else if ("result" in cellVal) cellVal = (cellVal as any).result;
          }
          if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== "") {
            hasData = true;
            rowData[key] = String(cellVal).trim();
          }
        }
      });

      if (hasData) {
        const errors: string[] = [];
        const code = (rowData.code || "").trim().toUpperCase();
        const name = (rowData.name || "").trim();

        if (!code && !name) {
          errors.push("Missing Code and Name.");
        } else if (!code && activeConfig.table !== "status_master" && activeConfig.table !== "priority_master") {
          errors.push("Record Code is mandatory.");
        } else if (!name) {
          errors.push("Record Name / Title is mandatory.");
        }

        if (activeConfig.parentRequired && !rowData.parent_code && !rowData.parent_id) {
          errors.push(`Parent link (${activeConfig.parentTable}) is required.`);
        }

        const isDuplicate = existingCodeSet.has(code) || (name && existingNameSet.has(name.toLowerCase()));
        rows.push({
          rowNumber,
          data: rowData,
          isValid: errors.length === 0,
          isDuplicate,
          errors
        });
      }
    });

    setParsedRows(rows);
  };

  const parseCsvContent = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => normalizeHeaderKey(h.trim().replace(/^["']|["']$/g, '')));
    const rows: ParsedRow[] = [];

    const existingCodeSet = new Set(
      existingRecords.map(r => (r.code || r.status_code || r.priority_code || "").trim().toUpperCase()).filter(Boolean)
    );
    const existingNameSet = new Set(
      existingRecords.map(r => (r.name || r.status_name || r.priority_name || "").trim().toLowerCase()).filter(Boolean)
    );

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const rowData: Record<string, any> = {};
      let hasData = false;

      headers.forEach((h, idx) => {
        if (h && cells[idx] !== undefined && cells[idx] !== "") {
          hasData = true;
          rowData[h] = cells[idx];
        }
      });

      if (hasData) {
        const errors: string[] = [];
        const code = (rowData.code || "").trim().toUpperCase();
        const name = (rowData.name || "").trim();

        if (!code && !name) {
          errors.push("Missing Code and Name.");
        } else if (!code && activeConfig.table !== "status_master" && activeConfig.table !== "priority_master") {
          errors.push("Record Code is mandatory.");
        } else if (!name) {
          errors.push("Record Name / Title is mandatory.");
        }

        if (activeConfig.parentRequired && !rowData.parent_code && !rowData.parent_id) {
          errors.push(`Parent link is required.`);
        }

        const isDuplicate = existingCodeSet.has(code) || (name && existingNameSet.has(name.toLowerCase()));
        rows.push({
          rowNumber: i + 1,
          data: rowData,
          isValid: errors.length === 0,
          isDuplicate,
          errors
        });
      }
    }

    setParsedRows(rows);
  };

  // 3. Execute Bulk Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.warning("No valid rows to import.");
      return;
    }

    setIsImporting(true);
    try {
      const recordsToImport = validRows.map(r => ({
        code: r.data.code,
        name: r.data.name,
        description: r.data.description,
        parent_code: r.data.parent_code,
        parent_name: r.data.parent_code,
        asset_tag: r.data.asset_tag,
        status_color: r.data.color,
        priority_color: r.data.color,
        sla_minutes: r.data.sla_minutes ? Number(r.data.sla_minutes) : undefined,
        contact_person: r.data.contact_person,
        phone: r.data.phone,
        email: r.data.email,
        scope_id: activeConfig.scopeId
      }));

      const res = await bulkImportMasterRecords(
        activeConfig.table,
        recordsToImport,
        duplicateStrategy,
        activeConfig.scopeId,
        activeConfig.parentKey,
        activeConfig.parentTable
      );

      if (!res.success) {
        throw new Error(res.error || "Bulk import failed.");
      }

      toast.success(
        `Bulk Import Successful! ${res.added} added, ${res.updated} updated, ${res.skipped} skipped.`
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      toast.error(`Import failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows for preview
  const filteredPreviewRows = parsedRows.filter(r => {
    if (activePreviewFilter === "VALID") return r.isValid && !r.isDuplicate;
    if (activePreviewFilter === "DUPLICATES") return r.isValid && r.isDuplicate;
    if (activePreviewFilter === "ERRORS") return !r.isValid;
    return true;
  });

  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;
  const duplicateCount = parsedRows.filter(r => r.isValid && r.isDuplicate).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

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
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Excel & CSV Bulk Import</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  {activeConfig.category}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bulk upload master records into <strong>{activeConfig.label}</strong> with automated schema validation
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
          {/* Step 1: Active Master Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                1. Selected Master Table
              </label>
              <span className="text-xs text-muted-foreground">
                Category: <strong>{activeConfig.category}</strong> • Relation: <code className="font-mono text-[11px]">{activeConfig.table}</code>
              </span>
            </div>

            <select
              value={selectedMasterId}
              onChange={e => {
                setSelectedMasterId(e.target.value);
                handleReset();
              }}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
            >
              {masterTables.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.category}] {t.label} — {t.desc}
                </option>
              ))}
            </select>
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
                  Download pre-formatted Excel template (.xlsx) with pre-styled headers, sample records, and column guidance.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Download Excel (.xlsx) Template</span>
              </button>
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
            <div className="p-8 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-3">
              <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-foreground">Analyzing spreadsheet structure & schema...</div>
            </div>
          )}

          {/* Step 4: Validation Summary & Preview */}
          {parsedRows.length > 0 && !isParsing && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Validation Summary:
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300">
                      Total: {parsedRows.length}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Valid: {validCount}
                    </span>
                    {duplicateCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        Duplicates: {duplicateCount}
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                        Errors: {errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Duplicate Strategy Radio */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-semibold">If Duplicate Exists:</span>
                  <select
                    value={duplicateStrategy}
                    onChange={e => setDuplicateStrategy(e.target.value as any)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground font-semibold"
                  >
                    <option value="SKIP">Skip Duplicate</option>
                    <option value="OVERWRITE">Update / Overwrite Existing</option>
                  </select>
                </div>
              </div>

              {/* Preview Tab Filters */}
              <div className="flex items-center gap-1 border-b border-border pb-2 text-xs">
                {(["ALL", "VALID", "DUPLICATES", "ERRORS"] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePreviewFilter(tab)}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      activePreviewFilter === tab
                        ? "bg-teal-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab === "ALL" && `All Rows (${parsedRows.length})`}
                    {tab === "VALID" && `New Valid (${validCount})`}
                    {tab === "DUPLICATES" && `Duplicates (${duplicateCount})`}
                    {tab === "ERRORS" && `Errors (${errorCount})`}
                  </button>
                ))}
              </div>

              {/* Preview Table */}
              <div className="rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-muted-foreground uppercase font-bold sticky top-0 text-[10px]">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Description</th>
                      {activeConfig.parentTable && <th className="p-2.5">Parent Link</th>}
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPreviewRows.slice(0, 50).map(r => (
                      <tr key={r.rowNumber} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-2.5 font-mono text-muted-foreground">#{r.rowNumber}</td>
                        <td className="p-2.5 font-mono font-bold text-foreground">{r.data.code || "-"}</td>
                        <td className="p-2.5 font-semibold text-foreground">{r.data.name || "-"}</td>
                        <td className="p-2.5 text-muted-foreground truncate max-w-xs">{r.data.description || "-"}</td>
                        {activeConfig.parentTable && (
                          <td className="p-2.5 text-muted-foreground font-mono">{r.data.parent_code || "-"}</td>
                        )}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          {!r.isValid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" title={r.errors.join(", ")}>
                              Error: {r.errors[0]}
                            </span>
                          ) : r.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Duplicate ({duplicateStrategy === "OVERWRITE" ? "Will Overwrite" : "Will Skip"})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Ready to Insert
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || validCount + (duplicateStrategy === "OVERWRITE" ? duplicateCount : 0) === 0 || isImporting}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Importing Records...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>
                  Execute Import ({validCount + (duplicateStrategy === "OVERWRITE" ? duplicateCount : 0)} Records)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
