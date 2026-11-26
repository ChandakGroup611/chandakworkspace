import Link from "next/link";
import { type Db, type Me, type Project, type Version, can, canApprove, canChangeDraft, chainOf, getSignoffLevels, getSignoffStatus, limitedToDepartments } from "@/lib/budget/data";
import { dmy, formatBudgetPeriod, versionTitle } from "@/lib/budget/format";
import { Selectors, SignoffActions } from "./forms";
import { MoreMenu } from "./more-menu";

export const TABS: [string, string][] = [
  ["start", "Get started"], ["create", "Create budget"], ["overview", "Overview"], ["budgets", "Budgets Registry"], ["entry", "Budget entry"], ["import", "Import from Excel"], ["summary", "Summary report"],
  ["detail", "Detail report"], ["compare", "Compare versions"], ["incurred", "Cost incurred"], ["periods", "Month / quarter / year"],
  ["setup", "Project setup"], ["workings", "Tower workings"], ["schedules", "Schedules"], ["line", "Budget line"], ["guide", "Workflow guide & learning hub"],
  ["view", "Budget"], ["edit", "Edit budget"],
];

/* ---------- information architecture ----------
 * Budget is organised by task, not by workbook sheet:
 *   Projects (home) → a project: Overview · Prepare budget · Actuals · Reports · Setup
 *   Administration (shared masters, access & roles, custom fields) is a separate area, never inside a project.
 * Each area is shown only to people with the rights to use it (same rule as the database, D.can).
 */
export type Area = "home" | "start" | "overview" | "prepare" | "actuals" | "reports" | "setup" | "help" | "admin";

export const AREA_OF: Record<string, Area> = {
  home: "home", start: "start", overview: "overview", budgets: "overview", view: "overview", edit: "prepare",
  create: "prepare", entry: "prepare", workings: "prepare", schedules: "prepare", import: "prepare", line: "prepare",
  incurred: "actuals",
  summary: "reports", detail: "reports", compare: "reports", periods: "reports",
  setup: "setup", guide: "help",
  masters: "admin", access: "admin", fields: "admin",
};

