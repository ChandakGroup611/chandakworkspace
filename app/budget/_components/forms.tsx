"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import * as A from "@/lib/budget/actions";
import type { CustomField } from "@/lib/budget/data";
import { BUILDING_TYPES, fmt, fmtPct, inputCr, isNeg } from "@/lib/budget/format";
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
  return (
    <>
      <label className="ctl">Project
        <select value={props.projectId ?? ""} onChange={(e) => router.push(`/budget/${e.target.value}/${props.tab === "home" ? "overview" : props.tab}`)}>
          {props.projectId == null && <option value="">Choose a project</option>}
          {props.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {props.projectId != null && (
        <label className="ctl">Version
          <select value={props.versionNumber ?? ""} onChange={(e) => router.push(`/budget/${props.projectId}/${props.tab}?v=${e.target.value}`)}>
            {props.versions.length === 0 && <option value="">No version yet</option>}
            {props.versions.slice().reverse().map((v) => (
              <option key={v.number} value={v.number}>R{v.number} · {v.as_on.split("-").reverse().join("/")} · {v.status}</option>
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
  kind: "dept" | "cat" | "line"; key: string; label: string; note?: string | null; tower?: string | null; indent?: number;
  initial_cr: number; ctc_cr: number; incurred_cr: number; balance_cr: number; variance_cr: number; util_pct: number | null; psf_ctc: number | null;
  line?: {
    id: number; isTax: boolean; taxRule: string | null; initial: number | null; ctc: number | null; initialCalc: boolean; ctcCalc: boolean;
    incurredAuto: boolean; remark: string | null; source: string; editable: boolean; needsRemark: boolean; removable: boolean; overBudget: boolean;
    custom?: Record<string, Cell>;
  };
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
          <th>Source</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const l = r.line;
            const cls = r.kind === "dept" ? "group" : r.kind === "cat" ? "cat" : l?.needsRemark ? "flag" : "";
            return (
              <tr key={r.key} className={cls} data-head={r.kind === "line" ? r.label : undefined}>
                <td className={r.indent === 2 ? "indent2" : r.indent === 1 ? "indent" : ""}>
                  {r.label}{r.tower && <span className="chip">{r.tower}</span>}
                  {l?.taxRule && <> <span className="chip">{l.taxRule}</span></>}
                  {r.note && <div className="note">{r.note}</div>}
                </td>
                <td className="n">{l?.editable ? <AmountInput line={l} field="initial" shown={r.initial_cr} /> : <>{fmt(r.initial_cr)}{l?.isTax && l.initialCalc && <span className="chip">auto</span>}</>}</td>
                <td className="n">{l?.editable ? <AmountInput line={l} field="ctc" shown={r.ctc_cr} /> : <>{fmt(r.ctc_cr)}{l?.isTax && l.ctcCalc && <span className="chip">auto</span>}</>}</td>
                <td className="n">{fmt(r.incurred_cr)}{l?.incurredAuto && <span className="chip">auto</span>}{l?.overBudget && <span className="chip bad" title="Cost incurred is above the Estimated CTC">over</span>}</td>
                <td className="n"><Neg v={r.balance_cr} /></td>
                <td className="n"><Neg v={r.variance_cr} /></td>
                <td className="n"><Bar v={r.util_pct} /></td>
                <td className="n">{fmt(r.psf_ctc)}</td>
                <td>{l?.editable ? <RemarkInput line={l} /> : l?.remark}{l?.needsRemark && <span className="chip warn">remark needed</span>}</td>
                {customFields.map((f) => <td key={f.id} className={f.field_type === "formula" || ["number", "integer", "amount_cr", "amount_inr", "percent"].includes(f.field_type) ? "n" : ""}>
                  {l && <CustomInput field={f} entity="line" entityId={l.id} cell={l.custom?.[f.key]} editable={l.editable} picks={picks} compact />}</td>)}
                <td>{l && (l.isTax && l.initialCalc && l.ctcCalc ? <span className="chip" title="Calculated by the GST rule">Calc</span>
                  : l.source === "excel" ? <span className="chip xl" title="Last set by an Excel import">Excel</span> : <span className="chip typed" title="Last typed on screen">Typed</span>)}</td>
                <td>{l?.removable && <button className="link" onClick={() => run(() => A.removeLine(l.id))}>Remove</button>}</td>
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
            onBlur={(e) => e.currentTarget.value.trim() !== (reasons[c] ?? "") && run(() => A.updateVersion(versionId, { category_reasons: { ...reasons, [c]: e.currentTarget.value.trim() } }))} /></td></tr>
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

export function DeleteEntry({ id }: { id: number }) {
  const { pending, run, banner } = useAction();
  return <>{banner}<button className="link" disabled={pending} onClick={() => run(() => A.deleteEntry(id))}>Delete</button></>;
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
    </tr>
  );
}

export function AddTowerButton({ projectId }: { projectId: number }) {
  const { pending, run, banner } = useAction();
  return <><div className="row"><input type="text" id="new-tower" placeholder="Tower name" /><button disabled={pending} onClick={() => run(() => A.addTower(projectId, value("new-tower")))}>Add tower</button></div>{banner}</>;
}

const AREA_FIELDS: [string, string][] = [
  ["total_carpet", "Total carpet area (A)"], ["sold_area", "Sold"], ["eng_area", "Construction area, Engg team"], ["design_area", "Construction area, Design team"],
  ["sale_value_cr", "Total sale value (Cr)"], ["residential_area", "Residential"], ["commercial_area", "Commercial"], ["retail_area", "Retail"], ["society_sale_area", "Society sale"],
];
export function AreasForm({ versionId, areas, editable, net }: { versionId: number; areas: Record<string, unknown> & { commitments?: { name: string; area: number }[] }; editable: boolean; net: number | null }) {
  const { run, banner } = useAction();
  const commitments = areas.commitments ?? [];
  const save = (patch: object) => run(() => A.updateVersion(versionId, { areas: { ...areas, ...patch } }));
  return (
    <>
      {banner}
      <div className="row">
        {AREA_FIELDS.map(([k, label]) => (
          <label key={k}>{label}<input type="number" disabled={!editable} defaultValue={(areas[k] as number | null) ?? ""} key={`${k}-${areas[k]}`}
            onBlur={(e) => { const v = e.currentTarget.value; if (v !== String(areas[k] ?? "")) save({ [k]: v === "" ? null : Number(v) }); }} /></label>
        ))}
      </div>
      <h3>Commitments deducted from sale area</h3>
      <div className="scroll"><table><thead><tr><th></th><th>Commitment</th><th className="n">Area (sft)</th><th></th></tr></thead><tbody>
        {commitments.map((c, i) => (
          <tr key={`${i}-${c.name}-${c.area}`}><td>{String.fromCharCode(66 + i)}</td>
            <td><input type="text" disabled={!editable} defaultValue={c.name} aria-label="Commitment" onBlur={(e) => e.currentTarget.value !== c.name && save({ commitments: commitments.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value } : x)) })} /></td>
            <td className="n"><input type="number" className="amt" disabled={!editable} defaultValue={c.area} aria-label="Area" onBlur={(e) => Number(e.currentTarget.value) !== c.area && save({ commitments: commitments.map((x, j) => (j === i ? { ...x, area: Number(e.currentTarget.value) || 0 } : x)) })} /></td>
            <td>{editable && <button className="link" onClick={() => save({ commitments: commitments.filter((_, j) => j !== i) })}>Remove</button>}</td></tr>
        ))}
        <tr className="total"><td></td><td>Net sale carpet area (E)</td><td className="n">{net == null ? "" : new Intl.NumberFormat("en-IN").format(net)}</td><td></td></tr>
      </tbody></table></div>
      {editable && <div className="row"><button onClick={() => save({ commitments: [...commitments, { name: "New commitment", area: 0 }] })}>Add commitment</button></div>}
    </>
  );
}

export function HeadSummarySelect({ headId, value: v, options }: { headId: number; value: string | null; options: string[] }) {
  const { run, banner } = useAction();
  return <>{banner}<select aria-label="Summary row" defaultValue={v ?? ""} onChange={(e) => run(() => A.updateHead(headId, { summary_subcategory: e.currentTarget.value }))}>
    {v == null && <option value="">Not set</option>}{options.map((o) => <option key={o}>{o}</option>)}</select></>;
}

export function TaxRuleInputs({ headId, rate, share, baseCount }: { headId: number; rate: number; share: number; baseCount: number }) {
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
      </span>
      {banner}
    </>
  );
}

export function AddHeadForm({ projectId, departments, baseOptions, summaryOptions }: {
  projectId: number; departments: { id: number; name: string; summary_category: string }[];
  baseOptions: { value: string; label: string; ids: number[] }[]; summaryOptions: Record<string, string[]>;
}) {
  const { pending, run, banner, setNotice } = useAction();
  return (
    <>
      <div className="row">
        <label>Department<select id="nh-dept">{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label style={{ flex: 1, minWidth: 180 }}>Category<input type="text" id="nh-cat" /></label>
        <label style={{ flex: 1, minWidth: 180 }}>Sub-category<input type="text" id="nh-sub" /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" id="nh-tax" /> GST line</label>
        <label>GST %<input type="text" id="nh-rate" defaultValue="18" style={{ width: 60 }} /></label>
        <label>Eligible share %<input type="text" id="nh-share" defaultValue="74.08" style={{ width: 70 }} /></label>
        <label style={{ minWidth: 220 }}>Charged on<select id="nh-base">{baseOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
        <button disabled={pending} onClick={() => {
          const dept = departments.find((d) => d.id === Number(value("nh-dept")))!;
          const isTax = (document.getElementById("nh-tax") as HTMLInputElement).checked;
          const opts = summaryOptions[dept.summary_category] ?? [];
          const summary = dept.summary_category === "Construction" && !isTax ? null : isTax ? (opts.find((o) => o.startsWith("GST")) ?? null) : (opts[0] ?? null);
          run(() => A.addHead(projectId, {
            department_id: dept.id, category: value("nh-cat"), sub_category: value("nh-sub"), summary_subcategory: summary, is_tax: isTax,
            tax_rate_pct: Number(value("nh-rate")), tax_share_pct: Number(value("nh-share")), tax_base: baseOptions.find((b) => b.value === value("nh-base"))?.ids ?? [],
          }), (r) => setNotice(r.draftNumber ? `Added, with a line in draft R${r.draftNumber}` : "Added. It appears in the next version you open."));
        }}>Add cost head</button>
      </div>
      {banner}
    </>
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
