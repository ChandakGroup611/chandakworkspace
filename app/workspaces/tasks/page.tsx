import { checkServerPermission } from "@/lib/permissions";
import React from "react";
import { Metadata } from "next";
import TaskListViewClient from "@/components/tasks/TaskListViewClient";

export const metadata: Metadata = {
  title: "All Workspace Tasks | Chandak Workspace",
  description: "Detailed and filterable list of all workspace tasks.",
};

import { fetchAllTasks } from "@/lib/actions/workspaces";

export default async function TasksPage() {
  const canAccess = await checkServerPermission("TASKS_VIEW");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const tasks = await fetchAllTasks();
  
  return (
    <div className="w-full h-full animate-in fade-in-50 duration-500">
      <main>
        <TaskListViewClient initialTasks={tasks} />
      </main>
    </div>
  );
}

