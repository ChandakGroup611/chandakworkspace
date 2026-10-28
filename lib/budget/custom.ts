// Server only: custom field values and formula results for the screens.
import * as D from "./data";
import { Dec, calculate, display, errorOf, toValue, type FieldDef, type Value } from "./formula";

// Custom field values for the screens: stored values plus the formula fields calculated here, on the
// server, with exact decimals, from the same figures the reports show. Each cell carries its display
// text, its stored value (for the input box) and, for a formula that cannot be worked out, why.

export interface Cell { text: string; raw: unknown; error: string | null }
export type Cells = Record<string, Cell>;
export interface CustomData { fields: D.CustomField[]; cells: Map<number, Cells>; inputs: Map<number, Record<string, Value>> }

export const cr = (n: number | string | null | undefined): Value => (n == null ? null : Dec.parse(String(n)));
export const crFromPaise = (p: number | string | null | undefined): Value => (p == null ? null : Dec.fromScaled(BigInt(p), 9));
export const rupeesFromPaise = (p: number | string | null | undefined): Value => (p == null ? null : Dec.fromScaled(BigInt(p), 2));
export const day = (d: string | null | undefined): Value => (d ? { date: d.slice(0, 10) } : null);

/** Names for user, department and tower values: "user:<id>" → name. */
export async function lookupNames(sb: D.Db, projectId: number | null, members: Record<string, string>) {
  const [depts, towers] = await Promise.all([D.getDepartments(sb), projectId ? D.getTowers(sb, projectId) : Promise.resolve([])]);
  return {
    ...Object.fromEntries(Object.entries(members).map(([id, n]) => [`user:${id}`, n])),
    ...Object.fromEntries(depts.map((d) => [`department:${d.id}`, d.name])),
    ...Object.fromEntries(towers.map((t) => [`tower:${t.id}`, t.name])),
  } as Record<string, string>;
}

/**
 * Loads and calculates one form's custom fields for some records.
 * builtins: record id → the built-in figures a formula may use (keys as in formula.BUILTINS).
 * lines: for version formulas, record id → that version's line inputs (for SUMLINES / COUNTLINES).
 */
export async function loadCustom(sb: D.Db, entity: D.Entity, projectId: number | null, builtins: Map<number, Record<string, Value>>,
  names: Record<string, string>, lines?: Map<number, Record<string, Value>[]>): Promise<CustomData> {
  const fields = await D.getCustomFields(sb, entity, projectId);
  const cells = new Map<number, Cells>();
  const inputs = new Map<number, Record<string, Value>>();
  if (!fields.length) return { fields, cells, inputs };
  const stored = await D.getCustomValues(sb, fields, [...builtins.keys()]);
  const defs = fields as unknown as FieldDef[];
  for (const [id, base] of builtins) {
    const raw = stored.get(id) ?? {};
    const values: Record<string, Value> = { ...base };
    for (const f of fields) if (f.field_type !== "formula") values[f.key] = toValue(f as unknown as FieldDef, raw[f.key], names);
    const calc = calculate(defs, { values, lines: lines?.get(id) });
    const row: Cells = {};
    for (const f of fields) {
      const def = f as unknown as FieldDef;
      if (f.field_type === "formula") {
        const v = calc[f.key];
        row[f.key] = { text: display(def, v), raw: null, error: errorOf(v) };
        if (!errorOf(v)) values[f.key] = v as Value;
      } else {
        const r = raw[f.key];
        row[f.key] = { text: r == null ? "" : display(def, values[f.key]), raw: r ?? null, error: null };
      }
    }
    cells.set(id, row);
    inputs.set(id, values);
  }
  return { fields, cells, inputs };
}

/** Line inputs (built-ins of a budget line) from its calculated figures. */
export function lineBuiltins(f: D.LineFigure, engArea: number | null | undefined): Record<string, Value> {
  return {
    initial: crFromPaise(f.initial_paise), ctc: crFromPaise(f.ctc_paise), incurred: crFromPaise(f.incurred_paise),
    balance: cr(f.balance_cr), variance: cr(f.variance_cr), util_pct: cr(f.util_pct), psf_initial: cr(f.psf_initial), psf_ctc: cr(f.psf_ctc),
    eng_area: cr(engArea ?? null),
  };
}

/** Line and version custom fields of one version, with version formulas able to total line fields. */
export async function loadVersionCustom(sb: D.Db, project: D.Project, v: D.Version, figs: D.LineFigure[], totals: D.Totals | undefined,
  net: number | null | undefined, names: Record<string, string>) {
  const lines = await loadCustom(sb, "line", project.id, new Map(figs.map((f) => [f.line_id, lineBuiltins(f, v.areas.eng_area)])), names);
  const a = v.areas;
  const versionBase: Record<string, Value> = {
    total_initial: cr(totals?.initial_cr), total_ctc: cr(totals?.ctc_cr), total_incurred: cr(totals?.incurred_cr), total_balance: cr(totals?.balance_cr),
    total_variance: cr(totals?.variance_cr), total_carpet: cr(a.total_carpet), net_sale_carpet: cr(net ?? null), sold_area: cr(a.sold_area),
    eng_area: cr(a.eng_area), design_area: cr(a.design_area), sale_value_cr: cr(a.sale_value_cr), as_on: day(v.as_on),
  };
  const version = await loadCustom(sb, "version", project.id, new Map([[v.id, versionBase]]), names, new Map([[v.id, [...lines.inputs.values()]]]));
  return { lines, version };
}

export const sections = (fields: D.CustomField[]) => {
  const out = new Map<string, D.CustomField[]>();
  for (const f of fields) {
    const s = f.section || "More details";
    if (!out.has(s)) out.set(s, []);
    out.get(s)!.push(f);
  }
  return [...out];
};
