import * as D from "./data";
import { loadVersionCustom, lookupNames } from "./custom";
import { billsWorkbook, detailWorkbook, summaryWorkbook, workingsWorkbook, type BillsExport, type DetailExport, type SummaryExport, type WorkingsExport } from "./excel-export";

// Reads one version for the Excel downloads, as the signed-in user (so a member limited to some
// departments gets only those). Amounts are taken in paise and turned into crores once, so the file
// carries the exact figures, not the 6-decimal rounding of the screens.

const isNum = (f: D.CustomField) => f.field_type === "formula" ? !["text", "yes_no", "date"].includes(f.result_type ?? "")
  : ["number", "integer", "amount_cr", "amount_inr", "percent"].includes(f.field_type);
const crOf = (paise: number | string | null | undefined) => Number(paise ?? 0) / 1e9;

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function custom(sb: D.Db, project: D.Project, v: D.Version, figs: D.LineFigure[], names: Record<string, string>) {
  const [totals, areas] = await Promise.all([D.getTotals(sb, project.id), D.getVersionAreas(sb, v.id)]);
  const c = await loadVersionCustom(sb, project, v, figs, totals.find((x) => x.version_id === v.id), areas?.net_sale_carpet, await lookupNames(sb, project.id, names));
  const cells = c.version.cells.get(v.id) ?? {};
  return {
    areas,
    lineFields: c.lines.fields.filter((f) => f.show_in_reports).map((f) => ({
      label: f.label, numeric: isNum(f),
      values: new Map([...c.lines.cells].map(([id, row]) => [id, row[f.key]?.error ? "Error" : row[f.key]?.text ?? ""])),
    })),
    versionFields: c.version.fields.filter((f) => f.show_in_reports).map((f) => ({ label: f.label, value: cells[f.key]?.error ? "Error" : cells[f.key]?.text ?? "" })),
  };
}

export async function detailExport(sb: D.Db, project: D.Project, v: D.Version, names: Record<string, string>): Promise<DetailExport> {
  const [figs, towers, steps, heads] = await Promise.all([D.getLineFigures(sb, v.id), D.getTowers(sb, project.id), D.getSignoffStatus(sb, v.id), D.getHeads(sb, project.id)]);
  const c = await custom(sb, project, v, figs, names);
  const notes = v.tower_notes ?? {};
  return {
    project: project.name, versionNumber: v.number, asOn: v.as_on, areas: v.areas, netSaleCarpet: c.areas?.net_sale_carpet ?? null,
    towers: towers.map((t) => ({ ...t, oc_date: notes[String(t.id)]?.oc_date ?? t.oc_date, reason: notes[String(t.id)]?.reason ?? null })),
    lines: figs.filter((l) => !l.is_memo), memo: figs.filter((l) => l.is_memo), departmentRemarks: v.department_remarks ?? {},
    // the sign-off chain; a project without one shows who prepared and who approved the version
    signatures: steps.length ? steps.map((s) => ({ title: s.title, name: s.signed_by ? names[s.signed_by] ?? "Member" : null, date: s.signed_at }))
      : [{ title: "Prepared by", name: (v.prepared_by && names[v.prepared_by]) || null, date: null },
         { title: "Approved by", name: (v.approved_by && names[v.approved_by]) || null, date: v.approved_at }],
    lineFields: c.lineFields, versionFields: c.versionFields,
    taxRules: Object.fromEntries(heads.filter((h) => h.is_tax && h.tax_rate_pct != null)
      .map((h) => [String(h.id), { rate: Number(h.tax_rate_pct), share: Number(h.tax_share_pct ?? 100), base: (h.tax_base ?? []).map(Number) }])),
  };
}

