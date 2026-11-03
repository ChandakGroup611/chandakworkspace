"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import * as A from "@/lib/budget/actions";
import { writeBudgetSummary } from "@/lib/budget/insights-actions";
import type { CustomField } from "@/lib/budget/data";
import { BUILDING_TYPES, RATE_BASES, fmt, fmtPct, inputCr, isNeg } from "@/lib/budget/format";
import { fieldTitle } from "@/lib/budget/fields";
import { type Cell, CustomInput, NewRecordFields, type Picks, clearNewRecordFields, readNewRecordFields } from "./custom-fields";

// Small interactive pieces of the budget screens. Each calls a server action and shows its refusal inline.

type Res = { ok: true } | { ok: false; error: string };

export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const run = <T extends Res>(fn: () => Promise<T>, onOk?: (r: Extract<T, { ok: true }>) => void) =>
    start(async () => {
      setError(null);
      setNotice(null);
      const r = await fn();
      if (!r.ok) setError(r.error);
      else onOk?.(r as Extract<T, { ok: true }>);
    });
  const banner = (
    <>
      {error && <div className="banner error" role="alert"><div>{error}</div><button className="link" onClick={() => setError(null)}>Dismiss</button></div>}
      {notice && <div className="banner ok" role="status"><div>{notice}</div><button className="link" onClick={() => setNotice(null)}>Dismiss</button></div>}
    </>
  );
  return { pending, run, banner, setNotice, setError };
}

const value = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;