interface SubTab { id: string; label: string }
const AREAS: { id: Area; label: string; first: string; subs?: SubTab[] }[] = [
  { id: "start", label: "Get started", first: "start" },
  { id: "overview", label: "Budget", first: "view", subs: [
    { id: "view", label: "Budget details" }, { id: "overview", label: "Dashboard" }, { id: "budgets", label: "Versions of this project" },
  ] },
  { id: "prepare", label: "Prepare budget", first: "entry", subs: [
    { id: "edit", label: "Edit budget" }, { id: "entry", label: "Budget sheet" }, { id: "workings", label: "Tower workings" }, { id: "schedules", label: "Schedules" }, { id: "import", label: "Import Excel (optional)" },
  ] },
  { id: "actuals", label: "Actuals", first: "incurred" },
  { id: "reports", label: "Reports", first: "summary", subs: [
    { id: "summary", label: "Summary" }, { id: "detail", label: "Detail" }, { id: "compare", label: "Compare versions" }, { id: "periods", label: "Periodic breakdown" },
  ] },
  { id: "setup", label: "Setup", first: "setup" },
];
const ADMIN_TABS: { id: string; label: string; href: string; right: (me: Me) => boolean }[] = [
  { id: "masters", label: "Master Module", href: "/budget/admin/masters", right: (me) => can(me, "project.setup") || can(me, "project.view") },
  { id: "access", label: "Access & roles", href: "/budget/admin/access", right: (me) => can(me, "access.manage") },
  { id: "fields", label: "Custom fields", href: "/budget/admin/fields", right: (me) => can(me, "fields.manage") },
];
const TAB_LABEL: Record<string, string> = Object.fromEntries([
  ...AREAS.flatMap((a) => (a.subs ?? []).map((t) => [t.id, t.label] as [string, string])),
  ["start", "Get started"], ["create", "Create budget"], ["list", "All budgets"], ["line", "Budget line"], ["guide", "Workflow guide"], ["approvals", "Approvals"], ...ADMIN_TABS.map((t) => [t.id, t.label] as [string, string]),
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
  return "view";
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
              {area === "home" ? <h1 className="crumb-current">All projects</h1> : <Link href="/budget">Projects</Link>}
              {area === "home" ? null : area === "admin" ? <>
                <span className="crumb-sep" aria-hidden>›</span><span>Administration</span>
                <span className="crumb-sep" aria-hidden>›</span><h1 className="crumb-current">{TAB_LABEL[tab]}</h1>
              </> : project ? <>
                <span className="crumb-sep" aria-hidden>›</span>
                {/* in the Budget area (except Budget details, which has its own heading) the project name is the page heading */}
                {area === "overview" && tab !== "view"
                  ? <h1 className="crumb-current"><Link href={href("view")} className="crumb-project">{project.name}</Link></h1>
                  : <Link href={href("view")} className="crumb-project">{project.name}</Link>}
                {version && <span className={`pill ${version.status}`}>R{version.number} · {version.status.replace("_", " ")}</span>}
                {area !== "overview" && <><span className="crumb-sep" aria-hidden>›</span>
                  {areaDef?.subs ? <><Link href={href(areaDef.first)}>{areaDef.label}</Link><span className="crumb-sep" aria-hidden>›</span><h1 className="crumb-current">{TAB_LABEL[tab] ?? tab}</h1></>
                    : <h1 className="crumb-current">{areaDef?.label ?? TAB_LABEL[tab] ?? tab}</h1>}</>}
              </> : <>
                {/* a budget page that is not tied to one project, such as the Create budget menu */}
                <span className="crumb-sep" aria-hidden>›</span><h1 className="crumb-current">{TAB_LABEL[tab] ?? tab}</h1>
              </>}
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
                <Link href="/budget/list" className="icon-link strong" aria-current={tab === "list" ? "page" : undefined} title="Every budget of every project, with filters">All budgets</Link>
                {can(me, "project.create") || can(me, "version.open") ? <Link href="/budget/create" className="icon-link cta" aria-current={tab === "create" && !project ? "page" : undefined}>+ Create budget</Link> : null}
                {/* less-used links live in "More" so the header has one main action; all are kept */}
                <MoreMenu active={tab === "approvals" || area === "help" || area === "admin"}>
                  <Link href="/budget/approvals" aria-current={tab === "approvals" ? "page" : undefined}>
                    <span>Approvals</span><small>Versions waiting for sign-off, all projects</small>
                  </Link>
                  <Link href={helpHref} aria-current={area === "help" ? "page" : undefined}>
                    <span>Guide</span><small>How the budget workflow runs</small>
                  </Link>
                  {can(me, "project.view") && <Link href="/budget/admin/masters" aria-current={tab === "masters" ? "page" : undefined}>
                    <span>Masters</span><small>Projects, towers, departments, cost heads, GST, vendors</small>
                  </Link>}
                  {allowed.admin && <Link href={adminTabs.find((t) => t.id !== "masters")?.href ?? "/budget/admin/access"} aria-current={area === "admin" && tab !== "masters" ? "page" : undefined}>
                    <span>Admin</span><small>Access, roles and custom fields</small>
                  </Link>}
                </MoreMenu>
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
  const period = formatBudgetPeriod(version.as_on, project.fy_start_month);
  const vTitle = versionTitle(version.number);

  return (
    <div className={`banner ${version.status === "approved" ? "locked" : "draft"}`}>
      <div>
        <b>{project.name} · {vTitle}</b> ({period.fy} · {period.quarter}) as on {period.asOnFormatted} ·{" "}
        <span className={`pill ${version.status}`}>{version.status.replace("_", " ")}</span> ·{" "}
        {version.status === "approved" ? by("approved", version.approved_by)
          : version.status === "in_review" ? `${by("prepared", version.prepared_by)}; ${signed} of ${steps.length} signed, waiting for ${next?.title ?? "sign-off"}`
          : `draft ${by("prepared", version.prepared_by)}`}
        {version.reason && ` · ${version.reason}`}
      </div>
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
