"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileText, RotateCcw, Columns3, Search, X } from "lucide-react";
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
import { generateTicketReportData, type TicketReportRow } from "@/lib/actions/ticket_reports";

type ColumnKey = keyof TicketReportRow;

interface ReportColumn {
  key: ColumnKey;
  label: string;
  kind: "text" | "date" | "badge" | "number";
  defaultVisible: boolean;
  width: number;
}

const COLUMNS: ReportColumn[] = [
  { key: "code", label: "Code", kind: "text", defaultVisible: true, width: 120 },
  { key: "title", label: "Title", kind: "text", defaultVisible: true, width: 260 },
  { key: "scope", label: "Scope", kind: "text", defaultVisible: true, width: 150 },
  { key: "category", label: "Category", kind: "text", defaultVisible: true, width: 150 },
  { key: "subcategory", label: "Sub-category", kind: "text", defaultVisible: false, width: 150 },
  { key: "issue_type", label: "Issue type", kind: "text", defaultVisible: false, width: 140 },
  { key: "department", label: "Department", kind: "text", defaultVisible: false, width: 140 },
  { key: "priority", label: "Priority", kind: "badge", defaultVisible: true, width: 120 },
  { key: "status", label: "Status", kind: "badge", defaultVisible: true, width: 140 },
  { key: "creator_name", label: "Raised by", kind: "text", defaultVisible: true, width: 160 },
  { key: "assigned_to", label: "Assigned to", kind: "text", defaultVisible: true, width: 160 },
  { key: "due_date", label: "Due date", kind: "date", defaultVisible: true, width: 120 },
  { key: "created_at", label: "Created on", kind: "date", defaultVisible: true, width: 120 },
  { key: "updated_at", label: "Last updated", kind: "date", defaultVisible: false, width: 120 },
  { key: "age_days", label: "Open for (days)", kind: "number", defaultVisible: false, width: 120 },
  { key: "description", label: "Description", kind: "text", defaultVisible: false, width: 320 },
];

