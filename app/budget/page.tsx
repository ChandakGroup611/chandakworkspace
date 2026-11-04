import * as D from "@/lib/budget/data";
import { ImportPanel } from "./_components/import-panel";
import { GuidedNewProject } from "./_components/manual";
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
  const { data: heads } = await sb.from("budget_cost_heads").select("project_id");
  const count = (pid: number) => (heads ?? []).filter((h) => h.project_id === pid).length;

  const neededTab = sp.needProject ? TAB_NAMES[sp.needProject] || sp.needProject : null;

  return (
    <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="home">
      {neededTab && (
        <div className="banner info" role="status">
          <div>
            <strong>No active project selected.</strong> Create a new project below to open <strong>{neededTab}</strong>; it takes you through the set-up step by step.
          </div>
        </div>
      )}
      <MySignoffs sb={sb} />
      <section className="panel"><div className="panel-head"><h2>All projects</h2>
        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <span className="sub">Latest approved version of each project · amounts in crores</span>
          {D.can(me, "project.create") && <a href="#new-project" className="btn-action primary">+ New project</a>}
        </div>
      </div>
        {projects.length ? <Portfolio projects={projects} totals={totals} canManage={D.can(me, "project.setup")} /> : <p>No projects yet.</p>}
      </section>
      {D.can(me, "project.create") && <>
        <section className="panel" id="new-project"><div className="panel-head"><h2>Start a new project</h2><span className="sub">Type everything in: project, towers, budget lines and figures. No Excel file needed.</span></div>
          <GuidedNewProject projects={projects.map((p) => ({ id: p.id, name: p.name, heads: count(p.id) }))} />
        </section>
        <details className="panel import-alt">
          <summary><b>Or create a project from an Excel workbook</b> <span className="sub">Optional: if the budget already exists as a detail budget workbook</span></summary>
          <ImportPanel projects={projects.map((p) => ({ id: p.id, name: p.name }))} projectId={null} canDetail canCost />
        </details>
      </>}
    </Shell>
  );
}
