import ExcelJS from "exceljs";
import type { Areas, LineFigure, Tower } from "./data";
import { DETAIL_TEMPLATE, SUMMARY_TEMPLATE } from "./excel-templates";

// Excel downloads of the Detail and Summary reports, laid out as the company's two formats: every row
// takes its fonts, fills, borders, number format and height from the matching row of the format, and
// the sheet keeps the format's column widths, zoom and print set-up. Typed figures go in as values
// (exactly the database's figures); everything the format calculates (group totals, Balance, Variance,
// PSF, Utilised %, net carpet area, budget vs incurred) goes in as live Excel formulas, as in the format.

export interface DetailExport {
  project: string; versionNumber: number; asOn: string; areas: Areas; netSaleCarpet: number | null;
  /** Towers with the OC date of this version and the reason it moved (Remark column of the OC rows). */
  towers: (Tower & { reason?: string | null })[];
  /** Lines in the totals; memo items go below the table, outside every total. */
  lines: LineFigure[]; memo: LineFigure[];
  /** Remark per department id (Remark column of the department rows and the recap). */
  departmentRemarks: Record<string, string>;
  /** The sign-off block at the foot of the sheet: each level, who signed it and when. */
  signatures: { title: string; name: string | null; date: string | null }[];
  /** Custom line fields shown in reports: one column each after "Budget Utilise As %". */
  lineFields: { label: string; numeric: boolean; values: Map<number, string> }[];
  /** Custom version fields shown in reports: one row each under the OC dates. */
  versionFields: { label: string; value: string }[];
}

export interface SummaryExport {
  project: string; asOn: string; printedOn: string; areas: Areas;
  rows: { category: string; subcategory: string; amount_cr: number; carpet: number | null; eng: number | null }[];
  /** Budget and incurred by category for this version (Budget vs incurred table). */
  categories: { category: string; budget_cr: number; incurred_cr: number }[];
  /** Every version up to this one, oldest first, with its budget by category. */
  versions: { number: number; as_on: string; total_carpet: number | null; eng_area: number | null; ctc_cr: number; byCategory: Record<string, number> }[];
  reasons: Record<string, string>;
  fyStartMonth: number;
  note: string | null;
  versionFields: { label: string; value: string }[];
  /** Supporting schedules: one working sheet each, linked from its summary row. */
  schedules: { title: string; line: string; category: string; subcategory: string; rows: { label: string; qty: number | null; rate: number | null; pct: number; periods: number; typed: number | null; remark: string | null }[] }[];
}

type Value = string | number | Date | null | { formula: string };
const f = (formula: string): Value => ({ formula });
const cr = (paise: number | string) => Number(paise) / 1e9;
const day = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const col = (n: number) => { let s = ""; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const num = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));

async function loadTemplate(b64: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(b64, "base64") as unknown as ExcelJS.Buffer);
  return wb.worksheets[0];
}

/** Writes rows one after another, each styled as a given row of the format. */
class Sheet {
  ws: ExcelJS.Worksheet;
  r = 0;
  maxCol: number;
  constructor(wb: ExcelJS.Workbook, name: string, private src: ExcelJS.Worksheet, private cols: number) {
    this.maxCol = cols;
    this.ws = wb.addWorksheet(name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31), {
      views: src.views.map((v) => ({ ...v })), pageSetup: { ...src.pageSetup }, properties: { ...src.properties },
    });
    for (let c = 1; c <= cols; c++) this.ws.getColumn(c).width = src.getColumn(c).width;
  }
  /** A new row styled as row `from` of the format, over columns 1..width. */
  row(from: number, values: Record<string, Value> = {}, width = this.cols, fromCol?: (c: number) => number) {
    const r = ++this.r;
    const s = this.src.getRow(from), d = this.ws.getRow(r);
    if (s.height) d.height = s.height;
    for (let c = 1; c <= width; c++) d.getCell(c).style = JSON.parse(JSON.stringify(s.getCell(fromCol ? fromCol(c) : c).style ?? {}));
    for (const [k, v] of Object.entries(values)) this.set(`${k}${r}`, v);
    if (width > this.maxCol) this.maxCol = width;
    return r;
  }
  set(addr: string, v: Value) {
    this.ws.getCell(addr).value = v as ExcelJS.CellValue;
  }
  /** Copies the format's own text (headings) from row `from`, columns 1..width. */
  copyText(from: number, r: number, width = this.cols) {
    for (let c = 1; c <= width; c++) {
      const v = this.src.getRow(from).getCell(c).value;
      if (typeof v === "string") this.ws.getRow(r).getCell(c).value = v;
    }
  }
  merge(range: string) { this.ws.mergeCells(range); }
  skip(n = 1) { this.r += n; }
  async finish() {
    this.ws.pageSetup.printArea = `A1:${col(this.maxCol)}${this.r}`;
    return this.ws.workbook.xlsx.writeBuffer();
  }
}

