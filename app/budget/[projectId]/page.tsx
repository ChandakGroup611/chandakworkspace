import { redirect } from "next/navigation";
import { getProjects } from "@/lib/budget/data";
import { loadSession } from "../_components/page-data";
import { TABS } from "../_components/shell";

export const dynamic = "force-dynamic";

export default async function BudgetProjectCatchAll({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { projectId } = await params;
  const search = await searchParams;
  const queryStr = search.v ? `?v=${search.v}` : "";

  // Check if projectId is actually a tab shortcut (e.g. /budget/overview, /budget/setup)
  const isTab = TABS.some(([k]) => k === projectId);

  const { sb } = await loadSession();
  const projects = await getProjects(sb);

  if (isTab) {
    if (projects.length > 0) {
      redirect(`/budget/${projects[0].id}/${projectId}${queryStr}`);
    } else {
      redirect(`/budget?needProject=${encodeURIComponent(projectId)}`);
    }
  }

  // If projectId is a numeric ID, redirect to that project's overview
  if (/^\d+$/.test(projectId)) {
    const project = projects.find((p) => String(p.id) === projectId) ?? projects[0];
    if (project) {
      redirect(`/budget/${project.id}/overview${queryStr}`);
    }
  }

  // Fallback to portfolio home
  redirect("/budget");
}
