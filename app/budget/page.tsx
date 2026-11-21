import * as D from "@/lib/budget/data";
import { ImportPanel } from "./_components/import-panel";
import Link from "next/link";
import { loadSession } from "./_components/page-data";
import { Shell } from "./_components/shell";
import { MySignoffs, Portfolio } from "./_components/views";

export const dynamic = "force-dynamic";

const TAB_NAMES: Record<string, string> = {
  overview: "Overview",
  entry: "Budget entry",
  workings: "Tower workings",
  schedules: "Schedules",
  summary: "Summary report",
  detail: "Detail report",
  periods: "Periodic breakdown",
  incurred: "Cost incurred",
  setup: "Project setup",
  compare: "Compare versions",
};

// Budget home: every project's latest approved figures, and the ways to start a new project.
export default async function BudgetHome({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const [projects, totals] = await Promise.all([D.getProjects(sb), D.getTotals(sb)]);

  const neededTab = sp.needProject ? TAB_NAMES[sp.needProject] || sp.needProject : null;

  return (
    <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="home">
      {neededTab && (
        <div className="banner info" role="status">
          <div>
            <strong>No project yet.</strong> <Link href="/budget/create">Create a budget</Link> first to open <strong>{neededTab}</strong>; it takes you through the set-up step by step.
          </div>
        </div>
      )}
      <MySignoffs sb={sb} />
      {projects.length > 0 ? (
        <Portfolio
          projects={projects}
          totals={totals}
          canManage={D.can(me, "project.setup")}
          canCreate={D.can(me, "project.create") || D.can(me, "version.open")}
        />
      ) : (
        <section className="panel">
          <div className="panel-head">
            <h2>All projects</h2>
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              <span className="sub">Latest approved version of each project · amounts in crores</span>
              {(D.can(me, "project.create") || D.can(me, "version.open")) && (
                <Link href="/budget/create" className="btn-action primary">
                  + Create budget
                </Link>
              )}
            </div>
          </div>
          <p>No projects yet.</p>
        </section>
      )}
      {D.can(me, "project.create") && <>
        <section className="panel cb-cta" id="new-project">
          <div><h2>Create a budget</h2><p className="sub">Type everything in, step by step: project, towers, budget lines, GST and figures. No Excel file needed.</p></div>
          <Link href="/budget/create" className="btn-action primary big">Open Create budget →</Link>
        </section>
        <details className="panel import-alt">
          <summary><b>Or create a project from an Excel workbook</b> <span className="sub">Optional: if the budget already exists as a detail budget workbook</span></summary>
          <ImportPanel projects={projects.map((p) => ({ id: p.id, name: p.name }))} projectId={null} canDetail canCost />
        </details>
      </>}
    </Shell>
  );
}
