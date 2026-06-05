import React from "react";
import { Metadata } from "next";
import TaskListViewClient from "@/components/tasks/TaskListViewClient";

export const metadata: Metadata = {
  title: "All Workspace Tasks | ADIOS",
  description: "Detailed and filterable list of all workspace tasks.",
};

import { fetchAllTasks } from "@/lib/actions/workspaces";

export default async function TasksPage() {
  const tasks = await fetchAllTasks();
  
  return (
    <div className="w-full space-y-2 animate-in fade-in-50 duration-500">
      <header className="border-b border-white/5 pb-2">
        <h1 className="text-xl font-bold">All Workspace Tasks</h1>
        <p className="text-xs text-gray-400 mt-1">Comprehensive view of tasks across all workspaces. Use filters to narrow down operations.</p>
      </header>

      <main>
        <TaskListViewClient initialTasks={tasks} />
      </main>
    </div>
  );
}

