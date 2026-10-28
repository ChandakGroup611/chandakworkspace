import Link from "next/link";
import * as D from "@/lib/budget/data";
import type { Db, Me, Project, Version } from "@/lib/budget/data";
import { dmy, fmt, fmtArea, fmtPct, fmtRupees, isNeg, monthName, nextQuarterEnd, toCr } from "@/lib/budget/format";
import { type Cells, cr, day, loadCustom, loadVersionCustom, lookupNames, rupeesFromPaise } from "@/lib/budget/custom";
import { groupDetail } from "@/lib/budget/group";
import { fieldTitle } from "@/lib/budget/fields";
import { CustomFieldsForm, CustomInput, type Picks } from "./custom-fields";
import * as F from "./forms";
import { ImportPanel } from "./import-panel";
import { Notice, VersionBanner } from "./shell";

// The budget screens. Server components: they read the calculated views as the signed-in user.

export interface Ctx {
  sb: Db; me: Me; projects: Project[]; project: Project; versions: Version[]; version: Version | null;
  names: Record<string, string>; search: Record<string, string | undefined>;
}

const Neg = ({ v }: { v: number | null | undefined }) => <span className={isNeg(v) ? "neg" : ""}>{fmt(v)}</span>;
function Bar({ v }: { v: number | null }) {
  if (v == null) return null;
  return <><span className="bar"><i className={v > 100 ? "over" : ""} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} /></span>{fmtPct(v)}</>;
}
const draftOf = (versions: Version[]) => versions.find((v) => v.status === "draft") ?? null;
const lastApproved = (versions: Version[]) => versions.filter((v) => v.status === "approved").pop() ?? null;
const isNum = (f: D.CustomField) => f.field_type === "formula" ? !["text", "yes_no", "date"].includes(f.result_type ?? "") : ["number", "integer", "amount_cr", "amount_inr", "percent"].includes(f.field_type);
const sectionsOf = (fields: D.CustomField[]): [string, number[]][] => {
  const out = new Map<string, number[]>();
  for (const f of fields) { const k = f.section || "More details"; if (!out.has(k)) out.set(k, []); out.get(k)!.push(f.id); }
  return [...out];
};
async function picksFor(sb: Db, projectId: number, names: Record<string, string>): Promise<Picks> {
  const [depts, towers] = await Promise.all([D.getDepartments(sb), D.getTowers(sb, projectId)]);
  return {
    user: Object.entries(names).map(([id, n]): [string, string] => [id, n]).sort((a, b) => a[1].localeCompare(b[1])),
    department: depts.map((d): [string, string] => [String(d.id), d.name]),
    tower: towers.map((t): [string, string] => [String(t.id), t.name]),
  };
}
/** Custom fields of a record shown as read-only rows in a report table. */
function CustomRows({ fields, cells }: { fields: D.CustomField[]; cells?: Cells }) {
  return <>{fields.map((f) => <tr key={f.id}><td title={fieldTitle(f)}>{f.label}</td><td className={isNum(f) ? "n" : ""}>{cells?.[f.key]?.error ? <span className="chip bad" title={cells[f.key].error!}>Error</span> : cells?.[f.key]?.text}</td></tr>)}</>;
}

export function NoVersion({ me, project }: Ctx) {
  return (
    <section className="panel"><h2>{project.name} has no budget version yet</h2>
      <p>Start it either way: open R1 and type the budget on Budget entry, or import a detail-format workbook.</p>
      {D.can(me, "version.open", project.id) ? <F.OpenVersionForm projectId={project.id} defaultDate={nextQuarterEnd(new Date().toISOString().slice(0, 10))} first />
        : <p className="note">The budget preparer starts the first version.</p>}
    </section>
  );
}

