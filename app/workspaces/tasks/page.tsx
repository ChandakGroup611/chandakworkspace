import React from "react";
import { Metadata } from "next";
import TaskListViewClient from "@/components/tasks/TaskListViewClient";

export const metadata: Metadata = {
  title: "All Workspace Tasks | Chandak Workspace",
  description: "Detailed and filterable list of all workspace tasks.",
};

import { fetchAllTasks } from "@/lib/actions/workspaces";

export default async function TasksPage() {
  const tasks = await fetchAllTasks();
  
  return (
    <div className="w-full h-full animate-in fade-in-50 duration-500">
      <main>
        <TaskListViewClient initialTasks={tasks} />
      </main>
    </div>
  );
}

