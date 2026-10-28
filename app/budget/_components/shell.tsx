import Link from "next/link";
import { type Db, type Me, type Project, type Version, can, canApprove, canChangeDraft, chainOf, getSignoffLevels, getSignoffStatus } from "@/lib/budget/data";
import { dmy } from "@/lib/budget/format";
import { Selectors, SignoffActions } from "./forms";

export const TABS: [string, string][] = [
  ["overview", "Overview"], ["entry", "Budget entry"], ["import", "Import from Excel"], ["summary", "Summary report"],
  ["detail", "Detail report"], ["compare", "Compare versions"], ["incurred", "Cost incurred"], ["periods", "Month / quarter / year"],
  ["setup", "Towers & set-up"], ["workings", "Tower workings"], ["schedules", "Schedules"], ["line", "Budget line"],
];

export interface TabDef {
  id: string;
  label: string;
  href: (projectId: number | string, q: string) => string;
}

export interface SectionDef {
  key: string;
  label: string;
  tabs: TabDef[];
}

export const BUDGET_SECTIONS: SectionDef[] = [
  {
    key: "planning",
    label: "Budget planning",
    tabs: [
      { id: "overview", label: "Overview", href: (pid, q) => `/budget/${pid}/overview${q}` },
      { id: "entry", label: "Budget entry", href: (pid, q) => `/budget/${pid}/entry${q}` },
      { id: "workings", label: "Tower workings", href: (pid, q) => `/budget/${pid}/workings${q}` },
      { id: "schedules", label: "Schedules", href: (pid, q) => `/budget/${pid}/schedules${q}` },
      { id: "import", label: "Import from Excel", href: (pid, q) => `/budget/${pid}/import${q}` },
      { id: "compare", label: "Compare versions", href: (pid, q) => `/budget/${pid}/compare${q}` },
    ],
  },
  {
    key: "reports",
    label: "Reports & actuals",
    tabs: [
      { id: "summary", label: "Summary report", href: (pid, q) => `/budget/${pid}/summary${q}` },
      { id: "detail", label: "Detail report", href: (pid, q) => `/budget/${pid}/detail${q}` },
      { id: "periods", label: "Periodic breakdown", href: (pid, q) => `/budget/${pid}/periods${q}` },
      { id: "incurred", label: "Cost incurred", href: (pid, q) => `/budget/${pid}/incurred${q}` },
    ],
  },
  {
    key: "setup",
    label: "Masters & setup",
    tabs: [
      { id: "setup", label: "Towers & set-up", href: (pid, q) => `/budget/${pid}/setup${q}` },
      { id: "access", label: "Access, roles & rights", href: () => `/budget/admin/access` },
      { id: "fields", label: "Custom fields & forms", href: () => `/budget/admin/fields` },
    ],
  },
];

export function Shell({ me, projects, project, versions, version, tab, children }: {
  me: Me; projects: Project[]; project: Project | null; versions: Version[]; version: Version | null; tab: string; children: React.ReactNode;
}) {
  const q = version ? `?v=${version.number}` : "";

  const activeSectionKey = 
    ["overview", "entry", "workings", "schedules", "import", "compare"].includes(tab) ? "planning"
    : ["summary", "detail", "periods", "incurred"].includes(tab) ? "reports"
    : ["setup", "access", "fields"].includes(tab) ? "setup"
    : "planning";

  const activeSection = BUDGET_SECTIONS.find((s) => s.key === activeSectionKey) ?? BUDGET_SECTIONS[0];

  return (
    <>
      <header className="top">
        <div className="wrap top-bar">
          <div className="top-title">
            <Link href="/budget" className="crumb-home" title="View all projects">
              Projects
            </Link>
            {project && (
              <>
                <span className="crumb-sep">/</span>
                <span className="crumb-current">{project.name}</span>
                {version && (
                  <span className={`pill ${version.status}`}>R{version.number} · {version.status.replace("_", " ")}</span>
                )}
              </>
            )}
          </div>
          <div className="top-selectors">
            <Selectors
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              projectId={project?.id ?? null}
              versions={versions.map((v) => ({ number: v.number, as_on: v.as_on, status: v.status }))}
              versionNumber={version?.number ?? null}
              tab={tab}
            />
          </div>
        </div>
        {project && (
          <div className="wrap subnav-wrap">
            <div className="budget-subnav">
              <div className="section-pills" role="tablist" aria-label="Budget sections">
                {BUDGET_SECTIONS.map((sec) => {
                  const isCurrentSection = sec.key === activeSectionKey;
                  const targetHref = sec.tabs[0].href(project.id, q);
                  return (
                    <Link
                      key={sec.key}
                      href={targetHref}
                      className={`section-pill ${isCurrentSection ? "active" : ""}`}
                      aria-current={isCurrentSection ? "true" : undefined}
                    >
                      {sec.label}
                    </Link>
                  );
                })}
              </div>
              <nav className="tabs" aria-label={`${activeSection.label} screens`}>
                {activeSection.tabs.map((t) => (
                  <Link
                    key={t.id}
                    href={t.href(project.id, q)}
                    aria-current={tab === t.id ? "page" : undefined}
                  >
                    {t.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}

export async function VersionBanner({ sb, me, project, version, names }: { sb: Db; me: Me; project: Project; version: Version; names: Record<string, string> }) {
  const who = (id: string | null) => (id && names[id]) || "someone";
  const [levels, steps] = await Promise.all([getSignoffLevels(sb), version.status === "approved" ? Promise.resolve([]) : getSignoffStatus(sb, version.id)]);
  const chain = chainOf(levels, project.id).length > 0;
  const next = steps.find((s) => s.is_next) ?? null;
  const signed = steps.filter((s) => s.signed_by).length;
  // the preparer may take back a version under sign-off: same rule as changing the draft
  const mayRecall = version.status === "in_review" && canChangeDraft(me, { ...version, status: "draft" });
  return (
    <div className={`banner ${version.status === "approved" ? "locked" : "draft"}`}>
      <div><b>{project.name} R{version.number}</b> as on {dmy(version.as_on)} · <span className={`pill ${version.status}`}>{version.status.replace("_", " ")}</span> ·{" "}
        {version.status === "approved" ? `approved by ${who(version.approved_by)}`
          : version.status === "in_review" ? `prepared by ${who(version.prepared_by)}; ${signed} of ${steps.length} signed, waiting for ${next?.title ?? "sign-off"}`
          : `draft prepared by ${who(version.prepared_by)}`}
        {version.reason && ` · ${version.reason}`}</div>
      <SignoffActions versionId={version.id} number={version.number} projectId={project.id} status={version.status} chain={chain}
        mayApprove={canApprove(me, version)} mayRecall={mayRecall} next={next ? { title: next.title, mine: next.approver_ids.includes(me.user_id) } : null} />
    </div>
  );
}

export function Notice({ children, kind = "" }: { children: React.ReactNode; kind?: string }) {
  return <div className={`banner ${kind}`}><div>{children}</div></div>;
}
