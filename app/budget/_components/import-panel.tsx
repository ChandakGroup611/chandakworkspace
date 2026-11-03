"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import * as A from "@/lib/budget/actions";
import BudgetImporter, { type CostRow, type ImportPayload } from "@/lib/budget/importer";
import { dmy, fmt, fmtRupees, isNeg, monthName, toCr } from "@/lib/budget/format";

// Import from Excel: the browser reads the workbook, the database previews the import without saving
// (budget_preview_import / budget_check_incurred), and Save runs the same import for real.

type Pending =
  | { kind: "detail"; fileName: string; payload: ImportPayload; target: string; preview: A.ImportPreview | null }
  | { kind: "cost"; fileName: string; rows: CostRow[]; errors: CostRow[]; target: string; checked: CostRow[] | null };

const norm = (s: string | null | undefined) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const Neg = ({ v }: { v: number | null }) => <span className={isNeg(v) ? "neg" : ""}>{fmt(v)}</span>;

export function ImportPanel({ projects, projectId, canDetail, canCost }: {
  projects: { id: number; name: string }[]; projectId: number | null; canDetail: boolean; canCost: boolean;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<React.ReactNode>(null);
  const [busy, start] = useTransition();

  const preview = (p: Pending) =>
    start(async () => {
      setError(null);
      if (p.kind === "detail") {
        const r = await A.previewImport(p.target === "new" ? null : Number(p.target), p.payload);
        if (!r.ok) { setError(r.error); setPending({ ...p, preview: null }); return; }
        setPending({ ...p, preview: r.preview });
      } else {
        const r = await A.checkCostRows(Number(p.target), p.rows);
        if (!r.ok) { setError(r.error); setPending({ ...p, checked: null }); return; }
        setPending({ ...p, checked: [...r.rows, ...p.errors].sort((a, b) => a.row - b.row) });
      }
    });

  async function readFile(file: File) {
    setDone(null);
    setError(null);
    try {
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellFormula: true, cellNF: true });
      const kind = BudgetImporter.detectKind(XLSX, wb);
      if (kind === "detail") {
        if (!canDetail) return setError(`${file.name} is a budget workbook. Only the budget preparer or an administrator can import it.`);
        const payload = BudgetImporter.toImportPayload(BudgetImporter.parseDetailWorkbook(XLSX, wb, file.name));
        const match = projects.find((p) => norm(p.name) === norm(payload.project.name) || norm(p.name) === norm(payload.project.name.replace(/^Chandak\s+/i, "")));
        preview({ kind, fileName: file.name, payload, target: match ? String(match.id) : projectId != null ? String(projectId) : "new", preview: null });
      } else if (kind === "cost") {
        if (projectId == null && projects.length === 0) return setError("Create the project first, then import its cost sheet.");
        const sheet = BudgetImporter.parseCostSheet(XLSX, wb, file.name);
        preview({ kind, fileName: file.name, rows: sheet.rows, errors: sheet.errors, target: String(projectId ?? projects[0].id), checked: null });
      } else {
        setError(`${file.name} could not be recognised as a detail budget workbook (expected a sheet with 'Sr. No.' and budget amount columns) or a cost incurred sheet (Month, Department, Category, Amount columns).`);
      }
    } catch (e) {
      setError(`Could not read ${file.name}: ${(e as Error).message}`);
    }
  }

  function save() {
    if (!pending) return;
    start(async () => {
      setError(null);
      if (pending.kind === "detail") {
        const r = await A.importWorkbook(pending.target === "new" ? null : Number(pending.target), pending.payload);
        if (!r.ok) return setError(r.error);
        setDone(<>{pending.fileName} is in draft R{r.versionNumber}: {r.linesChanged} line(s) changed, {r.adjustments} cost entr{r.adjustments === 1 ? "y" : "ies"} added.{" "}
          <Link href={`/budget/${r.projectId}/entry?v=${r.versionNumber}`}>Review it in Budget entry</Link>, type any further changes, then approve.</>);
      } else {
        const ok = (pending.checked ?? []).filter((x) => !x.problem);
        const r = await A.importCostRows(Number(pending.target), pending.fileName, ok);
        if (!r.ok) return setError(r.error);
        setDone(<>{r.entries} cost entr{r.entries === 1 ? "y" : "ies"} imported from {pending.fileName} ({fmt(toCr(r.totalPaise))} Cr).{" "}
          <Link href={`/budget/${pending.target}/incurred`}>See them in Cost incurred</Link>.</>);
      }
      setPending(null);
    });
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>Import from Excel</h2><span className="sub">Nothing is saved until you check the preview and press Save</span></div>
        <div className="grid2">
          <div><h3>Detail budget workbook</h3>
            <p className="sub">Your current detail format, unchanged. Brings in towers and OC dates, cost heads, GST rules, Initial Budget (a), Estimated CTC (b), remarks, areas, and cost incurred to date. It lands in the project&apos;s draft version; Balance, Variance, PSF, Utilised % and totals in the file are ignored and recalculated.</p>
            {!canDetail && <p className="note">Only the budget preparer or an administrator imports a budget workbook.</p>}</div>
          <div><h3>Cost incurred sheet</h3>
            <p className="sub">One row per bill or month: Month, Department, Category, Sub-category, Tower (optional), Amount (₹), Reference. Each valid row becomes a cost incurred entry. Department users import rows for their own department. <a href="/budget-samples/Cost%20Incurred%20Sheet%20template.xlsx" download>Download the template</a>.</p>
            {!canCost && <p className="note">Management has read-only access.</p>}</div>
        </div>
        <div className="row">
          <label>Choose a file (.xlsx)<input type="file" accept=".xlsx,.xlsm,.xls" disabled={!canCost || busy}
            onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) void readFile(f); e.currentTarget.value = ""; }} /></label>
          {busy && <span className="sub">Working…</span>}
        </div>
      </section>
      {error && (
        <div className="banner error" role="alert">
          <div>{error}</div>
          <button type="button" className="link" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {done && <div className="banner ok" role="status"><div>{done}</div></div>}
      {pending?.kind === "detail" && <DetailPreview p={pending} projects={projects} busy={busy}
        onTarget={(t) => preview({ ...pending, target: t, preview: null })} onSave={save} onCancel={() => setPending(null)} />}
      {pending?.kind === "cost" && <CostPreview p={pending} projects={projects} busy={busy}
        onTarget={(t) => preview({ ...pending, target: t, checked: null })} onSave={save} onCancel={() => setPending(null)} />}
    </>
  );
}

