import BudgetLearningGuide from "@/components/budget/BudgetLearningGuide";
import * as D from "@/lib/budget/data";
import { loadSession } from "../_components/page-data";
import { Shell } from "../_components/shell";

export const dynamic = "force-dynamic";

export default async function BudgetGuidePage() {
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const projects = await D.getProjects(sb);
  const project = projects[0] ?? null;
  const versions = project ? await D.getVersions(sb, project.id) : [];
  const version = versions[versions.length - 1] ?? null;

  return (
    <Shell me={me} projects={projects} project={project} versions={versions} version={version} tab="guide">
      <BudgetLearningGuide projectId={project?.id ?? "1"} version={version} />
    </Shell>
  );
}

