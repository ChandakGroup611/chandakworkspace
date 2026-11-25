import Link from "next/link";
import * as D from "@/lib/budget/data";
import type { Version } from "@/lib/budget/data";
import { dmy, fmt, fmtPct, formatBudgetPeriod, isNeg, versionTitle } from "@/lib/budget/format";
import { DeleteDraftButton, DeleteLineButton, RecordList, type RecordRow, SavedBanner } from "./record-list";
import { Notice, VersionBanner } from "./shell";
import type { Ctx } from "./views";

// The budget's own page (/budget/<project>/view?v=<n>): what it is, where it stands, its totals and every line,
// with one row of actions (Edit, Sign-off, Reports, Delete). This is where saving, the lists and the approvals land.

const Neg = ({ v }: { v: number | null | undefined }) => <span className={isNeg(v) ? "neg" : ""}>{fmt(v)}</span>;

/** What the signed-in person may do with a version, shared by the budget page and the lists. */
export function budgetRights(me: D.Me, versions: Version[], v: Version) {
  const open = versions.find((x) => x.status !== "approved") ?? null;
  const latestApproved = versions.filter((x) => x.status === "approved").pop() ?? null;
  return {
    canEdit: v.status === "draft" && D.canChangeDraft(me, v),
    canEditLines: v.status === "draft" && D.can(me, "budget.edit", v.project_id),
    canDelete: v.status === "draft" && D.canChangeDraft(me, v),
    canStartNext: !open && latestApproved?.id === v.id && D.can(me, "version.open", v.project_id),
    nextNumber: Math.max(0, ...versions.map((x) => x.number)) + 1,
    canExport: D.can(me, "report.export", v.project_id),
  };
}