// ---------- overview ----------
export async function Overview(c: Ctx & { version: Version }) {
  const { sb, me, project, versions, version: v, names } = c;
  const [totals, depts, allTotals, imports, towers] = await Promise.all([
    D.getTotals(sb, project.id), D.getDepartmentTotals(sb, v.id), D.getTotals(sb), D.getImports(sb, project.id), D.getTowers(sb, project.id),
  ]);
  const lookup = await lookupNames(sb, project.id, names);
  const pc = await loadCustom(sb, "project", project.id, new Map([[project.id, { towers: cr(towers.length) }]]), lookup);
  const t = totals.find((x) => x.version_id === v.id)!;
  const psf = v.areas.eng_area ? (t.ctc_cr * 1e7) / Number(v.areas.eng_area) : null;
  const draft = draftOf(versions);
  const approved = lastApproved(versions);
  const lastImport = imports.find((i) => i.kind === "detail");
  const kpi = (label: string, value: React.ReactNode, small?: string) => <div className="kpi"><span>{label}</span><b>{value}</b>{small && <small>{small}</small>}</div>;
  return (
    <>
      <VersionBanner me={me} project={project} version={v} names={names} />
      <div className="kpis">
        {kpi("Initial Budget (a)", fmt(t.initial_cr), "Crores")}
        {kpi("Estimated CTC (b)", fmt(t.ctc_cr), psf == null ? undefined : `PSF ₹${fmt(psf)}`)}
        {kpi("Cost Incurred (c)", fmt(t.incurred_cr), `till ${dmy(v.as_on)}`)}
        {kpi("Balance CTC (b − c)", fmt(t.balance_cr), "Crores")}
        {kpi("Variance (a − b)", <Neg v={t.variance_cr} />, t.variance_cr < 0 ? "CTC is above the initial budget" : "Within the initial budget")}
        {kpi("Budget utilised", fmtPct(t.util_pct), "Cost incurred ÷ CTC")}
      </div>
      <section className="panel"><div className="panel-head"><h2>Departments</h2><span className="sub">All amounts in crores · R{v.number}</span></div>
        <div className="scroll"><table><thead><tr><th>Sr</th><th>Department</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (b−c)</th><th className="n">Variance (a−b)</th><th className="n">Utilised</th></tr></thead>
          <tbody>{depts.map((d, i) => <tr key={d.department_id}><td>{i + 1}</td><td>{d.department}</td><td className="n">{fmt(d.initial_cr)}</td><td className="n">{fmt(d.ctc_cr)}</td><td className="n">{fmt(d.incurred_cr)}</td><td className="n"><Neg v={d.balance_cr} /></td><td className="n"><Neg v={d.variance_cr} /></td><td className="n"><Bar v={d.util_pct} /></td></tr>)}
            <tr className="total"><td></td><td>Total</td><td className="n">{fmt(t.initial_cr)}</td><td className="n">{fmt(t.ctc_cr)}</td><td className="n">{fmt(t.incurred_cr)}</td><td className="n"><Neg v={t.balance_cr} /></td><td className="n"><Neg v={t.variance_cr} /></td><td className="n"><Bar v={t.util_pct} /></td></tr></tbody></table></div>
      </section>
      <div className="grid2">
        <section className="panel"><div className="panel-head"><h2>Budget versions</h2><span className="sub">Each revision is kept; nothing is overwritten</span></div>
          <div className="scroll"><table><thead><tr><th>Version</th><th>As on</th><th>Status</th><th className="n">CTC (Cr)</th><th className="n">Change</th><th>Prepared by</th><th>Reason</th></tr></thead><tbody>
            {versions.slice().reverse().map((x) => {
              const xt = totals.find((y) => y.version_id === x.id)!;
              const pt = totals.find((y) => y.version_id === x.parent_id);
              return <tr key={x.id}><td><Link href={`/budget/${project.id}/overview?v=${x.number}`}>R{x.number}</Link></td><td>{dmy(x.as_on)}</td><td><span className={`pill ${x.status}`}>{x.status}</span></td>
                <td className="n">{fmt(xt.ctc_cr)}</td><td className="n">{pt && <Neg v={xt.ctc_cr - pt.ctc_cr} />}</td><td>{(x.prepared_by && names[x.prepared_by]) || ""}</td><td>{x.reason}</td></tr>;
            })}
          </tbody></table></div>
          {D.can(me, "version.open", project.id) && !draft ? <>
            <F.OpenVersionForm projectId={project.id} defaultDate={nextQuarterEnd((approved ?? v).as_on)} />
            <p className="note">Two ways to fill it: departments type their changes on Budget entry, or upload the revised workbook on Import from Excel. Both land in the same draft.</p></>
            : <p className="note">{draft ? `Draft R${draft.number} is open. Approve or delete it before opening another.` : "Only the budget preparer or an administrator opens new versions."}</p>}
        </section>
        {lastImport && <section className="panel"><div className="panel-head"><h2>What the last import found in the Excel</h2></div>
          <p className="sub">{lastImport.file_name}, imported {dmy(lastImport.imported_at)} by {(lastImport.imported_by && names[lastImport.imported_by]) || "the preparer"}.
            {lastImport.summary.sheet_totals_cr ? ` Sheet totals: CTC ${fmt((lastImport.summary.sheet_totals_cr as { ctc: number }).ctc)} and Cost Incurred ${fmt((lastImport.summary.sheet_totals_cr as { incurred: number }).incurred)} crores.` : ""} These were hidden in formulas and are now visible fields:</p>
          <ul className="plain">{((lastImport.summary.warnings as string[]) ?? []).map((w) => <li key={w}>{w}</li>)}</ul></section>}
      </div>
      {pc.fields.length > 0 && <section className="panel"><div className="panel-head"><h2>Project details</h2><span className="sub">Custom fields set up under Settings</span></div>
        <CustomFieldsForm fields={pc.fields} sections={sectionsOf(pc.fields)} entity="project" entityId={project.id} cells={pc.cells.get(project.id) ?? {}}
          editable={D.can(me, "project.setup", project.id)} picks={await picksFor(sb, project.id, names)} />
      </section>}
      <section className="panel"><div className="panel-head"><h2>All projects</h2><span className="sub">Latest approved version of each project · crores</span></div>
        <Portfolio projects={c.projects} totals={allTotals} />
      </section>
    </>
  );
}

export function Portfolio({ projects, totals }: { projects: Project[]; totals: D.Totals[] }) {
  return (
    <div className="scroll"><table><thead><tr><th>Project</th><th>Version</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Variance (a−b)</th><th className="n">Utilised</th></tr></thead><tbody>
      {projects.map((p) => {
        const pv = totals.filter((t) => t.project_id === p.id);
        const cur = pv.filter((t) => t.status === "approved").pop() ?? pv[pv.length - 1];
        if (!cur) return <tr key={p.id}><td><Link href={`/budget/${p.id}/overview`}>{p.name}</Link></td><td colSpan={6} className="sub">No version yet</td></tr>;
        return <tr key={p.id}><td><Link href={`/budget/${p.id}/overview`}>{p.name}</Link></td><td>R{cur.number} · {dmy(cur.as_on)}{cur.status === "draft" && " (draft)"}</td><td className="n">{fmt(cur.initial_cr)}</td><td className="n">{fmt(cur.ctc_cr)}</td><td className="n">{fmt(cur.incurred_cr)}</td><td className="n"><Neg v={cur.variance_cr} /></td><td className="n"><Bar v={cur.util_pct} /></td></tr>;
      })}
    </tbody></table></div>
  );
}

function Filters({ ctx, depts, towers }: { ctx: Ctx; depts: string[]; towers: D.Tower[] }) {
  return (
    <div className="row">
      <F.QuerySelect name="dept" label="" value={ctx.search.dept ?? ""} options={[["", "All departments"], ...depts.map((d): [string, string] => [d, d])]} />
      <F.QuerySelect name="tower" label="" value={ctx.search.tower ?? ""} options={[["", "All towers"], ["none", "Not split by tower"], ...towers.map((t): [string, string] => [String(t.id), t.name])]} />
    </div>
  );
}
const towerMatch = (f: D.LineFigure, tower?: string) => !tower || (tower === "none" ? f.subproject_id == null : String(f.subproject_id) === tower);

