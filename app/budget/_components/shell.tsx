import Link from "next/link";
import { type Db, type Me, type Project, type Version, can, canApprove, canChangeDraft, chainOf, getSignoffLevels, getSignoffStatus, limitedToDepartments } from "@/lib/budget/data";
import { dmy } from "@/lib/budget/format";
import { Selectors, SignoffActions } from "./forms";

export const TABS: [string, string][] = [
  ["start", "Get started"], ["overview", "Overview"], ["entry", "Budget entry"], ["import", "Import from Excel"], ["summary", "Summary report"],
  ["detail", "Detail report"], ["compare", "Compare versions"], ["incurred", "Cost incurred"], ["periods", "Month / quarter / year"],
  ["setup", "Project setup"], ["workings", "Tower workings"], ["schedules", "Schedules"], ["line", "Budget line"], ["guide", "Workflow guide & learning hub"],
];

/* ---------- information architecture ----------
 * Budget is organised by task, not by workbook sheet:
 *   Projects (home) → a project: Overview · Prepare budget · Actuals · Reports · Setup
 *   Administration (shared masters, access & roles, custom fields) is a separate area, never inside a project.
 * Each area is shown only to people with the rights to use it (same rule as the database, D.can).
 */
export type Area = "home" | "start" | "overview" | "prepare" | "actuals" | "reports" | "setup" | "help" | "admin";

export const AREA_OF: Record<string, Area> = {
  home: "home", start: "start", overview: "overview",
  entry: "prepare", workings: "prepare", schedules: "prepare", import: "prepare", line: "prepare",
  incurred: "actuals",
  summary: "reports", detail: "reports", compare: "reports", periods: "reports",
  setup: "setup", guide: "help",
  masters: "admin", access: "admin", fields: "admin",
};

interface SubTab { id: string; label: string }
const AREAS: { id: Area; label: string; first: string; subs?: SubTab[] }[] = [
  { id: "start", label: "Get started", first: "start" },
  { id: "overview", label: "Overview", first: "overview" },
  { id: "prepare", label: "Prepare budget", first: "entry", subs: [
    { id: "entry", label: "Budget entry" }, { id: "workings", label: "Tower workings" }, { id: "schedules", label: "Schedules" }, { id: "import", label: "Import Excel (optional)" },
  ] },
  { id: "actuals", label: "Actuals", first: "incurred" },
  { id: "reports", label: "Reports", first: "summary", subs: [
    { id: "summary", label: "Summary" }, { id: "detail", label: "Detail" }, { id: "compare", label: "Compare versions" }, { id: "periods", label: "Periodic breakdown" },
  ] },
  { id: "setup", label: "Setup", first: "setup" },
];
const ADMIN_TABS: { id: string; label: string; href: string; right: (me: Me) => boolean }[] = [
  { id: "masters", label: "Common masters", href: "/budget/admin/masters", right: (me) => can(me, "project.setup") },
  { id: "access", label: "Access & roles", href: "/budget/admin/access", right: (me) => can(me, "access.manage") },
  { id: "fields", label: "Custom fields", href: "/budget/admin/fields", right: (me) => can(me, "fields.manage") },
];
const TAB_LABEL: Record<string, string> = Object.fromEntries([
  ...AREAS.flatMap((a) => (a.subs ?? []).map((t) => [t.id, t.label] as [string, string])),
  ["start", "Get started"], ["line", "Budget line"], ["guide", "Workflow guide"], ...ADMIN_TABS.map((t) => [t.id, t.label] as [string, string]),
]);

/** Which areas this person may open for the project (the current one is always shown). */
export function areasFor(me: Me, projectId: number | null) {
  const pid = projectId ?? undefined;
  const ok: Record<Area, boolean> = {
    home: true, overview: true, help: true,
    start: can(me, "project.setup", pid) || can(me, "version.open", pid) || can(me, "budget.edit", pid),
    prepare: can(me, "budget.edit", pid) || can(me, "budget.import", pid) || can(me, "version.open", pid) || can(me, "project.setup", pid),
    actuals: can(me, "cost.view", pid) || can(me, "cost.enter", pid),
    reports: can(me, "report.view", pid) || can(me, "budget.view", pid) || can(me, "project.view", pid),
    setup: can(me, "project.setup", pid),
    admin: ADMIN_TABS.some((t) => t.right(me)),
  };
  return ok;
}

