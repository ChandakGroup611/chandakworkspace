import BudgetLearningGuide from "@/components/budget/BudgetLearningGuide";
import { notFound, redirect } from "next/navigation";
import * as D from "@/lib/budget/data";
import { loadSession } from "../../_components/page-data";
import { Shell, TABS } from "../../_components/shell";
import * as V from "../../_components/views";

export const dynamic = "force-dynamic";

// One page per screen: /budget/<project>/<screen>?v=<version number>
export default async function BudgetScreen({ params, searchParams }: {
  params: Promise<{ projectId: string; tab: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { projectId, tab } = await params;
  const search = await searchParams;
  if (!TABS.some(([k]) => k === tab)) notFound();
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const [projects, names] = await Promise.all([D.getProjects(sb), D.getMemberNames(sb)]);
  let project = projects.find((p) => String(p.id) === projectId);
  if (!project && projects.length > 0) {
    redirect(`/budget/${projects[0].id}/${tab}${search.v ? `?v=${search.v}` : ""}`);
  }
  if (!project) redirect("/budget");
  const versions = await D.getVersions(sb, project.id);
  const version = versions.find((v) => String(v.number) === search.v) ?? versions[versions.length - 1] ?? null;
  const ctx: V.Ctx = { sb, me, projects, project, versions, version, names, search };

  let body: React.ReactNode;
  if (tab === "import") body = await V.ImportTab(ctx);
  else if (tab === "setup") body = await V.Setup(ctx);
  else if (tab === "guide") body = <BudgetLearningGuide projectId={project.id} version={version} />;
  else if (tab === "incurred") body = await V.Incurred(ctx);
  else if (tab === "periods") body = await V.Periods(ctx);
  else if (!version) body = V.NoVersion(ctx);
  else {
    const c = { ...ctx, version };
    body = await ({ overview: V.Overview, entry: V.Entry, workings: V.Workings, schedules: V.Schedules, line: V.LineView, summary: V.Summary, detail: V.Detail, compare: V.Compare } as Record<string, (c: V.Ctx & { version: D.Version }) => Promise<React.ReactNode>>)[tab](c);
  }
  return <Shell me={me} projects={projects} project={project} versions={versions} version={version} tab={tab}>{body}</Shell>;
}
