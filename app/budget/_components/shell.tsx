import Link from "next/link";
import { type Me, type Project, type Version, can, canApprove } from "@/lib/budget/data";
import { dmy } from "@/lib/budget/format";
import { Selectors, VersionActions } from "./forms";

export const TABS: [string, string][] = [
  ["overview", "Overview"], ["entry", "Budget entry"], ["import", "Import from Excel"], ["summary", "Summary report"],
  ["detail", "Detail report"], ["compare", "Compare versions"], ["incurred", "Cost incurred"], ["periods", "Month / quarter / year"],
  ["setup", "Towers & set-up"],
];


export function Shell({ me, projects, project, versions, version, tab, children }: {
  me: Me; projects: Project[]; project: Project | null; versions: Version[]; version: Version | null; tab: string; children: React.ReactNode;
}) {
  const q = version ? `?v=${version.number}` : "";
  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand"><b><Link href="/budget" style={{ color: "inherit", textDecoration: "none" }}>Organization Budget</Link></b>
            <span>{me.name || me.email} · {me.role}</span>
            {(can(me, "access.manage") || can(me, "fields.manage")) && <Link className="settings" href={can(me, "access.manage") ? "/budget/admin/access" : "/budget/admin/fields"}>Settings</Link>}</div>
          <Selectors projects={projects.map((p) => ({ id: p.id, name: p.name }))} projectId={project?.id ?? null}
            versions={versions.map((v) => ({ number: v.number, as_on: v.as_on, status: v.status }))} versionNumber={version?.number ?? null} tab={tab} />
        </div>
        {project && (
          <div className="wrap">
            <nav className="tabs" aria-label="Budget screens">
              {TABS.map(([k, t]) => <Link key={k} href={`/budget/${project.id}/${k}${q}`} aria-current={tab === k ? "page" : undefined}>{t}</Link>)}
            </nav>
          </div>
        )}
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}

export function VersionBanner({ me, project, version, names }: { me: Me; project: Project; version: Version; names: Record<string, string> }) {
  const who = (id: string | null) => (id && names[id]) || "someone";
  const mayApprove = canApprove(me, version);
  return (
    <div className={`banner ${version.status === "approved" ? "locked" : "draft"}`}>
      <div><b>{project.name} R{version.number}</b> as on {dmy(version.as_on)} · <span className={`pill ${version.status}`}>{version.status}</span> ·{" "}
        {version.status === "approved" ? `approved by ${who(version.approved_by)}` : `draft prepared by ${who(version.prepared_by)}`}
        {version.reason && ` · ${version.reason}`}</div>
      {mayApprove && <VersionActions versionId={version.id} number={version.number} projectId={project.id} />}
    </div>
  );
}

export function Notice({ children, kind = "" }: { children: React.ReactNode; kind?: string }) {
  return <div className={`banner ${kind}`}><div>{children}</div></div>;
}