/** Where a person starts in a project: their own work first. */
export function landingTab(me: Me, projectId: number) {
  if (limitedToDepartments(me) && can(me, "budget.edit", projectId)) return "entry";
  const a = areasFor(me, projectId);
  if (!a.prepare && !a.setup && a.reports) return "summary";
  return "overview";
}

const STEPS = ["Set up", "Prepare", "Sign-off", "Approved"] as const;
function Stepper({ status }: { status: Version["status"] | null }) {
  const at = status == null ? 0 : status === "draft" ? 1 : status === "in_review" ? 2 : 3;
  return (
    <ol className="stepper" aria-label="Budget progress">
      {STEPS.map((label, i) => (
        <li key={label} className={i < at ? "done" : i === at ? "current" : ""} aria-current={i === at ? "step" : undefined}>
          <span className="dot" aria-hidden>{i < at || (i === 3 && at === 3) ? "✓" : i + 1}</span>{label}
        </li>
      ))}
    </ol>
  );
}

export function Shell({ me, projects, project, versions, version, tab, children }: {
  me: Me; projects: Project[]; project: Project | null; versions: Version[]; version: Version | null; tab: string; children: React.ReactNode;
}) {
  const q = version ? `?v=${version.number}` : "";
  const area: Area = AREA_OF[tab] ?? "overview";
  const allowed = areasFor(me, project?.id ?? null);
  const inProject = !!project && area !== "admin" && area !== "home";
  const areaDef = AREAS.find((a) => a.id === area);
  const href = (t: string) => `/budget/${project!.id}/${t}${q}`;
  const helpHref = project ? `/budget/${project.id}/guide${q}` : "/budget/guide";
  const adminTabs = ADMIN_TABS.filter((t) => t.right(me) || t.id === tab);

  return (
    <>
      <header className="top">
        <div className="top-outer">
          <div className="wrap top-bar">
            <nav className="crumbs" aria-label="You are here">
              {area === "home" ? <span className="crumb-current">All projects</span> : <Link href="/budget">Projects</Link>}
              {area === "home" ? null : area === "admin" ? <>
                <span className="crumb-sep" aria-hidden>›</span><span>Administration</span>
                <span className="crumb-sep" aria-hidden>›</span><span className="crumb-current">{TAB_LABEL[tab]}</span>
              </> : project ? <>
                <span className="crumb-sep" aria-hidden>›</span>
                <Link href={href("overview")} className="crumb-project">{project.name}</Link>
                {version && <span className={`pill ${version.status}`}>R{version.number} · {version.status.replace("_", " ")}</span>}
                {area !== "overview" && <><span className="crumb-sep" aria-hidden>›</span>
                  {areaDef?.subs ? <><Link href={href(areaDef.first)}>{areaDef.label}</Link><span className="crumb-sep" aria-hidden>›</span><span className="crumb-current">{TAB_LABEL[tab] ?? tab}</span></>
                    : <span className="crumb-current">{areaDef?.label ?? TAB_LABEL[tab] ?? tab}</span>}</>}
              </> : null}
            </nav>
            <div className="top-selectors">
              {area !== "admin" && (
                <Selectors
                  projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                  projectId={area === "home" ? null : project?.id ?? null}
                  versions={area === "home" ? [] : versions.map((v) => ({ number: v.number, as_on: v.as_on, status: v.status }))}
                  versionNumber={area === "home" ? null : version?.number ?? null}
                  tab={tab}
                />
              )}
              <div className="top-links">
                <Link href={helpHref} className="icon-link" aria-current={area === "help" ? "page" : undefined} title="Workflow guide">? Guide</Link>
                {allowed.admin && <Link href={adminTabs[0]?.href ?? "/budget/admin/masters"} className="icon-link" aria-current={area === "admin" ? "page" : undefined} title="Administration: shared masters, access and custom fields">Administration</Link>}
              </div>
            </div>
          </div>
        </div>

        {inProject && (
          <div className="subnav-outer">
            <div className="wrap budget-subnav">
              <nav className="areas" aria-label={`${project!.name} areas`}>
                {AREAS.filter((a) => allowed[a.id] || a.id === area).map((a) => (
                  <Link key={a.id} href={href(a.first)} aria-current={a.id === area ? "page" : undefined}>{a.label}</Link>
                ))}
              </nav>
              <Stepper status={version?.status ?? null} />
            </div>
            {areaDef?.subs && (
              <div className="wrap subtabs-row">
                <nav className="tabs" aria-label={`${areaDef.label} screens`}>
                  {areaDef.subs.map((t) => <Link key={t.id} href={href(t.id)} aria-current={tab === t.id ? "page" : undefined}>{t.label}</Link>)}
                </nav>
              </div>
            )}
          </div>
        )}

        {area === "admin" && (
          <div className="subnav-outer">
            <div className="wrap budget-subnav">
              <nav className="areas" aria-label="Administration">
                {adminTabs.map((t) => <Link key={t.id} href={t.href} aria-current={tab === t.id ? "page" : undefined}>{t.label}</Link>)}
              </nav>
              {project && <Link href={`/budget/${project.id}/overview`} className="back-link">← Back to {project.name}</Link>}
            </div>
          </div>
        )}
      </header>
      <div className="wrap budget-body">{children}</div>
    </>
  );
}

