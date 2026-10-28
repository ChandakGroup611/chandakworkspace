"use client";

import { Fragment, useMemo, useState } from "react";
import * as A from "@/lib/budget/actions";
import type { CustomField, Entity, RoleRow } from "@/lib/budget/data";
import { BUILTINS, Dec, ENTITIES, FIELD_TYPES, FUNCTIONS, RESULT_TYPES, calculate, checkFormula, display, parse, refsOf, type FieldDef, type Value } from "@/lib/budget/formula";
import { useAction } from "./forms";

// Settings of the budget module: who may do what (roles, rights, members from Chandak Workspace) and
// the custom fields of each form. The database enforces both; these screens only edit them.

// ---------- access ----------
interface Member { user_id: string; name: string; email: string | null; role_id: number; project_ids: number[] | null; department_ids: number[] | null; active: boolean }
type Opt = { id: number; name: string };

function MultiPick({ label, all, chosen, onChange, disabled }: { label: string; all: Opt[]; chosen: number[] | null; onChange: (v: number[] | null) => void; disabled?: boolean }) {
  const set = new Set(chosen ?? []);
  const text = chosen == null ? `All ${label}` : chosen.length ? all.filter((o) => set.has(o.id)).map((o) => o.name).join(", ") : `No ${label}`;
  return (
    <details className="multi">
      <summary aria-label={label} title={text}>{text}</summary>
      <label><input type="checkbox" checked={chosen == null} disabled={disabled} onChange={(e) => onChange(e.currentTarget.checked ? null : [])} /> All {label}</label>
      {chosen != null && all.map((o) => (
        <label key={o.id}><input type="checkbox" checked={set.has(o.id)} disabled={disabled} onChange={(e) => {
          const next = new Set(set);
          if (e.currentTarget.checked) next.add(o.id); else next.delete(o.id);
          onChange(all.filter((x) => next.has(x.id)).map((x) => x.id));
        }} /> {o.name}</label>
      ))}
    </details>
  );
}

