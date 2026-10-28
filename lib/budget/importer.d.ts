// Types for importer.js (shared with the prototype; reads the Excel formats in the browser).
type XLSXModule = typeof import("xlsx");
type WorkBook = import("xlsx").WorkBook;

export interface ImportPayload {
  kind: "detail";
  file: string;
  project: { name: string; code: string };
  as_on: string;
  revision: number | null;
  areas: Record<string, unknown>;
  subprojects: { name: string; oc_date: string | null }[];
  cost_heads: Record<string, unknown>[];
  lines: { head: string; initial: number | null; ctc: number | null; incurred_override: number | null; remark: string | null; extra?: Record<string, string | number | boolean> }[];
  incurred: { head: string; amount: number; reference: string }[];
  warnings: string[];
  sheet_totals_cr: { initial: number | null; ctc: number | null; incurred: number | null };
}

export interface CostRow {
  row: number;
  month: string | null;
  department: string | null;
  category: string | null;
  sub_category: string | null;
  tower: string | null;
  amount: number | null;
  reference: string | null;
  problem?: string | null;
  /** Columns outside the standard format, {header: value}, matched to custom fields by header. */
  extra?: Record<string, string | number | boolean>;
}

declare const BudgetImporter: {
  detectKind(XLSX: XLSXModule, wb: WorkBook): "detail" | "cost" | null;
  parseDetailWorkbook(XLSX: XLSXModule, wb: WorkBook, fileName: string): unknown;
  toImportPayload(data: unknown): ImportPayload;
  parseCostSheet(XLSX: XLSXModule, wb: WorkBook, fileName: string): { kind: "cost"; file: string; rows: CostRow[]; errors: CostRow[] };
  paiseFromCr(v: string | number): number;
  paiseFromInr(v: string | number): number;
};
export default BudgetImporter;
