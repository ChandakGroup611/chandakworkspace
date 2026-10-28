import type { LineFigure } from "./data";

// Groups the database's line figures into Department > Category > line, as on the detail format.
// Group totals add up figures already calculated per line by budget_line_figures.

export interface Figures {
  initial_cr: number; ctc_cr: number; incurred_cr: number; balance_cr: number; variance_cr: number;
  util_pct: number | null; psf_initial: number | null; psf_ctc: number | null;
}
export interface CategoryGroup { category: string; totals: Figures; lines: LineFigure[]; grouped: boolean }
export interface DepartmentGroup { sr: number; department: string; department_id: number; totals: Figures; categories: CategoryGroup[] }

export function addUp(lines: LineFigure[], engArea: number | null | undefined): Figures {
  let initial = 0, ctc = 0, incurred = 0;
  for (const l of lines) {
    initial += Number(l.initial_paise);
    ctc += Number(l.ctc_paise);
    incurred += Number(l.incurred_paise);
  }
  const area = Number(engArea) || null;
  return {
    initial_cr: initial / 1e9, ctc_cr: ctc / 1e9, incurred_cr: incurred / 1e9,
    balance_cr: (ctc - incurred) / 1e9, variance_cr: (initial - ctc) / 1e9,
    util_pct: ctc ? Math.round((incurred * 10000) / ctc) / 100 : null,
    psf_initial: area ? Math.round(initial / area) / 100 : null,
    psf_ctc: area ? Math.round(ctc / area) / 100 : null,
  };
}

export function groupDetail(figs: LineFigure[], engArea: number | null | undefined) {
  const depts = new Map<number, LineFigure[]>();
  for (const f of figs) {
    if (!depts.has(f.department_id)) depts.set(f.department_id, []);
    depts.get(f.department_id)!.push(f);
  }
  const out: DepartmentGroup[] = [];
  let sr = 0;
  for (const [id, lines] of depts) {
    const cats = new Map<string, LineFigure[]>();
    for (const l of lines) {
      if (!cats.has(l.category)) cats.set(l.category, []);
      cats.get(l.category)!.push(l);
    }
    out.push({
      sr: ++sr, department: lines[0].department, department_id: id, totals: addUp(lines, engArea),
      categories: [...cats].map(([category, ls]) => ({
        category, lines: ls, totals: addUp(ls, engArea), grouped: ls.length > 1 || ls.some((l) => l.sub_category),
      })),
    });
  }
  return { departments: out, total: addUp(figs, engArea) };
}