// ---------- budget entry ----------
export async function Entry(c: Ctx & { version: Version }) {
  const { sb, me, project, version: v, versions, search } = c;
  const [figs, lines, heads, towers, flagged, template, totals, areas, missing] = await Promise.all([
    D.getLineFigures(sb, v.id), D.getLines(sb, v.id), D.getHeads(sb, project.id), D.getTowers(sb, project.id),
    v.status === "draft" && v.parent_id ? D.getChangesNeedingRemark(sb, v.id) : Promise.resolve([]), getTemplate(sb),
    D.getTotals(sb, project.id), D.getVersionAreas(sb, v.id),
    v.status === "draft" ? sb.rpc("budget_missing_required", { p_version: v.id }).then((r) => (r.data ?? []) as { field: string; record: string }[]) : Promise.resolve([]),
  ]);
  const lookup = await lookupNames(sb, project.id, c.names);
  const custom = await loadVersionCustom(sb, project, v, figs, totals.find((t) => t.version_id === v.id), areas?.net_sale_carpet, lookup);
  const picks = await picksFor(sb, project.id, c.names);
  const lineFields = custom.lines.fields.filter((f) => f.show_in_entry);
  const g = groupDetail(figs, v.areas.eng_area);
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const headById = new Map(heads.map((h) => [h.id, h]));
  const flag = new Set(flagged.map((x) => x.line_id));
  const perHead = new Map<number, number>();
  for (const l of lines) perHead.set(l.cost_head_id, (perHead.get(l.cost_head_id) ?? 0) + 1);
  const rows: F.EntryRow[] = [];
  for (const d of g.departments) {
    if (search.dept && d.department !== search.dept) continue;
    rows.push({ kind: "dept", key: `d${d.department_id}`, label: `${d.sr}. ${d.department}`, ...d.totals });
    for (const cat of d.categories) {
      const ls = cat.lines.filter((f) => towerMatch(f, search.tower));
      if (!ls.length) continue;
      if (cat.grouped) rows.push({ kind: "cat", key: `c${d.department_id}-${cat.category}`, label: cat.category, indent: 1, ...cat.totals });
      for (const f of ls) {
        const raw = lineById.get(f.line_id)!;
        const h = headById.get(f.cost_head_id)!;
        const editable = v.status === "draft" && D.can(me, "budget.edit", project.id, f.department_id);
        rows.push({
          kind: "line", key: `l${f.line_id}`, label: f.sub_category || f.category, note: f.note, tower: f.subproject, indent: cat.grouped ? 2 : 1,
          initial_cr: f.initial_cr, ctc_cr: f.ctc_cr, incurred_cr: f.incurred_cr, balance_cr: f.balance_cr, variance_cr: f.variance_cr, util_pct: f.util_pct, psf_ctc: f.psf_ctc,
          line: {
            id: f.line_id, isTax: f.is_tax, taxRule: f.is_tax ? `GST ${Number(h.tax_rate_pct)}% × ${Number(h.tax_share_pct ?? 100)}%` : null,
            initial: raw.initial_paise, ctc: raw.ctc_paise, initialCalc: f.initial_calculated, ctcCalc: f.ctc_calculated,
            incurredAuto: f.is_tax && f.incurred_source === "tax rule", remark: f.remark, source: f.source, editable,
            needsRemark: flag.has(f.line_id), removable: editable && (perHead.get(f.cost_head_id) ?? 0) > 1, overBudget: f.over_budget,
            custom: custom.lines.cells.get(f.line_id),
          },
        });
      }
    }
  }
  const total: F.EntryRow = { kind: "dept", key: "total", label: "Total (all departments)", ...g.total };
  let notice: React.ReactNode;
  const draft = draftOf(versions);
  if (v.status === "approved") notice = <>R{v.number} is approved and locked. {draft ? <>Pick <Link href={`/budget/${project.id}/entry?v=${draft.number}`}>draft R{draft.number}</Link> to edit it.</> : D.can(me, "version.open", project.id) ? "Open the next version from the Overview to make changes." : "The budget preparer opens the next version."}</>;
  else if (!D.can(me, "budget.edit", project.id)) notice = `You can read every figure here (role: ${me.role}); departments and the preparer make the changes.`;
  else if (D.limitedToDepartments(me)) notice = "You can change your own department's lines. Other departments' lines are read only for you.";
  else notice = <>Type amounts in crores, then press Tab or Enter, or <Link href={`/budget/${project.id}/import`}>import a workbook</Link> into this draft. Balance, variance, PSF, GST and totals are recalculated by the database either way. The Source column shows where each figure came from.</>;
  const splitHeads = heads.filter((h) => !h.is_tax && D.can(me, "budget.edit", project.id, h.department_id));
  const vf = custom.version.fields;
  const deptName = new Map(figs.map((f) => [f.department_id, f.department]));
  return (
    <>
      <VersionBanner me={me} project={project} version={v} names={c.names} />
      <Notice kind={v.status === "approved" ? "locked" : ""}>{notice}</Notice>
      <section className="panel">
        <div className="panel-head"><h2>Budget entry · R{v.number}</h2><Filters ctx={c} depts={g.departments.map((d) => d.department)} towers={towers} /></div>
        <F.EntryTable rows={rows} total={total} customFields={lineFields} picks={picks} />
        <p className="note">Crores. Typed or imported: Initial, CTC, Remark. Everything else is calculated. PSF = amount ÷ engineering construction area ({fmtArea(v.areas.eng_area)} sft). Cost incurred comes from the Cost incurred tab, up to {dmy(v.as_on)}.
          {flag.size > 0 && ` ${flag.size} line(s) changed by more than 10% need a remark before approval.`}
          {lineFields.length > 0 && " Extra columns are custom fields; calculated ones are worked out on the server from the figures in the row."}</p>
        {missing.length > 0 && <p className="note bad-text">{missing.length} required field(s) still empty, needed before approval: {missing.slice(0, 6).map((m) => `${m.field} (${m.record})`).join(", ")}{missing.length > 6 ? " …" : ""}</p>}
      </section>
      {vf.length > 0 && <section className="panel">
        <div className="panel-head"><h3>Version fields · R{v.number}</h3><span className="sub">Custom fields of this version{v.status === "approved" ? "; locked with it" : ""}</span></div>
        <CustomFieldsForm fields={vf} sections={sectionsOf(vf)} entity="version" entityId={v.id} cells={custom.version.cells.get(v.id) ?? {}} editable={D.canChangeDraft(me, v)} picks={picks} />
      </section>}
      {v.status === "draft" && splitHeads.length > 0 && towers.length > 0 && <section className="panel">
        <div className="panel-head"><h3>Split a cost head by tower</h3><span className="sub">Adds a line for one tower; the Summary then shows it under that tower&apos;s building type</span></div>
        <F.SplitLineForm versionId={v.id} heads={splitHeads.map((h) => ({ id: h.id, label: `${deptName.get(h.department_id) ?? ""} · ${h.sub_category || h.category}` }))}
          towers={towers.map((t) => ({ id: t.id, label: t.type ? `${t.name} · ${t.type}` : t.name }))} />
      </section>}
      {D.canChangeDraft(me, v) && <section className="panel">
        <div className="panel-head"><h3>Version details</h3><span className="sub">Typed only; shown on the Summary report&apos;s version tables</span></div>
        <F.VersionDetailsForm versionId={v.id} asOn={v.as_on} reason={v.reason} categories={[...new Set(template.map((t) => t.category))]} reasons={v.category_reasons ?? {}} />
      </section>}
    </>
  );
}

