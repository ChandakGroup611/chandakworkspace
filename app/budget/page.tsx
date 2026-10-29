import * as D from "@/lib/budget/data";
import { NewProjectForm } from "./_components/forms";
import { ImportPanel } from "./_components/import-panel";
import { loadSession } from "./_components/page-data";
import { Shell } from "./_components/shell";
import { Portfolio } from "./_components/views";

export const dynamic = "force-dynamic";

// Budget home: every project's latest approved figures, and the ways to start a new project.
export default async function BudgetHome() {
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const [projects, totals] = await Promise.all([D.getProjects(sb), D.getTotals(sb)]);
  const { data: heads } = await sb.from("budget_cost_heads").select("project_id");
  const count = (pid: number) => (heads ?? []).filter((h) => h.project_id === pid).length;
  return (
    <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="home">
      <section className="panel"><div className="panel-head"><h2>All projects</h2>
        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <span className="sub">Latest approved version of each project · crores</span>
          {D.can(me, "project.create") && <a href="#new-project" className="btn-action primary">+ New Project</a>}
        </div>
      </div>
        {projects.length ? <Portfolio projects={projects} totals={totals} canManage={D.can(me, "project.setup")} /> : <p>No projects yet.</p>}
      </section>
      {D.can(me, "project.create") && <>
        <section className="panel" id="new-project"><div className="panel-head"><h2>New project</h2><span className="sub">Type the set-up, or import its detail budget workbook below</span></div>
          <NewProjectForm projects={projects.map((p) => ({ id: p.id, name: p.name, heads: count(p.id) }))} />
        </section>
        <ImportPanel projects={projects.map((p) => ({ id: p.id, name: p.name }))} projectId={null} canDetail canCost />
      </>}
    </Shell>
  );
}
