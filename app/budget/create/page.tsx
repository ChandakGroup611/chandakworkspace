import Link from "next/link";
import { cookies } from "next/headers";
import * as D from "@/lib/budget/data";
import { dmy } from "@/lib/budget/format";
import { GuidedNewProject } from "../_components/manual";
import { loadSession } from "../_components/page-data";
import { Shell } from "../_components/shell";

export const dynamic = "force-dynamic";

// Create budget: the one place to type a budget in by hand.
// Step 1 here is "which project"; the button opens the 6-step Create budget form for that project
// (/budget/<project>/create), which saves the figures as a draft version. A new project can be made here too.

type CardState = { tone: "new" | "draft" | "locked" | "next"; label: string; detail: string; cta: string; href: string } | null;

function cardFor(me: D.Me, p: D.Project, versions: D.Version[]): CardState {
  const open = versions.find((v) => v.status !== "approved") ?? null;
  const approved = versions.filter((v) => v.status === "approved").pop() ?? null;
  const next = Math.max(0, ...versions.map((v) => v.number)) + 1;
  const canOpen = D.can(me, "version.open", p.id);
  if (open?.status === "in_review")
    return { tone: "locked", label: `R${open.number} under sign-off`, detail: `As on ${dmy(open.as_on)}. Figures are locked until it is approved or taken back.`, cta: "View sign-off", href: `/budget/${p.id}/overview?v=${open.number}` };
  if (open) {
    if (!D.canChangeDraft(me, open) && !D.can(me, "budget.edit", p.id)) return null;
    return { tone: "draft", label: `Draft R${open.number} in progress`, detail: `As on ${dmy(open.as_on)}. Pick up where you left off.`, cta: `Continue R${open.number}`,
      href: D.canChangeDraft(me, open) ? `/budget/${p.id}/create` : `/budget/${p.id}/entry?v=${open.number}&mode=form` };
  }
  if (!canOpen) return null;
  if (approved)
    return { tone: "next", label: `R${approved.number} approved`, detail: `Start R${next}: the form starts from R${approved.number}'s figures, so you only change what moved.`, cta: `Create R${next}`, href: `/budget/${p.id}/create` };
  return { tone: "new", label: "No budget yet", detail: "Create the first budget, R1, from a blank form.", cta: "Create R1", href: `/budget/${p.id}/create` };
}

export default async function CreateBudgetHome() {
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const [projects, versions] = await Promise.all([D.getProjects(sb), D.getVersions(sb)]);
  const { data: heads } = await sb.from("budget_cost_heads").select("project_id");
  const headCount = (pid: number) => (heads ?? []).filter((h) => h.project_id === pid).length;
  const last = Number((await cookies()).get("active_budget_project")?.value) || null;

  const cards = projects
    .map((p) => ({ p, s: cardFor(me, p, versions.filter((v) => v.project_id === p.id)) }))
    .filter((x): x is { p: D.Project; s: NonNullable<CardState> } => x.s != null)
    // the project worked on last comes first, then drafts in progress, then the rest by name
    .sort((a, b) => Number(b.p.id === last) - Number(a.p.id === last) || Number(b.s.tone === "draft") - Number(a.s.tone === "draft") || a.p.name.localeCompare(b.p.name));
  const canCreateProject = D.can(me, "project.create");

  return (
    <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="create">
      <section className="panel guide-head cb-head">
        <div>
          <h2>Create budget</h2>
          <p className="sub">Type the budget in by hand, no Excel needed. Choose a project, then fill a short guided form. Your typing is kept on this browser until you save.</p>
        </div>
        <ol className="cb-how" aria-label="How it works">
          <li><span aria-hidden>1</span>Choose the project</li>
          <li><span aria-hidden>2</span>Fill 6 short steps: version, areas, towers, budget lines, GST, review</li>
          <li><span aria-hidden>3</span>Save as draft, then send for sign-off</li>
        </ol>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>1. Choose the project</h2>
          {canCreateProject && <a href="#cb-new" className="btn-action">+ New project</a>}
        </div>
        {cards.length ? (
          <ul className="cb-cards">
            {cards.map(({ p, s }) => (
              <li key={p.id} className={`cb-card ${s.tone}`}>
                <div className="cb-card-top">
                  <b className="cb-name">{p.name}</b>
                  {p.id === last && <span className="chip">Last opened</span>}
                </div>
                <span className="cb-meta">{p.code}{p.location ? ` · ${p.location}` : ""}</span>
                <span className={`chip ${s.tone === "draft" ? "warn" : s.tone === "next" ? "ok" : ""}`}>{s.label}</span>
                <p className="sub">{s.detail}</p>
                <Link className={`btn-action ${s.tone === "locked" ? "" : "primary"} big`} href={s.href}>{s.cta} →</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub">{projects.length ? "You have no project where you can create a budget. Ask the budget administrator for the Budget preparer role." : "No projects yet. Start with a new project below."}</p>
        )}
      </section>

      {canCreateProject && (
        <section className="panel" id="cb-new">
          <div className="panel-head"><h2>Or start a new project</h2><span className="sub">Only the basics here; towers, lines and amounts come in the form next.</span></div>
          <GuidedNewProject quick projects={projects.map((p) => ({ id: p.id, name: p.name, heads: headCount(p.id) }))} />
        </section>
      )}

      <p className="note">Already have the budget in a detail budget workbook? <Link href="/budget/import">Import it from Excel</Link> instead. Typed and imported figures land in the same draft.</p>
    </Shell>
  );
}