/** Row height for wrapped text: the format's height per line, times the lines the text needs. */
const tall = (base: number, text: string, perLine: number) => base * Math.max(1, Math.ceil(text.length / perLine));

// ---------------------------------------------------------------- detail

interface Block { dept: string; deptId: number; first: boolean; cat: string; single: LineFigure | null; children: { c: string; d: string; line: LineFigure; sub: boolean }[] }

/** Department > category > line, grouped as on the format: a department whose cost heads have no
 *  sub-categories is one block; otherwise each category is its own numbered block. */
function blocks(lines: LineFigure[]) {
  const depts = new Map<number, LineFigure[]>();
  for (const l of lines) {
    if (!depts.has(l.department_id)) depts.set(l.department_id, []);
    depts.get(l.department_id)!.push(l);
  }
  const tower = (l: LineFigure) => (l.subproject ? ` (${l.subproject})` : "");
  const note = (l: LineFigure) => (l.note ? `* ${l.note}` : "");
  const out: Block[] = [];
  for (const ls of depts.values()) {
    const dept = ls[0].department, deptId = ls[0].department_id;
    const start = out.length;
    if (!ls.some((l) => l.sub_category)) {
      out.push({ dept, deptId, first: true, cat: "", single: null, children: ls.map((l) => ({ c: l.category + tower(l), d: note(l), line: l, sub: false })) });
      continue;
    }
    const cats = new Map<string, LineFigure[]>();
    for (const l of ls) {
      if (!cats.has(l.category)) cats.set(l.category, []);
      cats.get(l.category)!.push(l);
    }
    for (const [cat, cl] of cats) {
      if (cl.length === 1 && !cl[0].sub_category && !cl[0].subproject) out.push({ dept, deptId, first: out.length === start, cat, single: cl[0], children: [] });
      else out.push({
        dept, deptId, first: out.length === start, cat, single: null,
        children: cl.map((l) => ({ c: "", d: [(l.sub_category ?? "") + tower(l), note(l)].filter(Boolean).join(" "), line: l, sub: true })),
      });
    }
  }
  return out;
}