async function getTemplate(sb: Db) {
  const { data } = await sb.from("budget_summary_template").select("category, subcategory, category_sort, subcategory_sort").order("category_sort").order("subcategory_sort");
  return (data ?? []) as { category: string; subcategory: string }[];
}

// ---------- import ----------
export async function ImportTab(c: Ctx) {
  const imports = await D.getImports(c.sb);
  const pname = new Map(c.projects.map((p) => [p.id, p.name]));
  const vnum = new Map((await D.getVersions(c.sb)).map((v) => [v.id, v.number]));
  return (
    <>
      <ImportPanel projects={c.projects.map((p) => ({ id: p.id, name: p.name }))} projectId={c.project.id} canDetail={D.can(c.me, "budget.import", c.project.id)} canCost={D.can(c.me, "cost.import", c.project.id)} />
      <ImportHistory imports={imports} pname={pname} vnum={vnum} names={c.names} />
    </>
  );
}

export function ImportHistory({ imports, pname, vnum, names }: { imports: Awaited<ReturnType<typeof D.getImports>>; pname: Map<number, string>; vnum: Map<number, number>; names: Record<string, string> }) {
  return (
    <section className="panel"><h3>Import history</h3>
      <div className="scroll"><table><thead><tr><th>Date</th><th>File</th><th>Type</th><th>Into</th><th>Result</th><th>By</th></tr></thead><tbody>
        {imports.map((i) => {
          const s = i.summary as Record<string, number>;
          const what = i.kind === "detail" ? `${s.lines_changed ?? 0} lines, ${s.incurred_adjustments ?? 0} cost entries, ${s.new_heads ?? 0} new heads, ${s.new_towers ?? 0} new towers`
            : `${s.entries ?? 0} cost entries (${fmt(toCr(s.total_paise ?? 0))} Cr)`;
          return <tr key={i.id}><td>{dmy(i.imported_at)}</td><td>{i.file_name}</td><td>{i.kind === "detail" ? "Budget workbook" : "Cost sheet"}</td>
            <td>{pname.get(i.project_id)}{i.version_id && vnum.has(i.version_id) ? ` R${vnum.get(i.version_id)}` : ""}</td><td>{what}</td><td>{(i.imported_by && names[i.imported_by]) || ""}</td></tr>;
        })}
        {imports.length === 0 && <tr><td colSpan={6} className="sub">No imports yet.</td></tr>}
      </tbody></table></div>
    </section>
  );
}

