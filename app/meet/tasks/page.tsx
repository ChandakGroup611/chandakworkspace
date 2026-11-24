import React from "react";
import { listTasks, type ShowScope } from "@/lib/actions/meet/lists";
import ListFilters from "@/components/meet/lists/ListFilters";
import MyWorkClient from "../my-work/MyWorkClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks · Chandak Meet", description: "Every action item from meetings, with filters" };

const STATUS_OPTS = [
  { id: "open_any", label: "All open" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "Any status" },
];

export default async function TasksListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await listTasks({
    show: sp.show as ShowScope | undefined,
    status: sp.status,
    meeting: sp.meeting,
    owner: sp.owner,
    priority: sp.priority,
    due: sp.due,
    q: sp.q,
  });
  const showOpts = [
    { id: "mine", label: "Assigned to me" },
    { id: "meetings", label: "From my meetings" },
    ...(data.isAdmin ? [{ id: "all", label: "All meetings" }] : []),
  ];
  // Re-mount the table when the filters change so it shows the new rows
  const key = JSON.stringify(sp);

  return (
    <div className="space-y-4 pb-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-heading">Tasks</h1>
        <p className="mt-0.5 text-[13.5px] text-muted">Action items from meetings. Click a task to open it, update progress, ask for more time or give it to someone else.</p>
      </div>

      <ListFilters
        action="/meet/tasks"
        search={sp.q}
        searchPlaceholder="Task title or ID (TSK-…)"
        fields={[
          { name: "show", label: "Whose", type: "select", value: data.show, options: showOpts },
          { name: "status", label: "Status", type: "select", value: sp.status || "open_any", options: STATUS_OPTS },
          { name: "meeting", label: "Meeting", type: "select", value: sp.meeting, anyLabel: "Any meeting", options: data.meetings },
          { name: "owner", label: "Owner", type: "select", value: sp.owner, anyLabel: "Anyone", options: [{ id: "none", label: "No owner yet" }, ...data.owners] },
          { name: "priority", label: "Priority", type: "select", value: sp.priority, anyLabel: "Any priority", options: [
            { id: "critical", label: "Critical" }, { id: "high", label: "High" }, { id: "medium", label: "Medium" }, { id: "low", label: "Low" },
          ] },
          { name: "due", label: "Due", type: "select", value: sp.due, anyLabel: "Any time", options: [
            { id: "overdue", label: "Overdue" }, { id: "soon", label: "Due in 2 days" }, { id: "week", label: "Next 7 days" }, { id: "month", label: "Next 30 days" },
          ] },
        ]}
      />

      {"error" in data && data.error && <p role="alert" className="text-[13px] text-danger-text">Couldn't load tasks: {data.error}</p>}

      <MyWorkClient key={key} initialTasks={data.tasks as any} users={data.owners.map((o) => ({ id: o.id, full_name: o.label }))} serverFiltered />
    </div>
  );
}
