"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import * as M from "@/lib/budget/manual-actions";
import { BUILDING_TYPES, fmt } from "@/lib/budget/format";
import { useAction } from "./forms";

// Guided, typed entry: everything a person needs to build a budget by hand, without an Excel file.
// Each form checks the input on the server and shows the refusal inline, like the other budget forms.

type Dept = { id: number; name: string; summary_category: string };
type Opt = { id: number; label: string };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const blankTower = (n: number): M.TowerInput => ({ name: `Tower ${String.fromCharCode(64 + n)}`, type: "", carpet_area: "", eng_area: "", oc_date: "" });
const num = (s: string) => { const t = s.replace(/,/g, "").trim(); return t === "" || Number.isNaN(Number(t)) ? 0 : Number(t); };

// ---------- towers ----------
function TowerFields({ t, onChange, onRemove, compact }: { t: M.TowerInput; onChange: (t: M.TowerInput) => void; onRemove?: () => void; compact?: boolean }) {
  const set = (k: keyof M.TowerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...t, [k]: e.currentTarget.value });
  return (
    <div className="mg-row tower-fields">
      <label>Tower / wing name *<input type="text" value={t.name} onChange={set("name")} placeholder="Tower A" /></label>
      <label>Building type<select value={t.type} onChange={set("type")}><option value="">Choose later</option>{BUILDING_TYPES.map((b) => <option key={b}>{b}</option>)}</select></label>
      <label>Carpet area (sft)<input type="text" inputMode="decimal" value={t.carpet_area} onChange={set("carpet_area")} placeholder="0" /></label>
      <label>Construction area (sft)<input type="text" inputMode="decimal" value={t.eng_area} onChange={set("eng_area")} placeholder="Engg. BUA" /></label>
      <label>Planned OC date<input type="date" value={t.oc_date} onChange={set("oc_date")} /></label>
      {onRemove && <button type="button" className="btn-action danger" onClick={onRemove} aria-label={`Remove ${t.name || "tower"}`}>{compact ? "×" : "Remove"}</button>}
    </div>
  );
}

/** Adds one tower with its type, areas and OC date. */
export function AddTowerForm({ projectId, count }: { projectId: number; count: number }) {
  const { pending, run, banner, setNotice } = useAction();
  const [t, setT] = useState<M.TowerInput>(blankTower(count + 1));
  return (
    <div className="mg-card" id="add-tower">
      <TowerFields t={t} onChange={setT} />
      <div className="mg-foot">
        <span className="note">The building type decides where the tower&apos;s construction cost shows on the Summary. Areas can be changed later.</span>
        <button className="btn-action primary" disabled={pending} onClick={() => run(() => M.addTowerFull(projectId, t), () => { setNotice(`${t.name} added`); setT(blankTower(count + 2)); })}>
          {pending ? "Adding…" : "+ Add tower"}
        </button>
      </div>
      {banner}
    </div>
  );
}

// ---------- new project ----------
/** A new project in one form: details, towers and where the cost heads come from. Opens Get started.
 *  `quick` (the Create budget menu): only the basics, then straight into the Create budget form, which asks for towers itself. */