// ---------- summary ----------
export async function Summary(c: Ctx & { version: Version }) {
  const { sb, project, version: v, versions } = c;
  const upTo = versions.filter((x) => x.number <= v.number);
  const [rows, cats, areas, towers, totals, figs] = await Promise.all([
    D.getSummaryRows(sb, v.id), D.getCategoryTotals(sb, upTo.map((x) => x.id)), D.getVersionAreas(sb, v.id), D.getTowers(sb, project.id), D.getTotals(sb, project.id),
    D.getLineFigures(sb, v.id),
  ]);
  const custom = await loadVersionCustom(sb, project, v, figs, totals.find((x) => x.version_id === v.id), areas?.net_sale_carpet, await lookupNames(sb, project.id, c.names));
  const vf = custom.version.fields.filter((f) => f.show_in_reports);
  const byCat = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }
  const thisCats = cats.filter((x) => x.version_id === v.id);
  const typeArea = (type: string, k: "carpet_area" | "eng_area") => {
    const ts = towers.filter((t) => t.type === type && t[k] != null);
    return ts.length ? ts.reduce((s, t) => s + Number(t[k]), 0) : null;
  };
  const a = v.areas;
  const commitments = a.commitments ?? [];
  const sold = Number(a.sold_area ?? 0), net = Number(areas?.net_sale_carpet ?? 0);
  const t = totals.find((x) => x.version_id === v.id)!;
  const sumBy = (k: "budget_cr" | "incurred_cr" | "balance_cr") => thisCats.reduce((s, x) => s + Number(x[k]), 0);
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>Project Budget Summary</h2><span className="sub">Chandak Group internal working · amounts in crores</span></div>
        <dl className="sumhead"><dt>Project name</dt><dd>{project.name}</dd><dt>Version</dt><dd>R{v.number} ({v.status})</dd><dt>Date</dt><dd>{dmy(v.as_on)}</dd><dt>Print date</dt><dd>{dmy(new Date().toISOString())}</dd></dl>
        <div className="scroll"><table><thead><tr><th>Sr</th><th>Category</th><th>Sub-category</th><th className="n">Carpet area</th><th className="n">Engg. construction area</th><th className="n">Amount</th><th className="n">Total amount</th></tr></thead><tbody>
          {[...byCat].map(([cat, subs], i) => (
            <SummaryCategory key={cat} sr={i + 1} cat={cat} total={Number(thisCats.find((x) => x.category === cat)?.budget_cr ?? 0)}
              subs={subs.map((s) => ({ name: s.subcategory, amount: s.amount_cr, carpet: cat === "Construction" ? typeArea(s.subcategory, "carpet_area") : null, eng: cat === "Construction" ? typeArea(s.subcategory, "eng_area") : null }))} />
          ))}
          <tr className="total"><td></td><td colSpan={5}>Total</td><td className="n">{fmt(t.ctc_cr)}</td></tr>
        </tbody></table></div>
        <p className="note">Construction is split by each tower&apos;s building type. Lines not yet split by tower show as &quot;Not allocated to a building&quot;; set tower types under Towers &amp; set-up and split lines under Budget entry.</p>
      </section>
      <div className="grid2">
        <section className="panel"><h3>Area particulars (sq.ft.)</h3>
          <div className="scroll"><table><tbody>
            <tr><td>Total sale carpet area (A)</td><td className="n">{fmtArea(a.total_carpet)}</td></tr>
            {commitments.map((x, i) => <tr key={i}><td>{x.name} ({String.fromCharCode(66 + i)})</td><td className="n">{fmtArea(x.area)}</td></tr>)}
            <tr className="total"><td>Net sale carpet area (E = A − {commitments.map((_, i) => String.fromCharCode(66 + i)).join(" − ") || "0"})</td><td className="n">{fmtArea(areas?.net_sale_carpet)}</td></tr>
            <tr><td>Sold</td><td className="n">{fmtArea(a.sold_area)} ({fmtPct(net ? (sold * 100) / net : null)})</td></tr>
            <tr><td>Available</td><td className="n">{fmtArea(net - sold)} ({fmtPct(net ? ((net - sold) * 100) / net : null)})</td></tr>
            <tr><td>Residential area</td><td className="n">{fmtArea(a.residential_area)}</td></tr><tr><td>Commercial area</td><td className="n">{fmtArea(a.commercial_area)}</td></tr>
            <tr><td>Retail area</td><td className="n">{fmtArea(a.retail_area)}</td></tr><tr><td>Society sale</td><td className="n">{fmtArea(a.society_sale_area)}</td></tr>
          </tbody></table></div>
          {vf.length > 0 && <><h3>Version fields</h3><div className="scroll"><table><tbody><CustomRows fields={vf} cells={custom.version.cells.get(v.id)} /></tbody></table></div></>}
        </section>
        <section className="panel"><h3>Budget vs incurred, till {dmy(v.as_on)}</h3>
          <div className="scroll"><table><thead><tr><th>Sr</th><th>Category</th><th className="n">Budget</th><th className="n">Incurred</th><th className="n">Balance</th></tr></thead><tbody>
            {thisCats.map((x, i) => <tr key={x.category}><td>{i + 1}</td><td>{x.category}</td><td className="n">{fmt(x.budget_cr)}</td><td className="n">{fmt(x.incurred_cr)}</td><td className="n"><Neg v={x.balance_cr} /></td></tr>)}
            <tr className="total"><td></td><td>Total</td><td className="n">{fmt(sumBy("budget_cr"))}</td><td className="n">{fmt(sumBy("incurred_cr"))}</td><td className="n"><Neg v={sumBy("balance_cr")} /></td></tr>
          </tbody></table></div>
        </section>
      </div>
      <section className="panel"><h3>Version history</h3>
        <div className="scroll"><table><thead><tr><th>Version</th><th>As on</th><th>Status</th><th className="n">Total carpet area</th><th className="n">Construction area (Engg)</th><th className="n">Total budget (Cr)</th></tr></thead><tbody>
          {upTo.map((x) => { const xt = totals.find((y) => y.version_id === x.id)!; return <tr key={x.id}><td>R{x.number}</td><td>{dmy(x.as_on)}</td><td><span className={`pill ${x.status}`}>{x.status}</span></td><td className="n">{fmtArea(xt.total_carpet)}</td><td className="n">{fmtArea(xt.eng_area)}</td><td className="n">{fmt(xt.ctc_cr)}</td></tr>; })}
        </tbody></table></div>
      </section>
      <section className="panel"><h3>Budget version-wise and category-wise breakup</h3>
        <div className="scroll"><table><thead><tr><th>Sr</th><th>Category</th>{upTo.map((x) => <th key={x.id} className="n">R{x.number}<br />{dmy(x.as_on)}</th>)}<th>Reason</th></tr></thead><tbody>
          {thisCats.map((x, i) => <tr key={x.category}><td>{i + 1}</td><td>{x.category}</td>
            {upTo.map((u) => <td key={u.id} className="n">{fmt(cats.find((y) => y.version_id === u.id && y.category === x.category)?.budget_cr ?? 0)}</td>)}<td>{v.category_reasons?.[x.category]}</td></tr>)}
          <tr className="total"><td></td><td>Total</td>{upTo.map((u) => <td key={u.id} className="n">{fmt(totals.find((y) => y.version_id === u.id)?.ctc_cr)}</td>)}<td></td></tr>
        </tbody></table></div>
      </section>
    </>
  );
}

function SummaryCategory({ sr, cat, total, subs }: { sr: number; cat: string; total: number; subs: { name: string; amount: number; carpet: number | null; eng: number | null }[] }) {
  return (
    <>
      <tr className="group"><td>{sr}</td><td colSpan={5}>{cat}</td><td className="n">{fmt(total)}</td></tr>
      {subs.map((s) => <tr key={s.name}><td></td><td></td><td>{s.name}</td><td className="n">{fmtArea(s.carpet)}</td><td className="n">{fmtArea(s.eng)}</td><td className="n">{fmt(s.amount)}</td><td></td></tr>)}
    </>
  );
}

