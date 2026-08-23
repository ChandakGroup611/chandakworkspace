import { checkServerPermission } from "@/lib/permissions";
import React from "react";
import { Metadata } from "next";
import TaskListViewClient from "@/components/tasks/TaskListViewClient";

export const metadata: Metadata = {
  title: "All Workspace Tasks | Chandak Workspace",
  description: "Detailed and filterable list of all workspace tasks.",
};

import { fetchAllTasks, fetchTasksByWorkspace } from "@/lib/actions/workspaces";

interface TasksPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const sp = await searchParams;
  const workspaceId = typeof sp?.workspaceId === "string" ? sp.workspaceId : null;

  const canAccess = await checkServerPermission("TASKS_VIEW");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-danger">Access Denied</h2>
          <p className="text-muted">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const tasks = workspaceId ? await fetchTasksByWorkspace(workspaceId, 1, 50, true) : await fetchAllTasks();
  
  return (
    <div className="w-full h-full animate-in fade-in-50 duration-500">
      <main>
        <TaskListViewClient initialTasks={tasks} />
      </main>
    </div>
  );
}