export function GuidedNewProject({ projects, quick = false }: { projects: { id: number; name: string; heads: number }[]; quick?: boolean }) {
  const { pending, run, banner } = useAction();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [location, setLocation] = useState("");
  const [fy, setFy] = useState(4);
  const [towers, setTowers] = useState<M.TowerInput[]>(quick ? [] : [blankTower(1)]);
  const [copy, setCopy] = useState("");
  const autoCode = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 6);
  return (
    <div className="mg-wizard">
      <fieldset className="mg-step">
        <legend><span className="mg-num">1</span>Project</legend>
        <div className="mg-row">
          <label style={{ flex: 2, minWidth: 220 }}>Project name *<input type="text" value={name} placeholder="For example: Chandak Sparkling Wings"
            onChange={(e) => { setName(e.target.value); if (!codeTouched) setCode(autoCode(e.target.value)); }} /></label>
          <label>Short code *<input type="text" value={code} placeholder="CSW" onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }} style={{ width: 110 }} /></label>
          <label style={{ flex: 1, minWidth: 160 }}>Location<input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Goregaon West, Mumbai" /></label>
          <label>Financial year starts in<select value={fy} onChange={(e) => setFy(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
        </div>
      </fieldset>
      {!quick && <fieldset className="mg-step">
        <legend><span className="mg-num">2</span>Towers or wings <span className="sub">optional; skip if the project is not split by building</span></legend>
        {towers.map((t, i) => <TowerFields key={i} t={t} compact onChange={(nt) => setTowers(towers.map((x, j) => (j === i ? nt : x)))} onRemove={() => setTowers(towers.filter((_, j) => j !== i))} />)}
        <div className="row"><button type="button" className="btn-action" onClick={() => setTowers([...towers, blankTower(towers.length + 1)])}>+ Another tower</button>
          {towers.length === 0 && <span className="note">No towers: every cost is kept at project level.</span>}</div>
      </fieldset>}
      <fieldset className="mg-step">
        <legend><span className="mg-num">{quick ? 2 : 3}</span>Budget lines</legend>
        <div className="mg-choice">
          <label className="radio"><input type="radio" name="np-heads" checked={copy === ""} onChange={() => setCopy("")} />
            <span><b>{quick ? "Start blank" : "Type them on the next screen"}</b><small>{quick ? "Add lines department by department in the form; Fill suggestions gives the usual ones." : "A grid with suggested lines for each department; you keep, change or delete each one."}</small></span></label>
          {projects.filter((p) => p.heads > 0).map((p) => (
            <label key={p.id} className="radio"><input type="radio" name="np-heads" checked={copy === String(p.id)} onChange={() => setCopy(String(p.id))} />
              <span><b>Copy the {p.heads} cost heads of {p.name}</b><small>Same departments and lines, with no amounts; GST rules are copied too.</small></span></label>
          ))}
        </div>
      </fieldset>
      <div className="mg-foot">
        <span className="note">{quick ? "Next: the Create budget form opens for this project, starting with R1." : "Next you add the budget lines, open version R1 and type the figures. A checklist shows what is left."}</span>
        <button className="primary" disabled={pending} onClick={() => run(
          () => M.createProjectGuided({ name, code, location, fyStartMonth: fy, towers, copyHeadsFrom: copy ? Number(copy) : null }),
          (r) => router.push(`/budget/${r.projectId}/${quick ? "create" : "start"}`),
        )}>{pending ? "Creating…" : quick ? "Create project and start budget" : "Create project and continue"}</button>
      </div>
      {banner}
    </div>
  );
}

// ---------- many lines at once ----------
interface GridRow { k: number; dept: string; cat: string; sub: string; summary: string; tower: string; initial: string; ctc: string; remark: string }
let rowKey = 1;
const emptyRow = (dept = ""): GridRow => ({ k: rowKey++, dept, cat: "", sub: "", summary: "", tower: "", initial: "", ctc: "", remark: "" });

/** Typical lines for a department, to start from instead of a blank grid (all editable). */
const CONSTRUCTION_STARTERS = ["Civil & Structure", "MEP Services", "Finishes", "External Development", "Lifts", "Contingency"];
function startersFor(d: Dept, summaryOptions: Record<string, string[]>): { cat: string; summary: string }[] {
  if (d.summary_category === "Construction") return CONSTRUCTION_STARTERS.map((c) => ({ cat: c, summary: "" }));
  return (summaryOptions[d.summary_category] ?? []).filter((s) => !s.startsWith("GST")).map((s) => ({ cat: s, summary: s }));
}

