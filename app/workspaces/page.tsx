import { fetchWorkspaceDashboardData } from "@/lib/actions/workspaces";
import WorkspacesClient from "./WorkspacesClient";
import { getTaskDetails } from "@/lib/actions/tasks";

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage({ searchParams }: { searchParams: { task?: string; workspace?: string } }) {
  let targetWorkspaceId: string | null = searchParams?.workspace || null;
  
  if (searchParams?.task) {
    try {
      const urlTaskDetails = await getTaskDetails(searchParams.task);
      if (urlTaskDetails) {
        targetWorkspaceId = urlTaskDetails.workspace_id;
      }
    } catch (e) {}
  }

  // Fetch all initial data on the server! Next.js will prefetch this on hover.
  // const dashboardData = await fetchWorkspaceDashboardData(targetWorkspaceId);

  return <WorkspacesClient initialData={null} initialTaskId={searchParams?.task} targetWorkspaceId={targetWorkspaceId} />;
}
