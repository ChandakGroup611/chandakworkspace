import { Suspense } from "react";
import { fetchWorkspaceDashboardData } from "@/lib/actions/workspaces";
import WorkspacesClient from "./WorkspacesClient";
import { getTaskDetails } from "@/lib/actions/tasks";
import WorkspacesLoading from "./loading";

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ task?: string; workspace?: string }> }) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<WorkspacesLoading />}>
      <WorkspacesDataFetcher searchParams={sp} />
    </Suspense>
  );
}

async function WorkspacesDataFetcher({ searchParams }: { searchParams: { task?: string; workspace?: string } }) {
  let targetWorkspaceId: string | null = searchParams?.workspace || null;
  
  if (searchParams?.task) {
    try {
      const urlTaskDetails = await getTaskDetails(searchParams.task);
      if (urlTaskDetails) {
        targetWorkspaceId = urlTaskDetails.workspace_id;
      }
    } catch (e) {}
  }

  // Fetch all initial data on the server!
  const dashboardData = await fetchWorkspaceDashboardData(targetWorkspaceId);

  return <WorkspacesClient initialData={dashboardData} initialTaskId={searchParams?.task} />;
}
