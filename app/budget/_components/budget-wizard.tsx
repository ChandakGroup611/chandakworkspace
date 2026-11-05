"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as W from "@/lib/budget/wizard-actions";
import { BUILDING_TYPES, RATE_BASES, fmt } from "@/lib/budget/format";
import { useAction } from "./forms";

// Create budget: one guided form with every input the detail budget workbook carries, so a budget can be
// built without Excel. Steps: version → project areas → towers → budget lines by department → GST → review.
// Balance, variance, utilised and PSF are worked out, never typed. The form keeps an unsaved copy in this
// browser, so a reload does not lose the typing.

type Dept = { id: number; name: string; summary_category: string };
export type WizLine = W.WizardLine & { prevCtc: number | null; incurredNow: number };
export interface WizardProps {
  projectId: number; projectName: string;
  /** The open draft being changed, or null when saving opens the next version. */
  draftNumber: number | null; nextNumber: number; baseNumber: number | null;
  asOn: string; reason: string;
  areas: Record<string, string>; commitments: { name: string; area: string }[];
  towers: W.WizardTower[]; departments: Dept[]; lines: WizLine[]; gst: W.WizardGst[];
  deptRemarks: Record<string, string>;
  summaryOptions: Record<string, string[]>; gstRules: { id: number; name: string; rate: number; share: number }[];
}
interface State {
  asOn: string; reason: string; areas: Record<string, string>; commitments: { name: string; area: string }[];
  towers: W.WizardTower[]; lines: WizLine[]; gst: W.WizardGst[]; removed: [number, string][]; deptRemarks: Record<string, string>;
}

const STEPS = ["Version", "Project areas", "Towers", "Budget lines", "GST", "Review & save"] as const;
const AREA_INPUTS: [string, string, string][] = [
  ["total_carpet", "Total carpet area (A)", "sft"], ["sold_area", "Sold area", "sft"], ["eng_area", "Construction area, Engg team", "sft"],
  ["design_area", "Construction area, Design team", "sft"], ["sale_value_cr", "Total sale value", "Cr"], ["residential_area", "Residential area", "sft"],
  ["commercial_area", "Commercial area", "sft"], ["retail_area", "Retail area", "sft"], ["society_sale_area", "Society sale area", "sft"],
];
const CONSTRUCTION_STARTERS = ["Civil & Structure", "MEP Services", "Finishes", "External Development", "Lifts", "Contingency"];
const n = (s: string | null | undefined) => { const t = (s ?? "").replace(/,/g, "").trim(); return t === "" || Number.isNaN(Number(t)) ? 0 : Number(t); };
const bad = (s: string) => s.replace(/,/g, "").trim() !== "" && !/^\d*\.?\d+$/.test(s.replace(/,/g, "").trim());
let seq = 1;
const newKey = () => `new-${Date.now()}-${seq++}`;

