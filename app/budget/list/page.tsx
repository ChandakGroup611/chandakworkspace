import Link from "next/link";
import * as D from "@/lib/budget/data";
import { dmy, fmt, fmtPct, formatBudgetPeriod, isNeg, versionTitle } from "@/lib/budget/format";
import { loadSession } from "../_components/page-data";
import { Shell } from "../_components/shell";
import { budgetRights } from "../_components/budget-record";
import { DeleteDraftButton, RecordList, type RecordRow } from "../_components/record-list";

export const dynamic = "force-dynamic";

// All budgets: every version of every project in one list, with search, filters, actions and a detail drawer.
// Clicking a row shows its details; "Open budget" goes to the budget's own page.
export default async function AllBudgets({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const sp = searchParams ? await searchParams : {};
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const [projects, versions, totals, names] = await Promise.all([D.getProjects(sb), D.getVersions(sb), D.getTotals(sb), D.getMemberNames(sb)]);
  const pById = new Map(projects.map((p) => [p.id, p]));
  const Neg = ({ v }: { v: number | null | undefined }) => <span className={isNeg(v) ? "neg" : ""}>{fmt(v)}</span>;
  const who = (id: string | null) => (id && names[id]) || "";
  const canCreate = D.can(me, "project.create") || D.can(me, "version.open");

  const sorted = versions.filter((v) => pById.has(v.project_id))
    .sort((a, b) => pById.get(a.project_id)!.name.localeCompare(pById.get(b.project_id)!.name) || b.number - a.number);
  const fys = new Set<string>();
  const rows: RecordRow[] = sorted.map((v) => {
    const p = pById.get(v.project_id)!;
    const t = totals.find((x) => x.version_id === v.id);
    const per = formatBudgetPeriod(v.as_on, p.fy_start_month);
    fys.add(per.fy);
    const own = versions.filter((x) => x.project_id === p.id);
    const r = budgetRights(me, own, v);
    const latest = Math.max(...own.map((x) => x.number)) === v.number;
    const href = `/budget/${p.id}/view?v=${v.number}`;
    return {
      id: `${p.id}-${v.number}`,
      search: [p.name, p.code, `r${v.number}`, versionTitle(v.number), v.reason, who(v.prepared_by), v.status].filter(Boolean).join(" ").toLowerCase(),
      filters: { project: String(p.id), status: v.status, fy: per.fy, latest: latest ? "latest" : "older" },
      tone: (t?.variance_cr ?? 0) < 0 ? "warn" : "",
      cells: [
        <span key="p"><Link href={href} className="rl-link">{p.name}</Link><small className="sub block">{p.code}{p.location ? ` · ${p.location}` : ""}</small></span>,
        <span key="v"><b>R{v.number}</b> <small className="sub">{v.number === 1 ? "Baseline" : `Revision ${v.number - 1}`}</small>{latest && <span className="chip">Latest</span>}</span>,
        <span key="s" className={`pill ${v.status}`}>{v.status.replace("_", " ")}</span>,
        <span key="f">{per.fy} · {per.quarter}<small className="sub block">as on {dmy(v.as_on)}</small></span>,
        fmt(t?.initial_cr), <b key="c">{fmt(t?.ctc_cr)}</b>, fmt(t?.incurred_cr), <Neg key="b" v={t?.balance_cr} />,
        t?.util_pct == null ? "" : fmtPct(t.util_pct),
        who(v.prepared_by),
      ],
      title: `${p.name} · ${versionTitle(v.number)}`,
      subtitle: <><span className={`pill ${v.status}`}>{v.status.replace("_", " ")}</span> {per.label}</>,
      detail: [
        ["Project", `${p.name} (${p.code})`], ["Version", `R${v.number} · ${versionTitle(v.number)}`], ["Status", v.status.replace("_", " ")],
        ["Financial year", `${per.fy} · ${per.quarter}`], ["As on", dmy(v.as_on)], ["Reason", v.reason ?? ""],
        ["Initial budget (Cr)", fmt(t?.initial_cr)], ["Estimated CTC (Cr)", fmt(t?.ctc_cr)], ["Cost incurred (Cr)", fmt(t?.incurred_cr)],
        ["Balance (Cr)", <Neg key="b" v={t?.balance_cr} />], ["Variance vs initial (Cr)", <Neg key="va" v={t?.variance_cr} />], ["Utilised", t?.util_pct == null ? "" : fmtPct(t.util_pct)],
        ["Prepared by", who(v.prepared_by)], ["Approved by", v.approved_by ? `${who(v.approved_by)}${v.approved_at ? `, ${dmy(v.approved_at)}` : ""}` : "Not yet"],
      ],
      href, hrefLabel: "Open budget",
      actions: <>
        {r.canEdit && <Link className="btn-action primary" href={`/budget/${p.id}/edit?v=${v.number}`}>Edit</Link>}
        {r.canStartNext && <Link className="btn-action" href={`/budget/${p.id}/create`}>Revise (R{r.nextNumber})</Link>}
        <Link className="btn-action" href={`/budget/${p.id}/summary?v=${v.number}`}>Report</Link>
        {r.canDelete && <DeleteDraftButton versionId={v.id} number={v.number} back="/budget/list" />}
      </>,
    };
  });
  const count = (s: string) => versions.filter((v) => v.status === s).length;

  return (
    <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="list">
      <section className="panel">
        <div className="panel-head">
          <div><h2>All budgets</h2><p className="sub">Every budget and revision of every project. Click a row for details, or Open to go to the budget. Amounts in crores.</p></div>
          {canCreate && <Link href="/budget/create" className="btn-action primary big">+ Create budget</Link>}
        </div>
        <div className="br-kpis compact">
          <div className="br-kpi"><span>Budgets</span><b>{versions.length}</b><small>{projects.length} projects</small></div>
          <div className="br-kpi warn"><span>Drafts</span><b>{count("draft")}</b><small>being prepared</small></div>
          <div className="br-kpi accent"><span>Under sign-off</span><b>{count("in_review")}</b><small><Link href="/budget/approvals">Open approvals</Link></small></div>
          <div className="br-kpi good"><span>Approved</span><b>{count("approved")}</b><small>locked</small></div>
        </div>
        <RecordList
          columns={[{ label: "Project", className: "label" }, { label: "Version" }, { label: "Status" }, { label: "Period" }, { label: "Initial", className: "n" },
            { label: "CTC", className: "n" }, { label: "Incurred", className: "n" }, { label: "Balance", className: "n" }, { label: "Utilised", className: "n" }, { label: "Prepared by" }]}
          rows={rows}
          initialFilters={sp.project ? { project: sp.project } : sp.status ? { status: sp.status } : undefined}
          highlight={sp.created ?? null}
          searchPlaceholder="Search project, version, reason, preparer…"
          filters={[
            { key: "project", label: "Project", options: projects.map((p): [string, string] => [String(p.id), p.name]) },
            { key: "status", label: "Status", options: [["draft", "Draft"], ["in_review", "Under sign-off"], ["approved", "Approved"]] },
            { key: "fy", label: "Financial year", options: [...fys].sort().map((f): [string, string] => [f, f]) },
            { key: "latest", label: "Show", options: [["latest", "Latest version only"], ["older", "Older versions"]] },
          ]}
          empty={<>No budgets yet. {canCreate && <Link href="/budget/create">Create the first one</Link>}</>}
        />
      </section>
    </Shell>
  );
}
