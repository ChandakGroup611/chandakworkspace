"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileText, RotateCcw, Columns3, Search, X, RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import {
  AppTableContainer,
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableRow,
  AppTableHead,
  AppTableCell,
} from "@/components/ui/AppTable";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback/States";
import { usePermissions } from "@/hooks/usePermissions";
import { generateAMCReportData, type AMCReportData } from "@/lib/actions/amc_reports";

/* ------------------------------------------------------------------ */
/* Report definitions                                                  */
/* ------------------------------------------------------------------ */

type Row = Record<string, any> & { id: string };
type Kind = "text" | "date" | "datetime" | "money" | "number" | "percent" | "badge";
type Tone = "success" | "warning" | "danger" | "accent" | "neutral";

interface Column {
  key: string;
  label: string;
  kind: Kind;
  defaultVisible: boolean;
  width: number;
}

interface FilterDef {
  key: string;
  label: string;
}

interface ReportDef {
  id: ReportId;
  label: string;
  noun: string;
  dataKey: keyof Omit<AMCReportData, "error">;
  /** Field used by the From / To date filter. */
  dateKey: string;
  dateLabel: string;
  searchKeys: string[];
  filters: FilterDef[];
  columns: Column[];
  kpis: (rows: Row[]) => { label: string; value: string | number }[];
}

export type ReportId = "contracts" | "invoices" | "renewals" | "transactions" | "allocations";

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const sum = (rows: Row[], key: string) => rows.reduce((t, r) => t + (Number(r[key]) || 0), 0);