export function BudgetWizard(props: WizardProps) {
  const { pending, run, banner } = useAction();
  const store = `budget-wizard-${props.projectId}-${props.draftNumber ?? `new${props.nextNumber}`}`;
  const initial: State = useMemo(() => ({
    asOn: props.asOn, reason: props.reason, areas: props.areas, commitments: props.commitments, towers: props.towers,
    lines: props.lines, gst: props.gst, removed: [], deptRemarks: props.deptRemarks,
  }), [props]);
  const [s, setS] = useState<State>(initial);
  const [step, setStep] = useState(0);
  const [dept, setDept] = useState<number>(props.departments[0]?.id ?? 0);
  const [restore, setRestore] = useState<State | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const number = props.draftNumber ?? props.nextNumber;

  // unsaved copy in this browser (a convenience only; the database is the record)
  useEffect(() => {
    try { const raw = localStorage.getItem(store); if (raw) setRestore(JSON.parse(raw)); } catch {}
  }, [store]);
  useEffect(() => {
    if (!dirty) return;
    try { localStorage.setItem(store, JSON.stringify(s)); } catch {}
  }, [s, dirty, store]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty && saved == null) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saved]);
  const up = (f: (x: State) => State) => { setDirty(true); setS(f); };

  // ---------- calculations shown live (the database works out the stored figures the same way) ----------
  const commitTotal = s.commitments.reduce((t, c) => t + n(c.area), 0);
  const areaOf = (basis: string) => basis === "net_sale_carpet" ? n(s.areas.total_carpet) - commitTotal : n(s.areas[basis]);
  const ctcOf = (l: WizLine) => l.method === "rate" ? (n(l.rate) * areaOf(l.basis)) / 1e7 : l.ctc.trim() === "" ? n(l.initial) : n(l.ctc);
  const incOf = (l: WizLine) => (l.incurred == null ? l.incurredNow : n(l.incurred));
  const gstOf = (g: W.WizardGst, f: "initial" | "ctc") => {
    if (g[f].trim() !== "") return n(g[f]);
    const base = s.lines.filter((l) => g.base.includes(l.key)).reduce((t, l) => t + (f === "ctc" ? ctcOf(l) : n(l.initial)), 0);
    return (base * n(g.rate) * n(g.share)) / 10000;
  };
  const deptTotals = (id: number) => {
    const ls = s.lines.filter((l) => l.departmentId === id), gs = s.gst.filter((g) => g.departmentId === id);
    const initial = ls.reduce((t, l) => t + n(l.initial), 0) + gs.reduce((t, g) => t + gstOf(g, "initial"), 0);
    const ctc = ls.reduce((t, l) => t + ctcOf(l), 0) + gs.reduce((t, g) => t + gstOf(g, "ctc"), 0);
    const inc = ls.reduce((t, l) => t + incOf(l), 0);
    return { initial, ctc, inc, count: ls.length + gs.length };
  };
  const all = props.departments.map((d) => ({ d, ...deptTotals(d.id) }));
  const grand = all.reduce((t, x) => ({ initial: t.initial + x.initial, ctc: t.ctc + x.ctc, inc: t.inc + x.inc }), { initial: 0, ctc: 0, inc: 0 });
  const moved = (l: WizLine) => l.prevCtc != null && l.prevCtc > 0 && Math.abs(ctcOf(l) - l.prevCtc) / l.prevCtc > 0.1;

  // ---------- problems per step ----------
  const problems: string[][] = [
    [!/^\d{4}-\d{2}-\d{2}$/.test(s.asOn) ? "Choose the as-on date" : ""],
    [...AREA_INPUTS.filter(([k]) => bad(s.areas[k] ?? "")).map(([, l]) => `${l} must be a number`), ...s.commitments.filter((c) => c.name.trim() && bad(c.area)).map((c) => `${c.name}: area must be a number`)],
    s.towers.flatMap((t, i) => [!t.name.trim() ? `Tower ${i + 1} needs a name` : "", bad(t.carpet_area) || bad(t.eng_area) ? `${t.name}: areas must be numbers` : "",
      s.towers.findIndex((x) => x.name.trim().toLowerCase() === t.name.trim().toLowerCase()) !== i ? `"${t.name}" is typed twice` : ""]),
    s.lines.flatMap((l) => {
      const nm = `${props.departments.find((d) => d.id === l.departmentId)?.name ?? ""} · ${l.category || "line without a name"}`;
      return [!l.category.trim() ? `${nm}: type a category` : "", bad(l.initial) ? `${nm}: Initial is not an amount` : "",
        l.method === "amount" && bad(l.ctc) ? `${nm}: CTC is not an amount` : "", l.method === "rate" && (!n(l.rate) || !l.basis) ? `${nm}: type the rate and choose its area` : "",
        l.incurred != null && bad(l.incurred) ? `${nm}: cost incurred is not an amount` : "",
        l.tower && !s.towers.some((t) => t.name.trim().toLowerCase() === l.tower.toLowerCase()) ? `${nm}: tower ${l.tower} is not in the towers list` : ""];
    }),
    s.gst.flatMap((g) => [!g.category.trim() ? "A GST line needs a name" : "", !(n(g.rate) > 0 && n(g.rate) <= 100) || !(n(g.share) > 0 && n(g.share) <= 100) ? `${g.category}: GST % and share % must be between 0 and 100` : "",
      !g.base.length ? `${g.category}: choose the lines it is charged on` : ""]),
    [],
  ].map((x) => x.filter(Boolean));
  const allProblems = problems.flat();
  const warnings = [
    ...s.lines.filter((l) => ctcOf(l) === 0).map((l) => `${l.category} has no CTC yet`),
    ...s.lines.filter((l) => moved(l) && !l.remark.trim()).map((l) => `${l.category}: CTC moved more than 10% from R${props.baseNumber}; a remark is needed before approval`),
    ...s.towers.filter((t) => !t.type).map((t) => `${t.name} has no building type (its construction cost will not show on the Summary)`),
  ];

  // ---------- line editing ----------
  const setLine = (key: string, patch: Partial<WizLine>) => up((x) => ({ ...x, lines: x.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  const addLine = (d: Dept, category = "", summary: string | null = null) => ({
    key: newKey(), headId: null, departmentId: d.id, category, subCategory: "", summary, tower: "", method: "amount" as const,
    initial: "", ctc: "", rate: "", basis: "eng_area", incurred: null, remark: "", prevCtc: null, incurredNow: 0,
  });
  const removeLine = (l: WizLine) => up((x) => ({
    ...x, lines: x.lines.filter((y) => y.key !== l.key), gst: x.gst.map((g) => ({ ...g, base: g.base.filter((b) => b !== l.key) })),
    removed: l.headId ? [...x.removed, [l.headId, l.tower] as [number, string]] : x.removed,
  }));
  const suggest = (d: Dept) => {
    const have = new Set(s.lines.filter((l) => l.departmentId === d.id).map((l) => l.category.trim().toLowerCase()));
    const list = d.summary_category === "Construction" ? CONSTRUCTION_STARTERS.map((c) => ({ c, sum: null as string | null }))
      : (props.summaryOptions[d.summary_category] ?? []).filter((o) => !o.startsWith("GST")).map((o) => ({ c: o, sum: o }));
    up((x) => ({ ...x, lines: [...x.lines.filter((l) => l.departmentId !== d.id || l.category.trim() || l.headId), ...list.filter((i) => !have.has(i.c.toLowerCase())).map((i) => addLine(d, i.c, i.sum))] }));
  };

  const save = () => run(
    () => W.saveBudgetWizard(props.projectId, {
      asOn: s.asOn, reason: s.reason, areas: s.areas, commitments: s.commitments, towers: s.towers, removed: s.removed, deptRemarks: s.deptRemarks,
      lines: s.lines.map(({ prevCtc: _p, incurredNow: _i, ...l }) => l), gst: s.gst,
    }),
    (r) => { setSaved(r.versionNumber); setDirty(false); try { localStorage.removeItem(store); } catch {} },
  );

  const cur = props.departments.find((d) => d.id === dept) ?? props.departments[0];
  const curLines = s.lines.filter((l) => l.departmentId === cur?.id);
  const towerOpts = s.towers.filter((t) => t.name.trim());

  if (saved != null) return (
    <section className="panel wz-done">
      <h2>R{saved} is saved as a draft</h2>
      <p className="sub">Every figure is in the budget now. Balance, variance, GST and totals are worked out. When it is final, send it for sign-off from the Overview.</p>
      <div className="actions-group">
        <Link className="btn-action primary" href={`/budget/${props.projectId}/overview?v=${saved}`}>Overview and sign-off</Link>
        <Link className="btn-action" href={`/budget/${props.projectId}/entry?v=${saved}`}>Budget sheet</Link>
        <Link className="btn-action" href={`/budget/${props.projectId}/summary?v=${saved}`}>Summary report</Link>
        <button className="btn-action" onClick={() => { setSaved(null); setStep(3); }}>Keep editing</button>
      </div>
    </section>
  );

  return (
    <div className="wz">
      {restore && <div className="banner draft" role="status"><div>You have unsaved typing from earlier on this browser.</div>
        <div className="row"><button className="btn-action primary" onClick={() => { setS(restore); setRestore(null); setDirty(true); }}>Restore it</button>
          <button className="btn-action" onClick={() => { setRestore(null); try { localStorage.removeItem(store); } catch {} }}>Discard</button></div></div>}

      <ol className="wz-steps" aria-label="Create budget steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "current" : i < step ? "done" : ""}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
              <span className="step-badge">{problems[i].length ? "!" : i < step ? "✓" : i + 1}</span>{label}
            </button>
          </li>
        ))}
      </ol>

      <section className="panel wz-body">
        {step === 0 && <>
          <h2>Version R{number} · {props.projectName}</h2>
          <p className="sub">{props.draftNumber ? `You are changing draft R${props.draftNumber}.` : props.baseNumber ? `Saving opens R${number} as a draft, starting from the figures of approved R${props.baseNumber}; change what is different below.` : "This is the first budget of the project."}</p>
          <div className="mg-row">
            <label>Figures as on *<input type="date" value={s.asOn} onChange={(e) => up((x) => ({ ...x, asOn: e.target.value }))} /></label>
            <label style={{ flex: 1, minWidth: 260 }}>Reason for this version<input type="text" value={s.reason} placeholder="For example: Q3 FY2026-27 revision" onChange={(e) => up((x) => ({ ...x, reason: e.target.value }))} /></label>
          </div>
          <p className="note">Cost incurred counts every entry up to the as-on month. Nothing is saved until the last step.</p>
        </>}

        {step === 1 && <>
          <h2>Project areas · R{number}</h2>
          <p className="sub">The areas of the workbook header. Rates per sq ft and PSF figures use them.</p>
          <div className="wz-areas">
            {AREA_INPUTS.map(([k, label, unit]) => (
              <label key={k}>{label} ({unit})<input className="amt" inputMode="decimal" value={s.areas[k] ?? ""} aria-invalid={bad(s.areas[k] ?? "")}
                onChange={(e) => up((x) => ({ ...x, areas: { ...x.areas, [k]: e.target.value } }))} /></label>
            ))}
          </div>
          <h3>Commitments deducted from the sale area</h3>
          <div className="scroll"><table><thead><tr><th className="label">Commitment</th><th className="n">Area (sft)</th><th></th></tr></thead><tbody>
            {s.commitments.map((c, i) => <tr key={i}>
              <td><input type="text" value={c.name} placeholder="e.g. Society members" onChange={(e) => up((x) => ({ ...x, commitments: x.commitments.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)) }))} /></td>
              <td className="n"><input className="amt" inputMode="decimal" value={c.area} onChange={(e) => up((x) => ({ ...x, commitments: x.commitments.map((y, j) => (j === i ? { ...y, area: e.target.value } : y)) }))} /></td>
              <td><button className="btn-action danger" onClick={() => up((x) => ({ ...x, commitments: x.commitments.filter((_, j) => j !== i) }))}>×</button></td></tr>)}
            <tr className="total"><td>Net sale carpet area (A − commitments)</td><td className="n">{fmt(n(s.areas.total_carpet) - commitTotal)}</td><td></td></tr>
          </tbody></table></div>
          <button className="btn-action" onClick={() => up((x) => ({ ...x, commitments: [...x.commitments, { name: "", area: "" }] }))}>+ Commitment</button>
        </>}

        {step === 2 && <>
          <h2>Towers and OC dates</h2>
          <p className="sub">Skip this step if the project is not split by building. The building type places a tower&apos;s construction cost on the Summary.</p>
          <div className="scroll"><table className="mg-grid"><thead><tr><th className="label">Tower *</th><th>Building type</th><th className="n">Carpet (sft)</th><th className="n">Construction BUA (sft)</th><th>Planned OC date</th><th></th></tr></thead><tbody>
            {s.towers.map((t, i) => {
              const set = (patch: Partial<W.WizardTower>) => up((x) => ({ ...x, towers: x.towers.map((y, j) => (j === i ? { ...y, ...patch } : y)) }));
              return <tr key={t.id ?? `n${i}`}>
                <td><input type="text" value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder="Tower A" /></td>
                <td><select value={t.type} onChange={(e) => set({ type: e.target.value })}><option value="">Not set</option>{BUILDING_TYPES.map((b) => <option key={b}>{b}</option>)}</select></td>
                <td className="n"><input className="amt" inputMode="decimal" value={t.carpet_area} onChange={(e) => set({ carpet_area: e.target.value })} /></td>
                <td className="n"><input className="amt" inputMode="decimal" value={t.eng_area} onChange={(e) => set({ eng_area: e.target.value })} /></td>
                <td><input type="date" value={t.oc_date} onChange={(e) => set({ oc_date: e.target.value })} /></td>
                <td>{t.id == null && <button className="btn-action danger" onClick={() => up((x) => ({ ...x, towers: x.towers.filter((_, j) => j !== i) }))}>×</button>}</td>
              </tr>;
            })}
            {s.towers.length === 0 && <tr><td colSpan={6} className="sub">No towers. Add one, or go on to the budget lines.</td></tr>}
          </tbody></table></div>
          <button className="btn-action" onClick={() => up((x) => ({ ...x, towers: [...x.towers, { id: null, name: `Tower ${String.fromCharCode(65 + x.towers.length)}`, type: "", carpet_area: "", eng_area: "", oc_date: "" }] }))}>+ Tower</button>
          <p className="note">Existing towers are removed under Project setup, once they carry no figure.</p>
        </>}

        {step === 3 && cur && <>
          <h2>Budget lines by department</h2>
          <p className="sub">Initial budget (a) and Estimated CTC (b) in crores. CTC can be an amount or a rate per sq ft × an area. A blank CTC starts equal to Initial. Cost incurred is the total up to the as-on date.</p>
          <div className="wz-depts">
            <nav className="wz-dept-list" aria-label="Departments">
              {all.map(({ d, ctc, count }) => (
                <button key={d.id} type="button" aria-current={d.id === cur.id ? "true" : undefined} onClick={() => setDept(d.id)}>
                  <span>{d.name}</span><small>{count} line{count === 1 ? "" : "s"} · {fmt(ctc)} Cr</small>
                </button>
              ))}
              <div className="wz-grand"><span>All departments</span><b>{fmt(grand.ctc)} Cr</b></div>
            </nav>
            <div className="wz-dept">
              <div className="mg-row mg-toolbar">
                <h3 style={{ margin: 0 }}>{cur.name}</h3>
                <button className="btn-action" onClick={() => suggest(cur)}>Fill suggestions</button>
                <button className="btn-action primary" onClick={() => up((x) => ({ ...x, lines: [...x.lines, addLine(cur)] }))}>+ Line</button>
              </div>
              <div className="scroll"><table className="mg-grid wz-lines"><thead><tr>
                <th className="label">Category *</th><th className="label-sm">Sub-category</th>{towerOpts.length > 0 && <th>Tower</th>}
                <th className="n">Initial (a)</th><th>CTC set as</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (b−c)</th><th className="n">Variance (a−b)</th><th className="label-sm">Remark</th><th></th>
              </tr></thead><tbody>
                {curLines.map((l) => {
                  const ctc = ctcOf(l), inc = incOf(l);
                  return <tr key={l.key} className={moved(l) && !l.remark.trim() ? "flag" : ""}>
                    <td><input type="text" value={l.category} onChange={(e) => setLine(l.key, { category: e.target.value })} placeholder="e.g. Civil Contractor" aria-invalid={!l.category.trim()} /></td>
                    <td><input type="text" value={l.subCategory} onChange={(e) => setLine(l.key, { subCategory: e.target.value })} /></td>
                    {towerOpts.length > 0 && <td><select value={l.tower} onChange={(e) => setLine(l.key, { tower: e.target.value })}><option value="">Whole project</option>{towerOpts.map((t) => <option key={t.name} value={t.name.trim()}>{t.name}</option>)}</select></td>}
                    <td className="n"><input className="amt" inputMode="decimal" value={l.initial} aria-invalid={bad(l.initial)} onChange={(e) => setLine(l.key, { initial: e.target.value })} placeholder="0.00" /></td>
                    <td><select value={l.method} onChange={(e) => setLine(l.key, { method: e.target.value as "amount" | "rate" })}><option value="amount">Amount</option><option value="rate">₹ per sq ft</option></select>
                      {l.method === "rate" && <div className="wz-rate"><input className="amt" inputMode="decimal" value={l.rate} placeholder="₹/sft" onChange={(e) => setLine(l.key, { rate: e.target.value })} />
                        <select value={l.basis} onChange={(e) => setLine(l.key, { basis: e.target.value })}>{RATE_BASES.map(([k, lab]) => <option key={k} value={k}>× {lab}</option>)}</select></div>}</td>
                    <td className="n">{l.method === "amount" ? <input className="amt" inputMode="decimal" value={l.ctc} aria-invalid={bad(l.ctc)} placeholder={l.initial || "= Initial"} onChange={(e) => setLine(l.key, { ctc: e.target.value })} /> : <b>{fmt(ctc)}</b>}
                      {l.prevCtc != null && <small className={moved(l) ? "warn-text" : "sub"} title={`R${props.baseNumber} CTC`}>was {fmt(l.prevCtc)}</small>}</td>
                    <td className="n"><input className="amt" inputMode="decimal" value={l.incurred ?? (l.incurredNow ? String(+l.incurredNow.toFixed(7)) : "")} placeholder="0.00" aria-invalid={l.incurred != null && bad(l.incurred)} onChange={(e) => setLine(l.key, { incurred: e.target.value })} /></td>
                    <td className="n"><span className={ctc - inc < 0 ? "neg" : ""}>{fmt(ctc - inc)}</span></td>
                    <td className="n"><span className={n(l.initial) - ctc < 0 ? "neg" : ""}>{fmt(n(l.initial) - ctc)}</span></td>
                    <td><input type="text" className="rem" value={l.remark} placeholder={moved(l) ? "Remark needed: CTC moved >10%" : ""} onChange={(e) => setLine(l.key, { remark: e.target.value })} /></td>
                    <td><button className="btn-action danger" aria-label={`Remove ${l.category}`} onClick={() => removeLine(l)}>×</button></td>
                  </tr>;
                })}
                {curLines.length === 0 && <tr><td colSpan={11} className="sub">No lines in {cur.name}. Use Fill suggestions or + Line, or leave it empty if this department has no budget.</td></tr>}
                {(() => { const t = deptTotals(cur.id); return <tr className="total"><td colSpan={towerOpts.length > 0 ? 3 : 2}>Total {cur.name}{s.gst.some((g) => g.departmentId === cur.id) ? " (with its GST lines)" : ""}</td>
                  <td className="n">{fmt(t.initial)}</td><td></td><td className="n">{fmt(t.ctc)}</td><td className="n">{fmt(t.inc)}</td><td className="n">{fmt(t.ctc - t.inc)}</td><td className="n">{fmt(t.initial - t.ctc)}</td><td colSpan={2}></td></tr>; })()}
              </tbody></table></div>
              <label className="wz-remark">Department remark (shown on the Detail report)
                <input type="text" value={s.deptRemarks[String(cur.id)] ?? ""} onChange={(e) => up((x) => ({ ...x, deptRemarks: { ...x.deptRemarks, [String(cur.id)]: e.target.value } }))} /></label>
            </div>
          </div>
        </>}

        {step === 4 && <>
          <h2>GST lines</h2>
          <p className="sub">A GST line is worked out as the CTC of the lines it is charged on × GST % × eligible share %. Leave its amounts blank to calculate them, or type an amount to override.</p>
          {s.gst.map((g, i) => {
            const set = (patch: Partial<W.WizardGst>) => up((x) => ({ ...x, gst: x.gst.map((y, j) => (j === i ? { ...y, ...patch } : y)) }));
            const d = props.departments.find((x) => x.id === g.departmentId);
            return <div className="mg-card wz-gst" key={g.key}>
              <div className="mg-row">
                <label>Department<select value={g.departmentId} onChange={(e) => set({ departmentId: Number(e.target.value) })}>{props.departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                <label style={{ flex: 1, minWidth: 180 }}>Name *<input type="text" value={g.category} onChange={(e) => set({ category: e.target.value })} placeholder="GST on Construction" /></label>
                {props.gstRules.length > 0 && <label>Preset<select value="" onChange={(e) => { const r = props.gstRules.find((x) => x.id === Number(e.target.value)); if (r) set({ rate: String(r.rate), share: String(r.share) }); }}>
                  <option value="">Choose…</option>{props.gstRules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
                <label>GST %<input className="amt" inputMode="decimal" value={g.rate} onChange={(e) => set({ rate: e.target.value })} style={{ width: 80 }} /></label>
                <label>Eligible share %<input className="amt" inputMode="decimal" value={g.share} onChange={(e) => set({ share: e.target.value })} style={{ width: 90 }} /></label>
                <label>Initial (Cr)<input className="amt" inputMode="decimal" value={g.initial} placeholder={`${fmt(gstOf({ ...g, initial: "" }, "initial"))} auto`} onChange={(e) => set({ initial: e.target.value })} /></label>
                <label>CTC (Cr)<input className="amt" inputMode="decimal" value={g.ctc} placeholder={`${fmt(gstOf({ ...g, ctc: "" }, "ctc"))} auto`} onChange={(e) => set({ ctc: e.target.value })} /></label>
                <button className="btn-action danger" onClick={() => up((x) => ({ ...x, gst: x.gst.filter((_, j) => j !== i) }))} disabled={g.headId != null} title={g.headId != null ? "Existing GST lines are removed under Project setup" : undefined}>Remove</button>
              </div>
              <details open={!g.base.length}><summary>Charged on {g.base.length} line(s) · CTC {fmt(gstOf(g, "ctc"))} Cr</summary>
                <div className="wz-base">
                  {props.departments.map((x) => { const ls = s.lines.filter((l) => l.departmentId === x.id && l.category.trim()); if (!ls.length) return null; return (
                    <fieldset key={x.id}><legend>{x.name} <button type="button" className="link" onClick={() => set({ base: [...new Set([...g.base, ...ls.map((l) => l.key)])] })}>all</button></legend>
                      {ls.map((l) => <label key={l.key} className="check"><input type="checkbox" checked={g.base.includes(l.key)} onChange={(e) => set({ base: e.target.checked ? [...g.base, l.key] : g.base.filter((b) => b !== l.key) })} />
                        {l.category}{l.subCategory ? ` · ${l.subCategory}` : ""}{l.tower ? ` · ${l.tower}` : ""}</label>)}
                    </fieldset>); })}
                </div></details>
              {d && <p className="note">Shown under {d.name} on the Detail report.</p>}
            </div>;
          })}
          <button className="btn-action primary" onClick={() => up((x) => ({ ...x, gst: [...x.gst, { key: newKey(), headId: null, departmentId: cur?.id ?? props.departments[0].id, category: "GST", subCategory: "", summary: null, rate: "18", share: "100", base: [], initial: "", ctc: "", remark: "" }] }))}>+ GST line</button>
        </>}

        {step === 5 && <>
          <h2>Review R{number} before saving</h2>
          <div className="scroll"><table><thead><tr><th className="label">Department</th><th className="n">Lines</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (b−c)</th><th className="n">Variance (a−b)</th></tr></thead><tbody>
            {all.filter((x) => x.count).map(({ d, initial, ctc, inc, count }) => <tr key={d.id}><td><button className="link" onClick={() => { setDept(d.id); setStep(3); }}>{d.name}</button></td><td className="n">{count}</td>
              <td className="n">{fmt(initial)}</td><td className="n">{fmt(ctc)}</td><td className="n">{fmt(inc)}</td><td className="n">{fmt(ctc - inc)}</td><td className="n"><span className={initial - ctc < 0 ? "neg" : ""}>{fmt(initial - ctc)}</span></td></tr>)}
            <tr className="total"><td>Total</td><td className="n">{s.lines.length + s.gst.length}</td><td className="n">{fmt(grand.initial)}</td><td className="n">{fmt(grand.ctc)}</td><td className="n">{fmt(grand.inc)}</td><td className="n">{fmt(grand.ctc - grand.inc)}</td><td className="n">{fmt(grand.initial - grand.ctc)}</td></tr>
          </tbody></table></div>
          <p className="note">As on {s.asOn.split("-").reverse().join("/")} · {s.towers.length} tower(s) · net sale carpet {fmt(n(s.areas.total_carpet) - commitTotal)} sft. Figures here are a preview; the database works out the final ones the same way.</p>
          {allProblems.length > 0 && <div className="banner error"><div><b>Fix these before saving:</b><ul className="plain">{allProblems.slice(0, 12).map((p) => <li key={p}>{p}</li>)}</ul></div></div>}
          {warnings.length > 0 && <div className="banner draft"><div><b>Can be saved, but check:</b><ul className="plain">{warnings.slice(0, 12).map((p) => <li key={p}>{p}</li>)}</ul>{warnings.length > 12 && `…and ${warnings.length - 12} more`}</div></div>}
        </>}

        {problems[step]?.length > 0 && step < 5 && <p className="bad-text">{problems[step].slice(0, 4).join(" · ")}</p>}
        <div className="mg-foot">
          <button className="btn-action" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          <span className="note">Step {step + 1} of {STEPS.length}{dirty ? " · unsaved changes kept on this browser" : ""}</span>
          {step < 5 ? <button className="primary" onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]} →</button>
            : <button className="primary" disabled={pending || allProblems.length > 0} onClick={save}>{pending ? "Saving…" : props.draftNumber ? `Save draft R${number}` : `Create R${number} as draft`}</button>}
        </div>
        {banner}
      </section>
    </div>
  );
}