function DetailPreview({ p, projects, busy, onTarget, onSave, onCancel }: {
  p: Extract<Pending, { kind: "detail" }>; projects: { id: number; name: string }[]; busy: boolean;
  onTarget: (t: string) => void; onSave: () => void; onCancel: () => void;
}) {
  const pl = p.payload, s = p.preview;
  const target = projects.find((x) => String(x.id) === p.target);
  const into = !s ? "" : s.into === "new project" ? `a new project ${pl.project.name} with draft R${s.version_number}`
    : s.into === "open draft" ? `the open draft R${s.version_number} of ${target?.name}` : `a new draft R${s.version_number} of ${target?.name}, copied from its latest approved version`;
  const sheet = pl.sheet_totals_cr;
  const checks: [string, number | null, number | undefined][] = s ? [["Estimated CTC", sheet.ctc, s.totals.ctc_cr], ["Cost incurred", sheet.incurred, s.totals.incurred_cr], ["Initial budget", sheet.initial, s.totals.initial_cr]] : [];
  return (
    <section className="panel">
      <div className="panel-head"><h2>Preview: {p.fileName}</h2><span className="sub">Budget workbook as on {dmy(pl.as_on)}{pl.revision != null && ` (revision R${pl.revision} in the file)`}</span></div>
      <div className="row"><label>Import into<select value={p.target} disabled={busy} onChange={(e) => onTarget(e.currentTarget.value)}>
        {projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="new">New project: {pl.project.name}</option></select></label></div>
      {!s ? <p className="sub">{busy ? "Checking the file against the database…" : "Preview not available."}</p> : <>
        <p>Save puts this into {into}. The draft stays open for typed changes; the preparer approves it as usual.</p>
        <div className="kpis">
          <div className="kpi"><span>Budget lines changing</span><b>{s.lines_changed}</b><small>Initial, CTC or remark</small></div>
          <div className="kpi"><span>Cost incurred entries</span><b>{s.incurred_adjustments}</b><small>difference from what is recorded</small></div>
          <div className="kpi"><span>New cost heads</span><b>{s.new_heads}</b><small>not in the project yet</small></div>
          <div className="kpi"><span>New towers</span><b>{s.new_towers}</b><small>from the OC date rows</small></div>
        </div>
        <h3>Check against the sheet&apos;s Total row</h3>
        <div className="scroll"><table><thead><tr><th>Figure</th><th className="n">Sheet total (Cr)</th><th className="n">System after import (Cr)</th><th></th></tr></thead><tbody>
          {checks.map(([n, a, b]) => <tr key={n}><td>{n}</td><td className="n">{fmt(a)}</td><td className="n">{fmt(b)}</td>
            <td>{a == null ? "" : Math.abs(Number(b) - a) < 0.000001 ? <span className="chip ok">match</span> : <><span className="chip warn">differs by {(Number(b) - a).toFixed(4)}</span> <span className="note">see the notes from the file below</span></>}</td></tr>)}
        </tbody></table></div>
        {s.changes.length ? <><h3>Budget figures that change</h3>
          <div className="scroll"><table><thead><tr><th>Cost head</th><th className="n">Initial now</th><th className="n">Initial in file</th><th className="n">CTC now</th><th className="n">CTC in file</th><th>Remark</th></tr></thead><tbody>
            {s.changes.map((c, i) => <tr key={i}><td>{c.department} · {c.head}</td><td className="n">{fmt(toCr(c.initial_before))}</td><td className="n">{fmt(toCr(c.initial_after))}</td>
              <td className="n">{fmt(toCr(c.ctc_before))}</td><td className="n">{fmt(toCr(c.ctc_after))}</td><td>{c.remark}</td></tr>)}
          </tbody></table></div></> : <p className="sub">No budget figure changes.</p>}
        {s.adjustments.length > 0 && <><h3>Cost incurred to {dmy(pl.as_on)}</h3>
          <p className="sub">The file holds cumulative cost; only the difference is booked, dated {monthName(pl.as_on)}.</p>
          <div className="scroll"><table><thead><tr><th>Cost head</th><th className="n">Recorded (Cr)</th><th className="n">In file (Cr)</th><th className="n">Entry added</th></tr></thead><tbody>
            {s.adjustments.map((a, i) => <tr key={i}><td>{a.department} · {a.head}</td><td className="n">{fmt(toCr(a.recorded))}</td><td className="n">{fmt(toCr(Number(a.recorded) + Number(a.entry)))}</td><td className="n"><Neg v={toCr(a.entry)} /></td></tr>)}
          </tbody></table></div></>}
        {s.new_head_names.length > 0 && <><h3>New cost heads</h3><ul className="plain">{s.new_head_names.map((x) => <li key={x}>{x}</li>)}</ul></>}
        {s.new_tower_names.length > 0 && <><h3>New towers</h3><p className="sub">{s.new_tower_names.join(", ")}. Set their building types under Towers &amp; set-up.</p></>}
        {(s.custom_values ?? 0) + (s.custom_problems?.length ?? 0) > 0 && <><h3>Custom field columns</h3>
          <p className="sub">{s.custom_values} value(s) read from columns matched to custom fields by their header.{s.custom_problems?.length ? " These cells do not fit their field's rules and are not saved; the rest of the file is:" : ""}</p>
          {s.custom_problems?.length ? <ul className="plain">{s.custom_problems.map((x) => <li key={x} className="bad-text">{x}</li>)}</ul> : null}</>}
        {pl.warnings.length > 0 && <><h3>Notes from the file</h3><ul className="plain">{pl.warnings.map((w) => <li key={w}>{w}</li>)}</ul></>}
        {s.lines_not_in_file > 0 && <p className="note">{s.lines_not_in_file} line(s) in the draft are not in this file and stay as they are.</p>}
      </>}
      <div className="row"><button className="primary" disabled={busy || !s} onClick={onSave}>Save into the draft</button><button onClick={onCancel}>Cancel</button></div>
    </section>
  );
}

function CostPreview({ p, projects, busy, onTarget, onSave, onCancel }: {
  p: Extract<Pending, { kind: "cost" }>; projects: { id: number; name: string }[]; busy: boolean;
  onTarget: (t: string) => void; onSave: () => void; onCancel: () => void;
}) {
  const rows = p.checked ?? [];
  const ok = rows.filter((r) => !r.problem);
  const total = ok.reduce((s, r) => s + Number(r.amount), 0);
  const hasExtra = rows.some((r) => r.extra && Object.keys(r.extra).length);
  return (
    <section className="panel">
      <div className="panel-head"><h2>Preview: {p.fileName}</h2><span className="sub">Cost incurred sheet</span></div>
      <div className="row"><label>Import into<select value={p.target} disabled={busy} onChange={(e) => onTarget(e.currentTarget.value)}>
        {projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
      {p.checked && <p>{ok.length} row(s) ready, {fmt(toCr(total))} crores. {rows.length - ok.length > 0 && `${rows.length - ok.length} row(s) will be skipped; fix them in the sheet and import them again later.`}</p>}
      <div className="scroll"><table><thead><tr><th>Row</th><th>Month</th><th>Department</th><th>Cost head</th><th>Tower</th><th className="n">Amount (₹)</th><th>Reference</th>{hasExtra && <th>Other columns</th>}<th>Status</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.row} className={r.problem ? "flag" : ""}><td>{r.row}</td><td>{r.month ? monthName(r.month) : ""}</td><td>{r.department}</td>
          <td>{r.sub_category || r.category}</td><td>{r.tower}</td><td className="n">{r.amount != null ? fmtRupees(r.amount) : ""}</td><td>{r.reference}</td>{hasExtra && <td>{Object.entries(r.extra ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}</td>}
          <td>{r.problem ? <><span className="chip warn">skip</span> {r.problem}</> : <span className="chip ok">ready</span>}</td></tr>)}
      </tbody></table></div>
      <div className="row"><button className="primary" disabled={busy || ok.length === 0} onClick={onSave}>Save {ok.length} entr{ok.length === 1 ? "y" : "ies"}</button><button onClick={onCancel}>Cancel</button></div>
    </section>
  );
}
