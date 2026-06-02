import React from "react";
import { fetchEnrolledWorkspaces } from "@/lib/actions/workspaces";
import { EnrolledWorkspacesClient } from "@/components/workspaces/EnrolledWorkspacesClient";

export default async function EnrolledWorkspacesPage() {
  const { workspaces, subWorkspaces } = await fetchEnrolledWorkspaces();

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <EnrolledWorkspacesClient 
          initialWorkspaces={workspaces} 
          initialSubWorkspaces={subWorkspaces} 
        />
      </div>
    </div>
  );
}