function MemberRow({ m, roles, projects, departments, me }: { m: Member; roles: RoleRow[]; projects: Opt[]; departments: Opt[]; me: string }) {
  const { pending, run, banner, setNotice } = useAction();
  const [row, setRow] = useState(m);
  const changed = JSON.stringify(row) !== JSON.stringify(m);
  return (
    <tr className={row.active ? "" : "muted"}>
      <td>{m.name}{m.user_id === me && <span className="chip">you</span>}<div className="note">{m.email}</div>{banner}</td>
      <td><select aria-label="Role" value={row.role_id} onChange={(e) => setRow({ ...row, role_id: Number(e.currentTarget.value) })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></td>
      <td><MultiPick label="projects" all={projects} chosen={row.project_ids} onChange={(v) => setRow({ ...row, project_ids: v })} /></td>
      <td><MultiPick label="departments" all={departments} chosen={row.department_ids} onChange={(v) => setRow({ ...row, department_ids: v })} /></td>
      <td><input type="checkbox" aria-label="Active" checked={row.active} onChange={(e) => setRow({ ...row, active: e.currentTarget.checked })} /></td>
      <td className="nowrap">
        <button className="primary" disabled={!changed || pending} onClick={() => run(() => A.saveMember(row, false), () => setNotice("Saved"))}>Save</button>{" "}
        <button className="link" disabled={pending} onClick={() => { if (confirm(`Remove ${m.name} from the budget module?`)) run(() => A.removeMember(m.user_id)); }}>Remove</button>
      </td>
    </tr>
  );
}

export function AccessSettings({ permissions, roles, members, directory, projects, departments, me }: {
  permissions: { code: string; area: string; label: string }[]; roles: RoleRow[]; members: Member[];
  directory: { user_id: string; email: string | null; full_name: string | null; member: boolean }[]; projects: Opt[]; departments: Opt[]; me: string;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const [search, setSearch] = useState("");
  const candidates = directory.filter((u) => !u.member && (!search || `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())));
  const areas = [...new Set(permissions.map((p) => p.area))];
  return (
    <>
      {banner}
      <section className="panel">
        <div className="panel-head"><h2>Members</h2><span className="sub">People come from Chandak Workspace users; their role and limits are set here</span></div>
        <div className="scroll"><table><thead><tr><th>Person</th><th>Role</th><th>Projects</th><th>Departments</th><th>Active</th><th></th></tr></thead><tbody>
          {members.map((m) => <MemberRow key={`${m.user_id}-${m.role_id}-${m.active}-${m.project_ids}-${m.department_ids}`} m={m} roles={roles} projects={projects} departments={departments} me={me} />)}
        </tbody></table></div>
        <h3>Add a Chandak Workspace user</h3>
        <div className="row">
          <label style={{ minWidth: 200 }}>Search<input type="text" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Name or email" /></label>
          <label style={{ flex: 1, minWidth: 240 }}>User<select id="nm-user">{candidates.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name} · {u.email}</option>)}</select></label>
          <label>Role<select id="nm-role">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <button className="primary" disabled={pending || !candidates.length} onClick={() => {
            const user = (document.getElementById("nm-user") as HTMLSelectElement).value;
            const role = Number((document.getElementById("nm-role") as HTMLSelectElement).value);
            run(() => A.saveMember({ user_id: user, role_id: role, project_ids: null, department_ids: null, active: true }, true), () => setNotice("Added. Limit them to projects or departments in the table if needed."));
          }}>Add member</button>
        </div>
        {!candidates.length && <p className="note">Every workspace user that matches is already a member.</p>}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Roles and rights</h2><span className="sub">Tick the rights each role has. Administrator always keeps every right.</span></div>
        <div className="scroll"><table className="matrix"><thead><tr><th>Right</th>{roles.map((r) => <th key={r.id}><RoleName role={r} /></th>)}</tr></thead><tbody>
          {areas.map((area) => (
            <Fragment key={area}>
              <tr className="group"><td colSpan={roles.length + 1}>{area}</td></tr>
              {permissions.filter((p) => p.area === area).map((p) => (
                <tr key={p.code}><td title={p.code}>{p.label}</td>
                  {roles.map((r) => <td key={r.id}><RightBox key={`${r.id}-${r.permissions.includes(p.code)}`} role={r} code={p.code} label={p.label} /></td>)}</tr>
              ))}
            </Fragment>
          ))}
        </tbody></table></div>
        <div className="row">
          <label style={{ minWidth: 200 }}>New role<input type="text" id="nr-name" placeholder="For example: Site engineer" /></label>
          <label style={{ flex: 1, minWidth: 240 }}>Description<input type="text" id="nr-desc" placeholder="What this role is for" /></label>
          <button disabled={pending} onClick={() => run(() => A.saveRole(null, (document.getElementById("nr-name") as HTMLInputElement).value, (document.getElementById("nr-desc") as HTMLInputElement).value),
            () => { setNotice("Role added. Tick its rights in the table."); for (const id of ["nr-name", "nr-desc"]) (document.getElementById(id) as HTMLInputElement).value = ""; })}>Add role</button>
        </div>
      </section>
    </>
  );
}

// Ticks at once; a refusal from the database puts the tick back and says why.
function RightBox({ role, code, label }: { role: RoleRow; code: string; label: string }) {
  const { pending, run, banner } = useAction();
  const [on, setOn] = useState(role.permissions.includes(code));
  return <>{banner}<input type="checkbox" aria-label={`${role.name}: ${label}`} checked={on} disabled={role.is_system || pending} onChange={(e) => {
    const next = e.currentTarget.checked;
    setOn(next);
    run(async () => { const r = await A.setRolePermission(role.id, code, next); if (!r.ok) setOn(!next); return r; });
  }} /></>;
}

function RoleName({ role }: { role: RoleRow }) {
  const { run, banner } = useAction();
  if (role.is_system) return <span title={role.description ?? ""}>{role.name}</span>;
  return (
    <span title={role.description ?? ""}>
      <input type="text" aria-label="Role name" defaultValue={role.name} style={{ width: 120 }} onBlur={(e) => e.currentTarget.value !== role.name && run(() => A.saveRole(role.id, e.currentTarget.value, role.description ?? ""))} />
      <br /><button className="link" onClick={() => { if (confirm(`Delete the role ${role.name}?`)) run(() => A.deleteRole(role.id)); }}>Delete</button>{banner}
    </span>
  );
}

// ---------- custom fields ----------
const NUMERIC = ["number", "integer", "amount_cr", "amount_inr", "percent"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "f_$1").slice(0, 40);
const blank = (entity: Entity): A.FieldInput => ({
  entity, project_id: null, key: "", label: "", help: null, field_type: "text", options: {}, formula: null, result_type: null, required: false,
  input_source: "both", excel_header: null, section: null, sort: 0, show_in_entry: true, show_in_reports: true, edit_permission: null,
});

export function FieldSettings({ fields, projects, permissions }: { fields: CustomField[]; projects: Opt[]; permissions: { code: string; label: string }[] }) {
  const [entity, setEntity] = useState<Entity>("line");
  const [editing, setEditing] = useState<A.FieldInput | null>(null);
  const { pending, run, banner, setNotice } = useAction();
  const list = fields.filter((f) => f.entity === entity);
  const pname = new Map(projects.map((p) => [p.id, p.name]));
  const typeLabel = (f: CustomField) => (f.field_type === "formula" ? `Formula → ${RESULT_TYPES.find((r) => r[0] === f.result_type)?.[1]}` : FIELD_TYPES.find((t) => t.type === f.field_type)?.label);
  return (
    <>
      {banner}
      <section className="panel">
        <div className="panel-head"><h2>Custom fields and forms</h2><span className="sub">Add, change or remove the fields of each form. Values are checked by the database whether typed or imported.</span></div>
        <nav className="tabs" aria-label="Forms">
          {ENTITIES.map((e) => <a key={e.entity} href="#" aria-current={entity === e.entity ? "page" : undefined} onClick={(ev) => { ev.preventDefault(); setEntity(e.entity as Entity); setEditing(null); }}>
            {e.label} ({fields.filter((f) => f.entity === e.entity).length})</a>)}
        </nav>
        <p className="note">{ENTITIES.find((e) => e.entity === entity)!.where}.</p>
        <div className="scroll"><table><thead><tr><th>#</th><th>Field</th><th>Key</th><th>Type</th><th>Projects</th><th>Filled by</th><th>Required</th><th>Shown</th><th>Status</th><th></th></tr></thead><tbody>
          {list.map((f) => (
            <tr key={f.id} className={f.active ? "" : "muted"}>
              <td>{f.sort}</td><td>{f.label}{f.section && <div className="note">{f.section}</div>}</td><td><code>{f.key}</code></td>
              <td>{typeLabel(f)}{f.formula && <div className="note"><code>= {f.formula}</code></div>}</td>
              <td>{f.project_id ? pname.get(f.project_id) : "All"}</td>
              <td>{f.field_type === "formula" ? "Calculated" : f.input_source === "typed" ? "Typed" : f.input_source === "excel" ? `Excel "${f.excel_header}"` : `Typed or Excel${f.excel_header ? ` "${f.excel_header}"` : ""}`}</td>
              <td>{f.required ? "Yes" : ""}</td><td>{[f.show_in_entry && "entry", f.show_in_reports && "reports"].filter(Boolean).join(", ")}</td>
              <td>{f.active ? <span className="chip ok">active</span> : <span className="chip">off</span>}</td>
              <td className="nowrap">
                <button className="link" onClick={() => setEditing({ ...f })}>Edit</button>{" "}
                <button className="link" disabled={pending} onClick={() => run(() => A.setFieldActive(f.id, !f.active), () => setNotice(f.active ? `${f.label} is switched off; its values are kept.` : `${f.label} is back on.`))}>{f.active ? "Switch off" : "Switch on"}</button>{" "}
                <button className="link" disabled={pending} onClick={() => { if (confirm(`Delete ${f.label} and all its values? Switch it off instead to keep the values.`)) run(() => A.deleteField(f.id), () => setNotice(`${f.label} deleted.`)); }}>Delete</button>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={10} className="sub">No custom fields on this form yet.</td></tr>}
        </tbody></table></div>
        {!editing && <div className="row"><button className="primary" onClick={() => setEditing({ ...blank(entity), sort: (list.at(-1)?.sort ?? 0) + 1 })}>Add a field to {ENTITIES.find((e) => e.entity === entity)!.label}</button></div>}
      </section>
      {editing && <FieldEditor key={editing.id ?? "new"} start={editing} fields={fields} projects={projects} permissions={permissions} onDone={(msg) => { setEditing(null); if (msg) setNotice(msg); }} />}
    </>
  );
}

function FieldEditor({ start, fields, projects, permissions, onDone }: {
  start: A.FieldInput; fields: CustomField[]; projects: Opt[]; permissions: { code: string; label: string }[]; onDone: (msg?: string) => void;
}) {
  const { pending, run, banner } = useAction();
  const [f, setF] = useState<A.FieldInput>(start);
  const [keyTouched, setKeyTouched] = useState(!!start.id);
  const [sample, setSample] = useState<Record<string, string>>({});
  const set = (patch: Partial<A.FieldInput>) => setF((x) => ({ ...x, ...patch }));
  const opt = (patch: Partial<CustomField["options"]>) => setF((x) => ({ ...x, options: { ...x.options, ...patch } }));
  const isFormula = f.field_type === "formula";
  const same = fields.filter((x) => x.entity === f.entity && x.id !== f.id && x.active && (x.project_id == null || f.project_id == null || x.project_id === f.project_id));
  const lineFields = fields.filter((x) => x.entity === "line" && x.active);
  const check = useMemo(() => (isFormula ? checkFormula({ ...f, formula: f.formula ?? "" } as FieldDef, f.entity, same as unknown as FieldDef[], lineFields as unknown as FieldDef[]) : null),
    [f, isFormula, same, lineFields]);
  const refs = useMemo(() => { try { return isFormula && !check ? [...refsOf(parse(f.formula ?? "")).refs] : []; } catch { return []; } }, [f.formula, isFormula, check]);
  const kinds = new Map<string, { label: string; type: string }>([
    ...(BUILTINS[f.entity] ?? []).map((b): [string, { label: string; type: string }] => [b.key, { label: `${b.label}${b.unit ? ` (${b.unit})` : ""}`, type: b.kind === "date" ? "date" : "number" }]),
    ...same.map((x): [string, { label: string; type: string }] => [x.key, { label: x.label, type: x.field_type === "formula" ? x.result_type ?? "number" : x.field_type }]),
  ]);
  const trial = useMemo(() => {
    if (!isFormula || check) return null;
    const values: Record<string, Value> = {};
    for (const k of refs) {
      const t = kinds.get(k)?.type ?? "number", s = sample[k] ?? "";
      values[k] = !s ? null : t === "date" || t === "month" ? { date: s } : t === "yes_no" ? /^y|true|1/i.test(s) : NUMERIC.includes(t) || t === "number" ? Dec.parse(s) : s;
    }
    const others = same.filter((x) => x.field_type === "formula") as unknown as FieldDef[];
    const r = calculate([...others, f as unknown as FieldDef], { values })[f.key || "_"];
    return r;
  }, [isFormula, check, refs, sample, f, same, kinds]);
  const insert = (text: string) => set({ formula: `${(f.formula ?? "").replace(/\s+$/, "")}${f.formula ? " " : ""}${text}` });
  const where = ENTITIES.find((e) => e.entity === f.entity)!;
  return (
    <section className="panel">
      <div className="panel-head"><h2>{f.id ? `Change ${start.label}` : `New field on ${where.label}`}</h2><span className="sub">{where.where}</span></div>
      {banner}
      <h3>1. What is it?</h3>
      <div className="row">
        <label style={{ minWidth: 220, flex: 1 }}>Field name<input type="text" value={f.label} onChange={(e) => { const label = e.currentTarget.value; set({ label, ...(keyTouched ? {} : { key: slug(label) }), ...(f.excel_header || f.id ? {} : {}) }); }} placeholder="For example: Planned quantity" /></label>
        <label>Key (used in formulas)<input type="text" value={f.key} disabled={!!f.id} onChange={(e) => { setKeyTouched(true); set({ key: e.currentTarget.value }); }} /></label>
        <label style={{ minWidth: 220 }}>Type<select value={f.field_type} onChange={(e) => {
          const t = e.currentTarget.value;
          set({ field_type: t, formula: t === "formula" ? f.formula ?? "" : null, result_type: t === "formula" ? f.result_type ?? "number" : null, required: t === "formula" ? false : f.required });
        }}>{FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}</select></label>
        <label>Projects<select value={f.project_id ?? ""} disabled={!!f.id} onChange={(e) => set({ project_id: e.currentTarget.value ? Number(e.currentTarget.value) : null })}>
          <option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name} only</option>)}</select></label>
      </div>
      <p className="note">{FIELD_TYPES.find((t) => t.type === f.field_type)?.hint}. The key cannot change once saved, because formulas and imports refer to it.</p>
      <label style={{ display: "block" }}>Help text shown to people filling it in<input type="text" value={f.help ?? ""} onChange={(e) => set({ help: e.currentTarget.value })} style={{ width: "100%" }} /></label>

      {(f.field_type === "dropdown" || f.field_type === "multi_select") && <>
        <h3>2. Choices</h3>
        <label style={{ display: "block" }}>One choice per line<textarea rows={4} style={{ width: "100%" }} value={(f.options.choices ?? []).join("\n")}
          onChange={(e) => opt({ choices: e.currentTarget.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></label>
        <p className="note">Typed and imported values must match a choice (capitals do not matter). Removing a choice that is in use is refused.</p>
      </>}
      {NUMERIC.includes(f.field_type) && <>
        <h3>2. Number rules</h3>
        <div className="row">
          {f.field_type === "number" || f.field_type === "percent" ? <label>Decimals<input type="number" min={0} max={9} value={f.options.decimals ?? ""} onChange={(e) => opt({ decimals: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label> : null}
          <label>Minimum<input type="text" inputMode="decimal" value={f.options.min ?? ""} onChange={(e) => opt({ min: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label>
          <label>Maximum<input type="text" inputMode="decimal" value={f.options.max ?? ""} onChange={(e) => opt({ max: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label>
          <label>Unit shown<input type="text" value={f.options.unit ?? ""} onChange={(e) => opt({ unit: e.currentTarget.value || null })} placeholder="sft, nos, MT" /></label>
        </div>
        <p className="note">Values are stored as exact decimals. A value with more decimals than allowed is refused, not rounded, so nothing changes silently.</p>
      </>}
      {(f.field_type === "text" || f.field_type === "long_text") && <div className="row"><label>Longest allowed (characters)<input type="number" min={1} value={f.options.max_length ?? ""} onChange={(e) => opt({ max_length: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label></div>}

      {isFormula && <>
        <h3>2. Formula</h3>
        <div className="row">
          <label style={{ flex: 1, minWidth: 320 }}>= <input className="formula" type="text" aria-label="Formula" value={f.formula ?? ""} onChange={(e) => set({ formula: e.currentTarget.value })} placeholder="planned_qty * rate" /></label>
          <label>Result<select value={f.result_type ?? "number"} onChange={(e) => set({ result_type: e.currentTarget.value })}>{RESULT_TYPES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          {(f.result_type === "number" || f.result_type === "percent") && <label>Decimals<input type="number" min={0} max={9} value={f.options.decimals ?? 2} onChange={(e) => opt({ decimals: Number(e.currentTarget.value) })} /></label>}
        </div>
        <p id="formula-check" className={check ? "bad-text" : "ok-text"} role="status">{f.formula ? (check ? `✗ ${check}` : "✓ The formula is valid") : "Type a formula, or click the fields and functions below."}</p>
        <div className="note">Fields of this form:</div>
        <div className="pickers">{[...kinds].map(([k, v]) => <button key={k} type="button" title={v.label} onClick={() => insert(k)}>{k}</button>)}</div>
        {f.entity === "version" && <><div className="note">Totals of budget line fields:</div>
          <div className="pickers">{[...BUILTINS.line.map((b) => b.key), ...lineFields.filter((x) => NUMERIC.includes(x.field_type) || (x.field_type === "formula" && !["text", "yes_no", "date"].includes(x.result_type ?? ""))).map((x) => x.key)]
            .map((k) => <button key={k} type="button" onClick={() => insert(`SUMLINES(${k})`)}>SUMLINES({k})</button>)}</div></>}
        <div className="note">Functions:</div>
        <div className="pickers">{Object.entries(FUNCTIONS).filter(([n]) => f.entity === "version" || !n.endsWith("LINES")).map(([n, d]) => <button key={n} type="button" title={d.help} onClick={() => insert(`${n}(`)}>{n}</button>)}</div>
        <p className="note">Operators: + − * / ^ and % (10% = 0.1), comparisons = &lt;&gt; &lt; &lt;= &gt; &gt;=, &amp; joins text. Blank numbers count as 0. Division by zero shows Error on that value only; use DIVIDE(a, b, 0) to show 0 instead. Calculated with exact decimals, then rounded to the result type.</p>
        {refs.length > 0 && <>
          <h3>Try it</h3>
          <div className="row">
            {refs.map((k) => <label key={k}>{kinds.get(k)?.label ?? k}<input type={kinds.get(k)?.type === "date" ? "date" : "text"} value={sample[k] ?? ""} onChange={(e) => setSample({ ...sample, [k]: e.currentTarget.value })} /></label>)}
            <div><div className="note">Result</div><b>{trial && typeof trial === "object" && "error" in trial ? <span className="bad-text">{trial.error}</span> : display(f as unknown as FieldDef, trial as Value)}</b></div>
          </div>
        </>}
      </>}

      {!isFormula && <>
        <h3>3. How is it filled?</h3>
        <div className="row">
          <label>Filled by<select value={f.input_source} onChange={(e) => set({ input_source: e.currentTarget.value as A.FieldInput["input_source"] })}>
            <option value="both">Typing or Excel import</option><option value="typed">Typing only</option><option value="excel">Excel import only</option></select></label>
          {f.input_source !== "typed" && <label style={{ minWidth: 220 }}>Excel column header<input type="text" value={f.excel_header ?? ""} placeholder={f.label} onChange={(e) => set({ excel_header: e.currentTarget.value })} /></label>}
          <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.required} onChange={(e) => set({ required: e.currentTarget.checked })} /> Required before approval</label>
        </div>
        {f.input_source !== "typed" && <p className="note">The imports read any column with this header (in the header row of the {f.entity === "cost_entry" ? "cost incurred sheet" : "detail budget workbook"}). Cells that do not fit the rules are listed in the import result; the rest of the file is still imported.</p>}
      </>}

      <h3>{isFormula ? "3" : "4"}. Where is it shown?</h3>
      <div className="row">
        <label>Section<input type="text" value={f.section ?? ""} onChange={(e) => set({ section: e.currentTarget.value })} placeholder="More details" /></label>
        <label>Order<input type="number" value={f.sort} onChange={(e) => set({ sort: Number(e.currentTarget.value) })} style={{ width: 80 }} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.show_in_entry} onChange={(e) => set({ show_in_entry: e.currentTarget.checked })} /> On entry screens</label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.show_in_reports} onChange={(e) => set({ show_in_reports: e.currentTarget.checked })} /> In reports</label>
        {!isFormula && <label>Extra right needed to change it<select value={f.edit_permission ?? ""} onChange={(e) => set({ edit_permission: e.currentTarget.value || null })}>
          <option value="">None</option>{permissions.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}</select></label>}
      </div>
      <div className="row">
        <button className="primary" disabled={pending || (isFormula && !!check)} onClick={() => run(() => A.saveField({ ...f, excel_header: f.input_source !== "typed" ? (f.excel_header?.trim() || f.label) : null }),
          () => onDone(`${f.label} saved.`))}>Save field</button>
        <button onClick={() => onDone()}>Cancel</button>
      </div>
    </section>
  );
}
