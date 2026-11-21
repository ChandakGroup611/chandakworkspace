import * as D from "./data";

// Alerts and the AI budget summary of a version. Every figure here is worked out by this code from the
// database's own figures (paise, exact); the AI is only asked to put those figures into words, and its
// text is refused if it carries any number that is not among them (the rule-written note is used instead).

export const NEAR_LIMIT_PCT = 90;        // cost incurred at or above this share of CTC
export const ABOVE_INITIAL_PCT = 10;     // CTC this much above the initial budget...
export const ABOVE_INITIAL_MIN_CR = 1;   // ...and by at least this many crores (small heads are left out)
export const RUN_RATE_MONTHS = 3;        // months of cost incurred averaged for the run rate

export interface Alert {
  level: "over" | "near" | "above_initial" | "run_out";
  department: string; line: string; message: string;
  figure: number;                          // crores, or months for run_out
}

const cr = (paise: number | string) => Number(paise) / 1e9;
const f2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (crores: number) => `₹${f2.format(crores)} Cr`;
const pct = (v: number) => `${f2.format(v)}%`;
const label = (l: D.LineFigure) => [l.category, l.sub_category, l.subproject].filter(Boolean).join(" · ");
const monthsBetween = (a: string, b: string) => {
  const [ya, ma] = a.slice(0, 7).split("-").map(Number), [yb, mb] = b.slice(0, 7).split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
};
const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Lines that need attention in this version, most serious first. */
export function alertsFor(lines: D.LineFigure[], entries: { cost_head_id: number; subproject_id: number | null; month: string; amount_paise: number }[],
  asOn: string, lastOc: string | null): Alert[] {
  const out: Alert[] = [];
  for (const l of lines) {
    if (l.is_memo) continue;
    const ctc = Number(l.ctc_paise), inc = Number(l.incurred_paise), init = Number(l.initial_paise);
    const base = { department: l.department, line: label(l) };
    if (ctc > 0 && inc > ctc) out.push({ ...base, level: "over", figure: cr(inc - ctc), message: `Cost incurred is ${money(cr(inc - ctc))} above the estimated CTC of ${money(cr(ctc))}` });
    else if (ctc > 0 && inc * 100 >= ctc * NEAR_LIMIT_PCT) out.push({ ...base, level: "near", figure: cr(ctc - inc), message: `${pct((inc * 100) / ctc)} of CTC used; ${money(cr(ctc - inc))} left` });
    if (init > 0 && (ctc - init) * 100 > init * ABOVE_INITIAL_PCT && ctc - init >= ABOVE_INITIAL_MIN_CR * 1e9) out.push({ ...base, level: "above_initial", figure: cr(ctc - init), message: `CTC is ${money(cr(ctc - init))} (${pct(((ctc - init) * 100) / init)}) above the initial budget` });
    if (lastOc && ctc > inc) {
      const recent = entries.filter((e) => e.cost_head_id === l.cost_head_id && (e.subproject_id ?? null) === (l.subproject_id ?? null)
        && monthsBetween(e.month, asOn) >= 0 && monthsBetween(e.month, asOn) < RUN_RATE_MONTHS);
      const perMonth = recent.reduce((s, e) => s + Number(e.amount_paise), 0) / RUN_RATE_MONTHS;
      const left = monthsBetween(asOn, lastOc);
      if (perMonth > 0 && left > 0) {
        const lasts = (ctc - inc) / perMonth;
        if (lasts < left) out.push({ ...base, level: "run_out", figure: Math.floor(lasts * 10) / 10,
          message: `At the last ${RUN_RATE_MONTHS} months' rate (${money(cr(perMonth))} a month) the balance lasts about ${f2.format(Math.floor(lasts * 10) / 10)} months; the last OC is ${left} months away (${dmy(lastOc)})` });
      }
    }
  }
  const rank = { over: 0, run_out: 1, near: 2, above_initial: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level] || b.figure - a.figure);
}

export async function getAlerts(sb: D.Db, project: D.Project, v: D.Version) {
  const [lines, entries, towers] = await Promise.all([D.getLineFigures(sb, v.id), D.getEntries(sb, project.id), D.getTowers(sb, project.id)]);
  // OC dates as revised in this version, or each tower's planned date
  const lastOc = towers.map((t) => v.tower_notes?.[String(t.id)]?.oc_date ?? t.oc_date).filter((d): d is string => !!d).sort().pop() ?? null;
  return alertsFor(lines, entries, v.as_on, lastOc);
}

// ---------------------------------------------------------------- the summary

export interface Facts { lines: string[]; numbers: string[] }

