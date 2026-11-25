import Link from "next/link";
import * as D from "@/lib/budget/data";
import type { Db, Me, Project, Version } from "@/lib/budget/data";
import { RATE_BASES, dmy, fmt, fmtArea, fmtPct, fmtRupees, formatBudgetPeriod, versionTitle, versionSubtitle, isNeg, monthName, nextQuarterEnd, toCr } from "@/lib/budget/format";
import { type Cells, cr, day, loadCustom, loadVersionCustom, lookupNames, rupeesFromPaise } from "@/lib/budget/custom";
import { groupDetail } from "@/lib/budget/group";
import { fieldTitle } from "@/lib/budget/fields";
import { CustomFieldsForm, CustomInput, type Picks } from "./custom-fields";
import * as F from "./forms";
import { ImportPanel } from "./import-panel";
import { DeleteLineButton, RecordList } from "./record-list";
import { type FormLine, LineByLineForm, LinesGrid } from "./manual";
import { MasterNav, Notice, VersionBanner } from "./shell";
import { getAlerts, latestNote, type Alert } from "@/lib/budget/insights";

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
/** Excel download of a report in the company's own format (needs the Export reports right). */
function Download({ c, kind }: { c: Ctx & { version: Version }; kind: "summary" | "detail" | "workings" }) {
  if (!D.can(c.me, "report.export", c.project.id)) return null;
  return <a className="btn" href={`/budget/${c.project.id}/export/${kind}?v=${c.version.number}`} download>Download Excel</a>;
}
/** The version still open (draft or under sign-off), if any. */
const draftOf = (versions: Version[]) => versions.find((v) => v.status !== "approved") ?? null;
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
  const [totals, depts, imports, towers, towerWorkings] = await Promise.all([
    D.getTotals(sb, project.id),
    D.getDepartmentTotals(sb, v.id),
    D.getImports(sb, project.id),
    D.getTowers(sb, project.id),
    D.getTowerWorkings(sb, v.id).catch(() => []),
  ]);
  const lookup = await lookupNames(sb, project.id, names);
  const pc = await loadCustom(sb, "project", project.id, new Map([[project.id, { towers: cr(towers.length) }]]), lookup);
  const t = totals.find((x) => x.version_id === v.id)!;
  const psf = v.areas.eng_area ? (t.ctc_cr * 1e7) / Number(v.areas.eng_area) : null;
  const draft = draftOf(versions);
  const approved = lastApproved(versions);
  const lastImport = imports.find((i) => i.kind === "detail");
  const kpi = (label: string, value: React.ReactNode, small?: string) => <div className="kpi"><span>{label}</span><b>{value}</b>{small && <small>{small}</small>}</div>;

  // Version progression timeline (R1 -> R2 -> ...)
  const versionEvolution = versions.map((ver, idx) => {
    const vt = totals.find((tot) => tot.version_id === ver.id);
    const prevVer = idx > 0 ? versions[idx - 1] : null;
    const prevVt = prevVer ? totals.find((tot) => tot.version_id === prevVer.id) : null;
    const diffCr = vt && prevVt ? vt.ctc_cr - prevVt.ctc_cr : null;
    return {
      version: ver,
      totals: vt,
      diffCr,
      isCurrent: ver.id === v.id,
    };
  });

  // Tower allocation breakdown (if any tower workings exist)
  const towerById = new Map(towers.map((t) => [t.id, t]));
  const towerMap = new Map<number, { name: string; type: string | null; ctc_paise: number; incurred_paise: number }>();
  for (const tw of towerWorkings) {
    const tInfo = towerById.get(tw.tower_id);
    const name = tInfo?.name ?? `Tower ${tw.tower_id}`;
    const type = tInfo?.type ?? null;
    const existing = towerMap.get(tw.tower_id) ?? { name, type, ctc_paise: 0, incurred_paise: 0 };
    existing.ctc_paise += Number(tw.ctc_paise || 0);
    existing.incurred_paise += Number(tw.incurred_paise || 0);
    towerMap.set(tw.tower_id, existing);
  }
  const towerList = Array.from(towerMap.values()).map((t) => ({
    name: t.name,
    type: t.type,
    ctc_cr: t.ctc_paise / 1e9,
    incurred_cr: t.incurred_paise / 1e9,
  }));

  // Top departments by CTC
  const sortedDepts = [...depts].sort((a, b) => b.ctc_cr - a.ctc_cr);
  const topDepts = sortedDepts.slice(0, 4);

  return (
    <>
      <F.StageProcessBar projectId={project.id} activeTab="overview" versionNumber={v.number} />
      <VersionBanner sb={sb} me={me} project={project} version={v} names={names} />
      <NextStep c={c} draft={draft} />

      {/* Budget Period & Financial Context Ribbon */}
      {(() => {
        const period = formatBudgetPeriod(v.as_on, project.fy_start_month);
        const vTitle = versionTitle(v.number);
        const canEdit = D.canChangeDraft(me, v);
        return (
          <div className="portfolio-strip" style={{ marginBottom: 12 }}>
            <span className="portfolio-metric-tag">
              Budget: <strong>{vTitle}</strong>
            </span>
            <span className="portfolio-metric-tag">
              Financial Year: <strong>{period.fy}</strong>
            </span>
            <span className="portfolio-metric-tag">
              Period / Quarter: <strong>{period.quarter} ({period.range})</strong>
            </span>
            <span className="portfolio-metric-tag">
              As On Cutoff: <strong>{period.asOnFormatted}</strong>
            </span>
            {canEdit && (
              <F.EditBudgetDetailsModal
                version={v}
                project={project}
                trigger={<button type="button" className="btn-action text-xs py-0.5">Edit Details</button>}
              />
            )}
            <Link
              href={`/budget/${project.id}/budgets`}
              className="text-primary hover:underline text-xs font-semibold ml-auto"
            >
              All Budgets Registry →
            </Link>
          </div>
        );
      })()}

      {/* Project Financial & Physical Metrics Strip */}
      <div className="sub-kpis-strip">
        <div className="sub-kpi-item">
          <span>Engg Construction Area</span>
          <b>{v.areas.eng_area ? `${fmtArea(v.areas.eng_area)} sft` : "—"}</b>
        </div>
        <div className="sub-kpi-item">
          <span>Net Sale Carpet</span>
          <b>{v.areas.total_carpet ? `${fmtArea(v.areas.total_carpet)} sft` : "—"}</b>
        </div>
        <div className="sub-kpi-item">
          <span>Construction Rate</span>
          <b>{psf != null ? `₹${fmt(psf)} / sft` : "—"}</b>
        </div>
        <div className="sub-kpi-item">
          <span>Projected Sale Value</span>
          <b>{v.areas.sale_value_cr != null ? `₹${fmt(v.areas.sale_value_cr)} Cr` : "—"}</b>
        </div>
        <div className="sub-kpi-item">
          <span>Towers / Sub-projects</span>
          <b>{towers.length > 0 ? `${towers.length} tower${towers.length === 1 ? "" : "s"}` : "None split"}</b>
        </div>
      </div>

      <div className="kpis">
        {kpi("Initial Budget (a)", fmt(t.initial_cr), "Crores")}
        {kpi("Estimated CTC (b)", fmt(t.ctc_cr), psf == null ? undefined : `PSF ₹${fmt(psf)}`)}
        {kpi("Cost Incurred (c)", fmt(t.incurred_cr), `till ${dmy(v.as_on)}`)}
        {kpi("Balance CTC (b − c)", fmt(t.balance_cr), "Crores")}
        {kpi("Variance (a − b)", <Neg v={t.variance_cr} />, t.variance_cr < 0 ? "CTC is above the initial budget" : "Within the initial budget")}
        {kpi("Budget utilised", fmtPct(t.util_pct), "Cost incurred ÷ CTC")}
      </div>

      {/* Version Progression & CTC Evolution */}
      {versionEvolution.length > 1 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Version progression & CTC evolution</h2>
            <span className="sub">Revision history from baseline R1 to R{Math.max(...versions.map((x) => x.number))}</span>
          </div>
          <div className="version-flow">
            {versionEvolution.map(({ version: ver, totals: vt, diffCr, isCurrent }) => (
              <Link
                key={ver.id}
                href={`/budget/${project.id}/overview?v=${ver.number}`}
                className={`version-node ${isCurrent ? "active" : ""}`}
                title={`Revision R${ver.number} as on ${dmy(ver.as_on)}`}
              >
                <div className="version-node-head">
                  <strong>R{ver.number}</strong>
                  <span className={`pill ${ver.status}`}>{ver.status}</span>
                </div>
                <span className="version-node-date">{dmy(ver.as_on)}</span>
                <span className="version-node-ctc">{vt ? `₹${fmt(vt.ctc_cr)} Cr` : "—"}</span>
                {diffCr != null && diffCr !== 0 && (
                  <span className={`version-node-diff ${diffCr > 0 ? "neg" : ""}`}>
                    {diffCr > 0 ? `+${fmt(diffCr)} Cr` : `${fmt(diffCr)} Cr`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tower Allocation Breakdown (when towers exist) */}
      {towerList.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Tower-wise budget allocation</h2>
            <span className="sub">Construction cost split across towers · R{v.number}</span>
          </div>
          <div className="tower-alloc-grid">
            {towerList.map((tw) => {
              const util = tw.ctc_cr > 0 ? (tw.incurred_cr / tw.ctc_cr) * 100 : 0;
              const pctOfProject = t.ctc_cr > 0 ? (tw.ctc_cr / t.ctc_cr) * 100 : 0;
              return (
                <div key={tw.name} className="tower-alloc-card">
                  <div className="tower-alloc-head">
                    <strong>{tw.name}</strong>
                    {tw.type && <span className="chip typed">{tw.type}</span>}
                  </div>
                  <div className="tower-alloc-amounts">
                    <span>CTC: <b>₹{fmt(tw.ctc_cr)} Cr</b> ({fmtPct(pctOfProject)})</span>
                    <span>Incurred: <b>₹{fmt(tw.incurred_cr)} Cr</b></span>
                  </div>
                  <div className="progress-bar-lg" style={{ marginTop: 4 }}>
                    <i
                      className={util > 100 ? "over" : util >= 90 ? "near" : ""}
                      style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
                    />
                  </div>
                  <div className="tower-alloc-amounts" style={{ marginTop: 2, fontSize: 11 }}>
                    <span>Utilised: {fmtPct(util)}</span>
                    <span>Bal: ₹{fmt(tw.ctc_cr - tw.incurred_cr)} Cr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Department Cost Centers & Breakdown Table */}
      <section className="panel">
        <div className="panel-head">
          <h2>Departments</h2>
          <span className="sub">All amounts in crores · R{v.number}</span>
        </div>
        {topDepts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
            {topDepts.map((d) => {
              const share = t.ctc_cr > 0 ? (d.ctc_cr / t.ctc_cr) * 100 : 0;
              return (
                <div key={d.department_id} style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <strong>{d.department}</strong>
                    <span style={{ color: "var(--muted)" }}>{fmtPct(share)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
                    <span>CTC: ₹{fmt(d.ctc_cr)} Cr</span>
                    <span>Inc: ₹{fmt(d.incurred_cr)} Cr</span>
                  </div>
                  <div className="progress-bar-lg" style={{ height: 5, marginTop: 2 }}>
                    <i className={(d.util_pct ?? 0) > 100 ? "over" : (d.util_pct ?? 0) >= 90 ? "near" : ""} style={{ width: `${Math.min(100, Math.max(0, d.util_pct ?? 0))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Department</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (b−c)</th><th className="n">Variance (a−b)</th><th className="n">Utilised</th></tr></thead>
          <tbody>{depts.map((d, i) => <tr key={d.department_id}><td>{i + 1}</td><td>{d.department}</td><td className="n">{fmt(d.initial_cr)}</td><td className="n">{fmt(d.ctc_cr)}</td><td className="n">{fmt(d.incurred_cr)}</td><td className="n"><Neg v={d.balance_cr} /></td><td className="n"><Neg v={d.variance_cr} /></td><td className="n"><Bar v={d.util_pct} /></td></tr>)}
            <tr className="total"><td></td><td>Total</td><td className="n">{fmt(t.initial_cr)}</td><td className="n">{fmt(t.ctc_cr)}</td><td className="n">{fmt(t.incurred_cr)}</td><td className="n"><Neg v={t.balance_cr} /></td><td className="n"><Neg v={t.variance_cr} /></td><td className="n"><Bar v={t.util_pct} /></td></tr></tbody></table></div>
      </section>
      <Insights c={c} />
      <SignoffPanel c={c} />
      <div className="grid2">
        <section className="panel"><div className="panel-head"><h2>Budget versions</h2><span className="sub">Each revision is kept; nothing is overwritten</span></div>
          <div className="scroll"><table><thead><tr><th>Version</th><th>As on</th><th>Status</th><th className="n">CTC (Cr)</th><th className="n">Change</th><th>Prepared by</th><th className="label-sm">Reason</th><th className="actions-col">Actions</th></tr></thead><tbody>
            {versions.slice().reverse().map((x) => {
              const xt = totals.find((y) => y.version_id === x.id)!;
              const pt = totals.find((y) => y.version_id === x.parent_id);
              return <tr key={x.id}><td><Link href={`/budget/${project.id}/overview?v=${x.number}`}>R{x.number}</Link></td><td>{dmy(x.as_on)}</td><td><span className={`pill ${x.status}`}>{x.status}</span></td>
                <td className="n">{fmt(xt.ctc_cr)}</td><td className="n">{pt && <Neg v={xt.ctc_cr - pt.ctc_cr} />}</td><td>{(x.prepared_by && names[x.prepared_by]) || ""}</td><td>{x.reason}</td>
                <td className="actions">
                  <div className="actions-group">
                    <Link className="btn-action" href={`/budget/${project.id}/view?v=${x.number}`} title="Open this budget">Open</Link>
                    <Link className="btn-action primary" href={`/budget/${project.id}/entry?v=${x.number}`} title="Open the budget sheet of this version">Budget sheet</Link>
                  </div>
                </td></tr>;
            })}
          </tbody></table></div>
          {D.can(me, "version.open", project.id) && !draft && approved ? <>
            <div className="row"><Link className="btn-action primary" href={`/budget/${project.id}/create`}>Create budget R{Math.max(...versions.map((x) => x.number)) + 1}</Link></div>
            <p className="note">Opens the next version as a draft under Prepare budget. Two ways to fill it: departments type their changes on the Budget sheet, or upload the revised workbook on Import Excel. Both land in the same draft.</p></>
            : <p className="note">{draft ? (draft.status === "in_review" ? `R${draft.number} is under sign-off. It is approved or sent back before another version is opened.` : `Draft R${draft.number} is open. Approve or delete it before opening another.`) : "Only the budget preparer or an administrator opens new versions."}</p>}
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
    </>
  );
}

/** Overview: one card that says where this version stands and what the person should do next. */
function NextStep({ c, draft }: { c: Ctx & { version: Version }; draft: Version | null }) {
  const { me, project, version: v, versions } = c;
  const pid = project.id;
  const canPrepare = D.can(me, "budget.edit", pid) || D.can(me, "version.open", pid);
  const canImport = D.can(me, "budget.import", pid);
  const next = Math.max(...versions.map((x) => x.number)) + 1;
  let title: string, text: string;
  const actions: { href: string; label: string; primary?: boolean }[] = [];
  if (v.status === "draft") {
    title = `R${v.number} is a draft: prepare the figures`;
    text = "Type the figures line by line or in the sheet (or import them), add any new lines, then send it for sign-off from the banner above.";
    if (D.canChangeDraft(me, v)) actions.push({ href: `/budget/${pid}/edit?v=${v.number}`, label: "Edit budget", primary: true });
    if (canPrepare) actions.push({ href: `/budget/${pid}/entry?v=${v.number}&mode=form`, label: "Enter line by line" });
    if (canPrepare) actions.push({ href: `/budget/${pid}/entry?v=${v.number}`, label: "Open budget sheet" });
    if (D.can(me, "project.setup", pid)) actions.push({ href: `/budget/${pid}/start?v=${v.number}`, label: "Get started checklist" });
    if (canImport) actions.push({ href: `/budget/${pid}/import?v=${v.number}`, label: "Import Excel" });
  } else if (v.status === "in_review") {
    title = `R${v.number} is under sign-off`;
    text = "The figures are locked while it is being signed. Sign it or send it back from the banner above; progress is shown under Sign-off below.";
    actions.push({ href: `/budget/${pid}/detail?v=${v.number}`, label: "Read the detail report", primary: true });
  } else if (draft && draft.number !== v.number) {
    title = `R${v.number} is approved; R${draft.number} is ${draft.status === "draft" ? "being prepared" : "under sign-off"}`;
    text = draft.status === "draft" ? "Changes are made in the newer draft." : "The newer version is waiting for signatures.";
    actions.push({ href: `/budget/${pid}/${draft.status === "draft" && canPrepare ? "entry" : "overview"}?v=${draft.number}`, label: `Go to R${draft.number}`, primary: true });
  } else {
    title = `R${v.number} is approved and locked`;
    text = D.can(me, "version.open", pid) ? `To revise the budget, start R${next}: it opens as an editable draft.` : "Read the reports, or record cost incurred under Actuals.";
    if (D.can(me, "version.open", pid)) actions.push({ href: `/budget/${pid}/create`, label: `Create budget R${next}`, primary: true });
    actions.push({ href: `/budget/${pid}/summary?v=${v.number}`, label: "Summary report", primary: !D.can(me, "version.open", pid) });
  }
  return (
    <section className="panel next-step" aria-label="What to do next">
      <div><h2>{title}</h2><p>{text}</p></div>
      {actions.length > 0 && <div className="actions-group">
        {actions.map((a) => <Link key={a.href} href={a.href} className={`btn-action${a.primary ? " primary" : ""}`}>{a.label}</Link>)}
      </div>}
    </section>
  );
}

// ---------- sign-off ----------
/** Versions waiting for the signed-in member's signature, in any project. */
export async function MySignoffs({ sb }: { sb: Db }) {
  const mine = await D.getMySignoffs(sb);
  if (!mine.length) return null;
  return (
    <Notice kind="draft">Waiting for your signature:{" "}
      {mine.map((m, i) => <span key={m.version_id}>{i > 0 && ", "}<Link href={`/budget/${m.project_id}/detail?v=${m.number}`}>{m.project} R{m.number}</Link> as {m.level}</span>)}.
      Open the version to read it; sign or send it back from the banner.</Notice>
  );
}

const ACTION_LABEL = { submitted: "Submitted", signed: "Signed", returned: "Sent back", recalled: "Taken back" } as const;
async function SignoffPanel({ c }: { c: Ctx & { version: Version } }) {
  const { sb, project, version: v, names } = c;
  const [levels, steps, log] = await Promise.all([D.getSignoffLevels(sb), D.getSignoffStatus(sb, v.id), D.getSignoffLog(sb, v.id)]);
  const chain = D.chainOf(levels, project.id);
  if (!chain.length && !log.length) return null;
  const who = (id: string | null) => (id && names[id]) || "Member";
  return (
    <div className="grid2">
      <section className="panel"><div className="panel-head"><h2>Sign-off · R{v.number}</h2><span className="sub">Each level signs in order; the last signature approves the version</span></div>
        <div className="scroll"><table><thead><tr><th>Level</th><th className="label-sm">Approvers</th><th>Signed</th></tr></thead><tbody>
          {steps.map((s) => <tr key={s.level_id}><td>{s.title}</td><td>{s.approver_ids.map(who).join(", ")}</td>
            <td>{s.signed_by ? `${who(s.signed_by)}, ${dmy(s.signed_at!)}` : s.is_next ? <span className="chip warn">waiting</span> : v.status === "approved" ? "" : "Not yet"}</td></tr>)}
        </tbody></table></div>
      </section>
      <section className="panel"><div className="panel-head"><h2>Sign-off history</h2></div>
        {log.length ? <div className="scroll"><table><thead><tr><th>Date</th><th className="label-sm">What</th><th>Level</th><th>By</th><th className="label-sm">Comment</th></tr></thead><tbody>
          {log.map((e) => <tr key={e.id}><td>{dmy(e.at)}</td><td>{ACTION_LABEL[e.action]}</td><td>{e.level_title}</td><td>{who(e.user_id)}</td><td>{e.comment}</td></tr>)}
        </tbody></table></div> : <p className="sub">Not submitted yet.</p>}
      </section>
    </div>
  );
}

async function SignoffSetup({ c }: { c: Ctx }) {
  const { sb, me, project, names } = c;
  const levels = await D.getSignoffLevels(sb);
  const own = levels.filter((l) => l.project_id === project.id), all = levels.filter((l) => l.project_id == null);
  const members = Object.entries(names).sort((a, b) => a[1].localeCompare(b[1]));
  return (
    <section className="panel"><div className="panel-head"><h2>Sign-off chain</h2>
      <span className="sub">{own.length ? `${project.name} uses its own levels below.` : all.length ? `${project.name} uses the levels for every project.` : "No levels: the preparer approves a version directly."}</span></div>
      <h3>Levels for {project.name}</h3>
      <p className="note">When a project has its own levels they replace the levels for every project. Order decides who signs first.</p>
      <F.SignoffLevelsEditor projectId={project.id} levels={own} members={members} editable={D.can(me, "project.setup", project.id)} />
      <h3>Levels for every project</h3>
      <F.SignoffLevelsEditor projectId={null} levels={all} members={members} editable={D.can(me, "access.manage")} />
    </section>
  );
}

// ---------- AI summary and alerts ----------
const ALERT_LABEL: Record<Alert["level"], [string, string]> = {
  over: ["Over CTC", "bad"], run_out: ["May run out", "bad"], near: ["Near limit", "warn"], above_initial: ["Above initial", "warn"],
};
function AlertTable({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="scroll"><table><thead><tr><th className="label">Alert</th><th className="label">Department</th><th className="label">Line</th><th className="label-sm">Why</th></tr></thead><tbody>
      {alerts.map((a, i) => <tr key={i}><td><span className={`chip ${ALERT_LABEL[a.level][1]}`}>{ALERT_LABEL[a.level][0]}</span></td><td>{a.department}</td><td>{a.line}</td><td>{a.message}</td></tr>)}
    </tbody></table></div>
  );
}
async function Insights({ c }: { c: Ctx & { version: Version } }) {
  const { sb, me, project, version: v, names } = c;
  const [alerts, note] = await Promise.all([getAlerts(sb, project, v), latestNote(sb, v.id)]);
  const canWrite = D.can(me, "report.export", project.id) && !D.limitedToDepartments(me);
  const shown = alerts.slice(0, 12);
  return (
    <div className="grid2">
      <section className="panel"><div className="panel-head"><h2>Budget summary</h2><span className="sub">Written from this version&apos;s own figures</span></div>
        {note ? <><p className="ai-note">{note.body}</p>
          <p className="note">{note.provider === "rules" ? "Written by rule" : "Written by AI"} on {dmy(note.created_at)}{note.created_by && names[note.created_by] ? ` for ${names[note.created_by]}` : ""}. Every figure in it is checked against R{v.number}; it also goes into the Summary Excel under &quot;Note:-&quot;.</p></>
          : <p className="sub">No summary yet for R{v.number}.</p>}
        {canWrite ? <F.WriteSummaryButton projectId={project.id} versionNumber={v.number} again={!!note} />
          : <p className="note">The budget preparer or an administrator writes the summary.</p>}
      </section>
      <section className="panel"><div className="panel-head"><h2>Alerts</h2><span className="sub">{alerts.length ? `${alerts.length} line${alerts.length === 1 ? "" : "s"} to look at` : "Nothing needs attention"}</span></div>
        {shown.length > 0 && <AlertTable alerts={shown} />}
        {alerts.length > shown.length && <details><summary>Show the other {alerts.length - shown.length}</summary><AlertTable alerts={alerts.slice(shown.length)} /></details>}
        <p className="note">Over CTC: cost incurred above the estimated CTC. Near limit: 90% or more of CTC used. Above initial: CTC more than 10% above the initial budget. May run out: at the last 3 months&apos; spending rate the balance ends before the last OC date.</p>
      </section>
    </div>
  );
}

export function Portfolio({
  projects,
  totals,
  canManage = true,
  canCreate = false,
}: {
  projects: Project[];
  totals: D.Totals[];
  canManage?: boolean;
  canCreate?: boolean;
}) {
  const summaries = projects.map((p) => {
    const pv = totals.filter((t) => t.project_id === p.id);
    const approved = pv.filter((t) => t.status === "approved").pop();
    const cur = approved ?? pv[pv.length - 1];
    return {
      project: p,
      cur,
      allVersions: pv,
      hasApproved: !!approved,
    };
  });

  const withCur = summaries.filter((s) => s.cur != null);
  const totalInitialCr = withCur.reduce((acc, s) => acc + (s.cur?.initial_cr ?? 0), 0);
  const totalCtcCr = withCur.reduce((acc, s) => acc + (s.cur?.ctc_cr ?? 0), 0);
  const totalIncurredCr = withCur.reduce((acc, s) => acc + (s.cur?.incurred_cr ?? 0), 0);
  const totalBalanceCr = withCur.reduce((acc, s) => acc + (s.cur?.balance_cr ?? 0), 0);
  const totalVarianceCr = totalInitialCr - totalCtcCr;
  const overallUtilPct = totalCtcCr > 0 ? (totalIncurredCr / totalCtcCr) * 100 : null;

  const totalProjects = projects.length;
  const approvedCount = withCur.filter((s) => s.cur?.status === "approved").length;
  const inProgressCount = withCur.filter((s) => s.cur?.status !== "approved").length;
  const overBudgetCount = withCur.filter((s) => (s.cur?.variance_cr ?? 0) < 0).length;
  const nearLimitCount = withCur.filter((s) => (s.cur?.util_pct ?? 0) >= 90).length;

  const kpi = (label: string, value: React.ReactNode, small?: string) => (
    <div className="kpi">
      <span>{label}</span>
      <b>{value}</b>
      {small && <small>{small}</small>}
    </div>
  );

  return (
    <>
      {/* Portfolio-wide Executive KPI summary cards */}
      {withCur.length > 0 && (
        <>
          <div className="portfolio-strip">
            <span className="portfolio-metric-tag">
              Projects: <strong>{totalProjects}</strong>
            </span>
            <span className="portfolio-metric-tag">
              Approved revisions: <strong>{approvedCount}</strong>
            </span>
            {inProgressCount > 0 && (
              <span className="portfolio-metric-tag">
                In progress / review: <strong>{inProgressCount}</strong>
              </span>
            )}
            {overBudgetCount > 0 && (
              <span className="chip bad">
                {overBudgetCount} over initial budget
              </span>
            )}
            {nearLimitCount > 0 && (
              <span className="chip warn">
                {nearLimitCount} ≥90% utilised
              </span>
            )}
          </div>

          <div className="kpis" style={{ marginBottom: 18 }}>
            {kpi("Portfolio Initial Budget", `₹${fmt(totalInitialCr)}`, `Across ${withCur.length} project budgets`)}
            {kpi("Portfolio Estimated CTC", `₹${fmt(totalCtcCr)}`, "Total approved cost to complete")}
            {kpi("Total Incurred Actuals", `₹${fmt(totalIncurredCr)}`, "Recorded bills & vouchers")}
            {kpi("Balance Headroom", `₹${fmt(totalBalanceCr)}`, "Remaining unspent CTC")}
            {kpi("Net Portfolio Variance", <Neg v={totalVarianceCr} />, totalVarianceCr < 0 ? "Portfolio CTC is above initial" : "Within initial baseline")}
            {kpi("Overall Utilisation", fmtPct(overallUtilPct), overallUtilPct != null ? `${fmt(totalIncurredCr)} / ${fmt(totalCtcCr)} Cr` : undefined)}
          </div>
        </>
      )}

      {/* Projects Master Directory List Page (Table + Spend Cards with Live Filter) */}
      <F.ProjectsMasterTable
        summaries={summaries}
        canManage={canManage}
        canCreate={canCreate}
      />
    </>
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
  const ocMoves = towers.length ? await D.getOcMoves(sb, v.id) : [];
  const scheduleOf = new Map((await D.getSchedules(sb, v.id)).map((s) => [s.line_id, s]));
  const editOc = v.status === "draft" && (D.canChangeDraft(me, v) || D.can(me, "project.setup", project.id));
  const lineFields = custom.lines.fields.filter((f) => f.show_in_entry);
  const g = groupDetail(figs, v.areas.eng_area);
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const headById = new Map(heads.map((h) => [h.id, h]));
  const flag = new Set(flagged.map((x) => x.line_id));
  const perHead = new Map<number, number>();
  for (const l of lines) perHead.set(l.cost_head_id, (perHead.get(l.cost_head_id) ?? 0) + 1);
  const ruleOf = (f: D.LineFigure): F.RuleState => {
    const basis = new Map(RATE_BASES).get(f.ctc_basis ?? "") ?? f.ctc_basis;
    const sched = scheduleOf.get(f.line_id);
    const kind = sched ? "schedule" : f.is_memo ? "memo" : f.ctc_rule;
    return {
      versionId: v.id, title: f.sub_category || f.category, scheduleHref: sched ? `/budget/${project.id}/schedules?v=${v.number}#s${sched.id}` : undefined,
      kind, rate: f.ctc_rate == null ? null : Number(f.ctc_rate), basis: f.ctc_basis, scope: f.balance_scope,
      totalCr: f.balance_of_paise == null ? null : Number(f.balance_of_paise) / 1e9,
      label: kind === "rate" ? `₹${f.ctc_rate} per sq ft × ${basis}` : kind === "balance" ? `${fmt(Number(f.balance_of_paise) / 1e9)} Cr less the other lines of its ${f.balance_scope}`
        : kind === "memo" ? "Memo item: shown for reference, outside every total" : kind === "schedule" ? `Worked out in the schedule "${sched!.title}"` : "Typed",
    };
  };
  const lineRow = (f: D.LineFigure, indent: number): F.EntryRow => {
    const raw = lineById.get(f.line_id)!;
    const h = headById.get(f.cost_head_id)!;
    const editable = v.status === "draft" && D.can(me, "budget.edit", project.id, f.department_id);
    return {
      kind: "line", key: `l${f.line_id}`, label: f.sub_category || f.category, note: f.note, tower: f.subproject, indent,
      initial_cr: f.initial_cr, ctc_cr: f.ctc_cr, incurred_cr: f.incurred_cr, balance_cr: f.balance_cr, variance_cr: f.variance_cr, util_pct: f.util_pct, psf_ctc: f.psf_ctc,
      line: {
        id: f.line_id, isTax: f.is_tax, taxRule: f.is_tax ? `GST ${Number(h.tax_rate_pct)}% × ${Number(h.tax_share_pct ?? 100)}%` : null,
        initial: raw.initial_paise, ctc: raw.ctc_paise, initialCalc: f.initial_calculated, ctcCalc: f.ctc_calculated,
        incurredAuto: f.is_tax && f.incurred_source === "tax rule", remark: f.remark, source: f.source, editable,
        needsRemark: flag.has(f.line_id), removable: editable && (perHead.get(f.cost_head_id) ?? 0) > 1, overBudget: f.over_budget,
        custom: custom.lines.cells.get(f.line_id), rule: ruleOf(f), href: `/budget/${project.id}/line?v=${v.number}&id=${f.line_id}`,
      },
    };
  };
  const rows: F.EntryRow[] = [];
  const deptGroups: F.DepartmentGroup[] = [];
  for (const d of g.departments) {
    if (search.dept && d.department !== search.dept) continue;
    const deptRows: F.EntryRow[] = [];
    const deptRem = { versionId: v.id, departmentId: d.department_id, text: v.department_remarks?.[String(d.department_id)] ?? "", editable: v.status === "draft" && D.can(me, "budget.edit", project.id, d.department_id) };
    rows.push({ kind: "dept", key: `d${d.department_id}`, label: `${d.sr}. ${d.department}`, ...d.totals, deptRemark: deptRem });
    for (const cat of d.categories) {
      const ls = cat.lines.filter((f) => towerMatch(f, search.tower));
      if (!ls.length) continue;
      if (cat.grouped) {
        const catRow: F.EntryRow = { kind: "cat", key: `c${d.department_id}-${cat.category}`, label: cat.category, indent: 1, ...cat.totals };
        rows.push(catRow);
        deptRows.push(catRow);
      }
      for (const f of ls) {
        const lr = lineRow(f, cat.grouped ? 2 : 1);
        rows.push(lr);
        deptRows.push(lr);
      }
    }
    deptGroups.push({
      department_id: d.department_id,
      sr: d.sr,
      department: d.department,
      totals: d.totals,
      deptRemark: deptRem,
      rows: deptRows,
    });
  }
  const memoRows: F.EntryRow[] = [];
  const memo = g.memo.filter((f) => (!search.dept || f.department === search.dept) && towerMatch(f, search.tower));
  if (memo.length) {
    rows.push({ kind: "memo", key: "memo", label: "Memo items · outside every total", ...groupDetail([], null).total });
    for (const f of memo) {
      const mr = { ...lineRow(f, 1), label: `${f.department} · ${f.sub_category || f.category}` };
      rows.push(mr);
      memoRows.push(mr);
    }
  }
  const total: F.EntryRow = { kind: "dept", key: "total", label: "Total (all departments)", ...g.total };
  let notice: React.ReactNode;
  const draft = draftOf(versions);
  if (v.status === "in_review") notice = <>R{v.number} is under sign-off and locked. {D.canChangeDraft(me, { ...v, status: "draft" }) ? "Take it back to draft from the banner above to make changes." : "The preparer takes it back if changes are needed."}</>;
  else if (v.status === "approved") notice = <>R{v.number} is approved and locked. {draft ? <>Changes go into the newer {draft.status === "draft" ? "draft" : "version"} R{draft.number}: <Link className="btn-action primary" href={`/budget/${project.id}/entry?v=${draft.number}`}>{draft.status === "draft" ? `Edit draft R${draft.number}` : `Open R${draft.number}`}</Link></> : D.can(me, "version.open", project.id) ? "To type a budget by hand, start the next version below; it opens as an editable draft." : "The budget preparer opens the next version."}</>;
  else if (!D.can(me, "budget.edit", project.id)) notice = `You can read every figure here (role: ${me.role}); departments and the preparer make the changes.`;
  else if (D.limitedToDepartments(me)) notice = "You can change your own department's lines. Other departments' lines are read only for you.";
  else notice = <>Type amounts in crores, then press Tab or Enter, or <Link href={`/budget/${project.id}/import`}>import a workbook</Link> into this draft. Balance, variance, PSF, GST and totals are recalculated by the database either way. The Source column shows where each figure came from.</>;
  const splitHeads = heads.filter((h) => !h.is_tax && D.can(me, "budget.edit", project.id, h.department_id));
  // manual entry: start a typed draft from a locked version, or add a new budget line (cost head) to the draft
  const canOpenNext = v.status === "approved" && !draft && D.can(me, "version.open", project.id);
  const canAddLine = v.status === "draft" && D.can(me, "project.setup", project.id);
  const headForm = canAddLine ? await headFormData(sb, heads, template) : null;
  const vf = custom.version.fields;
  const deptName = new Map(figs.map((f) => [f.department_id, f.department]));
  // line-by-line entry (?mode=form): the same lines as the sheet, one at a time, for typing without a spreadsheet
  const formMode = search.mode === "form" && v.status === "draft";
  const sheetHref = `/budget/${project.id}/entry?v=${v.number}`;
  let formLines: FormLine[] = [];
  if (formMode) {
    const prev = v.parent_id ? await D.getLineFigures(sb, v.parent_id) : [];
    const prevCtc = new Map(prev.map((p) => [`${p.cost_head_id}|${p.subproject_id ?? ""}`, p.ctc_cr]));
    const ordered = rows.filter((r) => r.line?.editable).map((r) => figs.find((f) => `l${f.line_id}` === r.key)!).filter(Boolean);
    formLines = ordered.map((f) => {
      const raw = lineById.get(f.line_id)!, rule = ruleOf(f);
      const h = headById.get(f.cost_head_id);
      return {
        id: f.line_id, department: f.department, label: f.sub_category ? `${f.category} · ${f.sub_category}` : f.category, tower: f.subproject,
        isTax: f.is_tax, taxRule: f.is_tax && h ? `GST ${Number(h.tax_rate_pct)}% × ${Number(h.tax_share_pct ?? 100)}%` : null,
        initial: f.is_tax && raw.initial_paise == null ? "" : String(+((raw.initial_paise ?? 0) / 1e9).toFixed(9)),
        ctc: f.is_tax && raw.ctc_paise == null ? "" : String(+((raw.ctc_paise ?? 0) / 1e9).toFixed(9)),
        remark: f.remark ?? "", needsRemark: flag.has(f.line_id), previousCtc: prevCtc.get(`${f.cost_head_id}|${f.subproject_id ?? ""}`) ?? null,
        ctcRule: rule.kind === "rate" || rule.kind === "balance" || rule.kind === "schedule" ? rule.label : null, incurredCr: f.incurred_cr,
      };
    });
  }
  const gridForm = canAddLine ? headForm : null;
  return (
    <>
      <F.StageProcessBar projectId={project.id} activeTab="entry" versionNumber={v.number} />
      <VersionBanner sb={sb} me={me} project={project} version={v} names={c.names} />
      <Notice kind={v.status === "approved" ? "locked" : ""}>{notice}</Notice>
      {canOpenNext && <section className="panel" id="manual-entry">
        <div className="panel-head"><h3>Create budget R{v.number + 1}</h3><span className="sub">R{v.number} is locked. The Create budget form takes you through every input: as-on date, areas, towers, lines by department with Initial, CTC and cost incurred, GST, then review</span></div>
        <div className="row"><Link className="btn-action primary big" href={`/budget/${project.id}/create`}>Open the Create budget form →</Link></div>
        <details><summary>Or only open R{v.number + 1} as an empty draft and type in the sheet</summary>
          <F.OpenVersionForm projectId={project.id} defaultDate={nextQuarterEnd(v.as_on)} />
        </details>
      </section>}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Budget entry · R{v.number}</h2>
            <span className="sub">{formMode ? "Line by line" : "Department Working Sheets"} · All amounts in crores</span>
          </div>
          {v.status === "draft" && <nav className="seg" aria-label="Entry view">
            <Link href={sheetHref} aria-current={!formMode ? "page" : undefined}>Sheet</Link>
            <Link href={`${sheetHref}&mode=form`} aria-current={formMode ? "page" : undefined}>Line by line</Link>
          </nav>}
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <Filters ctx={c} depts={g.departments.map((d) => d.department)} towers={towers} />
            <div className="actions-group">
              {v.status === "draft" && D.canChangeDraft(me, v) && <Link href={`/budget/${project.id}/edit?v=${v.number}`} className="btn-action primary">Edit budget</Link>}
              {canAddLine && <a href="#add-lines" className="btn-action">+ Add lines</a>}
              {canOpenNext && <Link href={`/budget/${project.id}/create`} className="btn-action primary">+ Create budget</Link>}
              {v.status === "draft" && splitHeads.length > 0 && towers.length > 0 && (
                <a href="#split-head" className="btn-action">+ Split Tower</a>
              )}
              <Link href={`/budget/${project.id}/import?v=${v.number}`} className="btn-action">Import Excel</Link>
              <Link href={`/budget/${project.id}/detail?v=${v.number}`} className="btn-action">Detail View</Link>
            </div>
          </div>
        </div>
        {figs.length === 0 && <Notice kind="draft">R{v.number} has no budget lines yet. {canAddLine ? <>Add them in <a href="#add-lines">Add several lines</a> below, with their amounts, or follow <Link href={`/budget/${project.id}/start?v=${v.number}`}>Get started</Link>.</> : "The budget preparer adds the lines."}</Notice>}
        {formMode ? (
          <LineByLineForm lines={formLines} sheetHref={sheetHref} />
        ) : (
          <F.DepartmentAccordionEntry
            departments={deptGroups}
            memoRows={memoRows}
            total={total}
            customFields={lineFields}
            picks={picks}
            versionId={v.id}
          />
        )}
        <p className="note">Crores. Typed or imported: Initial, CTC, Remark. Everything else is calculated. PSF = amount ÷ engineering construction area ({fmtArea(v.areas.eng_area)} sft). Cost incurred comes from the Cost incurred tab, up to {dmy(v.as_on)}.
          {flag.size > 0 && ` ${flag.size} line(s) changed by more than 10% need a remark before approval.`}
          {lineFields.length > 0 && " Extra columns are custom fields; calculated ones are worked out on the server from the figures in the row."}</p>
        {missing.length > 0 && <p className="note bad-text">{missing.length} required field(s) still empty, needed before approval: {missing.slice(0, 6).map((m) => `${m.field} (${m.record})`).join(", ")}{missing.length > 6 ? " …" : ""}</p>}
      </section>
      {vf.length > 0 && <section className="panel">
        <div className="panel-head"><h3>Version fields · R{v.number}</h3><span className="sub">Custom fields of this version{v.status === "approved" ? "; locked with it" : ""}</span></div>
        <CustomFieldsForm fields={vf} sections={sectionsOf(vf)} entity="version" entityId={v.id} cells={custom.version.cells.get(v.id) ?? {}} editable={D.canChangeDraft(me, v)} picks={picks} />
      </section>}
      {gridForm && <section className="panel" id="add-lines">
        <div className="panel-head"><h3>Add several lines · R{v.number}</h3><span className="sub">One row per line, with its amounts; saved together into this draft</span></div>
        <LinesGrid projectId={project.id} departments={gridForm.depts} towers={towers.map((t) => ({ id: t.id, label: t.name }))} summaryOptions={gridForm.options} draftNumber={v.number} startRows={figs.length ? 3 : 5} />
      </section>}
      {canAddLine && headForm && <section className="panel" id="add-line">
        <div className="panel-head"><h3>Add a GST or single line · R{v.number}</h3><span className="sub">Adds one cost head to {project.name}, including GST lines worked out from other lines; it appears above at 0.00</span></div>
        <F.AddHeadForm projectId={project.id} departments={headForm.depts} baseOptions={headForm.baseOptions} summaryOptions={headForm.options} gstRules={headForm.gstRules} />
      </section>}
      {v.status === "draft" && splitHeads.length > 0 && towers.length > 0 && <section className="panel" id="split-head">
        <div className="panel-head"><h3>Split a cost head by tower</h3><span className="sub">Adds a line for one tower; the Summary then shows it under that tower&apos;s building type</span></div>
        <F.SplitLineForm versionId={v.id} heads={splitHeads.map((h) => ({ id: h.id, label: `${deptName.get(h.department_id) ?? ""} · ${h.sub_category || h.category}` }))}
          towers={towers.map((t) => ({ id: t.id, label: t.type ? `${t.name} · ${t.type}` : t.name }))} />
      </section>}
      {ocMoves.length > 0 && <section className="panel">
        <div className="panel-head"><h3>OC dates · R{v.number}</h3><span className="sub">A date that moved since the previous version needs its reason before approval; both go on the Detail report</span></div>
        <div className="scroll"><table><thead><tr><th>Tower</th><th>Planned OC</th><th>Previous version</th><th>This version</th><th className="label-sm">Reason for the change</th></tr></thead><tbody>
          {ocMoves.map((t) => <F.TowerNoteRow key={t.tower_id} versionId={v.id} t={t} editable={editOc} />)}
        </tbody></table></div>
      </section>}
      {D.canChangeDraft(me, v) && <section className="panel">
        <div className="panel-head"><h3>Version details</h3><span className="sub">Typed only; shown on the Summary report&apos;s version tables</span></div>
        <F.VersionDetailsForm versionId={v.id} asOn={v.as_on} reason={v.reason} categories={[...new Set(template.map((t) => t.category))]} reasons={v.category_reasons ?? {}} />
      </section>}
    </>
  );
}

/** Inputs of the add-cost-head form; shared by Project setup → Cost heads and Budget entry → Add a budget line. */
export async function headFormData(sb: Db, heads: D.Head[], template: { category: string; subcategory: string }[]) {
  const depts = await D.getDepartments(sb);
  const gstRules = ((await sb.from("budget_gst_rules").select("id, name, rate_pct, share_pct").eq("active", true).order("sort").order("name")).data ?? [])
    .map((r) => ({ id: Number(r.id), name: String(r.name), rate: Number(r.rate_pct), share: Number(r.share_pct) }));
  const dept = new Map(depts.map((d) => [d.id, d]));
  const options: Record<string, string[]> = {};
  for (const t of template) (options[t.category] ??= []).push(t.subcategory);
  const plain = heads.filter((h) => !h.is_tax);
  const groups = new Map<string, number[]>();
  for (const h of plain) {
    const k = `${h.department_id}|${h.category}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(h.id);
  }
  const baseOptions = [
    ...[...groups].map(([k, ids]) => { const [d, cat] = k.split("|"); return { value: `cat:${k}`, label: `All of ${(dept.get(Number(d))?.name ?? "Department")} · ${cat}`, ids }; }),
    ...plain.map((h) => ({ value: `head:${h.id}`, label: `${(dept.get(h.department_id)?.name ?? "Head")} · ${h.sub_category || h.category}`, ids: [h.id] })),
  ];
  return { depts, gstRules, options, baseOptions };
}

export async function getTemplate(sb: Db) {
  const { data } = await sb.from("budget_summary_template").select("category, subcategory, category_sort, subcategory_sort").order("category_sort").order("subcategory_sort");
  return (data ?? []) as { category: string; subcategory: string }[];
}

// ---------- tower workings ----------
/** One tower's work packages, as the company's per-tower construction cost sheet, and how each split
 *  cost head is allocated across towers (the workbook's "Diff" check). */
export async function Workings(c: Ctx & { version: Version }) {
  const { sb, me, project, version: v, search } = c;
  const [areas, work, check] = await Promise.all([D.getTowerAreas(sb, v.id), D.getTowerWorkings(sb, v.id), D.getAllocationCheck(sb, v.id)]);
  const t = areas.find((x) => String(x.tower_id) === search.tower) ?? areas[0];
  const draft = v.status === "draft";
  const editAreas = draft && (D.canChangeDraft(me, v) || D.can(me, "project.setup", project.id));
  const crOf = (p: number | null | undefined) => Number(p ?? 0) / 1e9;
  const head = (x: { department: string; category: string; sub_category: string | null }) => x.sub_category ? `${x.category} · ${x.sub_category}` : x.category;
  if (!t) return <section className="panel"><h2>Tower workings</h2><p>This project has no towers yet. Add them under <Link href={`/budget/${project.id}/setup?section=towers`}>Project setup → Towers &amp; areas</Link>.</p></section>;
  const rows = work.filter((w) => w.tower_id === t.tower_id && !w.is_memo);
  const sum = (k: "ctc_paise" | "certified_paise" | "to_certify_paise" | "incurred_paise") => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const deptIds = new Map((await D.getDepartments(sb)).map((d) => [d.name, d.id]));
  const towersUsed = areas.filter((a) => work.some((w) => w.tower_id === a.tower_id));
  const unallocated = check.reduce((s, x) => s + Number(x.unallocated_paise), 0);
  return (
    <>
      <VersionBanner sb={sb} me={me} project={project} version={v} names={c.names} />
      <section className="panel">
        <div className="panel-head"><h2>Tower workings · R{v.number}</h2>
          <div className="actions-group">
            <F.QuerySelect name="tower" label="" value={String(t.tower_id)} options={areas.map((a): [string, string] => [String(a.tower_id), a.type ? `${a.name} · ${a.type}` : a.name])} />
            <Download c={c} kind="workings" />
          </div></div>
        <dl className="sumhead"><dt>Tower</dt><dd>{t.name}</dd><dt>Building type</dt><dd>{t.type ?? "Not set"}</dd>
          <dt>Construction BUA</dt><dd>{t.bua != null ? `${fmtArea(t.bua)} sft` : "Not set"}{t.bua !== t.planned_bua && t.planned_bua != null ? ` (planned ${fmtArea(t.planned_bua)} sft)` : ""}</dd>
          <dt>Design area</dt><dd>{t.design_area != null ? `${fmtArea(t.design_area)} sft` : "Not set"}</dd></dl>
        {editAreas && <F.TowerAreasForm versionId={v.id} towerId={t.tower_id} bua={v.tower_notes?.[String(t.tower_id)] && "bua" in v.tower_notes[String(t.tower_id)] ? t.bua : null}
          design={v.tower_notes?.[String(t.tower_id)] && "design_area" in v.tower_notes[String(t.tower_id)] ? t.design_area : null} planned={{ bua: t.planned_bua, design: t.planned_design_area }} />}
        <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Department</th><th className="label">Work category</th><th className="n">Rate per sft</th><th className="n">Amount (Cr)</th>
          <th className="n">Certified (Cr)</th><th className="n">Balance to certify (Cr)</th><th className="n">Cost incurred (Cr)</th><th className="label-sm">Remark</th></tr></thead><tbody>
          {rows.map((r, i) => <tr key={r.line_id}><td>{i + 1}</td><td>{r.department}</td><td>{head(r)}</td><td className="n">{fmt(r.rate_psf)}</td><td className="n">{fmt(crOf(r.ctc_paise))}</td>
            <td className="n"><F.CertifiedInput lineId={r.line_id} paise={r.certified_paise} editable={draft && D.can(me, "budget.edit", project.id, deptIds.get(r.department))} /></td>
            <td className="n"><Neg v={crOf(r.to_certify_paise)} /></td><td className="n">{fmt(crOf(r.incurred_paise))}</td><td>{r.remark}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={9} className="sub">No line is split to this tower yet. Split a cost head by tower under Budget entry.</td></tr>}
          <tr className="total"><td></td><td colSpan={2}>Total {t.name}</td><td className="n">{t.bua ? fmt(sum("ctc_paise") / 100 / Number(t.bua)) : ""}</td><td className="n">{fmt(crOf(sum("ctc_paise")))}</td>
            <td className="n">{fmt(crOf(sum("certified_paise")))}</td><td className="n"><Neg v={crOf(sum("to_certify_paise"))} /></td><td className="n">{fmt(crOf(sum("incurred_paise")))}</td><td></td></tr>
        </tbody></table></div>
        <p className="note">Rate per sft = amount ÷ the tower&apos;s construction BUA for this version. Certified is typed from billing; balance to certify = amount − certified.</p>
      </section>
      <section className="panel"><div className="panel-head"><h2>Allocation to towers</h2>
        <span className="sub">{unallocated === 0 ? "Every split cost head is fully allocated to towers" : `${fmt(crOf(unallocated))} Cr of split cost heads is not allocated to a tower`}</span></div>
        <div className="scroll"><table><thead><tr><th className="label">Department</th><th className="label">Cost head</th>{towersUsed.map((a) => <th key={a.tower_id} className="n">{a.name}</th>)}
          <th className="n">Not allocated</th><th className="n">Total (Detail)</th></tr></thead><tbody>
          {check.map((x) => <tr key={x.cost_head_id} className={Number(x.unallocated_paise) !== 0 ? "flag" : ""}><td>{x.department}</td><td>{head(x)}</td>
            {towersUsed.map((a) => <td key={a.tower_id} className="n">{fmt(crOf(work.filter((w) => w.tower_id === a.tower_id && w.cost_head_id === x.cost_head_id).reduce((s, w) => s + Number(w.ctc_paise), 0)))}</td>)}
            <td className="n"><Neg v={crOf(x.unallocated_paise)} /></td><td className="n">{fmt(crOf(x.total_paise))}</td></tr>)}
          {check.length === 0 && <tr><td colSpan={4 + towersUsed.length} className="sub">No cost head is split by tower in R{v.number}.</td></tr>}
        </tbody></table></div>
        <p className="note">Not allocated is the part of the cost head still on its line without a tower; the towers plus it always equal the Detail report.</p>
      </section>
    </>
  );
}

// ---------- supporting schedules ----------
/** The backup workings behind budget lines: each schedule works out one line's CTC. */
export async function Schedules(c: Ctx & { version: Version }) {
  const { sb, me, project, version: v } = c;
  const [schedules, figs] = await Promise.all([D.getSchedules(sb, v.id), D.getLineFigures(sb, v.id)]);
  const line = new Map(figs.map((f) => [f.line_id, f]));
  const editable = (lineId: number) => v.status === "draft" && D.can(me, "budget.edit", project.id, line.get(lineId)?.department_id);
  const totalScheduleCr = schedules.reduce((acc, s) => {
    return acc + s.rows.reduce((sum, r) => sum + (r.amount_paise ? Number(r.amount_paise) / 1e9 : 0), 0);
  }, 0);

  return (
    <>
      <F.StageProcessBar projectId={project.id} activeTab="schedules" versionNumber={v.number} />
      <VersionBanner sb={sb} me={me} project={project} version={v} names={c.names} />
      <Notice>Each schedule works out one budget line&apos;s Estimated CTC, as the working sheets behind the Summary (GST, interest, rent, corpus, stamp duty, SRA cost …).
        Amount = quantity × rate × % × periods, or a typed amount. Give a line a schedule from Budget entry → Rule → &quot;Worked out in a schedule&quot;.
        Schedules are kept per version and go into the Summary Excel as working sheets.</Notice>

      {/* Supporting Schedules Directory / Master List Table */}
      {schedules.length > 0 && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-head">
            <div>
              <h2>Supporting Schedules Directory</h2>
              <span className="sub">{schedules.length} schedules in R{v.number} · Total worked out: ₹{fmt(totalScheduleCr)} Cr</span>
            </div>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="label">Schedule Title</th>
                  <th>Linked Budget Line</th>
                  <th>Department</th>
                  <th className="n">Items</th>
                  <th className="n">Total (Cr)</th>
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s, idx) => {
                  const f = line.get(s.line_id);
                  const totalCr = s.rows.reduce((sum, r) => sum + (r.amount_paise ? Number(r.amount_paise) / 1e9 : 0), 0);
                  return (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <a href={`#s${s.id}`} className="font-semibold text-primary hover:underline">
                          {s.title}
                        </a>
                        {s.note && <div className="text-xs text-muted mt-0.5">{s.note}</div>}
                      </td>
                      <td>{f ? (f.sub_category || f.category) : "—"}</td>
                      <td>{f?.department ?? "—"}</td>
                      <td className="n">{s.rows.length}</td>
                      <td className="n"><strong>{fmt(totalCr)}</strong></td>
                      <td className="actions">
                        <a href={`#s${s.id}`} className="btn-action">
                          Open Editor ↓
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {schedules.map((s) => { const f = line.get(s.line_id); return (
        <section className="panel" id={`s${s.id}`} key={s.id}>
          <div className="panel-head"><h2>{s.title}</h2>{editable(s.line_id) && <F.ScheduleTitle key={`${s.title}-${s.note}`} s={s} />}<span className="sub">{f ? `${f.department} · ${f.sub_category || f.category}${f.subproject ? ` · ${f.subproject}` : ""} → Summary: ${f.summary_category} · ${f.summary_subcategory}` : ""}</span></div>
          {s.note && <p className="note">{s.note}</p>}
          <F.ScheduleEditor s={s} editable={editable(s.line_id)} />
        </section>
      ); })}
      {schedules.length === 0 && <section className="panel"><p className="sub">No schedules in R{v.number} yet.</p></section>}
    </>
  );
}

// ---------- one budget line ----------
const CHANGE_FIELDS: [string, string, (v: unknown) => string][] = [
  ["initial_paise", "Initial", (x) => (x == null ? "blank" : `${fmt(Number(x) / 1e9)} Cr`)], ["ctc_paise", "Estimated CTC", (x) => (x == null ? "blank" : `${fmt(Number(x) / 1e9)} Cr`)],
  ["remark", "Remark", (x) => (x == null || x === "" ? "blank" : String(x))], ["ctc_rate", "Rate (₹/sft)", (x) => (x == null ? "none" : String(x))],
  ["balance_of_paise", "Balance of", (x) => (x == null ? "none" : `${fmt(Number(x) / 1e9)} Cr`)], ["is_memo", "Memo item", (x) => (x ? "yes" : "no")],
  ["certified_paise", "Certified", (x) => (x == null ? "blank" : `${fmt(Number(x) / 1e9)} Cr`)], ["incurred_override_paise", "Incurred override", (x) => (x == null ? "none" : `${fmt(Number(x) / 1e9)} Cr`)],
];
export async function LineView(c: Ctx & { version: Version }) {
  const { sb, me, project, versions, search } = c;
  const view = search.id ? await D.getLineView(sb, Number(search.id), D.can(me, "audit.view", project.id)) : null;
  if (!view || !versions.some((x) => x.id === view.line.version_id)) return <section className="panel"><p className="sub">This budget line was not found.</p></section>;
  const { line: f, across, comments, changes } = view;
  const v = versions.find((x) => x.id === f.version_id)!;
  const byVersion = new Map(versions.map((x) => [x.id, x]));
  const schedule = (await D.getSchedules(sb, v.id)).find((s) => s.line_id === f.line_id);
  const name = [f.department, f.category, f.sub_category, f.subproject].filter(Boolean).join(" · ");
  const rule = f.is_memo ? "Memo item, outside every total" : f.ctc_rule === "rate" ? `Rate ₹${f.ctc_rate}/sft × ${RATE_BASES.find(([k]) => k === f.ctc_basis)?.[1] ?? f.ctc_basis}`
    : f.ctc_rule === "balance" ? `Balance of ${fmt(Number(f.balance_of_paise) / 1e9)} Cr less the other lines of its ${f.balance_scope}` : schedule ? `Worked out in the schedule "${schedule.title}"` : f.is_tax ? "GST rule" : "Typed";
  const incurredHref = `/budget/${project.id}/incurred?v=${v.number}&head=${f.cost_head_id}&tower=${f.subproject_id ?? 0}&upto=${v.as_on.slice(0, 7)}`;
  const canDeleteLine = v.status === "draft" && (D.can(me, "budget.delete", project.id) || D.can(me, "budget.edit", project.id) || D.canChangeDraft(me, v));
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>{name}</h2><span className="sub">R{v.number} as on {dmy(v.as_on)} · {v.status.replace("_", " ")}</span>
          <div className="row">
            <Link className="btn" href={`/budget/${project.id}/entry?v=${v.number}`}>Budget entry</Link>
            <Link className="btn" href={`/budget/${project.id}/detail?v=${v.number}`}>Detail report</Link>
            {canDeleteLine && <DeleteLineButton lineId={f.line_id} back={`/budget/${project.id}/view?v=${v.number}`} />}
          </div></div>
        <div className="scroll"><table><tbody>
          <tr><td>Initial budget (a)</td><td className="n">{fmt(f.initial_cr)} Cr</td></tr>
          <tr><td>Estimated CTC (b)</td><td className="n">{fmt(f.ctc_cr)} Cr</td></tr>
          <tr><td>Cost incurred (c)</td><td className="n">{f.is_tax || f.incurred_source === "override" ? fmt(f.incurred_cr) : <Link href={incurredHref}>{fmt(f.incurred_cr)}</Link>} Cr <span className="note">({f.incurred_source})</span></td></tr>
          <tr><td>Balance CTC (b − c)</td><td className="n"><Neg v={f.balance_cr} /> Cr</td></tr>
          <tr><td>Variance (a − b)</td><td className="n"><Neg v={f.variance_cr} /> Cr</td></tr>
          <tr><td>Utilised</td><td className="n">{fmtPct(f.util_pct)}</td></tr>
          <tr><td>PSF on CTC</td><td className="n">{fmt(f.psf_ctc)}</td></tr>
          <tr><td>How the CTC is set</td><td>{rule}{schedule && <> · <Link href={`/budget/${project.id}/schedules?v=${v.number}#s${schedule.id}`}>Open schedule</Link></>}</td></tr>
          <tr><td>Summary row</td><td>{f.summary_category} · {f.summary_subcategory}</td></tr>
          <tr><td>Remark</td><td>{f.remark}</td></tr>
        </tbody></table></div>
      </section>
      <section className="panel"><h3>This line in every version</h3>
        <div className="scroll"><table><thead><tr><th>Version</th><th>As on</th><th>Status</th><th className="n">Initial (Cr)</th><th className="n">CTC (Cr)</th><th className="n">Incurred (Cr)</th><th className="label-sm">Remark</th></tr></thead><tbody>
          {across.map((x) => ({ x, vv: byVersion.get(x.version_id) })).filter((r) => r.vv).sort((a, b) => b.vv!.number - a.vv!.number).map(({ x, vv }) => (
            <tr key={x.line_id} className={x.line_id === f.line_id ? "flag" : ""}><td><Link href={`/budget/${project.id}/line?v=${vv!.number}&id=${x.line_id}`}>R{vv!.number}</Link></td><td>{dmy(vv!.as_on)}</td>
              <td>{vv!.status.replace("_", " ")}</td><td className="n">{fmt(x.initial_cr)}</td><td className="n">{fmt(x.ctc_cr)}</td><td className="n">{fmt(x.incurred_cr)}</td><td>{x.remark}</td></tr>))}
        </tbody></table></div>
      </section>
      <section className="panel"><h3>Comments</h3>
        {comments.length ? <div className="scroll"><table><tbody>
          {comments.map((m) => <tr key={m.id}><td style={{ whiteSpace: "nowrap" }}>{dmy(m.created_at)}</td><td>{(m.user_id && c.names[m.user_id]) || "Member"}</td><td>{m.body}</td>
            <td className="actions">{m.user_id === me.user_id && <F.DeleteComment id={m.id} />}</td></tr>)}
        </tbody></table></div> : <p className="sub">No comments yet.</p>}
        {D.can(me, "project.view", project.id) && <F.CommentForm versionId={v.id} lineId={f.line_id} />}
      </section>
      {D.can(me, "audit.view", project.id) && <section className="panel"><h3>Change history</h3>
        {changes.length ? <div className="scroll"><table><thead><tr><th>Date</th><th>By</th><th className="label-sm">Change</th></tr></thead><tbody>
          {changes.map((ch) => {
            const what = ch.action === "insert" ? "Line added" : ch.action === "delete" ? "Line removed"
              : CHANGE_FIELDS.filter(([k]) => JSON.stringify(ch.old_row?.[k] ?? null) !== JSON.stringify(ch.new_row?.[k] ?? null)).map(([k, label, show]) => `${label}: ${show(ch.old_row?.[k])} → ${show(ch.new_row?.[k])}`).join("; ");
            return what ? <tr key={ch.id}><td style={{ whiteSpace: "nowrap" }}>{dmy(ch.at)}</td><td>{(ch.user_id && c.names[ch.user_id]) || ""}</td><td>{what}</td></tr> : null;
          })}
        </tbody></table></div> : <p className="sub">No changes recorded.</p>}
      </section>}
    </>
  );
}

// ---------- import ----------
export async function ImportTab(c: Ctx) {
  const imports = await D.getImports(c.sb);
  const pname = new Map(c.projects.map((p) => [p.id, p.name]));
  const vnum = new Map((await D.getVersions(c.sb)).map((v) => [v.id, v.number]));
  return (
    <>
      <ImportPanel projects={c.projects.map((p) => ({ id: p.id, name: p.name }))} projectId={c.project?.id || null} canDetail={c.project?.id ? D.can(c.me, "budget.import", c.project.id) : D.can(c.me, "project.create")} canCost={c.project?.id ? D.can(c.me, "cost.import", c.project.id) : true} />
      <ImportHistory imports={imports} pname={pname} vnum={vnum} names={c.names} />
    </>
  );
}

export function ImportHistory({ imports, pname, vnum, names }: { imports: Awaited<ReturnType<typeof D.getImports>>; pname: Map<number, string>; vnum: Map<number, number>; names: Record<string, string> }) {
  return (
    <section className="panel"><h3>Import history</h3>
      <div className="scroll"><table><thead><tr><th>Date</th><th className="label-sm">File</th><th>Type</th><th>Into</th><th>Result</th><th>By</th></tr></thead><tbody>
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
  // schedules behind each summary row
  const schedules = await D.getSchedules(sb, v.id);
  const lineOf = new Map(figs.map((f) => [f.line_id, f]));
  const workingsOf = (cat: string, sub: string) => schedules.filter((s) => lineOf.get(s.line_id)?.summary_category === cat && lineOf.get(s.line_id)?.summary_subcategory === sub)
    .map((s) => ({ title: s.title, href: `/budget/${project.id}/schedules?v=${v.number}#s${s.id}` }));
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
        <div className="panel-head"><h2>Project Budget Summary</h2><span className="sub">Chandak Group internal working · amounts in crores</span><Download c={c} kind="summary" /></div>
        <dl className="sumhead"><dt>Project name</dt><dd>{project.name}</dd><dt>Version</dt><dd>R{v.number} ({v.status})</dd><dt>Date</dt><dd>{dmy(v.as_on)}</dd><dt>Print date</dt><dd>{dmy(new Date().toISOString())}</dd></dl>
        <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Category</th><th className="label">Sub-category</th><th className="n">Carpet area</th><th className="n">Engg. construction area</th><th className="n">Amount</th><th className="n">Total amount</th></tr></thead><tbody>
          {[...byCat].map(([cat, subs], i) => (
            <SummaryCategory key={cat} sr={i + 1} cat={cat} total={Number(thisCats.find((x) => x.category === cat)?.budget_cr ?? 0)}
              subs={subs.map((s) => ({ name: s.subcategory, amount: s.amount_cr, workings: workingsOf(cat, s.subcategory), carpet: cat === "Construction" ? typeArea(s.subcategory, "carpet_area") : null, eng: cat === "Construction" ? typeArea(s.subcategory, "eng_area") : null }))} />
          ))}
          <tr className="total"><td></td><td colSpan={5}>Total</td><td className="n">{fmt(t.ctc_cr)}</td></tr>
        </tbody></table></div>
        <p className="note">Construction is split by each tower&apos;s building type. Lines not yet split by tower show as &quot;Not allocated to a building&quot;; set tower types under Project setup → Towers &amp; areas and split lines under Budget entry.</p>
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
          <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Category</th><th className="n">Budget</th><th className="n">Incurred</th><th className="n">Balance</th></tr></thead><tbody>
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
        <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Category</th>{upTo.map((x) => <th key={x.id} className="n">R{x.number}<br />{dmy(x.as_on)}</th>)}<th className="label-sm">Reason</th></tr></thead><tbody>
          {thisCats.map((x, i) => <tr key={x.category}><td>{i + 1}</td><td>{x.category}</td>
            {upTo.map((u) => <td key={u.id} className="n">{fmt(cats.find((y) => y.version_id === u.id && y.category === x.category)?.budget_cr ?? 0)}</td>)}<td>{v.category_reasons?.[x.category]}</td></tr>)}
          <tr className="total"><td></td><td>Total</td>{upTo.map((u) => <td key={u.id} className="n">{fmt(totals.find((y) => y.version_id === u.id)?.ctc_cr)}</td>)}<td></td></tr>
        </tbody></table></div>
      </section>
    </>
  );
}

function SummaryCategory({ sr, cat, total, subs }: { sr: number; cat: string; total: number; subs: { name: string; amount: number; carpet: number | null; eng: number | null; workings: { title: string; href: string }[] }[] }) {
  return (
    <>
      <tr className="group"><td>{sr}</td><td colSpan={5}>{cat}</td><td className="n">{fmt(total)}</td></tr>
      {subs.map((s) => <tr key={s.name}><td></td><td></td><td>{s.name}{s.workings.map((w) => <Link key={w.href} className="chip" href={w.href} title="Supporting schedule">{w.title}</Link>)}</td><td className="n">{fmtArea(s.carpet)}</td><td className="n">{fmtArea(s.eng)}</td><td className="n">{fmt(s.amount)}</td><td></td></tr>)}
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
  const oc = towers.map((t) => ({ ...t, oc_date: v.tower_notes?.[String(t.id)]?.oc_date ?? t.oc_date, reason: v.tower_notes?.[String(t.id)]?.reason ?? null }));
  const remarks = v.department_remarks ?? {};
  const steps = await D.getSignoffStatus(sb, v.id);
  const Cells = ({ x, href }: { x: CellFigures; href?: string }) => <>
    <td className="n">{fmt(x.psf_initial)}</td><td className="n">{fmt(x.psf_ctc)}</td><td className="n">{fmt(x.initial_cr)}</td><td className="n">{fmt(x.ctc_cr)}</td>
    <td className="n">{href ? <Link href={href} title="Entries and bills behind this figure">{fmt(x.incurred_cr)}</Link> : fmt(x.incurred_cr)}</td><td className="n"><Neg v={x.balance_cr} /></td><td className="n"><Neg v={x.variance_cr} /></td></>;
  const t = g.total;
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>{project.name} as on {dmy(v.as_on)} · R{v.number}</h2><Filters ctx={c} depts={g.departments.map((d) => d.department)} towers={towers} /><Download c={c} kind="detail" /></div>
        <div className="grid2">
          <div className="scroll"><table><tbody>
            <tr><td>Construction area, Engineering team (sft)</td><td className="n">{fmtArea(a.eng_area)}</td></tr>
            <tr><td>Construction area, Design team (sft)</td><td className="n">{fmtArea(a.design_area)}</td></tr>
            <tr><td>Total sale value (Cr)</td><td className="n">{fmt(a.sale_value_cr)}</td></tr>
            <tr><td>Total carpet area / for sale (sft)</td><td className="n">{fmtArea(a.total_carpet)} / {fmtArea(areas?.net_sale_carpet)}</td></tr>
            <tr><td>Sold / available (sft)</td><td className="n">{fmtArea(sold)} ({fmtPct(net ? (sold * 100) / net : null)}) / {fmtArea(net - sold)} ({fmtPct(net ? ((net - sold) * 100) / net : null)})</td></tr>
          </tbody></table></div>
          <div className="scroll"><table><tbody>
            {oc.filter((x) => x.oc_date).map((x) => <tr key={x.id}><td>OC date {x.name}{x.reason && <div className="note">{x.reason}</div>}</td><td className="n">{dmy(x.oc_date)}</td></tr>)}
            {!oc.some((x) => x.oc_date) && <tr><td>No OC dates yet</td></tr>}
            <CustomRows fields={vf} cells={custom.version.cells.get(v.id)} />
          </tbody></table></div>
        </div>
        <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Department</th><th className="label">Category</th><th className="label">Sub-category</th><th className="n">PSF on initial</th><th className="n">PSF on CTC</th><th className="n">Initial budget (a)</th><th className="n">Estimated CTC (b)</th><th className="n">Cost incurred (c)</th><th className="n">Balance CTC (d = b − c)</th><th className="n">Variance (a − b)</th><th className="label-sm">Remark</th><th className="n">Utilised</th>{lf.map((f) => <th key={f.id} className={isNum(f) ? "n" : ""} title={fieldTitle(f)}>{f.label}</th>)}</tr></thead><tbody>
          {g.departments.filter((d) => !search.dept || d.department === search.dept).map((d) => (
            <DeptRows key={d.department_id} d={d} tower={search.tower} Cells={Cells} fields={lf} cells={custom.lines.cells} remark={remarks[String(d.department_id)]}
              lineHref={(f) => `/budget/${project.id}/line?v=${v.number}&id=${f.line_id}`}
              entriesOf={(f) => f.is_tax || f.incurred_source === "override" ? undefined : `/budget/${project.id}/incurred?v=${v.number}&head=${f.cost_head_id}&tower=${f.subproject_id ?? 0}&upto=${v.as_on.slice(0, 7)}`} />
          ))}
          <tr className="total"><td></td><td>Total</td><td></td><td></td><Cells x={t} /><td></td><td className="n">{fmtPct(t.util_pct)}</td>{lf.map((f) => <td key={f.id}></td>)}</tr>
        </tbody></table></div>
      </section>
      <section className="panel"><h3>Department recap</h3>
        <div className="scroll"><table><thead><tr><th className="sr">Sr</th><th className="label">Department</th><th className="n">PSF on initial</th><th className="n">PSF on CTC</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (d)</th><th className="n">Variance (a − b)</th><th className="label-sm">Remark</th></tr></thead><tbody>
          {g.departments.map((d) => <tr key={d.department_id}><td>{d.sr}</td><td>{d.department}</td><Cells x={d.totals} /><td>{remarks[String(d.department_id)]}</td></tr>)}
          <tr className="total"><td></td><td>Total</td><Cells x={t} /><td></td></tr>
        </tbody></table></div>
      </section>
      {g.memo.length > 0 && <section className="panel"><h3>Memo items</h3><p className="sub">Shown for reference; they are outside every total above.</p>
        <div className="scroll"><table><thead><tr><th className="label">Department</th><th className="label">Item</th><th className="n">Estimated CTC (Cr)</th><th className="n">Cost incurred (Cr)</th><th className="label-sm">Remark</th></tr></thead><tbody>
          {g.memo.map((f) => <tr key={f.line_id}><td>{f.department}</td><td>{[f.category, f.sub_category, f.subproject].filter(Boolean).join(" · ")}</td><td className="n">{fmt(f.ctc_cr)}</td><td className="n">{fmt(f.incurred_cr)}</td><td>{f.remark}</td></tr>)}
        </tbody></table></div></section>}
      {steps.length > 0 && <section className="panel"><h3>Sign-off</h3>
        <div className="signoff">{steps.map((s) => <div key={s.level_id}><b>{s.title}</b><span>{s.signed_by ? c.names[s.signed_by] ?? "Member" : ""}</span><small>{s.signed_at ? `Signed ${dmy(s.signed_at)}` : "Pending"}</small></div>)}</div>
      </section>}
    </>
  );
}

type CellFigures = { psf_initial: number | null; psf_ctc: number | null; initial_cr: number; ctc_cr: number; incurred_cr: number; balance_cr: number; variance_cr: number };
function DeptRows({ d, tower, Cells, fields, cells, remark, entriesOf, lineHref }: {
  d: ReturnType<typeof groupDetail>["departments"][number]; tower?: string; Cells: React.ComponentType<{ x: CellFigures; href?: string }>; fields: D.CustomField[]; cells: Map<number, Cells>;
  remark?: string; entriesOf?: (f: D.LineFigure) => string | undefined; lineHref?: (f: D.LineFigure) => string;
}) {
  const extra = (id: number) => fields.map((f) => { const x = cells.get(id)?.[f.key]; return <td key={f.id} className={isNum(f) ? "n" : ""}>{x?.error ? <span className="chip bad" title={x.error}>Error</span> : x?.text}</td>; });
  return (
    <>
      <tr className="group"><td>{d.sr}</td><td>{d.department}</td><td></td><td></td><Cells x={d.totals} /><td>{remark}</td><td className="n">{fmtPct(d.totals.util_pct)}</td>{fields.map((f) => <td key={f.id}></td>)}</tr>
      {d.categories.flatMap((cat) => cat.lines.filter((f) => towerMatch(f, tower)).map((f) => (
        <tr key={f.line_id}><td></td><td></td><td>{lineHref ? <Link href={lineHref(f)} title="View this line">{f.category}</Link> : f.category}{f.subproject && <span className="chip">{f.subproject}</span>}</td><td>{f.sub_category || (f.note ? `* ${f.note}` : "")}</td>
          <Cells x={f} href={entriesOf?.(f)} /><td>{f.remark}</td><td className="n">{fmtPct(f.util_pct)}</td>{extra(f.line_id)}</tr>
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
        <div className="scroll"><table><thead><tr><th className="label">Department</th><th className="label">Cost head</th><th className="n">Initial R{A.number}</th><th className="n">Initial R{B.number}</th><th className="n">CTC R{A.number}</th><th className="n">CTC R{B.number}</th><th className="n">Change</th><th className="n">%</th><th className="label-sm">Remark</th></tr></thead><tbody>
          {shown.map((r, i) => <tr key={i}><td>{r.department}</td><td>{r.sub_category || r.category}{r.subproject && <span className="chip">{r.subproject}</span>}{(r.change === "added" || r.change === "removed") && <span className="chip warn">{r.change}</span>}</td>
            <td className="n">{fmt(r.from_initial_cr)}</td><td className="n">{fmt(r.to_initial_cr)}</td><td className="n">{fmt(r.from_ctc_cr)}</td><td className="n">{fmt(r.to_ctc_cr)}</td>
            <td className="n"><Neg v={r.ctc_change_cr} /></td><td className="n">{fmtPct(r.ctc_change_pct)}</td><td>{r.to_remark}</td></tr>)}
          {shown.length === 0 && <tr><td colSpan={9}>No differences.</td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel"><h3>Category totals (Estimated CTC)</h3>
        <div className="scroll"><table><thead><tr><th className="label">Category</th><th className="n">R{A.number}</th><th className="n">R{B.number}</th><th className="n">Change</th><th className="label-sm">Reason</th></tr></thead><tbody>
          {catNames.map((n) => <tr key={n}><td>{n}</td><td className="n">{fmt(cat(A.id, n))}</td><td className="n">{fmt(cat(B.id, n))}</td><td className="n"><Neg v={cat(B.id, n) - cat(A.id, n)} /></td><td>{B.category_reasons?.[n]}</td></tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}

// ---------- cost incurred ----------
export async function Incurred(c: Ctx) {
  const { sb, me, project, version: v, search } = c;
  const [heads, depts, towers, entries, bills, vendors] = await Promise.all([
    D.getHeads(sb, project.id),
    D.getDepartments(sb),
    D.getTowers(sb, project.id),
    D.getEntries(sb, project.id),
    D.getBills(sb, project.id),
    D.getVendors(sb),
  ]);
  const dept = new Map(depts.map((d) => [d.id, d]));
  const head = new Map(heads.map((h) => [h.id, h]));
  const tower = new Map(towers.map((t) => [t.id, t.name]));
  const allowed = heads.filter((h) => !h.is_tax && D.can(me, "cost.enter", project.id, h.department_id))
    .sort((a, b) => ((dept.get(a.department_id)?.sort ?? 999) - (dept.get(b.department_id)?.sort ?? 999)) || a.sort - b.sort);
  // ?head=&tower=&upto= shows the entries behind one budget line (tower 0 = not split by tower)
  const line = search.head ? { head: Number(search.head), tower: search.tower ? Number(search.tower) : null, upto: search.upto } : null;
  const shown = entries.filter((e) => (!line || (e.cost_head_id === line.head && (line.tower == null || (e.subproject_id ?? 0) === line.tower) && (!line.upto || e.month.slice(0, 7) <= line.upto))));
  const billHeads = new Map<number, string[]>();
  for (const e of entries) if (e.bill_id) {
    const h = head.get(e.cost_head_id)!;
    billHeads.set(e.bill_id, [...(billHeads.get(e.bill_id) ?? []), `${h.sub_category || h.category}${e.subproject_id ? ` · ${tower.get(e.subproject_id)}` : ""}`]);
  }
  const lineHead = line && head.get(line.head);
  const headOptions = allowed.map((h) => ({ id: h.id, label: `${(dept.get(h.department_id)?.name ?? "Head")} · ${h.sub_category || h.category}` }));
  const total = shown.reduce((s, e) => s + Number(e.amount_paise), 0);
  const cf = await loadCustom(sb, "cost_entry", project.id, new Map(shown.map((e) => [e.id, { amount: rupeesFromPaise(e.amount_paise), month: day(e.month) }])), await lookupNames(sb, project.id, c.names));
  const listed = cf.fields.filter((f) => f.show_in_reports);
  const picks = await picksFor(sb, project.id, c.names);
  const totalBasicPaise = bills.reduce((s, b) => s + Number(b.basic_paise), 0);
  const totalGstPaise = bills.reduce((s, b) => s + Number(b.gst_paise), 0);
  const totalGrossPaise = bills.reduce((s, b) => s + Number(b.total_paise), 0);

  return (
    <>
      <F.StageProcessBar projectId={project.id} activeTab="incurred" versionNumber={v?.number ?? null} />

      {/* Vendor Bills Master Ledger */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Vendor Bills Ledger · {project.name}</h2>
            <span className="sub">{bills.length} {bills.length === 1 ? "bill" : "bills"} recorded · {fmt(toCr(totalBasicPaise))} Cr basic value</span>
          </div>
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            {allowed.length > 0 && (
              <F.RecordBillModal
                projectId={project.id}
                heads={headOptions}
                towers={towers}
                date={[new Date().toISOString().slice(0, 10), v?.as_on ?? "9999-12-31"].sort()[0]}
                vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
              />
            )}
            {v && D.can(me, "report.export", project.id) && (
              <a
                className="btn"
                href={`/budget/${project.id}/export/bills?v=${v.number}`}
                download
                title={`Bills dated up to ${monthName(v.as_on)}, the ones R${v.number} counts`}
              >
                Download Excel
              </a>
            )}
          </div>
        </div>

        <div className="master-kpi-strip">
          <div className="master-kpi-tile">
            <span className="kpi-label">Recorded Bills</span>
            <span className="kpi-val">{bills.length}</span>
            <span className="kpi-sub">Total vendor bills</span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">Basic Amount</span>
            <span className="kpi-val">₹{fmt(toCr(totalBasicPaise))} Cr</span>
            <span className="kpi-sub">Excluding GST</span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">GST Input</span>
            <span className="kpi-val">₹{fmt(toCr(totalGstPaise))} Cr</span>
            <span className="kpi-sub">Tax component</span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">Gross Value</span>
            <span className="kpi-val">₹{fmt(toCr(totalGrossPaise))} Cr</span>
            <span className="kpi-sub">Invoice gross total</span>
          </div>
        </div>

        <RecordList
          columns={[{ label: "Bill date" }, { label: "Vendor", className: "label" }, { label: "Bill no." }, { label: "Work order" }, { label: "Split over" },
            { label: "Basic (₹)", className: "n" }, { label: "GST (₹)", className: "n" }, { label: "Total (₹)", className: "n" }, { label: "Entered by" }]}
          searchPlaceholder="Search vendor, bill no., work order, cost head…"
          filters={[
            { key: "vendor", label: "Vendor", options: [...new Set(bills.map((b) => b.vendor))].sort().map((x): [string, string] => [x, x]) },
            { key: "month", label: "Month", options: [...new Set(bills.map((b) => b.bill_date.slice(0, 7)))].sort().reverse().map((m): [string, string] => [m, monthName(m + "-01")]) },
          ]}
          empty={<>No bills recorded yet. Use <b>Record Bill</b> above to add vendor invoices.</>}
          rows={bills.map((b) => {
            const billSplits = entries.filter((e) => e.bill_id === b.bill_id);
            const over = (billHeads.get(b.bill_id) ?? []).join(", ");
            const editable = D.can(me, "cost.enter", project.id);
            return {
              id: String(b.bill_id),
              search: [b.vendor, b.bill_no, b.work_order, over, b.note].filter(Boolean).join(" ").toLowerCase(),
              filters: { vendor: b.vendor, month: b.bill_date.slice(0, 7) },
              cells: [dmy(b.bill_date), <strong key="v">{b.vendor}</strong>, b.bill_no, b.work_order || "—", <div key="o" className="trunc" title={over}>{over || "—"}</div>,
                fmtRupees(b.basic_paise), fmtRupees(b.gst_paise), <strong key="t">{fmtRupees(b.total_paise)}</strong>, (b.entered_by && c.names[b.entered_by]) || ""],
              title: `${b.vendor} · Bill ${b.bill_no}`,
              subtitle: `${dmy(b.bill_date)} · ₹${fmtRupees(b.total_paise)}`,
              detail: [["Vendor", b.vendor], ["Bill no.", b.bill_no], ["Bill date", dmy(b.bill_date)], ["Work order", b.work_order ?? ""], ["Basic (₹)", fmtRupees(b.basic_paise)],
                ["GST (₹)", fmtRupees(b.gst_paise)], ["Total (₹)", <strong key="t">{fmtRupees(b.total_paise)}</strong>], ["Note", b.note ?? ""], ["Entered by", (b.entered_by && c.names[b.entered_by]) || ""]],
              extra: billSplits.length > 0 ? <div className="scroll"><table><thead><tr><th>Split to cost head</th><th>Tower</th><th className="n">Amount (₹)</th></tr></thead><tbody>
                {billSplits.map((e) => { const h = head.get(e.cost_head_id)!; return <tr key={e.id}><td>{dept.get(h.department_id)?.name} · {h.sub_category || h.category}</td><td>{e.subproject_id ? tower.get(e.subproject_id) : "—"}</td><td className="n">{fmtRupees(e.amount_paise)}</td></tr>; })}
              </tbody></table></div> : null,
              actions: editable ? <>
                <F.RecordBillModal projectId={project.id} heads={headOptions} towers={towers} date={b.bill_date} vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
                  bill={{ bill_id: b.bill_id, vendor: b.vendor, bill_no: b.bill_no, bill_date: b.bill_date, work_order: b.work_order, gst_paise: b.gst_paise, note: b.note,
                    splits: billSplits.map((e) => ({ head: e.cost_head_id, tower: e.subproject_id, amount_paise: e.amount_paise })) }}
                  trigger={<button type="button" className="btn-action">Edit</button>} />
                <F.DeleteBill id={b.bill_id} />
              </> : undefined,
            };
          })}
        />
      </section>

      {/* Cost Incurred Entries Ledger */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Cost Incurred Entries Ledger · {project.name}</h2>
            <span className="sub">{shown.length} entries · {fmt(toCr(total))} crores total incurred</span>
          </div>
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            {allowed.length > 0 && (
              <F.RecordEntryModal
                projectId={project.id}
                heads={headOptions}
                towers={towers}
                month={[new Date().toISOString().slice(0, 10), v?.as_on ?? "9999-12-31"].sort()[0].slice(0, 7)}
              />
            )}
          </div>
        </div>

        {lineHead && <Notice>Showing entries behind {dept.get(lineHead.department_id)?.name} · {lineHead.sub_category || lineHead.category}{line!.tower ? ` · ${tower.get(line!.tower)}` : line!.tower === 0 ? " (not split by tower)" : ""}{line!.upto ? ` up to ${monthName(line!.upto + "-01")}` : ""}. <Link href={`/budget/${project.id}/incurred${v ? `?v=${v.number}` : ""}`}>Show all</Link></Notice>}

        <RecordList
          columns={[{ label: "Month" }, { label: "Department", className: "label" }, { label: "Cost head", className: "label" }, { label: "Tower" }, { label: "Amount (₹)", className: "n" },
            { label: "Reference" }, ...listed.map((f) => ({ label: f.label, className: isNum(f) ? "n" : "" })), { label: "Source" }, { label: "Entered by" }]}
          searchPlaceholder="Search cost head, reference, department…"
          initialFilters={search.dept ? { dept: search.dept } : undefined}
          filters={[
            { key: "dept", label: "Department", options: depts.map((d): [string, string] => [d.name, d.name]) },
            { key: "month", label: "Month", options: [...new Set(shown.map((e) => e.month.slice(0, 7)))].sort().reverse().map((m): [string, string] => [m, monthName(m + "-01")]) },
            ...(towers.length ? [{ key: "tower", label: "Tower", options: [["-", "Not split by tower"] as [string, string], ...towers.map((t): [string, string] => [t.name, t.name])] }] : []),
            { key: "source", label: "Source", options: [["Bill", "From a bill"], ["Excel", "Imported"], ["Typed", "Typed"]] },
          ]}
          empty="No cost entries yet. Use Record Entry above, record a bill, or import a cost incurred sheet."
          footer={<tr className="total"><td colSpan={4}>Total ({shown.length} entries)</td><td className="n">{fmtRupees(total)}</td><td colSpan={3 + listed.length + (shown.some((e) => D.can(me, "cost.enter", project.id, head.get(e.cost_head_id)?.department_id)) ? 1 : 0)}></td></tr>}
          rows={shown.map((e) => {
            const h = head.get(e.cost_head_id)!;
            const dname = dept.get(h.department_id)?.name ?? "";
            const src = e.bill_id ? "Bill" : e.source === "excel" ? "Excel" : "Typed";
            const editable = D.can(me, "cost.enter", project.id, h.department_id);
            const tname = e.subproject_id ? tower.get(e.subproject_id) ?? "" : "";
            return {
              id: String(e.id),
              search: [dname, h.category, h.sub_category, tname, e.reference, src].filter(Boolean).join(" ").toLowerCase(),
              filters: { dept: dname, month: e.month.slice(0, 7), tower: tname || "-", source: src },
              cells: [monthName(e.month), dname, <strong key="h">{h.sub_category || h.category}</strong>, tname ? <span className="chip">{tname}</span> : "",
                <span key="a" className={e.amount_paise < 0 ? "neg" : ""}><strong>{fmtRupees(e.amount_paise)}</strong></span>, <div key="r" className="trunc" title={e.reference ?? ""}>{e.reference}</div>,
                ...listed.map((f) => <CustomInput key={f.id} field={f} entity="cost_entry" entityId={e.id} cell={cf.cells.get(e.id)?.[f.key]} editable={editable} picks={picks} compact />),
                <span key="s" className={`chip ${src === "Excel" ? "xl" : src === "Typed" ? "typed" : ""}`}>{src}</span>, (e.entered_by && c.names[e.entered_by]) || ""],
              title: `${h.sub_category || h.category} · ₹${fmtRupees(e.amount_paise)}`,
              subtitle: `${dname} · ${monthName(e.month)}`,
              detail: [["Month", monthName(e.month)], ["Department", dname], ["Cost head", `${h.category}${h.sub_category ? ` · ${h.sub_category}` : ""}`], ["Tower", tname || "Not split by tower"],
                ["Amount (₹)", <strong key="a">{fmtRupees(e.amount_paise)}</strong>], ["Reference", e.reference ?? ""], ["Source", src === "Bill" ? "From a vendor bill" : src === "Excel" ? "Imported from Excel" : "Typed"],
                ["Entered by", (e.entered_by && c.names[e.entered_by]) || ""]],
              actions: editable ? (e.bill_id ? <span className="note">Change on the bill</span> : <F.EntryActions e={e} heads={headOptions} towers={towers} />) : undefined,
            };
          })}
        />
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
      <div className="scroll"><table><thead><tr><th className="label">Category</th>{periods.map((p) => <th key={p} className="n">{p}</th>)}<th className="n">Total</th></tr></thead><tbody>
        {cats.map((cat) => <tr key={cat}><td>{cat}</td>{periods.map((p) => <td key={p} className="n">{fmt(cell(cat, p))}</td>)}<td className="n">{fmt(cell(cat, null))}</td></tr>)}
        <tr className="total"><td>Total</td>{periods.map((p) => <td key={p} className="n">{fmt(cell(null, p))}</td>)}<td className="n">{fmt(cell(null, null))}</td></tr>
      </tbody></table></div>
    </section>
  );
}

// ---------- budgets registry (dedicated list page of all created budgets) ----------
export async function BudgetsRegistry(c: Ctx) {
  const { sb, me, project, versions, names } = c;
  const totals = await D.getTotals(sb, project.id);
  const v = c.version;

  const rows: F.BudgetRegistryRow[] = versions.map((ver) => ({
    version: ver,
    totals: totals.find((t) => t.version_id === ver.id) ?? null,
    names,
  }));

  const approved = versions.filter((ver) => ver.status === "approved").pop();
  const cur = approved ?? versions[versions.length - 1];
  const curTotals = cur ? totals.find((t) => t.version_id === cur.id) : null;
  const initialVersion = versions[0];
  const initialTotals = initialVersion ? totals.find((t) => t.version_id === initialVersion.id) : null;

  const canManage = D.can(me, "project.setup", project.id) || D.can(me, "version.open", project.id);

  return (
    <>
      <F.StageProcessBar projectId={project.id} activeTab="overview" versionNumber={v?.number ?? null} />

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Budgets & Revisions Registry · {project.name}</h2>
            <span className="sub">
              All baseline and revision budgets for this project with financial periods, cost totals, variances, and action buttons.
            </span>
          </div>
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <Link href={`/budget/${project.id}/periods`} className="btn-action">
              View Incurred by Period (M / Q / Y) →
            </Link>
            {canManage && (
              <Link href={`/budget/${project.id}/create`} className="btn-action primary">
                + Create Next Revision
              </Link>
            )}
          </div>
        </div>

        {/* Master Registry KPI Strip */}
        <div className="master-kpi-strip">
          <div className="master-kpi-tile">
            <span className="kpi-label">Original Baseline Budget</span>
            <span className="kpi-val">
              {initialTotals ? `₹${fmt(initialTotals.initial_cr)} Cr` : "—"}
            </span>
            <span className="kpi-sub">R1 Initial baseline</span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">Current Approved CTC</span>
            <span className="kpi-val">
              {curTotals ? `₹${fmt(curTotals.ctc_cr)} Cr` : "—"}
            </span>
            <span className="kpi-sub">
              {approved ? `Revision R${approved.number}` : "Latest working figure"}
            </span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">Total Incurred Actuals</span>
            <span className="kpi-val">
              {curTotals ? `₹${fmt(curTotals.incurred_cr)} Cr` : "—"}
            </span>
            <span className="kpi-sub">Spent to date</span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">Unspent Balance Headroom</span>
            <span className="kpi-val">
              {curTotals ? `₹${fmt(curTotals.balance_cr)} Cr` : "—"}
            </span>
            <span className="kpi-sub">Remaining unspent CTC</span>
          </div>
          <div className="master-kpi-tile">
            <span className="kpi-label">Total Versions Logged</span>
            <span className="kpi-val">{versions.length}</span>
            <span className="kpi-sub">Baseline + Revisions</span>
          </div>
        </div>

        {/* Dedicated Budgets Registry Table with Action Buttons */}
        <F.BudgetsRegistryTable
          project={project}
          rows={rows}
          canCreate={canManage}
          canManage={canManage}
        />
      </section>
    </>
  );
}

// ---------- set-up ----------
export async function Setup(c: Ctx) {
  const { sb, me, project, version: v } = c;
  const can = D.can(me, "project.setup", project.id);
  const [towers, heads, depts, template, areas, buildingTypes] = await Promise.all([
    D.getTowers(sb, project.id),
    D.getHeads(sb, project.id),
    D.getDepartments(sb),
    getTemplate(sb),
    v ? D.getVersionAreas(sb, v.id) : Promise.resolve(null),
    D.getBuildingTypes(sb),
  ]);
  // GST rules master (Masters & setup → Masters); empty until migration 20261028121200 is applied
  const gstRules = ((await sb.from("budget_gst_rules").select("id, name, rate_pct, share_pct").eq("active", true).order("sort").order("name")).data ?? [])
    .map((r) => ({ id: Number(r.id), name: String(r.name), rate: Number(r.rate_pct), share: Number(r.share_pct) }));
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
    ...[...groups].map(([k, ids]) => { const [d, cat] = k.split("|"); return { value: `cat:${k}`, label: `All of ${(dept.get(Number(d))?.name ?? "Department")} · ${cat}`, ids }; }),
    ...plain.map((h) => ({ value: `head:${h.id}`, label: `${(dept.get(h.department_id)?.name ?? "Head")} · ${h.sub_category || h.category}`, ids: [h.id] })),
  ];
  const tc = await loadCustom(sb, "tower", project.id, new Map(towers.map((t) => [t.id, { carpet_area: cr(t.carpet_area), eng_area: cr(t.eng_area), oc_date: day(t.oc_date) }])), await lookupNames(sb, project.id, c.names));
  const tf = tc.fields.filter((f) => f.show_in_entry);
  const picks = await picksFor(sb, project.id, c.names);
  const editAreas = !!v && v.status === "draft" && can;
  // one master per screen: /budget/<project>/setup?section=project|towers|heads|signoff|new
  const qs = (k: string) => `/budget/${project.id}/setup?${v ? `v=${v.number}&` : ""}section=${k}`;
  const tabs = [
    can ? { key: "project", label: "Project details", href: qs("project"), hint: "Name, code and location of the project." } : null,
    { key: "towers", label: "Towers & areas", href: qs("towers"), count: towers.length, hint: can ? "Name each tower and set its building type (the Summary groups construction by type), then the areas of this version." : "Read only for you." },
    { key: "heads", label: "Cost heads", href: qs("heads"), count: heads.length, hint: "One list of cost heads per project, so names never drift between files." },
    { key: "signoff", label: "Sign-off chain", href: qs("signoff"), hint: "Who signs a version, and in which order, before it is approved." },
  ].filter(Boolean) as { key: string; label: string; href: string; count?: number; hint?: string }[];
  const section = tabs.some((t) => t.key === c.search.section) ? c.search.section! : tabs[0].key;
  return (
    <>
      <F.StageProcessBar projectId={project.id} activeTab="setup" versionNumber={v?.number ?? null} />
      <MasterNav label="Project setup masters" items={tabs} active={section} />
      {section === "project" && can && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Project details · {project.name}</h2>
              <span className="sub">Core project identity and attributes</span>
            </div>
            <F.EditProjectModal p={project} />
          </div>
          <div className="master-kpi-strip">
            <div className="master-kpi-tile">
              <span className="kpi-label">Project Code</span>
              <span className="kpi-val"><span className="chip">{project.code}</span></span>
              <span className="kpi-sub">Identifier in budgets</span>
            </div>
            <div className="master-kpi-tile">
              <span className="kpi-label">Location</span>
              <span className="kpi-val">{project.location || "Not set"}</span>
              <span className="kpi-sub">City / Suburb</span>
            </div>
            <div className="master-kpi-tile">
              <span className="kpi-label">Towers Configured</span>
              <span className="kpi-val">{towers.length}</span>
              <span className="kpi-sub">Subprojects</span>
            </div>
            <div className="master-kpi-tile">
              <span className="kpi-label">Cost Heads</span>
              <span className="kpi-val">{heads.length}</span>
              <span className="kpi-sub">Master line items</span>
            </div>
          </div>
          <F.ProjectForm key={project.id} p={project} />
        </section>
      )}

      {section === "towers" && (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Towers & Subprojects · {project.name}</h2>
                <span className="sub">{towers.length} towers · physical structures and areas</span>
              </div>
              {can && <F.AddTowerModal projectId={project.id} buildingTypes={buildingTypes} />}
            </div>

            <div className="master-kpi-strip">
              <div className="master-kpi-tile">
                <span className="kpi-label">Total Towers</span>
                <span className="kpi-val">{towers.length}</span>
                <span className="kpi-sub">Active structures / wings</span>
              </div>
              <div className="master-kpi-tile">
                <span className="kpi-label">Total Carpet Area</span>
                <span className="kpi-val">
                  {towers.reduce((s, t) => s + (t.carpet_area || 0), 0).toLocaleString()} sft
                </span>
                <span className="kpi-sub">Sum of tower carpet areas</span>
              </div>
              <div className="master-kpi-tile">
                <span className="kpi-label">Total Construction BUA</span>
                <span className="kpi-val">
                  {towers.reduce((s, t) => s + (t.eng_area || 0), 0).toLocaleString()} sft
                </span>
                <span className="kpi-sub">Engineering BUA</span>
              </div>
            </div>

            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tower</th>
                    <th>Building type</th>
                    <th className="n">Carpet area (sft)</th>
                    <th className="n">Engg. construction area (sft)</th>
                    <th>Planned OC date</th>
                    {tf.map((f) => (
                      <th key={f.id} title={fieldTitle(f)}>
                        {f.label}{f.required && " *"}
                      </th>
                    ))}
                    {can && <th className="actions-col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {towers.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td>
                        {t.type ? <span className="chip">{t.type}</span> : <span className="sub">Not set</span>}
                      </td>
                      <td className="n">
                        {t.carpet_area ? `${t.carpet_area.toLocaleString()} sft` : "—"}
                      </td>
                      <td className="n">
                        {t.eng_area ? `${t.eng_area.toLocaleString()} sft` : "—"}
                      </td>
                      <td>{t.oc_date ? dmy(t.oc_date) : "—"}</td>
                      {tf.map((f) => (
                        <td key={f.id}>
                          <CustomInput
                            field={f}
                            entity="tower"
                            entityId={t.id}
                            cell={tc.cells.get(t.id)?.[f.key]}
                            editable={can}
                            picks={picks}
                            compact
                          />
                        </td>
                      ))}
                      {can && (
                        <td className="actions">
                          <div className="actions-group">
                            <F.EditTowerModal t={t} buildingTypes={buildingTypes} />
                            <F.DeleteTowerConfirmDialog towerId={t.id} towerName={t.name} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {towers.length === 0 && (
                    <tr>
                      <td colSpan={6 + tf.length} className="sub text-center py-6">
                        No towers configured yet. Click &quot;Add Tower&quot; above to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {v && (
            <section className="panel">
              <div className="panel-head">
                <h2>Areas for R{v.number}</h2>
                <span className="sub">{editAreas ? "Saved with this draft version" : "Areas are kept per version; edit them on a draft version"}</span>
              </div>
              <F.AreasForm key={v.id} versionId={v.id} areas={v.areas as Record<string, unknown>} editable={editAreas} net={areas?.net_sale_carpet ?? null} />
            </section>
          )}
        </>
      )}

      {section === "heads" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Cost Heads Master · {project.name}</h2>
              <span className="sub">{heads.length} cost heads configured</span>
            </div>
            {can && (
              <F.AddCostHeadModal
                projectId={project.id}
                departments={depts}
                summaryOptions={options}
                gstRules={gstRules}
                baseOptions={baseOptions}
              />
            )}
          </div>

          <div className="master-kpi-strip">
            <div className="master-kpi-tile">
              <span className="kpi-label">Total Cost Heads</span>
              <span className="kpi-val">{heads.length}</span>
              <span className="kpi-sub">Across all departments</span>
            </div>
            <div className="master-kpi-tile">
              <span className="kpi-label">Direct Cost Heads</span>
              <span className="kpi-val">{plain.length}</span>
              <span className="kpi-sub">Standard expenditure heads</span>
            </div>
            <div className="master-kpi-tile">
              <span className="kpi-label">Tax / GST Heads</span>
              <span className="kpi-val">{heads.length - plain.length}</span>
              <span className="kpi-sub">Rule-calculated tax heads</span>
            </div>
          </div>

          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th className="label">Department</th>
                  <th className="label">Category</th>
                  <th className="label-sm">Sub-category</th>
                  <th>Summary row</th>
                  <th>GST rule</th>
                  {can && <th className="actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => {
                  const d = dept.get(h.department_id)!;
                  const byTower = d.summary_category === "Construction" && !h.is_tax;
                  return (
                    <tr key={h.id}>
                      <td>{d.name}</td>
                      <td><strong>{h.category}</strong></td>
                      <td>{h.sub_category || <span className="sub">—</span>}</td>
                      <td>
                        {byTower ? (
                          <span className="sub" style={{ fontStyle: "italic" }}>
                            By tower building type
                          </span>
                        ) : (
                          h.summary_subcategory || <span className="sub">—</span>
                        )}
                      </td>
                      <td>
                        {h.is_tax ? (
                          <span className="chip">
                            GST {Number(h.tax_rate_pct)}% × {Number(h.tax_share_pct ?? 100)}%
                          </span>
                        ) : (
                          <span className="sub">—</span>
                        )}
                      </td>
                      {can && (
                        <td className="actions">
                          <div className="actions-group">
                            <F.EditCostHeadModal
                              h={h}
                              deptName={d.name}
                              options={options[d.summary_category] ?? []}
                            />
                            <F.DeleteCostHeadConfirmDialog
                              headId={h.id}
                              headName={h.sub_category ? `${h.category} · ${h.sub_category}` : h.category}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="sub text-center py-6">
                      No cost heads configured yet. Click &quot;Add Cost Head&quot; above to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {section === "signoff" && <SignoffSetup c={c} />}
    </>
  );
}