const REPORTS: ReportDef[] = [
  {
    id: "contracts",
    label: "Contracts",
    noun: "contracts",
    dataKey: "contracts",
    dateKey: "expiry_date",
    dateLabel: "Expiry",
    searchKeys: ["software_name", "vendor", "po_number", "owner"],
    filters: [
      { key: "contract_type", label: "Contract type" },
      { key: "renewal_state", label: "Renewal" },
      { key: "vendor", label: "Vendor" },
      { key: "department", label: "Department" },
      { key: "status", label: "Status" },
      { key: "owner", label: "Owner" },
    ],
    columns: [
      { key: "software_name", label: "Software / solution", kind: "text", defaultVisible: true, width: 220 },
      { key: "contract_type", label: "Contract type", kind: "badge", defaultVisible: true, width: 140 },
      { key: "vendor", label: "Vendor", kind: "text", defaultVisible: true, width: 160 },
      { key: "department", label: "Department", kind: "text", defaultVisible: true, width: 140 },
      { key: "cost_center", label: "Cost center", kind: "text", defaultVisible: false, width: 140 },
      { key: "owner", label: "Owner", kind: "text", defaultVisible: true, width: 150 },
      { key: "status", label: "Status", kind: "text", defaultVisible: false, width: 110 },
      { key: "approval_status", label: "Approval", kind: "text", defaultVisible: false, width: 140 },
      { key: "implementation_status", label: "Implementation", kind: "text", defaultVisible: false, width: 140 },
      { key: "purchase_date", label: "Start date", kind: "date", defaultVisible: true, width: 120 },
      { key: "expiry_date", label: "Expiry date", kind: "date", defaultVisible: true, width: 120 },
      { key: "days_to_expiry", label: "Days to expiry", kind: "number", defaultVisible: true, width: 120 },
      { key: "renewal_state", label: "Renewal", kind: "badge", defaultVisible: true, width: 140 },
      { key: "renewal_period", label: "Renewal period", kind: "text", defaultVisible: false, width: 130 },
      { key: "currency", label: "Currency", kind: "text", defaultVisible: false, width: 90 },
      { key: "cost", label: "Contract value", kind: "money", defaultVisible: true, width: 140 },
      { key: "monthly_cost", label: "Monthly cost", kind: "money", defaultVisible: true, width: 130 },
      { key: "remaining_value", label: "Remaining value", kind: "money", defaultVisible: false, width: 140 },
      { key: "total_licenses", label: "Licenses", kind: "number", defaultVisible: false, width: 100 },
      { key: "used_licenses", label: "Licenses used", kind: "number", defaultVisible: false, width: 120 },
      { key: "utilisation_pct", label: "Utilisation", kind: "percent", defaultVisible: false, width: 110 },
      { key: "risk_level", label: "Risk", kind: "text", defaultVisible: false, width: 100 },
      { key: "support_tier", label: "Support tier", kind: "text", defaultVisible: false, width: 120 },
      { key: "po_number", label: "PO number", kind: "text", defaultVisible: false, width: 130 },
      { key: "created_at", label: "Added on", kind: "datetime", defaultVisible: false, width: 120 },
    ],
    kpis: (rows) => [
      { label: "Contracts", value: rows.length },
      { label: "Subscriptions", value: rows.filter((r) => r.contract_type === "Subscription").length },
      { label: "AMCs", value: rows.filter((r) => r.contract_type === "AMC").length },
      { label: "Due in 90 days", value: rows.filter((r) => r.renewal_state === "Due in 30 days" || r.renewal_state === "Due in 90 days").length },
      { label: "Expired", value: rows.filter((r) => r.renewal_state === "Expired").length },
      { label: "Total value", value: money(sum(rows, "cost")) },
      { label: "Monthly cost", value: money(sum(rows, "monthly_cost")) },
    ],
  },
  {
    id: "invoices",
    label: "Invoices & payments",
    noun: "invoices",
    dataKey: "invoices",
    dateKey: "due_date",
    dateLabel: "Due",
    searchKeys: ["software_name", "invoice_number", "description", "vendor"],
    filters: [
      { key: "status", label: "Status" },
      { key: "contract_type", label: "Contract type" },
      { key: "vendor", label: "Vendor" },
      { key: "payment_type", label: "Payment type" },
    ],
    columns: [
      { key: "software_name", label: "Software / solution", kind: "text", defaultVisible: true, width: 220 },
      { key: "contract_type", label: "Contract type", kind: "badge", defaultVisible: true, width: 140 },
      { key: "vendor", label: "Vendor", kind: "text", defaultVisible: true, width: 160 },
      { key: "invoice_number", label: "Invoice no.", kind: "text", defaultVisible: true, width: 130 },
      { key: "description", label: "Description", kind: "text", defaultVisible: true, width: 240 },
      { key: "payment_type", label: "Payment type", kind: "text", defaultVisible: false, width: 130 },
      { key: "due_date", label: "Due date", kind: "date", defaultVisible: true, width: 120 },
      { key: "amount", label: "Amount", kind: "money", defaultVisible: true, width: 130 },
      { key: "status", label: "Status", kind: "badge", defaultVisible: true, width: 110 },
      { key: "payment_date", label: "Paid on", kind: "date", defaultVisible: true, width: 120 },
    ],
    kpis: (rows) => {
      const paid = rows.filter((r) => r.status === "Paid");
      const pending = rows.filter((r) => r.status === "Pending");
      const overdue = rows.filter((r) => r.status === "Overdue");
      return [
        { label: "Invoices", value: rows.length },
        { label: "Paid", value: money(sum(paid, "amount")) },
        { label: "Upcoming", value: money(sum(pending, "amount")) },
        { label: "Overdue", value: money(sum(overdue, "amount")) },
        { label: "Overdue invoices", value: overdue.length },
      ];
    },
  },
  {
    id: "renewals",
    label: "Renewals",
    noun: "renewals",
    dataKey: "renewals",
    dateKey: "renewal_date",
    dateLabel: "Renewed",
    searchKeys: ["software_name", "vendor", "po_number", "notes"],
    filters: [
      { key: "contract_type", label: "Contract type" },
      { key: "vendor", label: "Vendor" },
    ],
    columns: [
      { key: "software_name", label: "Software / solution", kind: "text", defaultVisible: true, width: 220 },
      { key: "contract_type", label: "Contract type", kind: "badge", defaultVisible: true, width: 140 },
      { key: "vendor", label: "Vendor", kind: "text", defaultVisible: true, width: 160 },
      { key: "renewal_date", label: "Renewed on", kind: "date", defaultVisible: true, width: 120 },
      { key: "previous_expiry", label: "Previous expiry", kind: "date", defaultVisible: true, width: 130 },
      { key: "new_expiry", label: "New expiry", kind: "date", defaultVisible: true, width: 120 },
      { key: "renewal_cost", label: "Renewal cost", kind: "money", defaultVisible: true, width: 130 },
      { key: "po_number", label: "PO number", kind: "text", defaultVisible: true, width: 130 },
      { key: "notes", label: "Notes", kind: "text", defaultVisible: false, width: 260 },
    ],
    kpis: (rows) => [
      { label: "Renewals", value: rows.length },
      { label: "Contracts renewed", value: new Set(rows.map((r) => r.amc_id)).size },
      { label: "Renewal spend", value: money(sum(rows, "renewal_cost")) },
    ],
  },
  {
    id: "transactions",
    label: "Add-ons & transactions",
    noun: "transactions",
    dataKey: "transactions",
    dateKey: "transaction_date",
    dateLabel: "Date",
    searchKeys: ["software_name", "line_item", "po_number", "notes", "vendor"],
    filters: [
      { key: "transaction_type", label: "Type" },
      { key: "contract_type", label: "Contract type" },
      { key: "vendor", label: "Vendor" },
    ],
    columns: [
      { key: "software_name", label: "Software / solution", kind: "text", defaultVisible: true, width: 220 },
      { key: "contract_type", label: "Contract type", kind: "badge", defaultVisible: false, width: 140 },
      { key: "vendor", label: "Vendor", kind: "text", defaultVisible: true, width: 160 },
      { key: "transaction_type", label: "Type", kind: "text", defaultVisible: true, width: 150 },
      { key: "line_item", label: "Line item", kind: "text", defaultVisible: true, width: 180 },
      { key: "transaction_date", label: "Date", kind: "date", defaultVisible: true, width: 120 },
      { key: "cost", label: "Cost", kind: "money", defaultVisible: true, width: 130 },
      { key: "licenses_added", label: "Licenses added", kind: "number", defaultVisible: true, width: 120 },
      { key: "po_number", label: "PO number", kind: "text", defaultVisible: true, width: 130 },
      { key: "notes", label: "Notes", kind: "text", defaultVisible: false, width: 260 },
    ],
    kpis: (rows) => [
      { label: "Transactions", value: rows.length },
      { label: "Licenses added", value: sum(rows, "licenses_added") },
      { label: "Total spend", value: money(sum(rows, "cost")) },
    ],
  },
  {
    id: "allocations",
    label: "License allocations",
    noun: "allocations",
    dataKey: "allocations",
    dateKey: "allocated_at",
    dateLabel: "Allocated",
    searchKeys: ["software_name", "user_name", "allocated_by", "notes"],
    filters: [
      { key: "status", label: "Status" },
      { key: "software_name", label: "Software" },
      { key: "contract_type", label: "Contract type" },
    ],
    columns: [
      { key: "software_name", label: "Software / solution", kind: "text", defaultVisible: true, width: 220 },
      { key: "contract_type", label: "Contract type", kind: "badge", defaultVisible: false, width: 140 },
      { key: "user_name", label: "User", kind: "text", defaultVisible: true, width: 170 },
      { key: "allocated_by", label: "Allocated by", kind: "text", defaultVisible: true, width: 170 },
      { key: "allocated_at", label: "Allocated on", kind: "datetime", defaultVisible: true, width: 120 },
      { key: "status", label: "Status", kind: "badge", defaultVisible: true, width: 110 },
      { key: "revoked_at", label: "Revoked on", kind: "datetime", defaultVisible: true, width: 120 },
      { key: "notes", label: "Notes", kind: "text", defaultVisible: false, width: 260 },
    ],
    kpis: (rows) => [
      { label: "Allocations", value: rows.length },
      { label: "Active", value: rows.filter((r) => r.status === "Active").length },
      { label: "Revoked", value: rows.filter((r) => r.status === "Revoked").length },
      { label: "Users", value: new Set(rows.filter((r) => r.status === "Active").map((r) => r.user_name)).size },
    ],
  },
];