export function LinesGrid({ projectId, departments, towers, summaryOptions, draftNumber, defaultDept, startRows = 5 }: {
  projectId: number; departments: Dept[]; towers: Opt[]; summaryOptions: Record<string, string[]>;
  /** The open draft; without one the lines are added as cost heads and their amounts are not saved. */
  draftNumber: number | null; defaultDept?: number; startRows?: number;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const first = String(defaultDept ?? departments[0]?.id ?? "");
  const [rows, setRows] = useState<GridRow[]>(() => Array.from({ length: startRows }, () => emptyRow(first)));
  const [suggestDept, setSuggestDept] = useState(first);
  const dept = useMemo(() => new Map(departments.map((d) => [String(d.id), d])), [departments]);
  const set = (k: number, patch: Partial<GridRow>) => setRows((rs) => rs.map((r) => (r.k === k ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.cat.trim());
  const total = (f: "initial" | "ctc") => filled.reduce((s, r) => s + num(f === "ctc" && !r.ctc.trim() ? r.initial : r[f]), 0);
  const suggest = () => {
    const d = dept.get(suggestDept);
    if (!d) return;
    const have = new Set(rows.filter((r) => r.dept === suggestDept).map((r) => r.cat.trim().toLowerCase()));
    const add = startersFor(d, summaryOptions).filter((s) => !have.has(s.cat.toLowerCase())).map((s) => ({ ...emptyRow(suggestDept), cat: s.cat, summary: s.summary }));
    setRows((rs) => [...rs.filter((r) => r.cat.trim() || r.initial.trim() || r.ctc.trim()), ...add]);
  };
  const save = () => run(
    () => M.addLinesBulk(projectId, filled.map((r) => {
      const d = dept.get(r.dept);
      const opts = d ? summaryOptions[d.summary_category] ?? [] : [];
      return {
        department_id: Number(r.dept), category: r.cat, sub_category: r.sub,
        summary_subcategory: d?.summary_category === "Construction" ? null : r.summary || opts.find((o) => !o.startsWith("GST")) || null,
        tower_id: r.tower ? Number(r.tower) : null, initial: r.initial, ctc: r.ctc, remark: r.remark,
      };
    })),
    (res) => {
      setNotice(res.draftNumber
        ? `Saved ${res.lines} line(s) in draft R${res.draftNumber}${res.heads ? ` (${res.heads} new cost head${res.heads === 1 ? "" : "s"})` : ""}. They are in the budget sheet now.`
        : `Added ${res.heads} cost head(s). Open version R1 to type their amounts.`);
      setRows(Array.from({ length: 3 }, () => emptyRow(first)));
    },
  );
  return (
    <div className="mg-card">
      <div className="mg-row mg-toolbar">
        <label>Suggest lines for<select value={suggestDept} onChange={(e) => setSuggestDept(e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <button type="button" className="btn-action" onClick={suggest}>Fill suggestions</button>
        <span className="note">Suggestions come from the Summary format; change names, delete rows you do not need.</span>
      </div>
      <div className="scroll"><table className="mg-grid">
        <thead><tr><th>#</th><th className="label">Department *</th><th className="label">Category *</th><th className="label-sm">Sub-category</th><th className="label-sm">Summary row</th>
          {towers.length > 0 && <th>Tower</th>}<th className="n">Initial (Cr)</th><th className="n">CTC (Cr)</th><th className="label-sm">Remark</th><th></th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const d = dept.get(r.dept);
            const opts = (d ? summaryOptions[d.summary_category] ?? [] : []).filter((o) => !o.startsWith("GST"));
            return (
              <tr key={r.k}>
                <td className="sub">{i + 1}</td>
                <td><select aria-label="Department" value={r.dept} onChange={(e) => set(r.k, { dept: e.target.value, summary: "" })}><option value="">Choose…</option>{departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td>
                <td><input type="text" aria-label="Category" value={r.cat} onChange={(e) => set(r.k, { cat: e.target.value })} placeholder="e.g. Civil Contractor" /></td>
                <td><input type="text" aria-label="Sub-category" value={r.sub} onChange={(e) => set(r.k, { sub: e.target.value })} placeholder="optional" /></td>
                <td>{d?.summary_category === "Construction" ? <span className="note">Follows the tower&apos;s building type</span>
                  : <select aria-label="Summary row" value={r.summary} onChange={(e) => set(r.k, { summary: e.target.value })}><option value="">{opts[0] ? `Default: ${opts[0]}` : "Default"}</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>}</td>
                {towers.length > 0 && <td><select aria-label="Tower" value={r.tower} onChange={(e) => set(r.k, { tower: e.target.value })}><option value="">Whole project</option>{towers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></td>}
                <td className="n"><input className="amt" inputMode="decimal" aria-label="Initial budget in crores" value={r.initial} onChange={(e) => set(r.k, { initial: e.target.value })} placeholder="0.00" /></td>
                <td className="n"><input className="amt" inputMode="decimal" aria-label="Estimated CTC in crores" value={r.ctc} onChange={(e) => set(r.k, { ctc: e.target.value })} placeholder={r.initial || "= Initial"} /></td>
                <td><input type="text" className="rem" aria-label="Remark" value={r.remark} onChange={(e) => set(r.k, { remark: e.target.value })} /></td>
                <td><button type="button" className="btn-action danger" aria-label={`Remove row ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.k !== r.k))}>×</button></td>
              </tr>
            );
          })}
          <tr className="total"><td></td><td colSpan={towers.length > 0 ? 5 : 4}>{filled.length} line(s) typed</td><td className="n">{fmt(total("initial"))}</td><td className="n">{fmt(total("ctc"))}</td><td colSpan={2}></td></tr>
        </tbody>
      </table></div>
      <div className="mg-foot">
        <div className="row">
          <button type="button" className="btn-action" onClick={() => setRows([...rows, emptyRow(rows[rows.length - 1]?.dept ?? first)])}>+ Row</button>
          <button type="button" className="btn-action" onClick={() => setRows([...rows, ...Array.from({ length: 5 }, () => emptyRow(rows[rows.length - 1]?.dept ?? first))])}>+ 5 rows</button>
        </div>
        <span className="note">{draftNumber ? `Amounts go into draft R${draftNumber}. CTC left blank starts equal to Initial.` : "No draft is open, so only the lines are added; open R1 to type amounts."}</span>
        <button className="primary" disabled={pending || filled.length === 0} onClick={save}>{pending ? "Saving…" : `Save ${filled.length || ""} line${filled.length === 1 ? "" : "s"}`}</button>
      </div>
      {banner}
    </div>
  );
}

// ---------- one line at a time ----------
export interface FormLine {
  id: number; department: string; label: string; tower: string | null; isTax: boolean; taxRule: string | null;
  initial: string; ctc: string; remark: string; needsRemark: boolean; previousCtc: number | null;
  /** CTC set by a rule (rate, balance, schedule): read only here. */
  ctcRule: string | null; incurredCr: number;
}

/** Walks a department user through their lines one at a time: Initial, CTC, remark, then Save & next. */
export function LineByLineForm({ lines, sheetHref }: { lines: FormLine[]; sheetHref: string }) {
  const { pending, run, banner, setNotice } = useAction();
  const depts = useMemo(() => [...new Set(lines.map((l) => l.department))], [lines]);
  const [dept, setDept] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [saved, setSaved] = useState<Record<number, { initial: string; ctc: string; remark: string }>>({});
  const cur = (l: FormLine) => saved[l.id] ?? { initial: l.initial, ctc: l.ctc, remark: l.remark };
  const list = lines.filter((l) => (!dept || l.department === dept) && (!onlyEmpty || !num(cur(l).ctc)));
  const [idx, setIdx] = useState(0);
  const i = Math.min(idx, Math.max(0, list.length - 1));
  const l = list[i];
  const [draft, setDraft] = useState<{ id: number; initial: string; ctc: string; remark: string } | null>(null);
  const v = l && draft?.id === l.id ? draft : l ? { id: l.id, ...cur(l) } : null;
  const done = lines.filter((x) => num(cur(x).ctc) > 0 || x.ctcRule).length;
  if (!lines.length) return <p className="sub">No line you can change in this version.</p>;
  const go = (n: number) => { setDraft(null); setIdx(Math.max(0, Math.min(list.length - 1, n))); };
  const change = (k: "initial" | "ctc" | "remark", val: string) => v && setDraft({ ...v, [k]: val });
  const moved = l && v && l.previousCtc != null && l.previousCtc > 0 && Math.abs(num(v.ctc) - l.previousCtc) / l.previousCtc > 0.1;
  const save = (next: boolean) => {
    if (!l || !v) return;
    run(() => M.saveLineFigures(l.id, { initial: v.initial, ctc: l.ctcRule ? l.ctc : v.ctc, remark: v.remark, isTax: l.isTax }), () => {
      setSaved((s) => ({ ...s, [l.id]: { initial: v.initial, ctc: l.ctcRule ? l.ctc : v.ctc, remark: v.remark } }));
      setNotice(`Saved ${l.label}`);
      if (next) go(onlyEmpty ? i : i + 1); else setDraft(null);
    });
  };
  return (
    <div className="lbl">
      <div className="mg-row mg-toolbar">
        <label>Department<select value={dept} onChange={(e) => { setDept(e.target.value); go(0); }}><option value="">All my lines</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label className="check"><input type="checkbox" checked={onlyEmpty} onChange={(e) => { setOnlyEmpty(e.target.checked); go(0); }} /> Only lines without a CTC</label>
        <span className="lbl-progress" aria-label="Progress"><span className="bar"><i style={{ width: `${(done / lines.length) * 100}%` }} /></span>{done} of {lines.length} lines have a CTC</span>
      </div>
      {!l || !v ? <p className="sub">Every line in this filter has a CTC. <button className="link" onClick={() => { setOnlyEmpty(false); go(0); }}>Show all lines</button></p> : (
        <div className="lbl-card" key={l.id}>
          <div className="lbl-head">
            <span className="sub">Line {i + 1} of {list.length} · {l.department}</span>
            <h3>{l.label}{l.tower && <span className="chip">{l.tower}</span>}{l.taxRule && <span className="chip">{l.taxRule}</span>}</h3>
            {l.previousCtc != null && <span className="sub">Previous version CTC: {fmt(l.previousCtc)} Cr · Cost incurred so far: {fmt(l.incurredCr)} Cr</span>}
          </div>
          <div className="mg-row">
            <label>Initial budget (Cr)<input className="amt big" inputMode="decimal" value={v.initial} onChange={(e) => change("initial", e.target.value)}
              placeholder={l.isTax ? "blank = GST rule" : "0.00"} autoFocus onKeyDown={(e) => { if (e.key === "Enter") save(true); }} /></label>
            <label>Estimated CTC (Cr){l.ctcRule ? <span className="note">Set by its rule: {l.ctcRule}</span>
              : <input className="amt big" inputMode="decimal" value={v.ctc} onChange={(e) => change("ctc", e.target.value)} placeholder={l.isTax ? "blank = GST rule" : v.initial || "0.00"}
                onKeyDown={(e) => { if (e.key === "Enter") save(true); }} />}</label>
            <label style={{ flex: 1, minWidth: 240 }}>Remark{(l.needsRemark || moved) && <span className="chip warn">needed: CTC moved more than 10%</span>}
              <input type="text" value={v.remark} onChange={(e) => change("remark", e.target.value)} placeholder="Why this amount, or what changed" onKeyDown={(e) => { if (e.key === "Enter") save(true); }} /></label>
          </div>
          <div className="mg-foot">
            <div className="row">
              <button type="button" className="btn-action" disabled={i === 0} onClick={() => go(i - 1)}>← Previous</button>
              <button type="button" className="btn-action" disabled={i >= list.length - 1} onClick={() => go(i + 1)}>Skip →</button>
            </div>
            <span className="note">Enter saves and moves on. Balance, variance, GST and totals are worked out for you.</span>
            <div className="row">
              <button type="button" className="btn-action" disabled={pending} onClick={() => save(false)}>Save</button>
              <button type="button" className="primary" disabled={pending} onClick={() => save(true)}>{pending ? "Saving…" : "Save & next"}</button>
            </div>
          </div>
        </div>
      )}
      {banner}
      <p className="note">Prefer a spreadsheet view? <Link href={sheetHref}>Open the budget sheet</Link>; both edit the same figures.</p>
    </div>
  );
}
