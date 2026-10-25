"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List as ListIcon,
  CheckSquare,
  Square,
  Search,
  RotateCcw,
  Plus,
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import { updateTaskStatus, toggleTaskChecklist, requestTaskExtension } from "@/lib/actions/meet/tasks";
import { toast } from "react-toastify";
import type { MeetingTask, TaskStatus } from "@/types/meet";

interface MyWorkClientProps {
  initialTasks: MeetingTask[];
}

export default function MyWorkClient({ initialTasks }: MyWorkClientProps) {
  const [tasks, setTasks] = useState<MeetingTask[]>(initialTasks);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [statusTab, setStatusTab] = useState<"all" | "overdue" | "due_soon" | "open" | "completed">("all");
  const [search, setSearch] = useState("");
  const [extensionTask, setExtensionTask] = useState<MeetingTask | null>(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    const effectiveDue = t.revised_due_date || t.due_date;

    switch (statusTab) {
      case "completed":
        return t.status === "completed";
      case "overdue":
        return t.status !== "completed" && t.status !== "cancelled" && effectiveDue < todayStr;
      case "due_soon":
        return (
          t.status !== "completed" &&
          t.status !== "cancelled" &&
          (effectiveDue === todayStr || effectiveDue === tomorrowStr)
        );
      case "open":
        return t.status !== "completed" && t.status !== "cancelled";
      default:
        return true;
    }
  });

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const res = await updateTaskStatus({ taskId, status });
      if (res.success && res.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...res.task } : t))
        );
        toast.success(`Task status updated to ${status.replace("_", " ")}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    }
  };

  const handleToggleChecklist = async (checklistId: string, current: boolean) => {
    try {
      await toggleTaskChecklist(checklistId, !current);
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          checklist: t.checklist?.map((c) =>
            c.id === checklistId ? { ...c, is_done: !current } : c
          ),
        }))
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionTask || !extensionDate || !extensionReason.trim()) return;

    try {
      setIsSubmittingExt(true);
      const res = await requestTaskExtension({
        taskId: extensionTask.id,
        requestedDueDate: extensionDate,
        reason: extensionReason.trim(),
      });
      if (res.success) {
        toast.success("Extension request submitted to meeting organizer");
        setExtensionTask(null);
        setExtensionReason("");
      } else {
        toast.error(res.error || "Failed to submit extension");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit extension");
    } finally {
      setIsSubmittingExt(false);
    }
  };

  // Kanban Columns
  const kanbanColumns: { status: TaskStatus; label: string }[] = [
    { status: "not_started", label: "Not Started" },
    { status: "in_progress", label: "In Progress" },
    { status: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
          {(["all", "overdue", "due_soon", "open", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`rounded-md px-3 py-1.5 font-medium border capitalize transition-colors ${
                statusTab === tab
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface text-subtle border-border hover:bg-sunken"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="rounded-md border border-border bg-surface pl-8 pr-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex rounded-md border border-border bg-surface p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-1 text-muted transition-colors ${
                viewMode === "list" ? "bg-sunken text-foreground" : "hover:text-foreground"
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`rounded p-1 text-muted transition-colors ${
                viewMode === "kanban" ? "bg-sunken text-foreground" : "hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="theme-card-structural overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <CheckCircle2 className="mx-auto h-7 w-7 text-muted mb-2" />
              <p className="text-[13.5px] font-medium text-foreground">No tasks matching criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border bg-sunken/40 text-[11.5px] uppercase font-semibold text-muted">
                  <tr>
                    <th className="py-2.5 px-4">Task Code</th>
                    <th className="py-2.5 px-4">Title & Context</th>
                    <th className="py-2.5 px-4">Owner</th>
                    <th className="py-2.5 px-4">TAT Due Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => {
                    const effectiveDue = task.revised_due_date || task.due_date;
                    const isOverdue = task.status !== "completed" && effectiveDue < todayStr;

                    return (
                      <tr key={task.id} className="hover:bg-sunken/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-primary">
                          {task.code}
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <p className="font-medium text-foreground">{task.title}</p>
                          {task.point && (
                            <span className="text-[11.5px] text-muted">
                              Point: {task.point.code} · {task.point.title}
                            </span>
                          )}

                          {/* Checklist preview */}
                          {task.checklist && task.checklist.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {task.checklist.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleToggleChecklist(c.id, c.is_done)}
                                  className="flex items-center gap-1.5 text-[11px] text-subtle hover:text-foreground text-left"
                                >
                                  {c.is_done ? (
                                    <CheckSquare className="h-3 w-3 text-success-text" />
                                  ) : (
                                    <Square className="h-3 w-3 text-muted" />
                                  )}
                                  <span className={c.is_done ? "line-through text-muted" : ""}>
                                    {c.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {task.owner?.full_name || "Unassigned"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className={`font-medium ${isOverdue ? "text-danger-text" : "text-foreground"}`}>
                              {effectiveDue}
                            </span>
                            {task.revised_due_date && (
                              <span className="text-[10.5px] text-muted line-through">
                                Original: {task.due_date}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            className="rounded border border-border bg-surface px-2 py-1 text-[11.5px] font-medium text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setExtensionTask(task);
                              setExtensionDate(effectiveDue);
                            }}
                            className="text-[11.5px] font-medium text-primary hover:underline"
                          >
                            Extension
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="theme-card-structural p-3.5 space-y-3 bg-sunken/30">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-[13px] font-semibold text-heading">{col.label}</span>
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-subtle">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-64">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border border-border bg-surface p-3 shadow-xs space-y-2 hover:border-border-active transition-all"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10.5px] font-semibold text-primary">
                          {t.code}
                        </span>
                        <StatusBadge status={t.priority} type="priority" />
                      </div>
                      <h4 className="text-[13px] font-medium text-foreground line-clamp-2">
                        {t.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-border">
                        <span>Due: {t.revised_due_date || t.due_date}</span>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[10.5px] text-foreground"
                        >
                          <option value="not_started">Start</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Complete</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extension Request Modal */}
      {extensionTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl space-y-4">
            <h3 className="text-[15px] font-semibold text-heading">
              Request TAT Due Date Extension
            </h3>
            <p className="text-[12.5px] text-muted">
              Task: {extensionTask.code} · {extensionTask.title}
            </p>

            <form onSubmit={handleSubmitExtension} className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Requested New Due Date *
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Reason for Extension *
                </label>
                <textarea
                  required
                  rows={2}
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Operational reason, delay from external vendor/bank..."
                  className="w-full rounded-md border border-border bg-background p-2.5 text-[12.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtensionTask(null)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingExt}
                >
                  Submit Request
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
