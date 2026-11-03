import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import * as D from "@/lib/budget/data";
import { TABS } from "../_components/shell";

export default async function ProjectHome({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { projectId } = await params;
  const search = searchParams ? await searchParams : {};
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v !== undefined) qs.set(k, v);
  }
  const qStr = qs.toString() ? `?${qs.toString()}` : "";

  // If projectId is actually a tab name (like /budget/overview, /budget/entry, /budget/setup, etc.):
  const isTab = TABS.some(([t]) => t === projectId);
  if (isTab || !/^\d+$/.test(projectId)) {
    const tabName = isTab ? projectId : "overview";
    const cookieStore = await cookies();
    const cookiePid = cookieStore.get("active_budget_project")?.value;

    let targetPid: string | null = null;
    try {
      const { sb } = await D.getSession();
      const projects = await D.getProjects(sb);
      if (cookiePid && projects.some((p) => String(p.id) === cookiePid)) {
        targetPid = cookiePid;
      } else if (projects.length > 0) {
        targetPid = String(projects[0].id);
      }
    } catch {}

    if (targetPid) {
      redirect(`/budget/${targetPid}/${tabName}${qStr}`);
    } else {
      redirect("/budget");
    }
  }

  redirect(`/budget/${projectId}/overview${qStr}`);
}