/** The figures the note may use, as sentences; `numbers` lists every number in them. */
export async function factsFor(sb: D.Db, project: D.Project, v: D.Version, versions: D.Version[]): Promise<Facts> {
  const lines = (await D.getLineFigures(sb, v.id)).filter((l) => !l.is_memo);
  const sum = (ls: D.LineFigure[], k: "initial_paise" | "ctc_paise" | "incurred_paise") => ls.reduce((s, l) => s + Number(l[k]), 0);
  const init = sum(lines, "initial_paise"), ctc = sum(lines, "ctc_paise"), inc = sum(lines, "incurred_paise");
  const out: string[] = [
    `Version: Project ${project.name}, budget version R${v.number} (${v.status.replace("_", " ")}), as on ${dmy(v.as_on)}.`,
    `Total: Initial budget ${money(cr(init))}; estimated cost to complete (CTC) ${money(cr(ctc))}; ${ctc >= init ? "above" : "below"} the initial budget by ${money(cr(Math.abs(ctc - init)))}.`,
    `Total: Cost incurred ${money(cr(inc))}, which is ${ctc ? pct((inc * 100) / ctc) : "0.00%"} of CTC; balance CTC ${money(cr(ctc - inc))}.`,
  ];
  const byCat = new Map<string, D.LineFigure[]>();
  for (const l of lines) { if (!byCat.has(l.summary_category)) byCat.set(l.summary_category, []); byCat.get(l.summary_category)!.push(l); }
  const prev = versions.filter((x) => x.number < v.number).pop();
  const prevLines = prev ? (await D.getLineFigures(sb, prev.id)).filter((l) => !l.is_memo) : [];
  const prevCat = (c: string) => sum(prevLines.filter((l) => l.summary_category === c), "ctc_paise");
  for (const [c, ls] of byCat) {
    const cc = sum(ls, "ctc_paise"), ci = sum(ls, "incurred_paise");
    let s = `Category: ${c}: CTC ${money(cr(cc))}, incurred ${money(cr(ci))} (${cc ? pct((ci * 100) / cc) : "0.00%"} used)`;
    if (prev) { const d = cc - prevCat(c); if (d) s += `, ${d > 0 ? "up" : "down"} ${money(cr(Math.abs(d)))} since R${prev.number}`; }
    out.push(s + ".");
  }
  if (prev) {
    const pc = sum(prevLines, "ctc_paise");
    out.push(`Since: Since R${prev.number} (as on ${dmy(prev.as_on)}), total CTC moved ${ctc >= pc ? "up" : "down"} by ${money(cr(Math.abs(ctc - pc)))}${pc ? ` (${pct((Math.abs(ctc - pc) * 100) / pc)})` : ""}.`);
    const changes = (await D.getCompare(sb, prev.id, v.id)).filter((x) => x.change !== "same" && x.ctc_change_cr)
      .sort((a, b) => Math.abs(b.ctc_change_cr) - Math.abs(a.ctc_change_cr)).slice(0, 5);
    for (const x of changes) {
      out.push(`Change: ${[x.department, x.category, x.sub_category, x.subproject].filter(Boolean).join(" · ")} ${x.ctc_change_cr > 0 ? "up" : "down"} ${money(Math.abs(x.ctc_change_cr))}${x.to_remark ? ` (remark: ${x.to_remark})` : ""}.`);
    }
  }
  const alerts = await getAlerts(sb, project, v);
  const count = (k: Alert["level"]) => alerts.filter((a) => a.level === k).length;
  out.push(`Alerts: ${count("over")} lines over CTC, ${count("near")} lines at ${NEAR_LIMIT_PCT}% or more of CTC, ${count("above_initial")} lines more than ${ABOVE_INITIAL_PCT}% (and ${money(ABOVE_INITIAL_MIN_CR)}) above the initial budget, ${count("run_out")} lines that may run out before the last OC date.`);
  for (const a of alerts.slice(0, 5)) out.push(`Alert: ${a.department} · ${a.line}: ${a.message}.`);
  return { lines: out, numbers: numbersIn(out.join(" ")) };
}

/** Every number written in a text, without thousands separators ("1,417.89" → "1417.89"). */
export function numbersIn(text: string) {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/^0+(?=\d)/, ""));
}

/** True when the text uses only numbers from the facts (and small counts such as "two lines" written as digits). */
export function onlyKnownNumbers(text: string, facts: Facts) {
  const known = new Set(facts.numbers);
  return numbersIn(text).every((n) => known.has(n) || (/^\d$/.test(n)));
}

/** The note written by rule, without AI: totals, the move since the last version, the biggest changes and the alert counts. */
export function ruleNote(facts: Facts) {
  const tagged = (tag: string) => facts.lines.filter((l) => l.startsWith(`${tag}: `)).map((l) => l.slice(tag.length + 2));
  const changes = tagged("Change").slice(0, 3);
  return [
    ...tagged("Total"), ...tagged("Since"),
    ...(changes.length ? [`Biggest changes: ${changes.map((c) => c.replace(/\.$/, "")).join("; ")}.`] : []),
    ...tagged("Alerts").map((a) => `Alerts: ${a}`),
  ].join(" ");
}

export const NOTE_INSTRUCTION = `You write the management note of a real-estate project budget for Chandak Group's management.
Use ONLY the facts given. Do not calculate, round, estimate or invent any figure: copy amounts and percentages exactly as written in the facts (for example "₹1,417.89 Cr").
Write 4 to 6 short sentences of plain prose, no headings, no bullet points, no markdown. Lead with the cost to complete against the initial budget and what has been spent,
then the biggest changes since the last version and their reasons, then what needs attention. Write in British English.`;

export async function latestNote(sb: D.Db, versionId: number) {
  try {
    const { data } = await sb.from("budget_ai_notes").select("body, provider, created_by, created_at").eq("version_id", versionId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    return (data ?? null) as { body: string; provider: string; created_by: string | null; created_at: string } | null;
  } catch {
    return null;
  }
}