const BADGE_TONE: Record<string, Tone> = {
  // contract type
  AMC: "accent",
  Subscription: "warning",
  // renewal state
  Expired: "danger",
  "Due in 30 days": "danger",
  "Due in 90 days": "warning",
  Active: "success",
  // invoice status
  Paid: "success",
  Overdue: "danger",
  Pending: "warning",
  Cancelled: "neutral",
  Revoked: "neutral",
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // Plain dates (YYYY-MM-DD) are calendar days: format without a timezone shift.
  const plain = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = new Date(plain ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: plain ? "UTC" : "Asia/Kolkata",
  });
}

/** Calendar day (YYYY-MM-DD) for the date-range filter, in India time for timestamps. */
function dayKey(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function cellText(col: Column, row: Row): string {
  const v = row[col.key];
  if (col.kind === "date" || col.kind === "datetime") return formatDate(v);
  if (v === null || v === undefined || v === "") return "—";
  if (col.kind === "money") {
    const n = Number(v) || 0;
    const cur = row.currency && row.currency !== "INR" ? `${row.currency} ` : "₹ ";
    return `${cur}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (col.kind === "percent") return `${v}%`;
  return String(v);
}

/** Value written to Excel: real numbers / dates so totals and sorting work there. */
function excelValue(col: Column, row: Row): string | number | Date | null {
  const v = row[col.key];
  if (v === null || v === undefined || v === "") return null;
  if (col.kind === "money" || col.kind === "number") return Number(v) || 0;
  if (col.kind === "percent") return (Number(v) || 0) / 100;
  if (col.kind === "date" || col.kind === "datetime") {
    const day = dayKey(v);
    return day ? new Date(`${day}T00:00:00Z`) : null;
  }
  return String(v);
}

function optionsOf(rows: Row[], key: string) {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = r[key];
    if (v !== null && v !== undefined && v !== "") set.add(String(v));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
}

const storageKey = (id: ReportId) => `chandak_amc_report_columns_v1_${id}`;

function readSavedColumns(def: ReportDef): string[] {
  const fallback = def.columns.filter((c) => c.defaultVisible).map((c) => c.key);
  try {
    const saved = window.localStorage.getItem(storageKey(def.id));
    if (!saved) return fallback;
    const keys = (JSON.parse(saved) as string[]).filter((k) => def.columns.some((c) => c.key === k));
    return keys.length ? keys : fallback;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const EMPTY_DATA: AMCReportData = { contracts: [], invoices: [], renewals: [], transactions: [], allocations: [] };

export default function AMCReportsClient({
  reportIds,
  defaultReport,
}: {
  /** Limit the ledgers offered (e.g. the Transactions page shows invoices, renewals, add-ons, allocations). */
  reportIds?: ReportId[];
  defaultReport?: ReportId;
} = {}) {
  const shownReports = useMemo(() => (reportIds?.length ? REPORTS.filter((r) => reportIds.includes(r.id)) : REPORTS), [reportIds]);
  const { hasPermission, roleCode } = usePermissions();
  const canExport =
    roleCode === "SUPER_ADMIN" || hasPermission("AMC_MANAGE") || hasPermission("AMC_EXPORT") || hasPermission("REPORTS_EXPORT");

  const [data, setData] = useState<AMCReportData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportId, setReportId] = useState<ReportId>(defaultReport ?? (reportIds?.[0] || "contracts"));
  const def = useMemo(() => REPORTS.find((r) => r.id === reportId)!, [reportId]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => def.columns.filter((c) => c.defaultVisible).map((c) => c.key));
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Switching report: reset filters and restore that report's saved columns.
  useEffect(() => {
    setQuery("");
    setSelected({});
    setDateFrom("");
    setDateTo("");
    setColumnFilters({});
    setColumnsOpen(false);
    setVisibleKeys(readSavedColumns(def));
  }, [def]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(def.id), JSON.stringify(visibleKeys));
    } catch { /* storage unavailable */ }
  }, [def.id, visibleKeys]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateAMCReportData();
      if (res.error) setError(res.error);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Could not load the AMC report.");
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = (data[def.dataKey] || []) as Row[];
  const visibleColumns = useMemo(() => def.columns.filter((c) => visibleKeys.includes(c.key)), [def, visibleKeys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !def.searchKeys.map((k) => r[k] ?? "").join(" ").toLowerCase().includes(q)) return false;
      for (const f of def.filters) {
        const values = selected[f.key];
        if (values?.length && !values.includes(String(r[f.key] ?? ""))) return false;
      }
      const day = dayKey(r[def.dateKey]);
      if (dateFrom && (!day || day < dateFrom)) return false;
      if (dateTo && (!day || day > dateTo)) return false;
      for (const [key, value] of Object.entries(columnFilters)) {
        if (!value) continue;
        const col = def.columns.find((c) => c.key === key);
        if (col && !cellText(col, r).toLowerCase().includes(value.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, def, query, selected, dateFrom, dateTo, columnFilters]);

  const kpis = useMemo(() => def.kpis(filtered), [def, filtered]);

  const hasFilters =
    !!query || !!dateFrom || !!dateTo ||
    Object.values(selected).some((v) => v.length > 0) ||
    Object.values(columnFilters).some(Boolean);

  const resetFilters = () => {
    setQuery("");
    setSelected({});
    setDateFrom("");
    setDateTo("");
    setColumnFilters({});
  };

  const toggleColumn = (key: string) => {
    setVisibleKeys((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      return def.columns.filter((c) => prev.includes(c.key) || c.key === key).map((c) => c.key);
    });
  };

  const fileStamp = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const fileBase = () => `AMC_${def.label.replace(/[^A-Za-z]+/g, "_").replace(/_+$/, "")}_Report_${fileStamp()}`;

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(def.label.slice(0, 31));
    sheet.columns = visibleColumns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.max(12, Math.round(c.width / 7)),
      style:
        c.kind === "money" ? { numFmt: "#,##0.00" } :
        c.kind === "percent" ? { numFmt: "0%" } :
        c.kind === "date" || c.kind === "datetime" ? { numFmt: "dd-mmm-yyyy" } : {},
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    filtered.forEach((r) => {
      const out: Record<string, any> = {};
      visibleColumns.forEach((c) => { out[c.key] = excelValue(c, r); });
      sheet.addRow(out);
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileBase()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text(`AMC & subscriptions: ${def.label}`, 14, 15);
    doc.setFontSize(9);
    doc.text(kpis.map((k) => `${k.label}: ${k.value}`).join("   ·   "), 14, 21);
    autoTable(doc, {
      head: [visibleColumns.map((c) => c.label)],
      body: filtered.map((r) => visibleColumns.map((c) => cellText(c, r).replace("₹ ", "Rs "))),
      startY: 26,
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`${fileBase()}.pdf`);
  };

  if (loading) return <LoadingState label="Loading AMC & subscription reports…" />;
  const allEmpty = shownReports.every((r) => !(data[r.dataKey] || []).length);
  if (error && allEmpty) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-3">
      {/* Report switcher */}
      <div role="tablist" aria-label="Report" className="flex flex-wrap gap-1 rounded-lg border border-border bg-elevated p-1 w-fit max-w-full">
        {shownReports.map((r) => {
          const count = (data[r.dataKey] || []).length;
          const active = r.id === reportId;
          return (
            <AppButton
              key={r.id}
              type="button"
              role="tab"
              aria-selected={active}
              variant={active ? "primary" : "ghost"}
              size="sm"
              onClick={() => setReportId(r.id)}
              className="h-8 px-3 text-[13px] font-medium"
            >
              {r.label}
              <span className={`ml-1.5 text-[11px] ${active ? "opacity-80" : "text-muted"}`}>{count}</span>
            </AppButton>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${def.noun}`}
            aria-label={`Search ${def.noun}`}
            className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
          />
        </div>
        {def.filters.map((f) => (
          <MultiSelectFilter
            key={`${def.id}-${f.key}`}
            placeholder={f.label}
            options={optionsOf(rows, f.key)}
            selectedValues={selected[f.key] || []}
            onChange={(vals: string[]) => setSelected((prev) => ({ ...prev, [f.key]: vals }))}
          />
        ))}
        <label className="flex items-center gap-1 text-xs text-subtle">
          {def.dateLabel} from
          {/* ui-audit-ignore-next-line html-date-input */}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label={`${def.dateLabel} from`}
            className="h-9 px-2 text-sm rounded-md border border-border bg-surface text-foreground" />
        </label>
        <label className="flex items-center gap-1 text-xs text-subtle">
          to
          {/* ui-audit-ignore-next-line html-date-input */}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label={`${def.dateLabel} to`}
            className="h-9 px-2 text-sm rounded-md border border-border bg-surface text-foreground" />
        </label>
        {hasFilters && (
          <AppButton variant="ghost" size="sm" onClick={resetFilters} leftIcon={<RotateCcw className="h-4 w-4" />}>
            Clear filters
          </AppButton>
        )}

        <div className="ml-auto flex items-center gap-2">
          <AppButton variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />} aria-label="Reload report">
            Refresh
          </AppButton>
          <div className="relative">
            <AppButton variant="outline" size="sm" onClick={() => setColumnsOpen((v) => !v)} leftIcon={<Columns3 className="h-4 w-4" />}
              aria-expanded={columnsOpen}>
              Columns
            </AppButton>
            {columnsOpen && (
              <div className="absolute right-0 z-40 mt-1 w-60 rounded-md border border-border bg-elevated p-2 shadow-lg">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-semibold text-subtle">Show columns</span>
                  <AppButton type="button" variant="ghost" size="icon-sm" aria-label="Close column picker" onClick={() => setColumnsOpen(false)} className="text-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                  </AppButton>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {def.columns.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-sm text-foreground rounded hover:bg-surface cursor-pointer">
                      <input type="checkbox" checked={visibleKeys.includes(c.key)} onChange={() => toggleColumn(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {canExport && (
            <>
              <AppButton variant="outline" size="sm" onClick={exportToExcel} disabled={filtered.length === 0}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
                Excel
              </AppButton>
              <AppButton variant="outline" size="sm" onClick={exportToPDF} disabled={filtered.length === 0}
                leftIcon={<FileText className="h-4 w-4" />}>
                PDF
              </AppButton>
            </>
          )}
        </div>
      </div>

      <ReportKPIBar kpis={kpis} className="mb-1" />

      {error && !allEmpty && <p className="text-xs text-danger">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? `No ${def.noun} to report yet` : `No ${def.noun} match these filters`}
          description={rows.length === 0 ? "Records you can see in AMC & subscriptions will appear here." : "Change or clear the filters."}
          action={hasFilters ? <AppButton size="sm" variant="outline" onClick={resetFilters}>Clear filters</AppButton> : undefined}
        />
      ) : (
        <AppTableContainer maxHeight="calc(100vh - 340px)">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                {visibleColumns.map((c, i) => (
                  <AppTableHead
                    key={c.key}
                    style={{ minWidth: c.width, position: "sticky", top: 0, left: i === 0 ? 0 : undefined, zIndex: i === 0 ? 30 : 20 }}
                    className={`bg-elevated border-b border-border px-4 py-2 text-foreground whitespace-nowrap ${c.kind === "money" || c.kind === "number" || c.kind === "percent" ? "text-right" : ""}`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <span>{c.label}</span>
                      <input
                        type="text"
                        value={columnFilters[c.key] || ""}
                        onChange={(e) => setColumnFilters((prev) => ({ ...prev, [c.key]: e.target.value }))}
                        placeholder={`Filter ${c.label}…`}
                        aria-label={`Filter ${c.label}`}
                        className="w-full text-[11px] font-normal px-2 py-1 rounded border border-border bg-surface text-foreground focus:outline-none focus:border-primary placeholder:text-muted"
                      />
                    </div>
                  </AppTableHead>
                ))}
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filtered.map((r) => (
                <AppTableRow key={r.id} className="hover:bg-surface-hover">
                  {visibleColumns.map((c, i) => {
                    const text = cellText(c, r);
                    const numeric = c.kind === "money" || c.kind === "number" || c.kind === "percent";
                    return (
                      <AppTableCell
                        key={c.key}
                        style={i === 0 ? { position: "sticky", left: 0, zIndex: 10 } : undefined}
                        className={`px-4 py-2 text-sm ${i === 0 ? "bg-surface" : ""} ${numeric ? "text-right font-mono tabular-nums whitespace-nowrap" : ""} ${c.kind === "date" || c.kind === "datetime" ? "whitespace-nowrap" : ""}`}
                      >
                        {c.key === "software_name" && r.software_name ? (
                          <Link
                            href={`/amc?q=${encodeURIComponent(r.software_name)}`}
                            className="font-medium text-primary hover:underline"
                            title={`Open ${r.software_name} in AMC & subscriptions`}
                          >
                            {r.software_name}
                          </Link>
                        ) : c.kind === "badge" && r[c.key] ? (
                          <AppBadge size="sm" variant={BADGE_TONE[String(r[c.key])] || "neutral"}>{text}</AppBadge>
                        ) : c.key === "days_to_expiry" && r.days_to_expiry !== null ? (
                          <span className={r.days_to_expiry < 0 ? "text-danger-text" : r.days_to_expiry <= 30 ? "text-warning-text" : ""}>{text}</span>
                        ) : c.key === "description" || c.key === "notes" ? (
                          <span className="line-clamp-2" title={text}>{text}</span>
                        ) : (
                          text
                        )}
                      </AppTableCell>
                    );
                  })}
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableContainer>
      )}
    </div>
  );
}
