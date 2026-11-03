import * as D from "@/lib/budget/data";
import { loadSession } from "../_components/page-data";
import { Shell } from "../_components/shell";
import { ImportTab } from "../_components/views";

export const dynamic = "force-dynamic";

export default async function BudgetImportPage() {
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const [projects, names] = await Promise.all([D.getProjects(sb), D.getMemberNames(sb)]);
  const project = projects[0] ?? null;
  const versions = project ? await D.getVersions(sb, project.id) : [];
  const version = versions[versions.length - 1] ?? null;

  return (
    <Shell me={me} projects={projects} project={project} versions={versions} version={version} tab="import">
      {await ImportTab({
        sb,
        me,
        projects,
        project: project ?? ({ id: 0, code: "", name: "All Projects" } as unknown as D.Project),
        versions,
        version,
        names,
        search: {},
      })}
    </Shell>
  );
}