// ---------- detail ----------
export async function Detail(c: Ctx & { version: Version }) {
  const { sb, project, version: v, search } = c;
  const [figs, towers, areas, totals] = await Promise.all([D.getLineFigures(sb, v.id), D.getTowers(sb, project.id), D.getVersionAreas(sb, v.id), D.getTotals(sb, project.id)]);
  const custom = await loadVersionCustom(sb, project, v, figs, totals.find((x) => x.version_id === v.id), areas?.net_sale_carpet, await lookupNames(sb, project.id, c.names));
  const lf = custom.lines.fields.filter((f) => f.show_in_reports);
  const vf = custom.version.fields.filter((f) => f.show_in_reports);
  const g = groupDetail(figs, v.areas.eng_area);
  const a = v.areas;
  const net = Number(areas?.net_sale_carpet ?? 0), sold = Number(a.sold_area ?? 0);
  const Cells = ({ x }: { x: CellFigures }) => <>
    <td className="n">{fmt(x.psf_initial)}</td><td className="n">{fmt(x.psf_ctc)}</td><td className="n">{fmt(x.initial_cr)}</td><td className="n">{fmt(x.ctc_cr)}</td>
    <td className="n">{fmt(x.incurred_cr)}</td><td className="n"><Neg v={x.balance_cr} /></td><td className="n"><Neg v={x.variance_cr} /></td></>;
  const t = g.total;
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>{project.name} as on {dmy(v.as_on)} · R{v.number}</h2><Filters ctx={c} depts={g.departments.map((d) => d.department)} towers={towers} /></div>
        <div className="grid2">
          <div className="scroll"><table><tbody>
            <tr><td>Construction area, Engineering team (sft)</td><td className="n">{fmtArea(a.eng_area)}</td></tr>
            <tr><td>Construction area, Design team (sft)</td><td className="n">{fmtArea(a.design_area)}</td></tr>
            <tr><td>Total sale value (Cr)</td><td className="n">{fmt(a.sale_value_cr)}</td></tr>
            <tr><td>Total carpet area / for sale (sft)</td><td className="n">{fmtArea(a.total_carpet)} / {fmtArea(areas?.net_sale_carpet)}</td></tr>
            <tr><td>Sold / available (sft)</td><td className="n">{fmtArea(sold)} ({fmtPct(net ? (sold * 100) / net : null)}) / {fmtArea(net - sold)} ({fmtPct(net ? ((net - sold) * 100) / net : null)})</td></tr>
          </tbody></table></div>
          <div className="scroll"><table><tbody>
            {towers.filter((x) => x.oc_date).map((x) => <tr key={x.id}><td>OC date {x.name}</td><td className="n">{dmy(x.oc_date)}</td></tr>)}
            {!towers.some((x) => x.oc_date) && <tr><td>No OC dates yet</td></tr>}
            <CustomRows fields={vf} cells={custom.version.cells.get(v.id)} />
          </tbody></table></div>
        </div>
        <div className="scroll"><table><thead><tr><th>Sr</th><th>Department</th><th>Category</th><th>Sub-category</th><th className="n">PSF on initial</th><th className="n">PSF on CTC</th><th className="n">Initial budget (a)</th><th className="n">Estimated CTC (b)</th><th className="n">Cost incurred (c)</th><th className="n">Balance CTC (d = b − c)</th><th className="n">Variance (a − b)</th><th>Remark</th><th className="n">Utilised</th>{lf.map((f) => <th key={f.id} className={isNum(f) ? "n" : ""} title={fieldTitle(f)}>{f.label}</th>)}</tr></thead><tbody>
          {g.departments.filter((d) => !search.dept || d.department === search.dept).map((d) => (
            <DeptRows key={d.department_id} d={d} tower={search.tower} Cells={Cells} fields={lf} cells={custom.lines.cells} />
          ))}
          <tr className="total"><td></td><td>Total</td><td></td><td></td><Cells x={t} /><td></td><td className="n">{fmtPct(t.util_pct)}</td>{lf.map((f) => <td key={f.id}></td>)}</tr>
        </tbody></table></div>
      </section>
      <section className="panel"><h3>Department recap</h3>
        <div className="scroll"><table><thead><tr><th>Sr</th><th>Department</th><th className="n">PSF on initial</th><th className="n">PSF on CTC</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (d)</th><th className="n">Variance (a − b)</th></tr></thead><tbody>
          {g.departments.map((d) => <tr key={d.department_id}><td>{d.sr}</td><td>{d.department}</td><Cells x={d.totals} /></tr>)}
          <tr className="total"><td></td><td>Total</td><Cells x={t} /></tr>
        </tbody></table></div>
      </section>
    </>
  );
}

type CellFigures = { psf_initial: number | null; psf_ctc: number | null; initial_cr: number; ctc_cr: number; incurred_cr: number; balance_cr: number; variance_cr: number };
function DeptRows({ d, tower, Cells, fields, cells }: {
  d: ReturnType<typeof groupDetail>["departments"][number]; tower?: string; Cells: React.ComponentType<{ x: CellFigures }>; fields: D.CustomField[]; cells: Map<number, Cells>;
}) {
  const extra = (id: number) => fields.map((f) => { const x = cells.get(id)?.[f.key]; return <td key={f.id} className={isNum(f) ? "n" : ""}>{x?.error ? <span className="chip bad" title={x.error}>Error</span> : x?.text}</td>; });
  return (
    <>
      <tr className="group"><td>{d.sr}</td><td>{d.department}</td><td></td><td></td><Cells x={d.totals} /><td></td><td className="n">{fmtPct(d.totals.util_pct)}</td>{fields.map((f) => <td key={f.id}></td>)}</tr>
      {d.categories.flatMap((cat) => cat.lines.filter((f) => towerMatch(f, tower)).map((f) => (
        <tr key={f.line_id}><td></td><td></td><td>{f.category}{f.subproject && <span className="chip">{f.subproject}</span>}</td><td>{f.sub_category || (f.note ? `* ${f.note}` : "")}</td>
          <Cells x={f} /><td>{f.remark}</td><td className="n">{fmtPct(f.util_pct)}</td>{extra(f.line_id)}</tr>
      )))}
    </>
  );
}