// ---------- header ----------
export function Selectors(props: {
  projects: { id: number; name: string }[]; projectId: number | null;
  versions: { number: number; as_on: string; status: string }[]; versionNumber: number | null; tab: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (props.projectId != null && typeof document !== "undefined") {
      document.cookie = `active_budget_project=${props.projectId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [props.projectId]);

  return (
    <>
      <label className="ctl">Project
        <select
          value={props.projectId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val && typeof document !== "undefined") {
              document.cookie = `active_budget_project=${val}; path=/; max-age=31536000; SameSite=Lax`;
            }
            const nextTab = props.tab === "home" || props.tab === "access" || props.tab === "fields" || props.tab === "masters" ? "overview" : props.tab;
            router.push(`/budget/${val}/${nextTab}`);
          }}
        >
          {props.projectId == null && <option value="">Choose a project</option>}
          {props.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {props.projectId != null && (
        <label className="ctl">Version
          <select value={props.versionNumber ?? ""} onChange={(e) => router.push(`/budget/${props.projectId}/${props.tab}?v=${e.target.value}`)}>
            {props.versions.length === 0 && <option value="">No version yet</option>}
            {props.versions.slice().reverse().map((v) => (
              <option key={v.number} value={v.number}>R{v.number} · {v.as_on.split("-").reverse().join("/")} · {v.status.replace("_", " ")}</option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

// Query-string controls (filters, compare versions, period grain).
export function QuerySelect(props: { name: string; label?: string; value: string; options: [string, string][] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sel = (
    <select aria-label={props.label ?? props.name} value={props.value} onChange={(e) => {
      const q = new URLSearchParams(params.toString());
      if (e.target.value) q.set(props.name, e.target.value); else q.delete(props.name);
      router.push(`${pathname}?${q.toString()}`);
    }}>
      {props.options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
  return props.label ? <label>{props.label}{sel}</label> : sel;
}

// ---------- versions ----------
export function VersionActions({ versionId, number, projectId }: { versionId: number; number: number; projectId: number }) {
  const { pending, run, banner, setNotice } = useAction();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="row">
        <button className="primary" disabled={pending} onClick={() => run(() => A.approveVersion(versionId), () => setNotice(`R${number} is approved and locked. Reports now show it as the current budget.`))}>
          Approve R{number}
        </button>
        <button className="danger" disabled={pending} onClick={() => {
          if (!confirm) return setConfirm(true);
          run(() => A.deleteDraft(versionId), () => router.push(`/budget/${projectId}/overview`));
        }}>{confirm ? "Click again to delete" : "Delete draft"}</button>
      </div>
      {banner}
    </>
  );
}

/** Sign-off of a version: submit the draft, sign or send it back at your level, or take it back. */
export function SignoffActions({ versionId, number, projectId, status, chain, mayApprove, mayRecall, next }: {
  versionId: number; number: number; projectId: number; status: string; chain: boolean; mayApprove: boolean; mayRecall: boolean;
  next: { title: string; mine: boolean } | null;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const cid = `so-comment-${versionId}`;
  const comment = () => (document.getElementById(cid) as HTMLInputElement | null)?.value ?? "";
  const box = <input type="text" id={cid} className="rem" style={{ minWidth: 220 }} aria-label="Sign-off comment" placeholder={status === "draft" ? "Note for the approvers (optional)" : "Comment (needed to send back)"} />;
  if (status === "draft" && mayApprove) {
    return (
      <>
        <div className="row">
          {chain ? <>{box}<button className="primary" disabled={pending} onClick={() => run(() => A.submitVersion(versionId, comment()),
            () => setNotice(`R${number} is submitted and locked while it is signed.`))}>Submit R{number} for sign-off</button></>
            : <button className="primary" disabled={pending} onClick={() => run(() => A.approveVersion(versionId), () => setNotice(`R${number} is approved and locked. Reports now show it as the current budget.`))}>
              Approve R{number}</button>}
          <button className="danger" disabled={pending} onClick={() => {
            if (!confirm) return setConfirm(true);
            run(() => A.deleteDraft(versionId), () => router.push(`/budget/${projectId}/overview`));
          }}>{confirm ? "Click again to delete" : "Delete draft"}</button>
        </div>
        {banner}
      </>
    );
  }
  if (status !== "in_review" || (!next?.mine && !mayRecall)) return null;
  return (
    <>
      <div className="row">
        {next?.mine && <>{box}
          <button className="primary" disabled={pending} onClick={() => run(() => A.signVersion(versionId, "signed", comment()),
            (r) => setNotice(r.outcome === "approved" ? `Signed. R${number} is approved and locked.` : "Signed. It goes to the next level."))}>Sign as {next.title}</button>
          <button disabled={pending} onClick={() => run(() => A.signVersion(versionId, "returned", comment()), () => setNotice(`R${number} is back with the preparer.`))}>Send back</button></>}
        {mayRecall && <button disabled={pending} onClick={() => run(() => A.recallVersion(versionId), () => setNotice(`R${number} is a draft again; it needs submitting again after the changes.`))}>Take back to draft</button>}
      </div>
      {banner}
    </>
  );
}

/** A tower's OC date in this version and the reason it moved. */
export function TowerNoteRow({ versionId, t, editable }: {
  versionId: number; editable: boolean;
  t: { tower_id: number; name: string; planned: string | null; previous: string | null; oc_date: string | null; moved: boolean; reason: string | null };
}) {
  const { run, banner } = useAction();
  const d = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");
  const save = (date: string, reason: string) => run(() => A.setTowerNote(versionId, t.tower_id, date, reason));
  const ids = { date: `oc-${t.tower_id}`, reason: `ocr-${t.tower_id}` };
  return (
    <tr className={t.moved && !t.reason ? "flag" : ""}>
      <td>{t.name}</td><td>{d(t.planned)}</td><td>{d(t.previous)}</td>
      <td>{editable ? <input type="date" id={ids.date} aria-label={`OC date ${t.name}`} defaultValue={t.oc_date ?? ""} key={`${t.oc_date}`}
        onBlur={(e) => { if (e.currentTarget.value !== (t.oc_date ?? "")) save(e.currentTarget.value, value(ids.reason)); }} /> : d(t.oc_date)}
        {t.moved && <span className="chip warn">moved</span>}</td>
      <td>{editable ? <input type="text" id={ids.reason} className="rem" aria-label={`Reason OC date ${t.name}`} defaultValue={t.reason ?? ""} key={`${t.reason}`}
        placeholder={t.moved ? "Reason needed before approval" : ""}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== (t.reason ?? "")) save(value(ids.date), e.currentTarget.value); }} /> : t.reason}{banner}</td>
    </tr>
  );
}

/** Sign-off levels of one chain (a project's own, or the one for every project). */
export function SignoffLevelsEditor({ projectId, levels, members, editable }: {
  projectId: number | null; editable: boolean;
  levels: { id: number; sort: number; title: string; approver_ids: string[] }[]; members: [string, string][];
}) {
  const { pending, run, banner } = useAction();
  const name = new Map(members);
  const [edits, setPicked] = useState<Record<number, string[]>>({});
  const picked = Object.fromEntries(levels.map((l) => [l.id, edits[l.id] ?? l.approver_ids])) as Record<number, string[]>;
  const [newPick, setNewPick] = useState<string[]>([]);
  const k = projectId ?? "all";
  const Pick = ({ ids, set }: { ids: string[]; set: (v: string[]) => void }) => (
    <details><summary>{ids.length ? ids.map((i) => name.get(i) ?? "Member").join(", ") : "Choose approvers"}</summary>
      <div className="pick-list">{members.map(([id, n]) => <label key={id}><input type="checkbox" checked={ids.includes(id)}
        onChange={(e) => set(e.currentTarget.checked ? [...ids, id] : ids.filter((x) => x !== id))} /> {n}</label>)}</div></details>
  );
  return (
    <>
      {banner}
      <div className="scroll"><table><thead><tr><th className="n">Order</th><th>Level</th><th>Approvers (any one signs)</th><th className="actions-col">Actions</th></tr></thead><tbody>
        {levels.map((l) => editable ? (
          <tr key={l.id}>
            <td className="n"><input type="number" id={`sl-sort-${l.id}`} className="amt" style={{ width: 60 }} defaultValue={l.sort} aria-label="Order" /></td>
            <td><input type="text" id={`sl-title-${l.id}`} defaultValue={l.title} aria-label="Level title" /></td>
            <td><Pick ids={picked[l.id]} set={(v) => setPicked({ ...edits, [l.id]: v })} /></td>
            <td className="actions">
              <div className="actions-group">
                <button className="btn-action primary" disabled={pending} onClick={() => run(() => A.saveSignoffLevel({ id: l.id, project_id: projectId, sort: Number(value(`sl-sort-${l.id}`)) || 0, title: value(`sl-title-${l.id}`), approver_ids: picked[l.id] ?? [] }))}>Save</button>
                <button className="btn-action danger" disabled={pending} onClick={() => run(() => A.deleteSignoffLevel(l.id))}>Remove</button>
              </div>
            </td>
          </tr>
        ) : <tr key={l.id}><td className="n">{l.sort}</td><td>{l.title}</td><td>{l.approver_ids.map((i) => name.get(i) ?? "Member").join(", ")}</td><td></td></tr>)}
        {levels.length === 0 && <tr><td colSpan={4} className="sub">No levels.</td></tr>}
        {editable && <tr>
          <td className="n"><input type="number" id={`sl-sort-new-${k}`} className="amt" style={{ width: 60 }} defaultValue={(levels[levels.length - 1]?.sort ?? 0) + 1} aria-label="New level order" /></td>
          <td><input type="text" id={`sl-title-new-${k}`} placeholder="For example: Checked by" aria-label="New level title" /></td>
          <td><Pick ids={newPick} set={setNewPick} /></td>
          <td className="actions"><button className="btn-action primary" disabled={pending} onClick={() => run(() => A.saveSignoffLevel({ project_id: projectId, sort: Number(value(`sl-sort-new-${k}`)) || 0, title: value(`sl-title-new-${k}`), approver_ids: newPick }), () => setNewPick([]))}>+ Add level</button></td>
        </tr>}
      </tbody></table></div>
    </>
  );
}

export function OpenVersionForm({ projectId, defaultDate, first }: { projectId: number; defaultDate: string; first?: boolean }) {
  const { pending, run, banner } = useAction();
  const router = useRouter();
  return (
    <>
      <div className="row">
        <label>As on<input type="date" id="nv-date" defaultValue={defaultDate} /></label>
        <label style={{ flex: 1, minWidth: 220 }}>Reason for this version<input type="text" id="nv-reason" defaultValue={first ? "First budget" : ""} placeholder="For example: Q2 FY2026-27 revision" /></label>
        <button className="primary" disabled={pending} onClick={() => run(
          () => A.openVersion(projectId, value("nv-date"), value("nv-reason")),
          (r) => router.push(`/budget/${projectId}/entry?v=${r.number}`),
        )}>{first ? "Open R1 for typed entry" : "Open next version"}</button>
        {first && <Link href={`/budget/${projectId}/import`}>or import a workbook</Link>}
      </div>
      {banner}
    </>
  );
}

// ---------- budget entry ----------
export interface EntryRow {
  kind: "dept" | "cat" | "line" | "memo"; key: string; label: string; note?: string | null; tower?: string | null; indent?: number;
  /** Department rows: the department's remark for this version. */
  deptRemark?: { versionId: number; departmentId: number; text: string; editable: boolean };
  initial_cr: number; ctc_cr: number; incurred_cr: number; balance_cr: number; variance_cr: number; util_pct: number | null; psf_ctc: number | null;
  line?: {
    id: number; isTax: boolean; taxRule: string | null; initial: number | null; ctc: number | null; initialCalc: boolean; ctcCalc: boolean;
    incurredAuto: boolean; remark: string | null; source: string; editable: boolean; needsRemark: boolean; removable: boolean; overBudget: boolean; href?: string;
    custom?: Record<string, Cell>;
    /** How CTC is set (typed, rate × area, balance of a total, GST rule) and whether the line is a memo item. */
    rule: RuleState;
  };
}
export interface RuleState {
  kind: "typed" | "rate" | "balance" | "tax" | "memo" | "schedule"; rate: number | null; basis: string | null; totalCr: number | null;
  scope: "category" | "department" | null; label: string;
  /** For giving the line a schedule: its version and a default title. */
  versionId: number; title: string; scheduleHref?: string;
}


function Bar({ v }: { v: number | null }) {
  if (v == null) return null;
  return <><span className="bar"><i className={v > 100 ? "over" : ""} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} /></span>{fmtPct(v)}</>;
}
export const Neg = ({ v }: { v: number | null }) => <span className={isNeg(v) ? "neg" : ""}>{fmt(v)}</span>;

function AmountInput({ line, field, shown }: { line: NonNullable<EntryRow["line"]>; field: "initial" | "ctc"; shown: number }) {
  const { pending, run, banner } = useAction();
  const stored = line[field];
  const calc = field === "initial" ? line.initialCalc : line.ctcCalc;
  const initial = line.isTax && stored == null ? "" : inputCr(stored ?? 0);
  return (
    <>
      <input
        key={`${line.id}-${field}-${stored}`}
        className={`amt ${line.isTax && calc ? "auto" : ""} ${pending ? "busy" : ""}`}
        inputMode="decimal"
        aria-label={field === "initial" ? "Initial budget" : "Estimated CTC"}
        defaultValue={initial}
        placeholder={line.isTax ? `${fmt(shown)} auto` : undefined}
        title={line.isTax ? "Leave blank to calculate from the GST rule" : undefined}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        onBlur={(e) => {
          const el = e.currentTarget;
          if (el.value.trim() === initial) return;
          run(() => A.updateLine(line.id, field, el.value, line.isTax), undefined);
        }}
      />
      {banner}
    </>
  );
}

function RemarkInput({ line }: { line: NonNullable<EntryRow["line"]> }) {
  const { run, banner } = useAction();
  return (
    <>
      <input key={`${line.id}-r-${line.remark}`} className="rem" type="text" aria-label="Remark" defaultValue={line.remark ?? ""}
        placeholder={line.needsRemark ? "Remark needed for this change" : ""}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== (line.remark ?? "")) run(() => A.updateLine(line.id, "remark", e.currentTarget.value, line.isTax)); }} />
      {banner}
    </>
  );
}

export function EntryTable({ rows, total, customFields = [], picks }: { rows: EntryRow[]; total: EntryRow; customFields?: CustomField[]; picks?: Picks }) {
  const { run, banner } = useAction();
  return (
    <>
      {banner}
      <div className="scroll"><table>
        <thead><tr><th>Cost head</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (b−c)</th>
          <th className="n">Variance (a−b)</th><th className="n">Utilised</th><th className="n">PSF on CTC</th><th>Remark</th>
          {customFields.map((f) => <th key={f.id} className={f.field_type === "formula" || ["number", "integer", "amount_cr", "amount_inr", "percent"].includes(f.field_type) ? "n cf" : "cf"} title={fieldTitle(f)}>{f.label}{f.required && " *"}</th>)}
          <th>Source</th><th className="actions-col">Actions</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const l = r.line;
            if (r.kind === "memo" && !l) return <tr key={r.key} className="cat"><td colSpan={11 + customFields.length}>{r.label}</td></tr>;
            const cls = r.kind === "dept" ? "group" : r.kind === "cat" || (r.kind === "memo" && !l) ? "cat" : l?.needsRemark ? "flag" : "";
            return (
              <tr key={r.key} className={cls} data-head={r.kind === "line" ? r.label : undefined}>
                <td className={r.indent === 2 ? "indent2" : r.indent === 1 ? "indent" : ""}>
                  {r.label}{r.tower && <span className="chip">{r.tower}</span>}
                  {l?.taxRule && <> <span className="chip">{l.taxRule}</span></>}
                  {r.note && <div className="note">{r.note}</div>}
                </td>
                <td className="n">{l?.editable ? <AmountInput line={l} field="initial" shown={r.initial_cr} /> : <>{fmt(r.initial_cr)}{l?.isTax && l.initialCalc && <span className="chip">auto</span>}</>}</td>
                <td className="n">{l?.editable && (l.rule.kind === "typed" || l.rule.kind === "tax" || l.rule.kind === "memo") ? <AmountInput line={l} field="ctc" shown={r.ctc_cr} />
                  : <>{r.kind === "memo" || r.kind === "line" ? <span className={isNeg(r.ctc_cr) ? "neg" : ""}>{fmt(r.ctc_cr)}</span> : fmt(r.ctc_cr)}{l?.isTax && l.ctcCalc && <span className="chip">auto</span>}{l && (l.rule.kind === "rate" || l.rule.kind === "balance" || l.rule.kind === "schedule") && <span className="chip" title={l.rule.label}>{l.rule.kind}</span>}</>}</td>
                <td className="n">{fmt(r.incurred_cr)}{l?.incurredAuto && <span className="chip">auto</span>}{l?.overBudget && <span className="chip bad" title="Cost incurred is above the Estimated CTC">over</span>}</td>
                <td className="n"><Neg v={r.balance_cr} /></td>
                <td className="n"><Neg v={r.variance_cr} /></td>
                <td className="n"><Bar v={r.util_pct} /></td>
                <td className="n">{fmt(r.psf_ctc)}</td>
                <td>{r.deptRemark ? <DeptRemarkInput d={r.deptRemark} /> : l?.editable ? <RemarkInput line={l} /> : l?.remark}{l?.needsRemark && <span className="chip warn">remark needed</span>}</td>
                {customFields.map((f) => <td key={f.id} className={f.field_type === "formula" || ["number", "integer", "amount_cr", "amount_inr", "percent"].includes(f.field_type) ? "n" : ""}>
                  {l && <CustomInput field={f} entity="line" entityId={l.id} cell={l.custom?.[f.key]} editable={l.editable} picks={picks} compact />}</td>)}
                <td>{l && (l.isTax && l.initialCalc && l.ctcCalc ? <span className="chip" title="Calculated by the GST rule">Calc</span>
                  : l.source === "excel" ? <span className="chip xl" title="Last set by an Excel import">Excel</span> : <span className="chip typed" title="Last typed on screen">Typed</span>)}
                  {l && !l.isTax && <LineRuleCell lineId={l.id} rule={l.rule} editable={l.editable} />}</td>
                <td className="actions">
                  <div className="actions-group">
                    {l?.href && <Link href={l.href} className="btn-action" title="Figures, versions, comments and history of this line">View</Link>}
                    {l?.removable && <button className="btn-action danger" onClick={() => run(() => A.removeLine(l.id))}>Remove</button>}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="total"><td>{total.label}</td><td className="n">{fmt(total.initial_cr)}</td><td className="n">{fmt(total.ctc_cr)}</td><td className="n">{fmt(total.incurred_cr)}</td>
            <td className="n"><Neg v={total.balance_cr} /></td><td className="n"><Neg v={total.variance_cr} /></td><td className="n"><Bar v={total.util_pct} /></td><td className="n">{fmt(total.psf_ctc)}</td><td></td>{customFields.map((f) => <td key={f.id}></td>)}<td></td><td></td></tr>
        </tbody>
      </table></div>
    </>
  );
}

function DeptRemarkInput({ d }: { d: NonNullable<EntryRow["deptRemark"]> }) {
  const { run, banner } = useAction();
  if (!d.editable) return <>{d.text}</>;
  return (
    <>
      <input key={`dr-${d.departmentId}-${d.text}`} className="rem" type="text" aria-label="Department remark" defaultValue={d.text} placeholder="Department remark"
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== d.text) run(() => A.setDepartmentRemark(d.versionId, d.departmentId, e.currentTarget.value)); }} />
      {banner}
    </>
  );
}

/** The CTC rule of a line: shown as a chip; on a draft, opens a small form to change it. */
function LineRuleCell({ lineId, rule, editable }: { lineId: number; rule: RuleState; editable: boolean }) {
  const { pending, run, banner } = useAction();
  const [kind, setKind] = useState<"typed" | "rate" | "balance" | "memo" | "schedule">(rule.kind === "tax" ? "typed" : rule.kind);
  const [open, setOpen] = useState(false);
  const chip = rule.kind === "typed" ? null : <span className={`chip ${rule.kind === "memo" ? "warn" : ""}`} title={rule.label}>
    {rule.kind === "memo" ? "Memo" : rule.kind === "rate" ? "Rate × area" : rule.kind === "schedule" ? "Schedule" : "Balance"}</span>;
  if (!editable) return chip;
  // a scheduled line is changed on the Schedules screen
  if (rule.kind === "schedule") return <div className="actions-group">{chip} <Link href={rule.scheduleHref ?? "#"} className="btn-action">Open</Link></div>;
  const id = (k: string) => `rule-${lineId}-${k}`;
  return (
    <>
      <div className="actions-group">
        {chip}
        <button className="btn-action" aria-label="CTC rule" onClick={() => setOpen(!open)}>{open ? "Close" : "Rule"}</button>
      </div>
      {open && <div className="rule-form">
        <label>CTC is<select value={kind} aria-label="Rule" onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="typed">Typed</option><option value="rate">Rate × area</option><option value="balance">Balance of a total</option><option value="memo">Memo item (outside totals)</option>
          <option value="schedule">Worked out in a schedule</option>
        </select></label>
        {kind === "schedule" && <label>Schedule title<input id={id("title")} type="text" defaultValue={rule.title} /></label>}
        {kind === "rate" && <>
          <label>₹ per sq ft<input id={id("rate")} type="text" inputMode="decimal" className="amt" defaultValue={rule.rate ?? ""} /></label>
          <label>× area<select id={id("basis")} defaultValue={rule.basis ?? "eng_area"}>{RATE_BASES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        </>}
        {kind === "balance" && <>
          <label>Total (Cr)<input id={id("total")} type="text" inputMode="decimal" className="amt" defaultValue={rule.totalCr ?? ""} /></label>
          <label>less the other lines of its<select id={id("scope")} defaultValue={rule.scope ?? "category"}><option value="category">category</option><option value="department">department</option></select></label>
        </>}
        <button className="primary" disabled={pending} onClick={() => run(() => kind === "schedule" ? A.addSchedule(rule.versionId, lineId, value(id("title"))) : A.setLineRule(lineId,
          kind === "rate" ? { kind, rate: value(id("rate")), basis: value(id("basis")) }
            : kind === "balance" ? { kind, total: value(id("total")), scope: value(id("scope")) as "category" | "department" } : { kind }), () => setOpen(false))}>Save rule</button>
      </div>}
      {banner}
    </>
  );
}

/** Certified amount of a line (crores), on the tower workings. */
export function CertifiedInput({ lineId, paise, editable }: { lineId: number; paise: number | null; editable: boolean }) {
  const { pending, run, banner } = useAction();
  const shown = paise == null ? "" : inputCr(paise);
  if (!editable) return <>{paise == null ? "" : fmt(Number(paise) / 1e9)}</>;
  return (
    <>
      <input key={`${lineId}-cert-${paise}`} className={`amt ${pending ? "busy" : ""}`} inputMode="decimal" aria-label="Certified" defaultValue={shown}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== shown) run(() => A.setCertified(lineId, e.currentTarget.value)); }} />
      {banner}
    </>
  );
}

/** A tower's construction BUA and design area for this version. */
export function TowerAreasForm({ versionId, towerId, bua, design, planned }: { versionId: number; towerId: number; bua: number | null; design: number | null; planned: { bua: number | null; design: number | null } }) {
  const { pending, run, banner } = useAction();
  const ids = { b: `ta-bua-${towerId}`, d: `ta-design-${towerId}` };
  return (
    <>
      <div className="row">
        <label>Construction BUA (sft)<input type="number" id={ids.b} defaultValue={bua ?? ""} key={`b${bua}`} placeholder={planned.bua == null ? "" : String(planned.bua)} /></label>
        <label>Design area (sft)<input type="number" id={ids.d} defaultValue={design ?? ""} key={`d${design}`} placeholder={planned.design == null ? "" : String(planned.design)} /></label>
        <button disabled={pending} onClick={() => run(() => A.setTowerAreas(versionId, towerId, value(ids.b), value(ids.d)))}>Save areas</button>
      </div>
      {banner}
    </>
  );
}

/** One supporting schedule: rows of quantity × rate × % × periods (or a typed amount); its total is the line's CTC. */
export function ScheduleEditor({ s, editable }: {
  s: { id: number; title: string; note: string | null; rows: { row_id: number; sort: number; label: string; qty: number | null; rate: number | null; pct: number; periods: number; typed_paise: number | null; amount_paise: number; remark: string | null }[] };
  editable: boolean;
}) {
  const { pending, run, banner } = useAction();
  const [confirm, setConfirm] = useState(false);
  const rupees = (p: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(p) / 100);
  const total = s.rows.reduce((t, r) => t + Number(r.amount_paise), 0);
  const f = (k: string, rid: number | "new") => `sr-${s.id}-${rid}-${k}`;
  const read = (rid: number | "new"): A.ScheduleRowInput => ({
    label: value(f("label", rid)), qty: value(f("qty", rid)), rate: value(f("rate", rid)), pct: value(f("pct", rid)),
    periods: value(f("periods", rid)), amount: value(f("amount", rid)), remark: value(f("remark", rid)),
  });
  const n = (v: number | null | undefined) => (v == null ? "" : String(Number(v)));
  const cells = (rid: number | "new", r?: (typeof s.rows)[number]) => <>
    <td><input type="text" id={f("label", rid)} defaultValue={r?.label ?? ""} aria-label="Item" placeholder={rid === "new" ? "New row" : ""} /></td>
    <td className="n"><input type="text" className="amt" id={f("qty", rid)} defaultValue={n(r?.qty)} aria-label="Quantity" /></td>
    <td className="n"><input type="text" className="amt" id={f("rate", rid)} defaultValue={n(r?.rate)} aria-label="Rate" /></td>
    <td className="n"><input type="text" className="amt" style={{ width: 60 }} id={f("pct", rid)} defaultValue={r ? n(r.pct) : "100"} aria-label="Percent" /></td>
    <td className="n"><input type="text" className="amt" style={{ width: 60 }} id={f("periods", rid)} defaultValue={r ? n(r.periods) : "1"} aria-label="Periods" /></td>
    <td className="n"><input type="text" className="amt" id={f("amount", rid)} defaultValue={r?.typed_paise == null ? "" : String(Number(r.typed_paise) / 100)} aria-label="Typed amount" placeholder="calculate" /></td>
  </>;
  return (
    <>
      {banner}
      <div className="scroll"><table><thead><tr><th>Item</th><th className="n">Quantity</th><th className="n">Rate (₹)</th><th className="n">%</th><th className="n">Periods</th>
        {editable && <th className="n">Typed amount (₹)</th>}<th className="n">Amount (₹)</th><th>Remark</th>{editable && <th className="actions-col">Actions</th>}</tr></thead><tbody>
        {s.rows.map((r) => editable ? (
          <tr key={`${r.row_id}-${r.amount_paise}-${r.label}`}>{cells(r.row_id, r)}<td className="n">{rupees(r.amount_paise)}</td>
            <td><input type="text" className="rem" id={f("remark", r.row_id)} defaultValue={r.remark ?? ""} aria-label="Row remark" /></td>
            <td className="actions">
              <div className="actions-group">
                <button className="btn-action primary" disabled={pending} onClick={() => run(() => A.saveScheduleRow(s.id, r.row_id, r.sort, read(r.row_id)))}>Save</button>
                <button className="btn-action danger" disabled={pending} onClick={() => run(() => A.deleteScheduleRow(r.row_id))}>Remove</button>
              </div>
            </td></tr>
        ) : (
          <tr key={r.row_id}><td>{r.label}</td><td className="n">{n(r.qty)}</td><td className="n">{n(r.rate)}</td><td className="n">{n(r.pct)}</td><td className="n">{n(r.periods)}</td>
            <td className="n">{rupees(r.amount_paise)}</td><td>{r.remark}</td></tr>
        ))}
        {editable && <tr key="new">{cells("new")}<td></td><td><input type="text" className="rem" id={f("remark", "new")} aria-label="Row remark" /></td>
          <td className="actions"><button className="btn-action primary" disabled={pending} onClick={() => run(() => A.saveScheduleRow(s.id, null, (s.rows[s.rows.length - 1]?.sort ?? 0) + 1, read("new")), () => {
            // the new row stays in place (so typing is never lost to a refresh); clear it for the next one
            for (const [k, d] of [["label", ""], ["qty", ""], ["rate", ""], ["pct", "100"], ["periods", "1"], ["amount", ""], ["remark", ""]]) (document.getElementById(f(k, "new")) as HTMLInputElement).value = d;
          })}>+ Add row</button></td></tr>}
        <tr className="total"><td colSpan={editable ? 6 : 5}>Total = CTC of the line</td><td className="n">{rupees(total)}</td><td>{fmt(total / 1e9)} Cr</td>{editable && <td></td>}</tr>
      </tbody></table></div>
      {editable && <div className="row">
        <button className="btn-action danger" disabled={pending} onClick={() => { if (!confirm) return setConfirm(true); run(() => A.deleteSchedule(s.id)); }}>{confirm ? "Confirm Delete Schedule" : "Delete schedule"}</button>
        <span className="note">Removing it keeps the line&apos;s last CTC, which can then be typed again.</span></div>}
    </>
  );
}

export function SplitLineForm({ versionId, heads, towers }: { versionId: number; heads: { id: number; label: string }[]; towers: { id: number; label: string }[] }) {
  const { pending, run, banner, setNotice } = useAction();
  return (
    <>
      <div className="row">
        <label style={{ flex: 1, minWidth: 240 }}>Cost head<select id="add-head">{heads.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}</select></label>
        <label>Tower<select id="add-tower">{towers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <button disabled={pending} onClick={() => run(() => A.addTowerLine(versionId, Number(value("add-head")), Number(value("add-tower"))), () => setNotice("Line added. Enter its amounts in the table."))}>Add line</button>
      </div>
      {banner}
    </>
  );
}

export function VersionDetailsForm({ versionId, asOn, reason, categories, reasons }: { versionId: number; asOn: string; reason: string | null; categories: string[]; reasons: Record<string, string> }) {
  const { run, banner } = useAction();
  return (
    <>
      {banner}
      <div className="row">
        <label>As on<input type="date" defaultValue={asOn} onBlur={(e) => e.currentTarget.value !== asOn && run(() => A.updateVersion(versionId, { as_on: e.currentTarget.value }))} /></label>
        <label style={{ flex: 1, minWidth: 240 }}>Reason for this version<input type="text" defaultValue={reason ?? ""} onBlur={(e) => e.currentTarget.value !== (reason ?? "") && run(() => A.updateVersion(versionId, { reason: e.currentTarget.value.trim() || null }))} /></label>
      </div>
      <div className="scroll"><table><thead><tr><th>Category</th><th>Reason for the change</th></tr></thead><tbody>
        {categories.map((c) => (
          <tr key={c}><td>{c}</td><td><input type="text" className="rem" aria-label={`Reason for ${c}`} defaultValue={reasons[c] ?? ""}
            onBlur={(e) => e.currentTarget.value.trim() !== (reasons[c] ?? "") && run(() => A.updateVersion(versionId, { category_reasons: { [c]: e.currentTarget.value.trim() } }))} /></td></tr>
        ))}
      </tbody></table></div>
    </>
  );
}

// ---------- cost incurred ----------
export function EntryForm({ projectId, heads, towers, month, customFields = [], picks }: {
  projectId: number; heads: { id: number; label: string }[]; towers: { id: number; name: string }[]; month: string; customFields?: CustomField[]; picks?: Picks;
}) {
  const { pending, run, banner, setNotice } = useAction();
  return (
    <>
      <div className="row">
        <label style={{ flex: 1, minWidth: 240 }}>Cost head<select id="ce-head">{heads.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}</select></label>
        <label>Tower<select id="ce-tower"><option value="">Not split by tower</option>{towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Month<input type="month" id="ce-month" defaultValue={month} /></label>
        <label>Amount (₹)<input type="text" inputMode="decimal" id="ce-amount" placeholder="1250000" /></label>
        <label style={{ flex: 1, minWidth: 200 }}>Reference<input type="text" id="ce-ref" placeholder="Bill / PO / voucher number" /></label>
        <NewRecordFields fields={customFields} prefix="ce-cf-" picks={picks} />
        <button className="primary" disabled={pending} onClick={() => {
          const amount = value("ce-amount");
          run(() => A.addEntry(projectId, Number(value("ce-head")), value("ce-tower") ? Number(value("ce-tower")) : null, value("ce-month"), amount, value("ce-ref"), readNewRecordFields("ce-cf-")), () => {
            setNotice(`Recorded ₹${amount}`);
            clearNewRecordFields("ce-cf-");
            (document.getElementById("ce-amount") as HTMLInputElement).value = "";
            (document.getElementById("ce-ref") as HTMLInputElement).value = "";
          });
        }}>Add</button>
      </div>
      {banner}
    </>
  );
}

export interface BillValue { id: number; vendor: string; billNo: string; date: string; workOrder: string; gst: string; note: string; splits: { head: number; tower: number | null; amount: string }[] }

/** A bill: vendor, number, date, work order and GST, split over one or more cost heads and towers.
 *  Records a new bill, or with `bill` changes that bill and replaces its splits. */
export function BillForm({ projectId, heads, towers, date, bill, onDone }: {
  projectId: number; heads: { id: number; label: string }[]; towers: { id: number; name: string }[]; date: string; bill?: BillValue; onDone?: () => void;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const start = bill?.splits.length ? bill.splits : [{ head: heads[0]?.id ?? 0, tower: null, amount: "" }];
  const [rows, setRows] = useState(start.map((_, i) => i));
  const [amounts, setAmounts] = useState<Record<number, string>>(Object.fromEntries(start.map((x, i) => [i, x.amount])));
  const [form, setForm] = useState(0);
  const p = `bill-${bill?.id ?? "new"}`;
  const id = (k: string) => (bill ? `${p}-${k}` : k === "vendor" ? "bill-vendor" : k === "no" ? "bill-no" : k === "date" ? "bill-date" : k === "wo" ? "bill-wo" : k === "gst" ? "bill-gst" : k === "note" ? "bill-note" : `bill-${k}`);
  const basic = rows.reduce((t, k) => t + (Number((amounts[k] ?? "").replace(/,/g, "")) || 0), 0);
  const inr = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
  const save = () => {
    const b = { vendor: value(id("vendor")), billNo: value(id("no")), date: value(id("date")), workOrder: value(id("wo")), gst: value(id("gst")), note: value(id("note")) };
    const splits = rows.map((k) => ({ head: Number(value(id(`head-${k}`))), tower: value(id(`tower-${k}`)) ? Number(value(id(`tower-${k}`))) : null, amount: amounts[k] ?? "" }));
    if (bill) return run(() => A.updateBill(bill.id, b, splits), () => onDone?.());
    run(() => A.addBill(projectId, b, splits), () => {
      setNotice(`Bill ${b.billNo} of ${b.vendor} recorded: ₹${inr(basic)} over ${splits.filter((s) => s.amount.trim()).length} cost head(s)`);
      setRows([0]); setAmounts({}); setForm(form + 1);
    });
  };
  return (
    <div key={form}>
      <div className="row">
        <label style={{ flex: 1, minWidth: 200 }}>Vendor<input type="text" id={id("vendor")} defaultValue={bill?.vendor} /></label>
        <label>Bill number<input type="text" id={id("no")} defaultValue={bill?.billNo} /></label>
        <label>Bill date<input type="date" id={id("date")} defaultValue={bill?.date ?? date} /></label>
        <label>Work order / PO<input type="text" id={id("wo")} defaultValue={bill?.workOrder} /></label>
        <label>GST on the bill (₹)<input type="text" inputMode="decimal" id={id("gst")} placeholder="0" defaultValue={bill?.gst} /></label>
      </div>
      <div className="scroll"><table><thead><tr><th>Cost head</th><th>Tower</th><th className="n">Basic amount (₹)</th><th className="actions-col">Actions</th></tr></thead><tbody>
        {rows.map((k) => <tr key={k}>
          <td><select id={id(`head-${k}`)} aria-label="Split cost head" defaultValue={start[k]?.head}>{heads.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}</select></td>
          <td><select id={id(`tower-${k}`)} aria-label="Split tower" defaultValue={start[k]?.tower ?? ""}><option value="">Not split by tower</option>{towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></td>
          <td className="n"><input type="text" inputMode="decimal" className="amt" aria-label="Split amount" value={amounts[k] ?? ""} onChange={(e) => setAmounts({ ...amounts, [k]: e.target.value })} /></td>
          <td className="actions">{rows.length > 1 && <button className="btn-action danger" onClick={() => setRows(rows.filter((x) => x !== k))}>Remove</button>}</td>
        </tr>)}
        <tr className="total"><td colSpan={2}>Basic amount of the bill <button className="btn-action primary" style={{ marginLeft: 8 }} onClick={() => setRows([...rows, Math.max(...rows) + 1])}>+ Add a split</button></td><td className="n">{inr(basic)}</td><td></td></tr>
      </tbody></table></div>
      <div className="row">
        <label style={{ flex: 1, minWidth: 240 }}>Note<input type="text" id={id("note")} defaultValue={bill?.note} /></label>
        <button className="primary" disabled={pending} onClick={save}>{bill ? "Save bill" : "Record bill"}</button>
        {bill && <button disabled={pending} onClick={onDone}>Cancel</button>}
      </div>
      {banner}
    </div>
  );
}

/** One bill in the Bills list: View shows its splits, Edit opens it in the bill form, Delete removes it. */
export function BillRow({ b, splits, heads, towers, editable, children }: {
  b: { bill_id: number; vendor: string; bill_no: string; bill_date: string; work_order: string | null; gst_paise: number; note: string | null };
  splits: { head: number; headLabel: string; tower: number | null; towerName: string | null; amount_paise: number; month: string }[];
  heads: { id: number; label: string }[]; towers: { id: number; name: string }[]; editable: boolean; children: React.ReactNode;
}) {
  const [mode, setMode] = useState<"" | "view" | "edit">("");
  const rupees = (p: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(p) / 100);
  return (
    <>
      <tr className={`clickable ${mode ? "open" : ""}`} onClick={(e) => { if (!(e.target as HTMLElement).closest("button,a,input,select")) setMode(mode === "view" ? "" : "view"); }}>
        {children}
        <td className="actions">
          <div className="actions-group">
            <button className="btn-action" onClick={() => setMode(mode === "view" ? "" : "view")}>{mode === "view" ? "Hide Splits" : "View Splits"}</button>
            {editable && <><button className="btn-action" onClick={() => setMode(mode === "edit" ? "" : "edit")}>Edit Bill</button><DeleteBill id={b.bill_id} /></>}
          </div>
        </td>
      </tr>
      {mode === "view" && <tr className="detail"><td colSpan={10}>
        <div className="scroll"><table><thead><tr><th>Cost head</th><th>Tower</th><th>Counts in</th><th className="n">Basic (₹)</th></tr></thead><tbody>
          {splits.map((s, i) => <tr key={i}><td>{s.headLabel}</td><td>{s.towerName ?? "Not split by tower"}</td><td>{s.month}</td><td className="n">{rupees(s.amount_paise)}</td></tr>)}
        </tbody></table></div>
        {b.note && <p className="note">Note: {b.note}</p>}
      </td></tr>}
      {mode === "edit" && <tr className="detail"><td colSpan={10}>
        <BillForm projectId={0} heads={heads} towers={towers} date={b.bill_date} onDone={() => setMode("")}
          bill={{ id: b.bill_id, vendor: b.vendor, billNo: b.bill_no, date: b.bill_date.slice(0, 10), workOrder: b.work_order ?? "", gst: String(Number(b.gst_paise) / 100), note: b.note ?? "",
            splits: splits.map((s) => ({ head: s.head, tower: s.tower, amount: String(Number(s.amount_paise) / 100) })) }} />
      </td></tr>}
    </>
  );
}

export function DeleteBill({ id }: { id: number }) {
  const { pending, run, banner } = useAction();
  const [confirm, setConfirm] = useState(false);
  return <>{banner}<button className="btn-action danger" disabled={pending} onClick={() => { if (!confirm) return setConfirm(true); run(() => A.deleteBill(id)); }}>{confirm ? "Confirm Delete" : "Delete"}</button></>;
}

/** Edit and Delete for a typed or imported cost entry. */
export function EntryActions({ e, heads, towers }: {
  e: { id: number; cost_head_id: number; subproject_id: number | null; month: string; amount_paise: number; reference: string | null };
  heads: { id: number; label: string }[]; towers: { id: number; name: string }[];
}) {
  const { pending, run, banner } = useAction();
  const [open, setOpen] = useState(false);
  const id = (k: string) => `ee-${e.id}-${k}`;
  return (
    <>
      <div className="actions-group">
        <button className="btn-action" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</button>
        <DeleteEntry id={e.id} />
      </div>
      {open && <div className="rule-form">
        <label>Cost head<select id={id("head")} defaultValue={e.cost_head_id}>{heads.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}</select></label>
        <label>Tower<select id={id("tower")} defaultValue={e.subproject_id ?? ""}><option value="">Not split by tower</option>{towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Month<input type="month" id={id("month")} defaultValue={e.month.slice(0, 7)} /></label>
        <label>Amount (₹)<input type="text" inputMode="decimal" className="amt" id={id("amount")} defaultValue={String(Number(e.amount_paise) / 100)} /></label>
        <label>Reference<input type="text" id={id("ref")} defaultValue={e.reference ?? ""} /></label>
        <button className="btn-action primary" disabled={pending} onClick={() => run(() => A.updateEntry(e.id, Number(value(id("head"))), value(id("tower")) ? Number(value(id("tower"))) : null, value(id("month")), value(id("amount")), value(id("ref"))), () => setOpen(false))}>Save</button>
      </div>}
      {banner}
    </>
  );
}

/** Actions (View, Edit, Delete) for Portfolio project rows. */
export function ProjectActions({ p, canManage = true }: { p: { id: number; name: string; code: string; location: string | null }; canManage?: boolean }) {
  const { pending, run, banner, setNotice } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <div className="actions-group">
        <Link href={`/budget/${p.id}/overview`} className="btn-action" title="View budget overview & details">
          View
        </Link>
        {canManage && (
          <>
            <button className="btn-action" onClick={() => setEditing(!editing)} title="Edit project details">
              {editing ? "Close" : "Edit"}
            </button>
            <button
              className="btn-action danger"
              disabled={pending}
              onClick={() => {
                if (!confirm) return setConfirm(true);
                run(() => A.deleteProject(p.id), () => { setConfirm(false); setNotice("Project deleted"); });
              }}
              title="Delete project"
            >
              {confirm ? "Confirm Delete" : "Delete"}
            </button>
          </>
        )}
      </div>
      {editing && (
        <div className="rule-form" style={{ marginTop: 6, textAlign: "left" }}>
          <label>Name<input type="text" id={`pj-edit-${p.id}-name`} defaultValue={p.name} /></label>
          <label>Code<input type="text" id={`pj-edit-${p.id}-code`} defaultValue={p.code} /></label>
          <label>Location<input type="text" id={`pj-edit-${p.id}-loc`} defaultValue={p.location ?? ""} /></label>
          <button
            className="btn-action primary"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  A.updateProject(p.id, {
                    name: value(`pj-edit-${p.id}-name`),
                    code: value(`pj-edit-${p.id}-code`),
                    location: value(`pj-edit-${p.id}-loc`),
                  }),
                () => { setEditing(false); setNotice("Project saved"); }
              )
            }
          >
            Save
          </button>
        </div>
      )}
      {banner}
    </>
  );
}

/** Delete with a second click to confirm, for set-up rows. */
export function ConfirmDelete({ label = "Delete", onConfirm }: { label?: string; onConfirm: () => Promise<A.Result> }) {
  const { pending, run, banner } = useAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      {banner}
      {confirm ? (
        <span className="inline-flex items-center gap-1.5">
          <button className="btn-action danger" disabled={pending} onClick={() => run(onConfirm, () => setConfirm(false))}>
            Confirm Delete
          </button>
          <button className="btn-action" disabled={pending} onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <button className="btn-action danger" disabled={pending} onClick={() => setConfirm(true)}>
          {label}
        </button>
      )}
    </>
  );
}


export function HeadRow({
  h,
  deptName,
  byTower,
  can,
  options,
  gstRules = [],
}: {
  h: { id: number; category: string; sub_category: string | null; summary_subcategory: string | null; is_tax: boolean; tax_rate_pct: number | null; tax_share_pct: number | null; tax_base: number[] };
  deptName: string;
  byTower: boolean;
  can: boolean;
  options: string[];
  gstRules?: GstRuleOpt[];
}) {
  const { pending, run, banner } = useAction();
  const [editing, setEditing] = useState(false);
  const [cat, setCat] = useState(h.category);
  const [sub, setSub] = useState(h.sub_category ?? "");

  return (
    <tr className={editing ? "editing-row" : ""}>
      <td>{deptName}</td>
      <td>
        {editing ? (
          <input
            type="text"
            className="row-edit-input"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="Category name"
            autoFocus
          />
        ) : (
          <span className="font-medium">{h.category}</span>
        )}
      </td>
      <td>
        {editing ? (
          <input
            type="text"
            className="row-edit-input"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Sub-category (optional)"
          />
        ) : (
          h.sub_category || <span className="sub">—</span>
        )}
      </td>
      <td>
        {byTower ? (
          <span className="sub" style={{ fontStyle: "italic" }}>By tower building type</span>
        ) : can ? (
          <HeadSummarySelect headId={h.id} value={h.summary_subcategory} options={options} />
        ) : (
          h.summary_subcategory || <span className="sub">—</span>
        )}
      </td>
      <td>
        {h.is_tax &&
          (can ? (
            <TaxRuleInputs
              key={`${h.tax_rate_pct}-${h.tax_share_pct}`}
              headId={h.id}
              rate={Number(h.tax_rate_pct)}
              share={Number(h.tax_share_pct ?? 100)}
              baseCount={h.tax_base.length}
              gstRules={gstRules}
            />
          ) : (
            `GST ${Number(h.tax_rate_pct)}% × ${Number(h.tax_share_pct ?? 100)}% of ${h.tax_base.length} head(s)`
          ))}
      </td>
      {can && (
        <td className="actions">
          {editing ? (
            <div className="actions-group">
              <button
                className="btn-action primary"
                disabled={pending || !cat.trim()}
                onClick={() =>
                  run(
                    () => A.renameHead(h.id, cat.trim(), sub.trim()),
                    () => setEditing(false)
                  )
                }
              >
                Save
              </button>
              <button
                className="btn-action"
                disabled={pending}
                onClick={() => {
                  setCat(h.category);
                  setSub(h.sub_category ?? "");
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="actions-group">
              <button className="btn-action" onClick={() => setEditing(true)}>
                Edit / Rename
              </button>
              <ConfirmDelete onConfirm={() => A.deleteHead(h.id)} />
            </div>
          )}
          {banner}
        </td>
      )}
    </tr>
  );
}

/** Rename or delete a cost head (Towers & set-up). */
export function HeadActions({ h }: { h: { id: number; category: string; sub_category: string | null } }) {
  const { pending, run, banner } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="actions-group">
        <button className="btn-action" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit / Rename"}</button>
        <ConfirmDelete onConfirm={() => A.deleteHead(h.id)} />
      </div>
      {open && <div className="rule-form">
        <label>Category<input type="text" id={`hn-${h.id}-c`} defaultValue={h.category} /></label>
        <label>Sub-category<input type="text" id={`hn-${h.id}-s`} defaultValue={h.sub_category ?? ""} /></label>
        <button className="btn-action primary" disabled={pending} onClick={() => run(() => A.renameHead(h.id, value(`hn-${h.id}-c`), value(`hn-${h.id}-s`)), () => setOpen(false))}>Save</button>
      </div>}
      {banner}
    </>
  );
}

/** Project name, code and location (Towers & set-up). */
export function ProjectForm({ p }: { p: { id: number; name: string; code: string; location: string | null } }) {
  const { pending, run, banner, setNotice } = useAction();
  return (
    <>
      <div className="row">
        <label style={{ flex: 1, minWidth: 200 }}>Project name<input type="text" id="pj-name" defaultValue={p.name} /></label>
        <label>Code<input type="text" id="pj-code" defaultValue={p.code} /></label>
        <label style={{ flex: 1, minWidth: 160 }}>Location<input type="text" id="pj-loc" defaultValue={p.location ?? ""} /></label>
        <button disabled={pending} onClick={() => run(() => A.updateProject(p.id, { name: value("pj-name"), code: value("pj-code"), location: value("pj-loc") }), () => setNotice("Project saved"))}>Save project</button>
      </div>
      {banner}
    </>
  );
}

/** Title and note of a schedule. */
export function ScheduleTitle({ s }: { s: { id: number; title: string; note: string | null } }) {
  const { pending, run, banner } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-action" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit Title"}</button>
      {open && <div className="rule-form">
        <label>Title<input type="text" id={`st-${s.id}-t`} defaultValue={s.title} /></label>
        <label style={{ flex: 1, minWidth: 240 }}>Note<input type="text" id={`st-${s.id}-n`} defaultValue={s.note ?? ""} /></label>
        <button className="primary" disabled={pending} onClick={() => run(() => A.updateSchedule(s.id, { title: value(`st-${s.id}-t`), note: value(`st-${s.id}-n`).trim() || null }), () => setOpen(false))}>Save</button>
      </div>}
      {banner}
    </>
  );
}

export function DeleteComment({ id }: { id: number }) {
  return <ConfirmDelete onConfirm={() => A.deleteComment(id)} />;
}

/** Comments on a budget line. */
export function CommentForm({ versionId, lineId }: { versionId: number; lineId: number }) {
  const { pending, run, banner } = useAction();
  const [text, setText] = useState("");
  return (
    <>
      <div className="row"><label style={{ flex: 1 }}>Add a comment<input type="text" value={text} onChange={(e) => setText(e.target.value)} aria-label="Comment" /></label>
        <button disabled={pending} onClick={() => run(() => A.addComment(versionId, lineId, text), () => setText(""))}>Post</button></div>
      {banner}
    </>
  );
}

export function DeleteEntry({ id }: { id: number }) {
  const { pending, run, banner } = useAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      {banner}
      <button
        className="btn-action danger"
        disabled={pending}
        onClick={() => {
          if (!confirm) return setConfirm(true);
          run(() => A.deleteEntry(id));
        }}
      >
        {confirm ? "Confirm Delete" : "Delete"}
      </button>
    </>
  );
}

// ---------- set-up ----------
export function TowerRow({ t, editable, customFields = [], cells = {}, picks }: {
  t: { id: number; name: string; type: string | null; carpet_area: number | null; eng_area: number | null; oc_date: string | null }; editable: boolean;
  customFields?: CustomField[]; cells?: Record<string, Cell>; picks?: Picks;
}) {
  const { run, banner } = useAction();
  const custom = customFields.map((f) => <td key={f.id}><CustomInput field={f} entity="tower" entityId={t.id} cell={cells[f.key]} editable={editable} picks={picks} compact /></td>);
  if (!editable) return <tr><td>{t.name}</td><td>{t.type ?? "Not set"}</td><td className="n">{t.carpet_area}</td><td className="n">{t.eng_area}</td><td>{t.oc_date}</td>{custom}</tr>;
  const save = (field: "name" | "type" | "carpet_area" | "eng_area" | "oc_date", old: unknown) => (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.currentTarget.value;
    if (v !== String(old ?? "")) run(() => A.updateTower(t.id, field, v));
  };
  return (
    <tr>
      <td><input type="text" aria-label="Tower name" defaultValue={t.name} onBlur={save("name", t.name)} />{banner}</td>
      <td><select aria-label="Building type" defaultValue={t.type ?? ""} onChange={save("type", t.type)}><option value="">Not set</option>{BUILDING_TYPES.map((b) => <option key={b}>{b}</option>)}</select></td>
      <td className="n"><input type="number" className="amt" aria-label="Carpet area" defaultValue={t.carpet_area ?? ""} onBlur={save("carpet_area", t.carpet_area)} /></td>
      <td className="n"><input type="number" className="amt" aria-label="Engineering construction area" defaultValue={t.eng_area ?? ""} onBlur={save("eng_area", t.eng_area)} /></td>
      <td><input type="date" aria-label="OC date" defaultValue={t.oc_date ?? ""} onBlur={save("oc_date", t.oc_date)} /></td>
      {custom}
      <td className="actions">
        <div className="actions-group">
          <ConfirmDelete onConfirm={() => A.deleteTower(t.id)} />
        </div>
      </td>
    </tr>
  );
}

export function AddTowerButton({ projectId }: { projectId: number }) {
  const { pending, run, banner } = useAction();
  return <><div className="row" id="add-tower"><input type="text" id="new-tower" placeholder="Tower name" /><button className="btn-action primary" disabled={pending} onClick={() => run(() => A.addTower(projectId, value("new-tower")))}>+ Add tower</button></div>{banner}</>;
}

const AREA_FIELDS: [string, string][] = [
  ["total_carpet", "Total carpet area (A)"], ["sold_area", "Sold"], ["eng_area", "Construction area, Engg team"], ["design_area", "Construction area, Design team"],
  ["sale_value_cr", "Total sale value (Cr)"], ["residential_area", "Residential"], ["commercial_area", "Commercial"], ["retail_area", "Retail"], ["society_sale_area", "Society sale"],
];
export function AreasForm({ versionId, areas, editable, net }: { versionId: number; areas: Record<string, unknown> & { commitments?: { name: string; area: number }[] }; editable: boolean; net: number | null }) {
  const { run, banner } = useAction();
  // only the changed field is sent (the server merges it); commitments are kept here so quick edits build on each other
  const [commitments, setCommitments] = useState(areas.commitments ?? []);
  const save = (patch: object) => run(() => A.updateVersion(versionId, { areas: patch }));
  const saveCommitments = (next: { name: string; area: number }[]) => { setCommitments(next); save({ commitments: next }); };
  return (
    <>
      {banner}
      <div className="row">
        {AREA_FIELDS.map(([k, label]) => (
          <label key={k}>{label}<input type="number" disabled={!editable} defaultValue={(areas[k] as number | null) ?? ""} key={k}
            onBlur={(e) => { const v = e.currentTarget.value; if (v !== String(areas[k] ?? "")) save({ [k]: v === "" ? null : Number(v) }); }} /></label>
        ))}
      </div>
      <h3>Commitments deducted from sale area</h3>
      <div className="scroll"><table><thead><tr><th></th><th>Commitment</th><th className="n">Area (sft)</th>{editable && <th className="actions-col">Actions</th>}</tr></thead><tbody>
        {commitments.map((c, i) => (
          <tr key={`${i}-${commitments.length}`}><td>{String.fromCharCode(66 + i)}</td>
            <td><input type="text" disabled={!editable} defaultValue={c.name} aria-label="Commitment" onBlur={(e) => e.currentTarget.value !== c.name && saveCommitments(commitments.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value } : x)))} /></td>
            <td className="n"><input type="number" className="amt" disabled={!editable} defaultValue={c.area} aria-label="Area" onBlur={(e) => Number(e.currentTarget.value) !== c.area && saveCommitments(commitments.map((x, j) => (j === i ? { ...x, area: Number(e.currentTarget.value) || 0 } : x)))} /></td>
            {editable && <td className="actions"><button className="btn-action danger" onClick={() => saveCommitments(commitments.filter((_, j) => j !== i))}>Remove</button></td>}</tr>
        ))}
        <tr className="total"><td></td><td>Net sale carpet area (E)</td><td className="n">{net == null ? "" : new Intl.NumberFormat("en-IN").format(net)}</td>{editable && <td></td>}</tr>
      </tbody></table></div>
      {editable && <div className="row"><button className="btn-action primary" onClick={() => saveCommitments([...commitments, { name: "New commitment", area: 0 }])}>+ Add commitment</button></div>}
    </>
  );
}

export function HeadSummarySelect({ headId, value: v, options }: { headId: number; value: string | null; options: string[] }) {
  const { run, banner } = useAction();
  return <>{banner}<select aria-label="Summary row" defaultValue={v ?? ""} onChange={(e) => run(() => A.updateHead(headId, { summary_subcategory: e.currentTarget.value }))}>
    {v == null && <option value="">Not set</option>}{options.map((o) => <option key={o}>{o}</option>)}</select></>;
}

type GstRuleOpt = { id: number; name: string; rate: number; share: number };

export function TaxRuleInputs({ headId, rate, share, baseCount, gstRules = [] }: { headId: number; rate: number; share: number; baseCount: number; gstRules?: GstRuleOpt[] }) {
  const { run, banner } = useAction();
  const save = (k: "tax_rate_pct" | "tax_share_pct", old: number) => (e: React.FocusEvent<HTMLInputElement>) => {
    const n = Number(e.currentTarget.value);
    if (n !== Number(old)) run(() => A.updateHead(headId, { [k]: n }));
  };
  return (
    <>
      <span className="row" style={{ gap: 4, alignItems: "center", flexWrap: "nowrap" }}>
        GST <input type="text" className="amt" style={{ width: 60 }} aria-label="GST rate" defaultValue={rate} onBlur={save("tax_rate_pct", rate)} />% ×
        <input type="text" className="amt" style={{ width: 70 }} aria-label="Eligible share" defaultValue={share} onBlur={save("tax_share_pct", share)} />% of {baseCount} head(s)
        {gstRules.length > 0 && <select aria-label="Apply a GST rule" value={gstRules.find((g) => g.rate === Number(rate) && g.share === Number(share))?.id ?? ""}
          onChange={(e) => { const g = gstRules.find((x) => x.id === Number(e.currentTarget.value)); if (g) run(() => A.updateHead(headId, { tax_rate_pct: g.rate, tax_share_pct: g.share })); }}>
          <option value="">Custom</option>{gstRules.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
      </span>
      {banner}
    </>
  );
}

export function AddHeadForm({ projectId, departments, baseOptions, summaryOptions, gstRules = [] }: {
  projectId: number; departments: { id: number; name: string; summary_category: string }[];
  baseOptions: { value: string; label: string; ids: number[] }[]; summaryOptions: Record<string, string[]>; gstRules?: GstRuleOpt[];
}) {
  const { pending, run, banner, setNotice } = useAction();
  const [isTax, setIsTax] = useState(false);
  const [rate, setRate] = useState("18");
  const [share, setShare] = useState("74.08");

  return (
    <div className="add-head-card">
      <div className="add-head-grid">
        <label className="field-group">
          <span className="field-label">Department</span>
          <select id="nh-dept" className="form-select">
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="field-group" style={{ flex: 1, minWidth: 200 }}>
          <span className="field-label">Category *</span>
          <input type="text" id="nh-cat" className="form-input" placeholder="e.g. Civil Contractor" />
        </label>
        <label className="field-group" style={{ flex: 1, minWidth: 200 }}>
          <span className="field-label">Sub-category</span>
          <input type="text" id="nh-sub" className="form-input" placeholder="e.g. RCC Structure" />
        </label>
      </div>

      <div className="add-head-gst-box">
        <label className="gst-toggle">
          <input type="checkbox" id="nh-tax" checked={isTax} onChange={(e) => setIsTax(e.target.checked)} />
          <span style={{ fontWeight: 500 }}>This is a GST / Tax line</span>
        </label>

        {isTax && (
          <div className="gst-subfields">
            {gstRules.length > 0 && (
              <label className="field-group">
                <span className="field-label">GST Rule Preset</span>
                <select
                  id="nh-rule"
                  className="form-select"
                  defaultValue=""
                  onChange={(e) => {
                    const g = gstRules.find((x) => x.id === Number(e.currentTarget.value));
                    if (!g) return;
                    setRate(String(g.rate));
                    setShare(String(g.share));
                  }}
                >
                  <option value="">Custom GST</option>
                  {gstRules.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
            )}
            <label className="field-group" style={{ width: 90 }}>
              <span className="field-label">GST %</span>
              <input type="text" id="nh-rate" className="form-input" value={rate} onChange={(e) => setRate(e.target.value)} />
            </label>
            <label className="field-group" style={{ width: 110 }}>
              <span className="field-label">Eligible Share %</span>
              <input type="text" id="nh-share" className="form-input" value={share} onChange={(e) => setShare(e.target.value)} />
            </label>
            <label className="field-group" style={{ flex: 1, minWidth: 240 }}>
              <span className="field-label">Charged on</span>
              <select id="nh-base" className="form-select">
                {baseOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="add-head-footer">
        <button
          className="btn-action primary"
          disabled={pending}
          onClick={() => {
            const dept = departments.find((d) => d.id === Number(value("nh-dept")))!;
            const catVal = value("nh-cat");
            if (!catVal) return;
            const opts = summaryOptions[dept.summary_category] ?? [];
            const summary = dept.summary_category === "Construction" && !isTax ? null : isTax ? (opts.find((o) => o.startsWith("GST")) ?? null) : (opts[0] ?? null);
            run(
              () => A.addHead(projectId, {
                department_id: dept.id,
                category: catVal,
                sub_category: value("nh-sub"),
                summary_subcategory: summary,
                is_tax: isTax,
                tax_rate_pct: Number(value("nh-rate") || rate),
                tax_share_pct: Number(value("nh-share") || share),
                tax_base: baseOptions.find((b) => b.value === value("nh-base"))?.ids ?? [],
              }),
              (r) => {
                setNotice(r.draftNumber ? `Added, with a line in draft R${r.draftNumber}` : "Added. It appears in the next version you open.");
                const catEl = document.getElementById("nh-cat") as HTMLInputElement | null;
                const subEl = document.getElementById("nh-sub") as HTMLInputElement | null;
                if (catEl) catEl.value = "";
                if (subEl) subEl.value = "";
                setIsTax(false);
              }
            );
          }}
        >
          + Add Cost Head
        </button>
      </div>
      {banner}
    </div>
  );
}

export function NewProjectForm({ projects }: { projects: { id: number; name: string; heads: number }[] }) {
  const { pending, run, banner } = useAction();
  const router = useRouter();
  return (
    <>
      <div className="row">
        <label style={{ minWidth: 200 }}>Project name<input type="text" id="np-name" placeholder="For example: Chandak Sparkling Wings" /></label>
        <label>Code<input type="text" id="np-code" placeholder="CSW" /></label>
        <label>Towers<input type="number" id="np-towers" defaultValue={2} min={0} max={50} style={{ width: 80 }} /></label>
        <label style={{ minWidth: 220 }}>Cost heads<select id="np-copy"><option value="">Start with none</option>
          {projects.map((p) => <option key={p.id} value={p.id}>Copy the {p.heads} heads of {p.name}</option>)}</select></label>
        <button className="primary" disabled={pending} onClick={() => run(
          () => A.createProject(value("np-name").trim(), value("np-code").trim(), Number(value("np-towers")) || 0, value("np-copy") ? Number(value("np-copy")) : null),
          (r) => router.push(`/budget/${r.projectId}/overview`),
        )}>Create project</button>
      </div>
      {banner}
    </>
  );
}

// ---------- budget summary ----------
export function WriteSummaryButton({ projectId, versionNumber, again }: { projectId: number; versionNumber: number; again: boolean }) {
  const { pending, run, banner, setNotice } = useAction();
  return (
    <div className="row">
      <button className="primary" disabled={pending} onClick={() => run(() => writeBudgetSummary(projectId, versionNumber),
        (r) => setNotice(r.provider === "rules" ? "Summary written by rule: no AI is set up, or the AI's text used a figure that is not in the budget." : "Summary written."))}>
        {pending ? "Writing…" : again ? "Write it again" : "Write the summary"}
      </button>
      {banner}
    </div>
  );
}
