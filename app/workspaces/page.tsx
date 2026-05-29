import { fetchWorkspaceDashboardData } from "@/lib/actions/workspaces";
import WorkspacesClient from "./WorkspacesClient";
import { getTaskDetails } from "@/lib/actions/tasks";

export default async function WorkspacesPage({ searchParams }: { searchParams: { task?: string } }) {
  let taskWorkspaceId: string | null = null;
  
  if (searchParams?.task) {
    try {
      const urlTaskDetails = await getTaskDetails(searchParams.task);
      if (urlTaskDetails) {
        taskWorkspaceId = urlTaskDetails.workspace_id;
      }
    } catch (e) {}
  }

  // Fetch all initial data on the server! Next.js will prefetch this on hover.
  const dashboardData = await fetchWorkspaceDashboardData(taskWorkspaceId);

  return <WorkspacesClient initialData={dashboardData} initialTaskId={searchParams?.task} />;
}
