import { checkServerPermission } from "@/lib/permissions";
import React from "react";
import { Metadata } from "next";
import TaskListViewClient from "@/components/tasks/TaskListViewClient";
import { fetchAllTasks, fetchTasksByWorkspace } from "@/lib/actions/workspaces";
import { getUserAccessScope } from "@/lib/auth/scope";
import { getCachedUser } from "@/lib/auth/cached-user";

export const metadata: Metadata = {
  title: "All Workspace Tasks | Chandak Workspace",
  description: "Detailed and filterable list of all workspace tasks.",
};

interface TasksPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const sp = await searchParams;
  const workspaceId = typeof sp?.workspaceId === "string" ? sp.workspaceId : null;

  const t0 = Date.now();
  const timings: Record<string, number> = {};
  // The permission check, the user's scope and the task list load at the same time;
  // the list is only shown when the permission check passes.
  const [canAccess, { user }, tasks] = await Promise.all([
    checkServerPermission("TASKS_VIEW"),
    getCachedUser(),
    workspaceId ? fetchTasksByWorkspace(workspaceId, true) : fetchAllTasks(timings),
  ]);
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

  const userScope = user ? await getUserAccessScope(user.id) : null;
  timings.total = Date.now() - t0;

  return (
    <div className="w-full h-full animate-in fade-in-50 duration-150" data-load-ms={JSON.stringify(timings)}>
      <main>
        <TaskListViewClient initialTasks={tasks} userScope={userScope} currentUserId={user?.id || userScope?.userId || null} />
      </main>
    </div>
  );
}