const COLUMN_STORAGE_KEY = "chandak_ticket_report_columns_v1";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** Date-only string (YYYY-MM-DD) of a timestamp in India time, for the date-range filter. */
function istDay(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function cellText(col: ReportColumn, row: TicketReportRow): string {
  const v = row[col.key];
  if (col.kind === "date") return formatDate(v as string | null);
  if (col.kind === "number") return v === null || v === undefined ? "—" : String(v);
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function optionsOf(rows: TicketReportRow[], key: ColumnKey) {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = r[key];
    if (v !== null && v !== undefined && v !== "") set.add(String(v));
  });
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

export default function TicketReportsClient() {
  const router = useRouter();
  const { hasPermission, roleCode } = usePermissions();
  const canExport =
    roleCode === "SUPER_ADMIN" || hasPermission("TICKETS_MANAGE") || hasPermission("REPORTS_EXPORT");

  const [rows, setRows] = useState<TicketReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const [query, setQuery] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const [visibleKeys, setVisibleKeys] = useState<ColumnKey[]>(
    COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Remember the chosen columns for this viewer (convenience only; safe if storage is blocked).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        const keys = (JSON.parse(saved) as string[]).filter((k) => COLUMNS.some((c) => c.key === k)) as ColumnKey[];
        if (keys.length) setVisibleKeys(keys);
      }
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleKeys));
    } catch { /* storage unavailable */ }
  }, [visibleKeys]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateTicketReportData();
      if (res.error) setError(res.error);
      setRows(res.rows || []);
      setTruncated(!!res.truncated);
    } catch (e: any) {
      setError(e?.message || "Could not load the ticket report.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.code} ${r.title} ${r.description}`.toLowerCase().includes(q)) return false;
      if (scopes.length && !scopes.includes(r.scope)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (priorities.length && !priorities.includes(r.priority)) return false;
      if (categories.length && !categories.includes(r.category)) return false;
      if (assignees.length && !assignees.includes(r.assigned_to)) return false;
      if (openOnly && r.is_closed) return false;
      const day = istDay(r.created_at);
      if (dateFrom && (!day || day < dateFrom)) return false;
      if (dateTo && (!day || day > dateTo)) return false;
      for (const [key, value] of Object.entries(columnFilters)) {
        if (!value) continue;
        const col = COLUMNS.find((c) => c.key === key);
        if (col && !cellText(col, r).toLowerCase().includes(value.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, query, scopes, statuses, priorities, categories, assignees, openOnly, dateFrom, dateTo, columnFilters]);

  const kpis = useMemo(() => {
    const open = filtered.filter((r) => !r.is_closed);
    const today = istDay(new Date().toISOString());
    const overdue = open.filter((r) => r.due_date && istDay(r.due_date) < today).length;
    const unassigned = open.filter((r) => r.assigned_to === "Unassigned").length;
    return [
      { label: "Tickets", value: filtered.length },
      { label: "Open", value: open.length, onClick: () => setOpenOnly((v) => !v), isActive: openOnly },
      { label: "Closed", value: filtered.length - open.length },
      { label: "Overdue", value: overdue },
      { label: "Unassigned", value: unassigned },
    ];
  }, [filtered, openOnly]);

  const hasFilters =
    !!query || scopes.length > 0 || statuses.length > 0 || priorities.length > 0 || categories.length > 0 ||
    assignees.length > 0 || openOnly || !!dateFrom || !!dateTo || Object.values(columnFilters).some(Boolean);

  const resetFilters = () => {
    setQuery("");
    setScopes([]);
    setStatuses([]);
    setPriorities([]);
    setCategories([]);
    setAssignees([]);
    setOpenOnly(false);
    setDateFrom("");
    setDateTo("");
    setColumnFilters({});
  };

  const fileStamp = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ticket report");
    sheet.columns = visibleColumns.map((c) => ({
      header: c.label,
      key: c.key,
      width: c.key === "title" || c.key === "description" ? 45 : 20,
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    filtered.forEach((r) => {
      const out: Record<string, string> = {};
      visibleColumns.forEach((c) => { out[c.key] = cellText(c, r); });
      sheet.addRow(out);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Ticket_Report_${fileStamp()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("Ticket report", 14, 15);
    autoTable(doc, {
      head: [visibleColumns.map((c) => c.label)],
      body: filtered.map((r) => visibleColumns.map((c) => cellText(c, r))),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`Ticket_Report_${fileStamp()}.pdf`);
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleKeys((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      return COLUMNS.filter((c) => prev.includes(c.key) || c.key === key).map((c) => c.key);
    });
  };

  if (loading) return <LoadingState label="Loading ticket report…" />;
  if (error && rows.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, title or description"
            aria-label="Search tickets"
            className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <MultiSelectFilter placeholder="Scope" options={optionsOf(rows, "scope")} selectedValues={scopes} onChange={setScopes} />
        <MultiSelectFilter placeholder="Status" options={optionsOf(rows, "status")} selectedValues={statuses} onChange={setStatuses} />
        <MultiSelectFilter placeholder="Priority" options={optionsOf(rows, "priority")} selectedValues={priorities} onChange={setPriorities} />
        <MultiSelectFilter placeholder="Category" options={optionsOf(rows, "category")} selectedValues={categories} onChange={setCategories} />
        <MultiSelectFilter placeholder="Assigned to" options={optionsOf(rows, "assigned_to")} selectedValues={assignees} onChange={setAssignees} />
        <label className="flex items-center gap-1 text-xs text-subtle">
          From
          {/* ui-audit-ignore-next-line html-date-input */}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Created from"
            className="h-9 px-2 text-sm rounded-md border border-border bg-surface text-foreground" />
        </label>
        <label className="flex items-center gap-1 text-xs text-subtle">
          To
          {/* ui-audit-ignore-next-line html-date-input */}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Created to"
            className="h-9 px-2 text-sm rounded-md border border-border bg-surface text-foreground" />
        </label>
        {hasFilters && (
          <AppButton variant="ghost" size="sm" onClick={resetFilters} leftIcon={<RotateCcw className="h-4 w-4" />}>
            Clear filters
          </AppButton>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <AppButton variant="outline" size="sm" onClick={() => setColumnsOpen((v) => !v)} leftIcon={<Columns3 className="h-4 w-4" />}
              aria-expanded={columnsOpen}>
              Columns
            </AppButton>
            {columnsOpen && (
              <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-border bg-elevated p-2 shadow-lg">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-semibold text-subtle">Show columns</span>
                  <button type="button" aria-label="Close column picker" onClick={() => setColumnsOpen(false)} className="text-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {COLUMNS.map((c) => (
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

      {truncated && (
        <p className="text-xs text-warning">Showing the newest 10,000 tickets. Narrow the filters to see older ones.</p>
      )}
      {error && rows.length > 0 && <p className="text-xs text-danger">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No tickets to report yet" : "No tickets match these filters"}
          description={rows.length === 0 ? "Tickets you can see will appear here." : "Change or clear the filters."}
          action={hasFilters ? <AppButton size="sm" variant="outline" onClick={resetFilters}>Clear filters</AppButton> : undefined}
        />
      ) : (
        <AppTableContainer maxHeight="calc(100vh - 300px)">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                {visibleColumns.map((c, i) => (
                  <AppTableHead
                    key={c.key}
                    style={{ minWidth: c.width, position: "sticky", top: 0, left: i === 0 ? 0 : undefined, zIndex: i === 0 ? 30 : 20 }}
                    className="bg-elevated border-b border-border px-4 py-2 text-foreground whitespace-nowrap"
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
                <AppTableRow
                  key={r.id}
                  onClick={() => router.push(`/tickets/${r.id}`)}
                  className="cursor-pointer hover:bg-surface-hover"
                  title={`Open ${r.code}`}
                >
                  {visibleColumns.map((c, i) => (
                    <AppTableCell
                      key={c.key}
                      style={i === 0 ? { position: "sticky", left: 0, zIndex: 10 } : undefined}
                      className={`px-4 py-2 text-sm ${i === 0 ? "bg-surface" : ""} ${c.kind === "date" || c.key === "code" ? "whitespace-nowrap" : ""}`}
                    >
                      {c.key === "code" ? (
                        <Link href={`/tickets/${r.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-primary hover:underline">
                          {r.code}
                        </Link>
                      ) : c.kind === "badge" && r[c.key] ? (
                        <AppBadge size="sm" customColor={c.key === "status" ? r.status_color : c.key === "priority" ? r.priority_color : null}>{cellText(c, r)}</AppBadge>
                      ) : c.key === "title" || c.key === "description" ? (
                        <span className="line-clamp-2" title={cellText(c, r)}>{cellText(c, r)}</span>
                      ) : (
                        cellText(c, r)
                      )}
                    </AppTableCell>
                  ))}
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableContainer>
      )}
    </div>
  );
}