// ---------- compare ----------
export async function Compare(c: Ctx) {
  const { sb, project, versions, search } = c;
  if (versions.length < 2) {
    return <section className="panel"><h2>Compare versions</h2><p>There is only one version so far. Open the next version from the Overview, or import a revised workbook, then compare it here.</p></section>;
  }
  const A = versions.find((x) => String(x.number) === search.from) ?? versions[versions.length - 2];
  const B = versions.find((x) => String(x.number) === search.to) ?? versions[versions.length - 1];
  const [rows, cats] = await Promise.all([D.getCompare(sb, A.id, B.id), D.getCategoryTotals(sb, [A.id, B.id])]);
  const only = search.all !== "1";
  const shown = only ? rows.filter((r) => r.change !== "same") : rows;
  const opts = versions.map((x): [string, string] => [String(x.number), `R${x.number} · ${dmy(x.as_on)}`]);
  const catNames = [...new Set(cats.map((x) => x.category))];
  const cat = (vid: number, name: string) => Number(cats.find((x) => x.version_id === vid && x.category === name)?.budget_cr ?? 0);
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>Compare versions · {project.name}</h2>
          <div className="row"><F.QuerySelect name="from" label="From" value={String(A.number)} options={opts} /><F.QuerySelect name="to" label="To" value={String(B.number)} options={opts} />
            <F.QuerySelect name="all" label="Show" value={only ? "" : "1"} options={[["", "Changed lines only"], ["1", "All lines"]]} /></div></div>
        <p className="sub">{rows.filter((r) => r.change !== "same").length} line(s) differ between R{A.number} and R{B.number}. Amounts in crores.</p>
        <div className="scroll"><table><thead><tr><th>Department</th><th>Cost head</th><th className="n">Initial R{A.number}</th><th className="n">Initial R{B.number}</th><th className="n">CTC R{A.number}</th><th className="n">CTC R{B.number}</th><th className="n">Change</th><th className="n">%</th><th>Remark</th></tr></thead><tbody>
          {shown.map((r, i) => <tr key={i}><td>{r.department}</td><td>{r.sub_category || r.category}{r.subproject && <span className="chip">{r.subproject}</span>}{(r.change === "added" || r.change === "removed") && <span className="chip warn">{r.change}</span>}</td>
            <td className="n">{fmt(r.from_initial_cr)}</td><td className="n">{fmt(r.to_initial_cr)}</td><td className="n">{fmt(r.from_ctc_cr)}</td><td className="n">{fmt(r.to_ctc_cr)}</td>
            <td className="n"><Neg v={r.ctc_change_cr} /></td><td className="n">{fmtPct(r.ctc_change_pct)}</td><td>{r.to_remark}</td></tr>)}
          {shown.length === 0 && <tr><td colSpan={9}>No differences.</td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel"><h3>Category totals (Estimated CTC)</h3>
        <div className="scroll"><table><thead><tr><th>Category</th><th className="n">R{A.number}</th><th className="n">R{B.number}</th><th className="n">Change</th><th>Reason</th></tr></thead><tbody>
          {catNames.map((n) => <tr key={n}><td>{n}</td><td className="n">{fmt(cat(A.id, n))}</td><td className="n">{fmt(cat(B.id, n))}</td><td className="n"><Neg v={cat(B.id, n) - cat(A.id, n)} /></td><td>{B.category_reasons?.[n]}</td></tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}

// ---------- cost incurred ----------
export async function Incurred(c: Ctx) {
  const { sb, me, project, version: v, search } = c;
  const [heads, depts, towers, entries] = await Promise.all([D.getHeads(sb, project.id), D.getDepartments(sb), D.getTowers(sb, project.id), D.getEntries(sb, project.id)]);
  const dept = new Map(depts.map((d) => [d.id, d]));
  const head = new Map(heads.map((h) => [h.id, h]));
  const tower = new Map(towers.map((t) => [t.id, t.name]));
  const allowed = heads.filter((h) => !h.is_tax && D.can(me, "cost.enter", project.id, h.department_id))
    .sort((a, b) => dept.get(a.department_id)!.sort - dept.get(b.department_id)!.sort || a.sort - b.sort);
  const shown = entries.filter((e) => !search.dept || dept.get(head.get(e.cost_head_id)!.department_id)?.name === search.dept);
  const total = shown.reduce((s, e) => s + Number(e.amount_paise), 0);
  const cf = await loadCustom(sb, "cost_entry", project.id, new Map(shown.map((e) => [e.id, { amount: rupeesFromPaise(e.amount_paise), month: day(e.month) }])), await lookupNames(sb, project.id, c.names));
  const listed = cf.fields.filter((f) => f.show_in_reports);
  const picks = await picksFor(sb, project.id, c.names);
  return (
    <>
      {allowed.length ? <section className="panel"><div className="panel-head"><h2>Record cost incurred</h2><span className="sub">Type one entry here, or import a cost incurred sheet on Import from Excel</span></div>
        <F.EntryForm projectId={project.id} heads={allowed.map((h) => ({ id: h.id, label: `${dept.get(h.department_id)!.name} · ${h.sub_category || h.category}` }))} towers={towers}
          month={(v?.as_on ?? new Date().toISOString()).slice(0, 7)} customFields={cf.fields.filter((f) => f.show_in_entry)} picks={picks} />
        <p className="note">Amounts are entered in rupees and shown in crores in the budget.{v && ` A version counts every entry up to its as-on month (R${v.number}: up to ${monthName(v.as_on)}).`}</p></section>
        : <Notice>{!D.can(me, "cost.enter", project.id) ? "You can read every entry; departments record their own costs." : "No cost heads you can record against."}</Notice>}
      <section className="panel"><div className="panel-head"><h2>Entries · {project.name}</h2>
        <div className="row"><F.QuerySelect name="dept" label="" value={search.dept ?? ""} options={[["", "All departments"], ...depts.map((d): [string, string] => [d.name, d.name])]} /></div></div>
        <p className="sub">{shown.length} entries · {fmt(toCr(total))} crores. Imported entries carry the file or Excel formula they came from.</p>
        <div className="scroll"><table><thead><tr><th>Month</th><th>Department</th><th>Cost head</th><th>Tower</th><th className="n">Amount (₹)</th><th>Reference</th>{listed.map((f) => <th key={f.id} className={isNum(f) ? "n" : ""} title={fieldTitle(f)}>{f.label}</th>)}<th>Source</th><th>Entered by</th><th></th></tr></thead><tbody>
          {shown.map((e) => { const h = head.get(e.cost_head_id)!; return <tr key={e.id}><td>{monthName(e.month)}</td><td>{dept.get(h.department_id)?.name}</td><td>{h.sub_category || h.category}</td><td>{e.subproject_id ? tower.get(e.subproject_id) : ""}</td>
            <td className="n"><span className={e.amount_paise < 0 ? "neg" : ""}>{fmtRupees(e.amount_paise)}</span></td><td><div className="trunc" title={e.reference ?? ""}>{e.reference}</div></td>
            {listed.map((f) => <td key={f.id} className={isNum(f) ? "n" : ""}><CustomInput field={f} entity="cost_entry" entityId={e.id} cell={cf.cells.get(e.id)?.[f.key]} editable={D.can(me, "cost.enter", project.id, h.department_id)} picks={picks} compact /></td>)}
            <td>{e.source === "excel" ? <span className="chip xl">Excel</span> : <span className="chip typed">Typed</span>}</td><td>{(e.entered_by && c.names[e.entered_by]) || ""}</td>
            <td>{D.can(me, "cost.enter", project.id, h.department_id) && <F.DeleteEntry id={e.id} />}</td></tr>; })}
        </tbody></table></div>
      </section>
    </>
  );
}

// ---------- periods ----------
export async function Periods(c: Ctx) {
  const grain = ["month", "quarter", "year"].includes(c.search.grain ?? "") ? c.search.grain! : "quarter";
  const rows = await D.getIncurredByPeriod(c.sb, c.project.id, grain);
  const periods = [...new Map(rows.map((r) => [r.period, r.period_start])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map((x) => x[0]);
  const cats = [...new Set(rows.map((r) => r.category))];
  const cell = (cat: string | null, p: string | null) => rows.filter((r) => (cat == null || r.category === cat) && (p == null || r.period === p)).reduce((s, r) => s + Number(r.amount_cr), 0);
  return (
    <section className="panel"><div className="panel-head"><h2>Cost incurred by period · {c.project.name}</h2>
      <div className="row"><F.QuerySelect name="grain" label="View by" value={grain} options={[["month", "Month"], ["quarter", "Quarter"], ["year", "Financial year"]]} /></div></div>
      <p className="sub">Financial year April to March (Q1 = Apr–Jun). Crores. Typed and imported entries count the same way.</p>
      <div className="scroll"><table><thead><tr><th>Category</th>{periods.map((p) => <th key={p} className="n">{p}</th>)}<th className="n">Total</th></tr></thead><tbody>
        {cats.map((cat) => <tr key={cat}><td>{cat}</td>{periods.map((p) => <td key={p} className="n">{fmt(cell(cat, p))}</td>)}<td className="n">{fmt(cell(cat, null))}</td></tr>)}
        <tr className="total"><td>Total</td>{periods.map((p) => <td key={p} className="n">{fmt(cell(null, p))}</td>)}<td className="n">{fmt(cell(null, null))}</td></tr>
      </tbody></table></div>
    </section>
  );
}

// ---------- set-up ----------
export async function Setup(c: Ctx) {
  const { sb, me, project, version: v, projects } = c;
  const can = D.can(me, "project.setup", project.id);
  const [towers, heads, depts, template, areas, allHeads] = await Promise.all([
    D.getTowers(sb, project.id), D.getHeads(sb, project.id), D.getDepartments(sb), getTemplate(sb), v ? D.getVersionAreas(sb, v.id) : Promise.resolve(null),
    sb.from("budget_cost_heads").select("project_id").then((r) => (r.data ?? []) as { project_id: number }[]),
  ]);
  const dept = new Map(depts.map((d) => [d.id, d]));
  const options: Record<string, string[]> = {};
  for (const t of template) (options[t.category] ??= []).push(t.subcategory);
  const sorted = heads.slice().sort((a, b) => dept.get(a.department_id)!.sort - dept.get(b.department_id)!.sort || a.sort - b.sort);
  const plain = sorted.filter((h) => !h.is_tax);
  const groups = new Map<string, number[]>();
  for (const h of plain) {
    const k = `${h.department_id}|${h.category}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(h.id);
  }
  const baseOptions = [
    ...[...groups].map(([k, ids]) => { const [d, cat] = k.split("|"); return { value: `cat:${k}`, label: `All of ${dept.get(Number(d))!.name} · ${cat}`, ids }; }),
    ...plain.map((h) => ({ value: `head:${h.id}`, label: `${dept.get(h.department_id)!.name} · ${h.sub_category || h.category}`, ids: [h.id] })),
  ];
  const headCount = (pid: number) => allHeads.filter((h) => h.project_id === pid).length;
  const tc = await loadCustom(sb, "tower", project.id, new Map(towers.map((t) => [t.id, { carpet_area: cr(t.carpet_area), eng_area: cr(t.eng_area), oc_date: day(t.oc_date) }])), await lookupNames(sb, project.id, c.names));
  const tf = tc.fields.filter((f) => f.show_in_entry);
  const picks = await picksFor(sb, project.id, c.names);
  const editAreas = !!v && v.status === "draft" && can;
  return (
    <>
      <section className="panel"><div className="panel-head"><h2>Towers · {project.name}</h2><span className="sub">{can ? "Typed only: name each tower and set its building type; the Summary groups construction by type." : "Read only for you."}</span></div>
        <div className="scroll"><table><thead><tr><th>Tower</th><th>Building type</th><th className="n">Carpet area (sft)</th><th className="n">Engg. construction area (sft)</th><th>OC date</th>{tf.map((f) => <th key={f.id} title={fieldTitle(f)}>{f.label}{f.required && " *"}</th>)}</tr></thead><tbody>
          {towers.map((t) => <F.TowerRow key={`${t.id}-${t.name}-${t.type}-${t.carpet_area}-${t.eng_area}-${t.oc_date}`} t={t} editable={can} customFields={tf} cells={tc.cells.get(t.id)} picks={picks} />)}
          {towers.length === 0 && <tr><td colSpan={5 + tf.length}>No towers yet.</td></tr>}
        </tbody></table></div>
        {can && <F.AddTowerButton projectId={project.id} />}
      </section>
      {v && <section className="panel"><div className="panel-head"><h2>Areas for R{v.number}</h2><span className="sub">{editAreas ? "Typed here or imported from the workbook header; saved with this draft" : "Areas are kept per version; edit them on a draft version"}</span></div>
        <F.AreasForm versionId={v.id} areas={v.areas as Record<string, unknown>} editable={editAreas} net={areas?.net_sale_carpet ?? null} />
      </section>}
      <section className="panel"><div className="panel-head"><h2>Cost heads · {project.name}</h2><span className="sub">{heads.length} heads; one list, so names never drift between files</span></div>
        {can && <F.AddHeadForm projectId={project.id} departments={depts} baseOptions={baseOptions} summaryOptions={options} />}
        <div className="scroll"><table><thead><tr><th>Department</th><th>Category</th><th>Sub-category</th><th>Summary row</th><th>GST rule</th></tr></thead><tbody>
          {sorted.map((h) => {
            const d = dept.get(h.department_id)!;
            const byTower = d.summary_category === "Construction" && !h.is_tax;
            return <tr key={h.id}><td>{d.name}</td><td>{h.category}</td><td>{h.sub_category}</td>
              <td>{byTower ? "By tower building type" : can ? <F.HeadSummarySelect headId={h.id} value={h.summary_subcategory} options={options[d.summary_category] ?? []} /> : h.summary_subcategory}</td>
              <td>{h.is_tax && (can ? <F.TaxRuleInputs key={`${h.tax_rate_pct}-${h.tax_share_pct}`} headId={h.id} rate={Number(h.tax_rate_pct)} share={Number(h.tax_share_pct ?? 100)} baseCount={h.tax_base.length} />
                : `GST ${Number(h.tax_rate_pct)}% × ${Number(h.tax_share_pct ?? 100)}% of ${h.tax_base.length} head(s)`)}</td></tr>;
          })}
        </tbody></table></div>
      </section>
      {D.can(me, "project.create") && <section className="panel"><div className="panel-head"><h2>New project</h2><span className="sub">Typed set-up; or import a workbook and choose &quot;New project&quot;</span></div>
        <F.NewProjectForm projects={projects.map((p) => ({ id: p.id, name: p.name, heads: headCount(p.id) }))} />
      </section>}
    </>
  );
}