export async function detailWorkbook(x: DetailExport) {
  const src = await loadTemplate(DETAIL_TEMPLATE);
  const wb = new ExcelJS.Workbook();
  const extra = x.lineFields.length;
  const S = new Sheet(wb, `${x.project}_${x.asOn.slice(0, 10).split("-").reverse().join("")}`, src, 13);
  for (let i = 0; i < extra; i++) S.ws.getColumn(14 + i).width = 120;
  const a = x.areas;
  const psf = (c: string, r: number) => f(`IF($L$2=0,0,(${c}${r}/$L$2)*10^7)`);
  const util = (r: number) => f(`IF(H${r}=0,0,I${r}/H${r})`);

  // heading: title, construction areas, carpet areas, sale value, OC dates
  S.row(1, { A: `Chandak ${x.project} As On ${dmy(x.asOn)}_R${x.versionNumber}` }); S.merge("A1:M1");
  S.row(2, { A: "Construction Area (Sft) Engineering Team (Sale + Rehab + Society)", L: num(a.eng_area) }); S.merge("A2:K2"); S.merge("L2:M2");
  S.row(3, { A: "Construction Area (Sft) Design Team (Sale + Rehab + Society)", L: num(a.design_area) }); S.merge("A3:K3"); S.merge("L3:M3");
  const r4 = S.row(4); S.copyText(4, r4);
  const commitments = (a.commitments ?? []).map((c) => Number(c.area)).filter((n) => n);
  const r5 = S.row(5, {
    B: num(a.total_carpet), C: f(`B5${commitments.map((n) => `-${n}`).join("")}`), D: num(a.sold_area),
    G: f("IF(C5=0,0,D5/C5)"), I: f("C5-D5"), L: f("IF(C5=0,0,I5/C5)"),
  });
  for (const m of ["A4:A5", "D4:F4", "G4:H4", "I4:K4", "L4:M4", "D5:F5", "G5:H5", "I5:K5", "L5:M5"]) S.merge(m);
  void r5;
  const r6 = S.row(6, { A: "Total Sale Value (In Cr.)", L: num(a.sale_value_cr) }); S.merge(`A${r6}:K${r6}`); S.merge(`L${r6}:M${r6}`);
  for (const t of x.towers.filter((t) => t.oc_date)) {
    const r = S.row(7, { A: `OC Date ${t.name}`, K: day(t.oc_date!), L: t.reason || null }); S.merge(`A${r}:J${r}`); S.merge(`L${r}:M${r}`);
    if (t.reason) S.ws.getRow(r).height = tall(125, t.reason, 30);
  }
  for (const v of x.versionFields) {
    const r = S.row(7, { A: v.label, K: v.value }); S.merge(`A${r}:J${r}`); S.merge(`L${r}:M${r}`);
    S.ws.getCell(`K${r}`).numFmt = "General";
  }

  // the table
  const head = S.row(12, {}, 13 + extra, (c) => (c > 13 ? 12 : c)); S.copyText(12, head, 13);
  x.lineFields.forEach((fd, i) => S.set(`${col(14 + i)}${head}`, fd.label));
  const extraValues = (r: number, l: LineFigure) => x.lineFields.forEach((fd, i) => {
    const t = fd.values.get(l.line_id) ?? "";
    const n = fd.numeric ? Number(t.replace(/[^0-9.\-]/g, "")) : NaN;
    S.set(`${col(14 + i)}${r}`, t === "" ? null : fd.numeric && Number.isFinite(n) ? n : t);
  });
  const figures = (r: number, l: LineFigure) => {
    S.set(`G${r}`, cr(l.initial_paise)); S.set(`H${r}`, cr(l.ctc_paise)); S.set(`I${r}`, cr(l.incurred_paise));
    S.set(`L${r}`, l.remark ?? null);
  };
  const calc = (r: number) => { S.set(`E${r}`, psf("G", r)); S.set(`F${r}`, psf("H", r)); S.set(`J${r}`, f(`H${r}-I${r}`)); S.set(`K${r}`, f(`G${r}-H${r}`)); S.set(`M${r}`, util(r)); };

  const groupRows: { r: number; b: Block; sr: number }[] = [];
  blocks(x.lines).forEach((b, i) => {
    const r = S.row(13, { A: i + 1, B: b.dept, C: b.cat || null }, 13 + extra, (c) => (c > 13 ? 12 : c));
    S.ws.getRow(r).height = tall(62, b.cat, 50);
    calc(r);
    groupRows.push({ r, b, sr: i + 1 });
    const deptRemark = b.first ? x.departmentRemarks[String(b.deptId)] ?? null : null;
    S.set(`L${r}`, deptRemark);
    if (b.single) {
      figures(r, b.single);
      if (deptRemark) S.set(`L${r}`, [deptRemark, b.single.remark].filter(Boolean).join("; "));
      extraValues(r, b.single);
      return;
    }
    const first = S.r + 1;
    for (const ch of b.children) {
      const cr_ = S.row(ch.sub ? 37 : 14, { C: ch.c || null, D: ch.d || null }, 13 + extra, (c) => (c > 13 ? 12 : c));
      S.ws.getRow(cr_).height = tall(62, ch.sub ? ch.d : ch.c.length > ch.d.length ? ch.c : ch.d, 50);
      figures(cr_, ch.line);
      calc(cr_);
      extraValues(cr_, ch.line);
    }
    const last = S.r;
    for (const c of "GHI") S.set(`${c}${r}`, f(`SUM(${c}${first}:${c}${last})`));
  });
  const sumOf = (c: string) => f(groupRows.length ? groupRows.map((g) => `${c}${g.r}`).join("+") : "0");
  const tr = S.row(82, { A: "Total", G: sumOf("G"), H: sumOf("H"), I: sumOf("I"), J: sumOf("J") });
  S.set(`E${tr}`, psf("G", tr)); S.set(`F${tr}`, psf("H", tr)); S.set(`K${tr}`, f(`G${tr}-H${tr}`)); S.set(`M${tr}`, util(tr));
  S.merge(`A${tr}:D${tr}`);

  // memo items, as below the format's total: listed for reference, outside every total
  if (x.memo.length) {
    S.skip(2);
    S.row(85, { B: "Memo (not in totals)", D: "Estimated CTC (in Cr.)", E: "Cost Incurred (in Cr.) " });
    x.memo.forEach((l, i) => S.row(86, {
      A: i + 1, B: l.department, C: [l.category, l.sub_category, l.subproject].filter(Boolean).join(" · "), D: cr(l.ctc_paise), E: cr(l.incurred_paise),
    }));
  }

  // department recap, as below the format's table
  S.skip(2);
  const rh = S.row(89); S.copyText(89, rh); S.merge(`C${rh}:D${rh}`);
  const firstRecap = S.r + 1;
  for (const g of groupRows) {
    const r = S.row(90, {
      A: g.sr, B: g.b.dept, C: g.b.cat || null, E: f(`IF($L$2=0,0,(G${g.r}/$L$2)*10^7)`), F: f(`IF($L$2=0,0,(H${g.r}/$L$2)*10^7)`),
      G: f(`G${g.r}`), H: f(`H${g.r}`), I: f(`I${g.r}`), J: f(`J${g.r}`),
      L: g.b.first ? x.departmentRemarks[String(g.b.deptId)] ?? null : null,
    });
    S.set(`K${r}`, f(`G${r}-H${r}`));
    S.merge(`C${r}:D${r}`);
  }
  const lastRecap = S.r;
  const rt = S.row(98, { A: "Total" });
  for (const c of "EFGHIJ") S.set(`${c}${rt}`, f(groupRows.length ? `SUM(${c}${firstRecap}:${c}${lastRecap})` : "0"));
  S.set(`K${rt}`, f(`G${rt}-H${rt}`));
  S.merge(`A${rt}:D${rt}`);
  // as in the format: Variance below zero (CTC above the initial budget) red, above zero green
  for (const ref of [`K${head + 1}:K${tr}`, `K${firstRecap}:K${rt}`]) {
    S.ws.addConditionalFormatting({ ref, rules: [
      { type: "cellIs", operator: "lessThan", formulae: ["0"], priority: 1, style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF9B9B" }, bgColor: { argb: "FFFF9B9B" } } } },
      { type: "cellIs", operator: "greaterThan", formulae: ["0"], priority: 2, style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC5E0B4" }, bgColor: { argb: "FFC5E0B4" } } } },
    ] });
  }

  // sign-off block, as at the foot of the format: three levels to a row, a signature line over each
  if (x.signatures.length) {
    S.skip(2);
    const sh = S.row(99, { A: "Sign-off" }); S.merge(`A${sh}:L${sh}`);
    for (let i = 0; i < x.signatures.length; i += 3) {
      S.skip(2);
      S.row(106);
      const r = S.row(107);
      S.ws.getRow(r).height = 140;
      x.signatures.slice(i, i + 3).forEach((sg, j) => {
        const [a, b] = [["A", "B"], ["G", "H"], ["K", "L"]][j];
        S.set(`${a}${r}`, [sg.title, sg.name ?? "", sg.date ? `Signed ${dmy(sg.date)}` : sg.name ? "" : "Pending"].join("\n"));
        S.ws.getCell(`${a}${r}`).alignment = { horizontal: "center", vertical: "top", wrapText: true };
        S.merge(`${a}${r}:${b}${r}`);
      });
    }
  }
  return S.finish();
}

// ---------------------------------------------------------------- tower workings

export interface WorkingsExport {
  project: string; versionNumber: number; asOn: string;
  towers: { name: string; type: string | null; bua: number | null; design: number | null; lines: { department: string; head: string; ctc: number; certified: number | null; incurred: number; remark: string | null }[] }[];
  /** Cost heads split by tower: amount per tower (same order as `towers`), not allocated, total. */
  allocation: { department: string; head: string; byTower: number[]; unallocated: number; total: number }[];
}

const thin = { style: "thin" as const, color: { argb: "FF9AA3B2" } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const headFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFDCE6F1" } };

export interface BillsExport {
  project: string; versionNumber: number; asOn: string;
  bills: { date: string; vendor: string; billNo: string; workOrder: string | null; gst: number; note: string | null;
    splits: { department: string; head: string; tower: string | null; amount: number }[] }[];
}

/** The bills behind cost incurred: a Bills sheet (basic amount summed from the splits by formula, GST, total)
 *  and a Splits sheet, one row per cost head / tower a bill is split over. Amounts in rupees. */
export async function billsWorkbook(x: BillsExport) {
  const wb = new ExcelJS.Workbook();
  const heading = (ws: ExcelJS.Worksheet, labels: string[], widths: number[]) => {
    widths.forEach((w, c) => (ws.getColumn(c + 1).width = w));
    ws.getCell("A1").value = `${x.project} · bills up to ${dmy(x.asOn)} (R${x.versionNumber})`; ws.getCell("A1").font = { bold: true, size: 13 };
    labels.forEach((label, c) => { const cell = ws.getRow(3).getCell(c + 1); cell.value = label; cell.font = { bold: true }; cell.fill = headFill; cell.border = box; });
  };
  const bills = wb.addWorksheet("Bills", { views: [{ state: "frozen", ySplit: 3 }] });
  const splits = wb.addWorksheet("Splits", { views: [{ state: "frozen", ySplit: 3 }] });
  heading(bills, ["Ref", "Bill date", "Vendor", "Bill no.", "Work order", "Basic (₹)", "GST (₹)", "Total (₹)", "Note"], [7, 12, 32, 14, 16, 16, 14, 16, 36]);
  heading(splits, ["Ref", "Bill date", "Vendor", "Bill no.", "Department", "Cost head", "Tower", "Basic (₹)"], [7, 12, 32, 14, 20, 36, 14, 16]);
  let s = 4;
  x.bills.forEach((b, i) => {
    const n = 4 + i, ref = i + 1;
    bills.getRow(n).values = [ref, new Date(b.date), b.vendor, b.billNo, b.workOrder ?? "", { formula: `SUMIF(Splits!A:A,A${n},Splits!H:H)` }, b.gst, { formula: `F${n}+G${n}` }, b.note ?? ""] as ExcelJS.CellValue[];
    for (const p of b.splits) splits.getRow(s++).values = [ref, new Date(b.date), b.vendor, b.billNo, p.department, p.head, p.tower ?? "", p.amount] as ExcelJS.CellValue[];
  });
  const bt = 4 + x.bills.length;
  bills.getRow(bt).values = ["", "", "Total", "", "", { formula: `SUM(F4:F${bt - 1})` }, { formula: `SUM(G4:G${bt - 1})` }, { formula: `SUM(H4:H${bt - 1})` }] as ExcelJS.CellValue[];
  splits.getRow(s).values = ["", "", "Total", "", "", "", "", { formula: `SUM(H4:H${s - 1})` }] as ExcelJS.CellValue[];
  for (const [ws, last, cols, money] of [[bills, bt, 9, [6, 7, 8]], [splits, s, 8, [8]]] as [ExcelJS.Worksheet, number, number, number[]][]) {
    ws.getRow(last).font = { bold: true };
    for (let n = 4; n <= last; n++) for (let c = 1; c <= cols; c++) {
      const cell = ws.getRow(n).getCell(c); cell.border = box;
      if (money.includes(c)) cell.numFmt = "#,##0.00"; else if (c === 2) cell.numFmt = "dd-mm-yyyy";
    }
  }
  return wb.xlsx.writeBuffer();
}

/** One sheet per tower in the layout of the company's tower cost sheet ("Budget CTC"), and an
 *  Allocation sheet with the check against the Detail total. Amounts in crores; rate, balance and
 *  totals are live formulas. */
export async function workingsWorkbook(x: WorkingsExport) {
  const wb = new ExcelJS.Workbook();
  const used = new Set<string>();
  const sheetName = (n: string) => { let s = n.replace(/[\\/?*[\]:]/g, " ").slice(0, 28) || "Tower"; while (used.has(s)) s += "_"; used.add(s); return s; };
  for (const t of x.towers) {
    const ws = wb.addWorksheet(sheetName(t.name), { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    [8, 22, 46, 14, 16, 16, 18, 16, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ws.getCell("A1").value = "Budget CTC"; ws.getCell("A1").font = { bold: true, size: 14 };
    const info: [string, Value][] = [["PROJECT NAME:", x.project], ["SUB PROJECT:", t.name], ["BUILDING TYPE:", t.type], ["CONSTRUCTION (BUA):", t.bua], ["DESIGN AREA:", t.design],
      ["REVISION:", `R${x.versionNumber}`], ["DATE:", day(x.asOn)]];
    info.forEach(([k, v], i) => { const r = ws.getRow(2 + i); r.getCell(2).value = k; r.getCell(2).font = { bold: true }; r.getCell(3).value = v as ExcelJS.CellValue; });
    ws.getCell("C8").numFmt = "dd/mm/yyyy"; ws.getCell("C5").numFmt = "#,##0"; ws.getCell("C6").numFmt = "#,##0";
    const h = 10;
    ["Sr. No.", "Department", "Budget Work Category", "Rate per sq.ft", "Amount (in Cr.)", "Certified Amount in Cr.", "Balance Certified Amount in Cr.", "Cost Incurred (in Cr.)", "Remarks"]
      .forEach((label, i) => { const c = ws.getRow(h).getCell(i + 1); c.value = label; c.font = { bold: true }; c.fill = headFill; c.border = box; c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" }; });
    ws.getRow(h).height = 32;
    t.lines.forEach((l, i) => {
      const r = h + 1 + i, row = ws.getRow(r);
      row.values = [i + 1, l.department, l.head, { formula: `IF($C$5=0,"",E${r}*10^7/$C$5)` }, l.ctc, l.certified, { formula: `E${r}-F${r}` }, l.incurred, l.remark ?? ""] as ExcelJS.CellValue[];
    });
    const first = h + 1, last = h + t.lines.length, tr = last + 1;
    ws.getRow(tr).values = ["", "Total", "", { formula: `IF($C$5=0,"",E${tr}*10^7/$C$5)` }, ...["E", "F", "G", "H"].map((c) => ({ formula: t.lines.length ? `SUM(${c}${first}:${c}${last})` : "0" }))] as ExcelJS.CellValue[];
    ws.getRow(tr).font = { bold: true };
    for (let r = first; r <= tr; r++) for (let c = 1; c <= 9; c++) {
      const cell = ws.getRow(r).getCell(c); cell.border = box;
      if (c >= 4 && c <= 8) cell.numFmt = c === 4 ? "#,##0.00" : "#,##0.00;[Red]-#,##0.00";
      if (c === 9 || c === 3) cell.alignment = { wrapText: true, vertical: "top" };
    }
    ws.views = [{ state: "frozen", ySplit: h }];
  }
  // allocation check: towers, not allocated, total
  const ws = wb.addWorksheet("Allocation", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  const n = x.towers.length;
  ws.getCell("A1").value = `${x.project} R${x.versionNumber}: cost heads split by tower`; ws.getCell("A1").font = { bold: true, size: 13 };
  const hr = ws.getRow(3);
  ["Department", "Cost head", ...x.towers.map((t) => t.name), "Not allocated", "Total of towers", "Total (Detail)", "Diff"].forEach((label, i) => {
    const c = hr.getCell(i + 1); c.value = label; c.font = { bold: true }; c.fill = headFill; c.border = box; c.alignment = { wrapText: true, horizontal: "center" };
  });
  ws.getColumn(1).width = 22; ws.getColumn(2).width = 46;
  for (let i = 3; i <= n + 6; i++) ws.getColumn(i).width = 15;
  x.allocation.forEach((a, i) => {
    const r = 4 + i, tc = col(2 + n), un = col(3 + n);
    ws.getRow(r).values = [a.department, a.head, ...a.byTower, a.unallocated, { formula: n ? `SUM(C${r}:${tc}${r})` : "0" }, a.total, { formula: `${col(5 + n)}${r}-${col(4 + n)}${r}-${un}${r}` }] as ExcelJS.CellValue[];
    for (let c = 1; c <= n + 6; c++) { const cell = ws.getRow(r).getCell(c); cell.border = box; if (c > 2) cell.numFmt = "#,##0.00;[Red]-#,##0.00"; }
  });
  return wb.xlsx.writeBuffer();
}

// ---------------------------------------------------------------- summary

const fyOf = (iso: string, startMonth: number) => {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return m >= startMonth ? y : y - 1;
};

export async function summaryWorkbook(x: SummaryExport) {
  const src = await loadTemplate(SUMMARY_TEMPLATE);
  const wb = new ExcelJS.Workbook();
  const S = new Sheet(wb, "Summary", src, 7);
  const a = x.areas;

  S.row(1, { A: "Project Name :- ", B: x.project }); S.merge("B1:G1");
  S.row(2, { A: "Note: -", B: "Chandak Group Internal Working" }); S.merge("B2:G2");
  S.row(3, { F: "Date", G: day(x.asOn) }); S.merge("A3:E3");
  S.row(4, { F: "Print Date", G: day(x.printedOn) });
  const h = S.row(5); S.copyText(5, h);

  // categories and sub-categories
  const byCat = new Map<string, SummaryExport["rows"]>();
  for (const r of x.rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }
  const catRow = new Map<string, number>();
  let sr = 0;
  // working sheet names, one per schedule
  const used = new Set(["Summary"]);
  const sheetOf = x.schedules.map((s) => { let n = s.title.replace(/[\\/?*[\]:']/g, " ").slice(0, 28).trim() || "Working"; while (used.has(n)) n += "_"; used.add(n); return n; });
  for (const [cat, subs] of byCat) {
    const r = S.row(6, { A: ++sr, B: cat });
    catRow.set(cat, r);
    for (const s of subs) {
      const sr7 = S.row(7, { C: s.subcategory, D: s.carpet, E: s.eng, F: s.amount_cr });
      const i = x.schedules.findIndex((w) => w.category === cat && w.subcategory === s.subcategory);
      if (i >= 0) S.set(`C${sr7}`, { text: s.subcategory, hyperlink: `#'${sheetOf[i]}'!A1` } as unknown as Value);
    }
    S.set(`G${r}`, subs.length ? f(`SUM(F${r + 1}:F${S.r})`) : 0);
  }
  const first = 6, lastCat = S.r;
  const tr = S.row(67, { A: "Total", G: f(`SUM(G${first}:G${lastCat})`) }); S.merge(`A${tr}:F${tr}`);

  // note (the AI summary, when one has been written)
  S.skip();
  const note = `Note:- ${x.note ?? ""}`.trimEnd();
  const nr = S.row(69, { A: note });
  S.merge(`A${nr}:G${nr}`);
  S.ws.getCell(`A${nr}`).alignment = { ...S.ws.getCell(`A${nr}`).alignment, wrapText: true, vertical: "top" };
  S.ws.getRow(nr).height = tall(93, note, 110);
  S.skip();

  // area particulars
  const ph = S.row(71, { D: "Particluars" }); S.merge(`D${ph}:E${ph}`); S.merge(`F${ph}:G${ph}`);
  const area = (label: string, v: Value, from = 72) => { const r = S.row(from, { D: label, F: v }); S.merge(`D${r}:E${r}`); S.merge(`F${r}:G${r}`); return r; };
  const ra = area("Total Sale Carpet Area (Sq.Ft.) (A)", num(a.total_carpet));
  const letters: string[] = [];
  const commitRows = (a.commitments ?? []).map((c, i) => {
    const L = String.fromCharCode(66 + i);
    letters.push(L);
    return area(`${c.name} (Sq.Ft.) (${L})`, num(c.area));
  });
  const netL = String.fromCharCode(66 + letters.length);
  area(`Net Sale Carpet Area (Sq.Ft.) (${netL}=A${letters.map((l) => `-${l}`).join("")})`, f(`F${ra}${commitRows.map((r) => `-F${r}`).join("")}`), 76);
  { const r = S.row(77); S.merge(`D${r}:E${r}`); S.merge(`F${r}:G${r}`); }
  { const r = S.row(78, { D: "Sale Tower Area" }); S.merge(`D${r}:E${r}`); S.merge(`F${r}:G${r}`); }
  area("Residential Area", num(a.residential_area), 79);
  area("Commercial Area", num(a.commercial_area), 79);
  area("Retail Area", num(a.retail_area), 79);
  area("Society Sale", num(a.society_sale_area), 79);
  for (const v of x.versionFields) {
    const r = area(v.label, v.value, 79);
    S.ws.getCell(`F${r}`).numFmt = "General";
  }

  // budget vs incurred till the as-on date
  S.skip(2);
  S.row(85, { D: `Till ${dmy(x.asOn)}` });
  const bh = S.row(86); S.copyText(86, bh);
  const b1 = S.r + 1;
  x.categories.forEach((c, i) => {
    const r = S.row(87, { A: i + 1, B: c.category, C: catRow.has(c.category) ? f(`G${catRow.get(c.category)}`) : c.budget_cr, D: c.incurred_cr });
    S.set(`E${r}`, f(`C${r}-D${r}`));
  });
  const b2 = S.r;
  const bt = S.row(94);
  for (const c of "CDE") S.set(`${c}${bt}`, f(x.categories.length ? `SUM(${c}${b1}:${c}${b2})` : "0"));

  // version history
  S.skip(3);
  const vh = S.row(98); S.copyText(98, vh);
  for (const v of x.versions) S.row(99, { A: day(v.as_on), B: v.total_carpet, C: v.eng_area, D: v.ctc_cr });

  // budget by category, version by version: earlier financial years, then this year's versions with the reasons
  const thisFy = fyOf(x.asOn, x.fyStartMonth);
  const earlier = x.versions.filter((v) => fyOf(v.as_on, x.fyStartMonth) < thisFy);
  const current = x.versions.filter((v) => fyOf(v.as_on, x.fyStartMonth) === thisFy);
  const cats = x.categories.map((c) => c.category);
  const breakup = (vs: SummaryExport["versions"], reasons: boolean, rows: { title: number; head: number; body: number; total: number }) => {
    S.skip(3);
    const width = 2 + vs.length + (reasons ? 1 : 0);
    const W = Math.max(width, 6);
    for (let c = 8; c <= width; c++) S.ws.getColumn(c).width = 150;
    const dateCol = (c: number) => (c <= 2 ? c : Math.min(c, 5));
    const t = S.row(rows.title, { A: "Budget Month Wise and Category Wise Breakup" }, W); S.merge(`A${t}:${col(W)}${t}`);
    const hr = S.row(rows.head, { A: "Sr. No.", B: "Category" }, width, (c) => (reasons && c === width ? 6 : dateCol(c)));
    vs.forEach((v, i) => S.set(`${col(3 + i)}${hr}`, day(v.as_on)));
    if (reasons) S.set(`${col(width)}${hr}`, "Reason");
    const r1 = S.r + 1;
    cats.forEach((cat, i) => {
      const r = S.row(rows.body, { A: i + 1, B: cat }, width, (c) => (reasons && c === width ? 6 : dateCol(c)));
      vs.forEach((v, j) => S.set(`${col(3 + j)}${r}`, v.byCategory[cat] ?? 0));
      if (reasons) S.set(`${col(width)}${r}`, x.reasons[cat] ?? null);
    });
    const r2 = S.r;
    const tt = S.row(rows.total, {}, 2 + vs.length, dateCol);
    vs.forEach((_, j) => { const c = col(3 + j); S.set(`${c}${tt}`, f(cats.length ? `SUM(${c}${r1}:${c}${r2})` : "0")); });
  };
  if (earlier.length) breakup(earlier, false, { title: 109, head: 110, body: 111, total: 118 });
  breakup(current, true, { title: 121, head: 122, body: 123, total: 130 });

  // supporting schedules: the working sheets behind the summary rows (amounts in rupees, live formulas)
  x.schedules.forEach((s, i) => {
    const ws = wb.addWorksheet(sheetOf[i], { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    [6, 44, 14, 14, 10, 10, 18, 40].forEach((w, c) => (ws.getColumn(c + 1).width = w));
    ws.getCell("A1").value = s.title; ws.getCell("A1").font = { bold: true, size: 13 };
    ws.getCell("A2").value = `${x.project} · ${s.line} → Summary: ${s.category} · ${s.subcategory} · as on ${dmy(x.asOn)}`;
    ws.getCell("A3").value = { text: "← Summary", hyperlink: "#'Summary'!A1" } as unknown as ExcelJS.CellValue;
    const h = 5;
    ["Sr.", "Item", "Quantity", "Rate (₹)", "%", "Periods", "Amount (₹)", "Remark"].forEach((label, c) => {
      const cell = ws.getRow(h).getCell(c + 1); cell.value = label; cell.font = { bold: true }; cell.fill = headFill; cell.border = box;
    });
    s.rows.forEach((r, j) => {
      const n = h + 1 + j;
      ws.getRow(n).values = [j + 1, r.label, r.qty, r.rate, r.pct, r.periods,
        r.typed != null ? r.typed : { formula: `ROUND(C${n}*D${n}*E${n}/100*F${n},2)` }, r.remark ?? ""] as ExcelJS.CellValue[];
    });
    const t = h + 1 + s.rows.length;
    ws.getRow(t).values = ["", "Total (₹)", "", "", "", "", { formula: s.rows.length ? `SUM(G${h + 1}:G${t - 1})` : "0" }, { formula: `G${t}/10^7` }] as ExcelJS.CellValue[];
    ws.getRow(t).font = { bold: true };
    ws.getCell(`H${t}`).numFmt = '0.00" Cr"';
    for (let n = h + 1; n <= t; n++) for (let c = 1; c <= 8; c++) { const cell = ws.getRow(n).getCell(c); cell.border = box; if (c >= 3 && c <= 7) cell.numFmt = c === 7 ? "#,##0.00" : "#,##0.####"; }
  });
  return S.finish();
}