export async function BudgetRecord(c: Ctx & { version: Version }) {
  const { sb, me, project, versions, version: v, names, search } = c;
  const pid = project.id;
  const [totals, depts, figs] = await Promise.all([D.getTotals(sb, pid), D.getDepartmentTotals(sb, v.id), D.getLineFigures(sb, v.id)]);
  const t = totals.find((x) => x.version_id === v.id) ?? null;
  const period = formatBudgetPeriod(v.as_on, project.fy_start_month);
  const r = budgetRights(me, versions, v);
  const parent = versions.find((x) => x.id === v.parent_id) ?? null;
  const q = `?v=${v.number}`;
  const who = (id: string | null) => (id && names[id]) || "—";

  const lines = figs.filter((f) => !f.is_memo);
  const rows: RecordRow[] = lines.map((f) => ({
    id: String(f.line_id),
    tone: f.over_budget ? "bad" : "",
    search: [f.department, f.category, f.sub_category, f.subproject, f.remark].filter(Boolean).join(" ").toLowerCase(),
    filters: { dept: f.department, tower: f.subproject ?? "Whole project", status: f.over_budget ? "over" : Number(f.ctc_cr) === 0 ? "zero" : "ok" },
    cells: [
      f.department,
      <span key="c"><b>{f.category}</b>{f.sub_category ? <small className="sub block">{f.sub_category}</small> : null}{f.is_tax && <span className="chip">GST</span>}</span>,
      f.subproject ?? <span className="sub">Whole project</span>,
      fmt(f.initial_cr), <b key="b">{fmt(f.ctc_cr)}</b>, fmt(f.incurred_cr), <Neg key="bal" v={f.balance_cr} />, <Neg key="var" v={f.variance_cr} />,
      f.util_pct == null ? "" : fmtPct(f.util_pct),
    ],
    title: `${f.category}${f.sub_category ? ` · ${f.sub_category}` : ""}`,
    subtitle: `${f.department}${f.subproject ? ` · ${f.subproject}` : ""} · R${v.number}`,
    detail: [
      ["Department", f.department], ["Category", f.category], ["Sub-category", f.sub_category ?? ""], ["Tower", f.subproject ?? "Whole project"],
      ["Initial budget (Cr)", fmt(f.initial_cr)], ["Estimated CTC (Cr)", <b key="b">{fmt(f.ctc_cr)}</b>], ["Cost incurred (Cr)", fmt(f.incurred_cr)],
      ["Balance to spend (Cr)", <Neg key="bal" v={f.balance_cr} />], ["Variance vs initial (Cr)", <Neg key="var" v={f.variance_cr} />],
      ["Utilised", f.util_pct == null ? "" : fmtPct(f.util_pct)],
      ["CTC set as", f.ctc_rule === "rate" ? `₹${f.ctc_rate}/sft × area` : f.ctc_rule === "balance" ? "Balance of a total" : f.ctc_rule === "tax" ? "GST rule" : "Typed amount"],
      ["Source", f.source === "excel" ? "Imported from Excel" : "Typed"], ["Remark", f.remark ?? ""],
    ],
    href: `/budget/${pid}/line?v=${v.number}&id=${f.line_id}`, hrefLabel: "Open line history & comments",
    ...(r.canEditLines ? {
      actions: <>
        <Link className="btn-action" href={`/budget/${pid}/entry${q}&mode=form#l${f.line_id}`}>Edit</Link>
        <DeleteLineButton lineId={f.line_id} />
      </>,
    } : {}),
  }));
  const deptNames = [...new Set(lines.map((f) => f.department))];
  const towerNames = [...new Set(lines.map((f) => f.subproject ?? "Whole project"))];
  const sum = (k: "initial_cr" | "ctc_cr" | "incurred_cr" | "balance_cr" | "variance_cr") => lines.reduce((s, f) => s + Number(f[k] ?? 0), 0);

  const kpi = (label: string, value: React.ReactNode, small?: string, tone = "") => (
    <div className={`br-kpi ${tone}`}><span>{label}</span><b>{value}</b>{small && <small>{small}</small>}</div>
  );

  return (
    <>
      {search.saved && (
        <SavedBanner text={<><b>{search.saved === "created" ? `${versionTitle(v.number)} is created as a draft.` : `R${v.number} is saved.`}</b> This is the budget&apos;s own page. Find it any time under <b>All budgets</b> in the top bar. When the figures are final, send it for sign-off from the bar below.</>}>
          {r.canEdit && <Link className="btn-action" href={`/budget/${pid}/edit${q}`}>Keep editing</Link>}
          <Link className="btn-action" href="/budget/list">All budgets</Link>
        </SavedBanner>
      )}
      <VersionBanner sb={sb} me={me} project={project} version={v} names={names} />

      <section className="panel br-head">
        <div className="br-title">
          <span className="br-eyebrow">{project.name} · {project.code}</span>
          <h1>{versionTitle(v.number)} <span className={`pill ${v.status}`}>{v.status.replace("_", " ")}</span></h1>
          <p className="sub">{period.fy} · {period.quarter} · figures as on {period.asOnFormatted}{v.reason ? ` · ${v.reason}` : ""}</p>
        </div>
        <div className="br-actions">
          {r.canEdit && <Link className="btn-action primary big" href={`/budget/${pid}/edit${q}`}>✎ Edit budget</Link>}
          {!r.canEdit && r.canEditLines && <Link className="btn-action primary big" href={`/budget/${pid}/entry${q}&mode=form`}>✎ Edit my lines</Link>}
          {r.canStartNext && <Link className="btn-action primary big" href={`/budget/${pid}/create`}>+ Start revision R{r.nextNumber}</Link>}
          <Link className="btn-action" href={`/budget/${pid}/entry${q}`}>Budget sheet</Link>
          <Link className="btn-action" href={`/budget/${pid}/summary${q}`}>Summary report</Link>
          <Link className="btn-action" href={`/budget/${pid}/detail${q}`}>Detail report</Link>
          {versions.length > 1 && <Link className="btn-action" href={`/budget/${pid}/compare${q}`}>Compare</Link>}
          {r.canExport && <a className="btn-action" href={`/budget/${pid}/export/detail${q}`} download>⬇ Excel</a>}
          {r.canDelete && <DeleteDraftButton versionId={v.id} number={v.number} back="/budget/list" />}
        </div>
        <dl className="br-meta">
          <div><dt>Version</dt><dd>R{v.number}{parent ? ` (from R${parent.number})` : ""}</dd></div>
          <div><dt>Status</dt><dd><span className={`pill ${v.status}`}>{v.status.replace("_", " ")}</span></dd></div>
          <div><dt>As on</dt><dd>{dmy(v.as_on)}</dd></div>
          <div><dt>Period</dt><dd>{period.range}</dd></div>
          <div><dt>Prepared by</dt><dd>{who(v.prepared_by)}</dd></div>
          <div><dt>Approved</dt><dd>{v.approved_by ? `${who(v.approved_by)}${v.approved_at ? `, ${dmy(v.approved_at)}` : ""}` : "Not yet"}</dd></div>
        </dl>
      </section>

      {v.status === "in_review" && <Notice kind="draft">Figures are locked while R{v.number} is under sign-off. Use <b>Take back</b> in the bar above to change them.</Notice>}
      {v.status === "approved" && !r.canStartNext && <Notice kind="locked">R{v.number} is approved and locked.{versions.some((x) => x.status !== "approved") ? " Changes go in the newer version." : ""}</Notice>}

      <div className="br-kpis">
        {kpi("Initial budget", `₹${fmt(t?.initial_cr)} Cr`, "(a)")}
        {kpi("Estimated CTC", `₹${fmt(t?.ctc_cr)} Cr`, "(b) cost to complete", "accent")}
        {kpi("Cost incurred", `₹${fmt(t?.incurred_cr)} Cr`, `(c) up to ${dmy(v.as_on)}`)}
        {kpi("Balance to spend", <Neg v={t?.balance_cr} />, "(b − c) Cr", (t?.balance_cr ?? 0) < 0 ? "bad" : "")}
        {kpi("Variance vs initial", <Neg v={t?.variance_cr} />, "(a − b) Cr", (t?.variance_cr ?? 0) < 0 ? "bad" : "good")}
        {kpi("Utilised", t?.util_pct == null ? "—" : fmtPct(t.util_pct), "c ÷ b", (t?.util_pct ?? 0) > 100 ? "bad" : (t?.util_pct ?? 0) >= 90 ? "warn" : "")}
      </div>

      <section className="panel">
        <div className="panel-head"><h2>By department</h2><span className="sub">Crores · click a department to see its lines below</span></div>
        <div className="scroll"><table><thead><tr><th className="label">Department</th><th className="n">Initial (a)</th><th className="n">CTC (b)</th><th className="n">Incurred (c)</th><th className="n">Balance (b−c)</th><th className="n">Variance (a−b)</th><th className="n">Utilised</th></tr></thead><tbody>
          {depts.map((d) => <tr key={d.department_id}><td><a href={`#lines`}>{d.department}</a></td><td className="n">{fmt(d.initial_cr)}</td><td className="n"><b>{fmt(d.ctc_cr)}</b></td><td className="n">{fmt(d.incurred_cr)}</td><td className="n"><Neg v={d.balance_cr} /></td><td className="n"><Neg v={d.variance_cr} /></td><td className="n">{d.util_pct == null ? "" : fmtPct(d.util_pct)}</td></tr>)}
          {depts.length === 0 && <tr><td colSpan={7} className="rl-empty">No lines yet. {r.canEdit ? <Link href={`/budget/${pid}/edit${q}`}>Add them in Edit budget</Link> : null}</td></tr>}
          {t && depts.length > 0 && <tr className="total"><td>Total</td><td className="n">{fmt(t.initial_cr)}</td><td className="n">{fmt(t.ctc_cr)}</td><td className="n">{fmt(t.incurred_cr)}</td><td className="n"><Neg v={t.balance_cr} /></td><td className="n"><Neg v={t.variance_cr} /></td><td className="n">{t.util_pct == null ? "" : fmtPct(t.util_pct)}</td></tr>}
        </tbody></table></div>
      </section>

      <section className="panel" id="lines">
        <div className="panel-head"><h2>Budget lines · {lines.length}</h2><span className="sub">Click a line for its full details</span></div>
        <RecordList
          columns={[{ label: "Department" }, { label: "Category", className: "label" }, { label: "Tower" }, { label: "Initial", className: "n" }, { label: "CTC", className: "n" },
            { label: "Incurred", className: "n" }, { label: "Balance", className: "n" }, { label: "Variance", className: "n" }, { label: "Utilised", className: "n" }]}
          rows={rows}
          searchPlaceholder="Search category, sub-category, remark…"
          filters={[
            { key: "dept", label: "Department", options: deptNames.map((d): [string, string] => [d, d]) },
            ...(towerNames.length > 1 ? [{ key: "tower", label: "Tower", options: towerNames.map((d): [string, string] => [d, d]) }] : []),
            { key: "status", label: "Status", options: [["over", "Over budget"], ["zero", "No CTC yet"], ["ok", "Within budget"]] },
          ]}
          empty={r.canEdit ? <>No lines yet. <Link href={`/budget/${pid}/edit${q}`}>Add them in Edit budget</Link>.</> : "No lines yet."}
          footer={<tr className="total"><td colSpan={3}>Total ({lines.length} lines)</td><td className="n">{fmt(sum("initial_cr"))}</td><td className="n">{fmt(sum("ctc_cr"))}</td><td className="n">{fmt(sum("incurred_cr"))}</td><td className="n"><Neg v={sum("balance_cr")} /></td><td className="n"><Neg v={sum("variance_cr")} /></td><td></td><td></td></tr>}
        />
      </section>

      {versions.length > 1 && <section className="panel">
        <div className="panel-head"><h2>Other versions of {project.name}</h2><Link className="btn-action" href={`/budget/list?project=${pid}`}>All budgets of this project</Link></div>
        <ul className="br-versions">
          {versions.slice().reverse().map((x) => {
            const xt = totals.find((y) => y.version_id === x.id);
            return <li key={x.id} aria-current={x.id === v.id ? "true" : undefined}>
              <Link href={`/budget/${pid}/view?v=${x.number}`}><b>R{x.number}</b> {versionTitle(x.number)}</Link>
              <span className={`pill ${x.status}`}>{x.status.replace("_", " ")}</span>
              <span className="sub">as on {dmy(x.as_on)} · CTC {fmt(xt?.ctc_cr)} Cr</span>
            </li>;
          })}
        </ul>
      </section>}
    </>
  );
}