export async function summaryExport(sb: D.Db, project: D.Project, v: D.Version, versions: D.Version[], names: Record<string, string>,
  note: string | null): Promise<SummaryExport> {
  const upTo = versions.filter((x) => x.number <= v.number);
  const ids = upTo.map((x) => x.id);
  const [rows, cats, totals, towers, figs] = await Promise.all([
    sb.from("budget_summary_rows").select("category, subcategory, amount_paise").eq("version_id", v.id).order("category_sort").order("subcategory_sort"),
    sb.from("budget_category_totals").select("version_id, category, budget_paise, incurred_paise").in("version_id", ids).order("category_sort"),
    sb.from("budget_version_totals").select("version_id, total_carpet, eng_area, ctc_paise").eq("project_id", project.id),
    D.getTowers(sb, project.id), D.getLineFigures(sb, v.id),
  ]);
  const sRows = must(rows) as { category: string; subcategory: string; amount_paise: number }[];
  const cRows = must(cats) as { version_id: number; category: string; budget_paise: number; incurred_paise: number }[];
  const tRows = must(totals) as { version_id: number; total_carpet: number | null; eng_area: number | null; ctc_paise: number }[];
  const c = await custom(sb, project, v, figs, names);
  const typeArea = (type: string, k: "carpet_area" | "eng_area") => {
    const ts = towers.filter((t) => t.type === type && t[k] != null);
    return ts.length ? ts.reduce((s, t) => s + Number(t[k]), 0) : null;
  };
  return {
    project: project.name, asOn: v.as_on, printedOn: new Date().toISOString().slice(0, 10), areas: v.areas,
    rows: sRows.map((r) => ({
      category: r.category, subcategory: r.subcategory, amount_cr: crOf(r.amount_paise),
      carpet: r.category === "Construction" ? typeArea(r.subcategory, "carpet_area") : null,
      eng: r.category === "Construction" ? typeArea(r.subcategory, "eng_area") : null,
    })),
    categories: cRows.filter((x) => x.version_id === v.id).map((x) => ({ category: x.category, budget_cr: crOf(x.budget_paise), incurred_cr: crOf(x.incurred_paise) })),
    versions: upTo.map((x) => {
      const t = tRows.find((y) => y.version_id === x.id);
      return {
        number: x.number, as_on: x.as_on, total_carpet: t?.total_carpet == null ? null : Number(t.total_carpet),
        eng_area: t?.eng_area == null ? null : Number(t.eng_area), ctc_cr: crOf(t?.ctc_paise),
        byCategory: Object.fromEntries(cRows.filter((y) => y.version_id === x.id).map((y) => [y.category, crOf(y.budget_paise)])),
      };
    }),
    reasons: v.category_reasons ?? {}, fyStartMonth: project.fy_start_month || 4, note, versionFields: c.versionFields,
    schedules: (await D.getSchedules(sb, v.id)).flatMap((s) => {
      const l = figs.find((f) => f.line_id === s.line_id);
      if (!l) return [];
      return [{
        title: s.title, line: [l.department, l.category, l.sub_category, l.subproject].filter(Boolean).join(" · "), category: l.summary_category, subcategory: l.summary_subcategory,
        rows: s.rows.map((r) => ({ label: r.label, qty: r.qty == null ? null : Number(r.qty), rate: r.rate == null ? null : Number(r.rate), pct: Number(r.pct), periods: Number(r.periods),
          typed: r.typed_paise == null ? null : Number(r.typed_paise) / 100, remark: r.remark })),
      }];
    }),
  };
}

export async function workingsExport(sb: D.Db, project: D.Project, v: D.Version): Promise<WorkingsExport> {
  const [areas, work, check] = await Promise.all([D.getTowerAreas(sb, v.id), D.getTowerWorkings(sb, v.id), D.getAllocationCheck(sb, v.id)]);
  const head = (x: { category: string; sub_category: string | null }) => (x.sub_category ? `${x.category} · ${x.sub_category}` : x.category);
  const towers = areas.filter((t) => work.some((w) => w.tower_id === t.tower_id));
  return {
    project: project.name, versionNumber: v.number, asOn: v.as_on,
    towers: towers.map((t) => ({
      name: t.name, type: t.type, bua: t.bua == null ? null : Number(t.bua), design: t.design_area == null ? null : Number(t.design_area),
      lines: work.filter((w) => w.tower_id === t.tower_id && !w.is_memo).map((w) => ({
        department: w.department, head: head(w), ctc: crOf(w.ctc_paise), certified: w.certified_paise == null ? null : crOf(w.certified_paise), incurred: crOf(w.incurred_paise), remark: w.remark,
      })),
    })),
    allocation: check.map((x) => ({
      department: x.department, head: head(x), unallocated: crOf(x.unallocated_paise), total: crOf(x.total_paise),
      byTower: towers.map((t) => crOf(work.filter((w) => w.tower_id === t.tower_id && w.cost_head_id === x.cost_head_id).reduce((s, w) => s + Number(w.ctc_paise), 0))),
    })),
  };
}

/** Bills dated up to the end of the version's as-on month: the ones its cost incurred counts. */
export async function billsExport(sb: D.Db, project: D.Project, v: D.Version): Promise<BillsExport> {
  const [bills, entries, heads, depts, towers] = await Promise.all([D.getBills(sb, project.id), D.getEntries(sb, project.id), D.getHeads(sb, project.id), D.getDepartments(sb), D.getTowers(sb, project.id)]);
  const head = new Map(heads.map((h) => [h.id, h]));
  const dept = new Map(depts.map((d) => [d.id, d.name]));
  const tower = new Map(towers.map((t) => [t.id, t.name]));
  const upto = v.as_on.slice(0, 7);
  return {
    project: project.name, versionNumber: v.number, asOn: v.as_on,
    bills: bills.filter((b) => b.bill_date.slice(0, 7) <= upto).reverse().map((b) => ({
      date: b.bill_date, vendor: b.vendor, billNo: b.bill_no, workOrder: b.work_order, gst: Number(b.gst_paise) / 100, note: b.note,
      splits: entries.filter((e) => e.bill_id === b.bill_id).map((e) => {
        const h = head.get(e.cost_head_id)!;
        return { department: dept.get(h.department_id) ?? "", head: h.sub_category ? `${h.category} · ${h.sub_category}` : h.category, tower: e.subproject_id ? tower.get(e.subproject_id) ?? null : null, amount: Number(e.amount_paise) / 100 };
      }),
    })),
  };
}

export { billsWorkbook, detailWorkbook, summaryWorkbook, workingsWorkbook };