export async function VersionBanner({ sb, me, project, version, names }: { sb: Db; me: Me; project: Project; version: Version; names: Record<string, string> }) {
  // unknown people (imported versions, removed members) are left out instead of showing "someone"
  const who = (id: string | null) => (id && names[id]) || null;
  const by = (verb: string, id: string | null) => { const n = who(id); return n ? `${verb} by ${n}` : verb; };
  const [levels, steps] = await Promise.all([getSignoffLevels(sb), version.status === "approved" ? Promise.resolve([]) : getSignoffStatus(sb, version.id)]);
  const chain = chainOf(levels, project.id).length > 0;
  const next = steps.find((s) => s.is_next) ?? null;
  const signed = steps.filter((s) => s.signed_by).length;
  // the preparer may take back a version under sign-off: same rule as changing the draft
  const mayRecall = version.status === "in_review" && canChangeDraft(me, { ...version, status: "draft" });
  return (
    <div className={`banner ${version.status === "approved" ? "locked" : "draft"}`}>
      <div><b>{project.name} R{version.number}</b> as on {dmy(version.as_on)} · <span className={`pill ${version.status}`}>{version.status.replace("_", " ")}</span> ·{" "}
        {version.status === "approved" ? by("approved", version.approved_by)
          : version.status === "in_review" ? `${by("prepared", version.prepared_by)}; ${signed} of ${steps.length} signed, waiting for ${next?.title ?? "sign-off"}`
          : `draft ${by("prepared", version.prepared_by)}`}
        {version.reason && ` · ${version.reason}`}</div>
      <SignoffActions versionId={version.id} number={version.number} projectId={project.id} status={version.status} chain={chain}
        mayApprove={canApprove(me, version)} mayRecall={mayRecall} next={next ? { title: next.title, mine: next.approver_ids.includes(me.user_id) } : null} />
    </div>
  );
}

export function Notice({ children, kind = "" }: { children: React.ReactNode; kind?: string }) {
  return <div className={`banner ${kind}`}><div>{children}</div></div>;
}

/** One tab per master (Project details, Towers & areas, Cost heads, …). Only the chosen master is shown below it. */
export interface MasterTab { key: string; label: string; href: string; count?: number; hint?: string }
export function MasterNav({ label, items, active }: { label: string; items: MasterTab[]; active: string }) {
  const current = items.find((i) => i.key === active);
  return (
    <div className="master-head">
      <nav className="master-nav" aria-label={label}>
        {items.map((i) => (
          <Link key={i.key} href={i.href} aria-current={i.key === active ? "page" : undefined} scroll={false}>
            {i.label}{i.count != null && <span className="count">{i.count}</span>}
          </Link>
        ))}
      </nav>
      {current?.hint && <p className="sub master-hint">{current.hint}</p>}
    </div>
  );
}
