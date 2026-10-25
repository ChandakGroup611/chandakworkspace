import React from "react";
import { getTasks } from "@/lib/actions/meet/tasks";
import { MeetHeader } from "@/components/meet/MeetHeader";
import MyWorkClient from "./MyWorkClient";

export const metadata = {
  title: "My Work · Chandak Meet",
  description: "Personal meeting action items, TAT compliance and Kanban board",
};

export default async function MyWorkPage() {
  const tasks = await getTasks({ statusTab: "all" });

  return (
    <div className="space-y-6">
      <MeetHeader
        title="My Work & Action Items"
        description="All action items and commitments assigned to you across Chandak Group meetings"
        breadcrumbs={[{ label: "My Work" }]}
      />

      <MyWorkClient initialTasks={tasks} />
    </div>
  );
}
