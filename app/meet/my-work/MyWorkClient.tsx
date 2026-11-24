"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
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
  Trash2,
  X,
  Calendar,
  ShieldCheck,
  Info,
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import {
  updateTaskStatus,
  toggleTaskChecklist,
  requestTaskExtension,
  createTask,
  deleteTask,
} from "@/lib/actions/meet/tasks";
import { calculateDueDateFromTAT, calculateTATFromDates, formatPrettyDate } from "@/lib/utils/meet-working-days";
import { toast } from "react-toastify";
import type { MeetingTask, TaskStatus, PointPriority } from "@/types/meet";

interface MyWorkClientProps {
  initialTasks: MeetingTask[];
  users?: any[];
  /** The page already filtered the tasks (Tasks list page): hide the built-in status tabs and search. */
  serverFiltered?: boolean;
}

export default function MyWorkClient({ initialTasks, users = [], serverFiltered = false }: MyWorkClientProps) {
  const [tasks, setTasks] = useState<MeetingTask[]>(initialTasks);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [statusTab, setStatusTab] = useState<"all" | "overdue" | "due_soon" | "open" | "completed">("all");
  const [search, setSearch] = useState("");
  const [extensionTask, setExtensionTask] = useState<MeetingTask | null>(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);
  const [isPending, startTransition] = useTransition();

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Create Task Modal State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskOwnerId, setNewTaskOwnerId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<PointPriority>("medium");
  const [newTaskStartDate, setNewTaskStartDate] = useState(todayStr);
  const [newTaskTat, setNewTaskTat] = useState(3);
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => calculateDueDateFromTAT(todayStr, 3).dueDate);
  const [newTaskSkippedDays, setNewTaskSkippedDays] = useState(() => calculateDueDateFromTAT(todayStr, 3).nonWorkingDaysSkipped);
  const [newTaskRequiresVerification, setNewTaskRequiresVerification] = useState(false);
  const [newTaskChecklist, setNewTaskChecklist] = useState<string[]>([]);
  const [checklistInput, setChecklistInput] = useState("");

  const handleNewTaskTatChange = (val: number) => {
    const safe = Math.max(1, Math.min(60, val || 1));
    setNewTaskTat(safe);
    const res = calculateDueDateFromTAT(newTaskStartDate, safe);
    setNewTaskDueDate(res.dueDate);
    setNewTaskSkippedDays(res.nonWorkingDaysSkipped);
  };

  const handleNewTaskDueDateChange = (newDue: string) => {
    setNewTaskDueDate(newDue);
    if (newDue && newTaskStartDate) {
      const res = calculateTATFromDates(newTaskStartDate, newDue);
      setNewTaskTat(res.tatDays);
      setNewTaskSkippedDays(res.nonWorkingDaysSkipped);
    }
  };

  const handleNewTaskStartDateChange = (newStart: string) => {
    setNewTaskStartDate(newStart);
    if (newStart) {
      const res = calculateDueDateFromTAT(newStart, newTaskTat);
      setNewTaskDueDate(res.dueDate);
      setNewTaskSkippedDays(res.nonWorkingDaysSkipped);
    }
  };

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

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    startTransition(async () => {
      try {
        const res = await createTask({
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || undefined,
          owner_id: newTaskOwnerId || undefined,
          priority: newTaskPriority,
          tat_days: Number(newTaskTat),
          start_date: newTaskStartDate,
          due_date: newTaskDueDate,
          requires_verification: newTaskRequiresVerification,
          checklist: newTaskChecklist.length > 0 ? newTaskChecklist : undefined,
        });

        if (res.success && res.task) {
          toast.success("Action item created successfully");
          setTasks((prev) => [res.task, ...prev]);
          setIsCreateTaskOpen(false);
          setNewTaskTitle("");
          setNewTaskDesc("");
          setNewTaskChecklist([]);
          setNewTaskRequiresVerification(false);
        } else {
          toast.error(res.error || "Failed to create task");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create task");
      }
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this action item?")) return;

    startTransition(async () => {
      try {
        const res = await deleteTask(taskId);
        if (res.success) {
          toast.success("Task deleted");
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } else {
          toast.error(res.error || "Failed to delete task");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete task");
      }
    });
  };

  const handleAddChecklistItem = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && checklistInput.trim()) {
      e.preventDefault();
      setNewTaskChecklist((prev) => [...prev, checklistInput.trim()]);
      setChecklistInput("");
    }
  };

  // Kanban Columns
  const kanbanColumns: { status: TaskStatus; label: string }[] = [
    { status: "not_started", label: "Not Started" },
    { status: "in_progress", label: "In Progress" },
    { status: "on_hold" as TaskStatus, label: "On Hold" },
    { status: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className={`flex flex-wrap items-center gap-1.5 text-[12.5px] ${serverFiltered ? "hidden" : ""}`}>
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

        {/* View Mode Toggle, Search, and + New Task Action */}
        <div className="flex flex-wrap items-center gap-2">
          {serverFiltered && <span className="text-[13px] text-muted">{filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"}</span>}
          <div className={`relative ${serverFiltered ? "hidden" : ""}`}>
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

          <AppButton
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setIsCreateTaskOpen(true)}
          >
            New Action Item
          </AppButton>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="theme-card-structural overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <CheckCircle2 className="mx-auto h-7 w-7 text-muted mb-2" />
              <p className="text-[13.5px] font-medium text-foreground">No tasks matching criteria</p>
              <div className="mt-3">
                <AppButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setIsCreateTaskOpen(true)}
                >
                  Create First Action Item
                </AppButton>
              </div>
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
                    const isOverdue =
                      task.status !== "completed" &&
                      task.status !== "cancelled" &&
                      effectiveDue < todayStr;

                    return (
                      <tr key={task.id} className="hover:bg-sunken/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-primary">
                          <Link href={`/meet/tasks/${task.id}`} className="hover:underline">{task.code}</Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/meet/tasks/${task.id}`} className="font-medium text-foreground hover:underline">{task.title}</Link>
                          {task.point && (
                            <div className="text-[12px] text-muted flex items-center gap-1 mt-0.5">
                              <Link href={`/meet/points/${task.point.id}`} className="font-mono hover:text-primary hover:underline">{task.point.code}</Link>
                              <span>·</span>
                              <span>{(task.point as any)?.meeting?.title || "Meeting"}</span>
                            </div>
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
                            <option value="on_hold">On Hold</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
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
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete task"
                              className="p-1 text-muted hover:text-danger-text transition-colors rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="theme-card-structural p-3 space-y-3 bg-sunken/10">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-[12.5px] font-semibold text-heading uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-muted">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[300px]">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border bg-surface p-3 space-y-2 hover:border-border-active transition-all"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-primary font-semibold">{task.code}</span>
                        <StatusBadge status={task.priority} type="priority" />
                      </div>
                      <h4 className="text-[13px] font-semibold text-heading">
                        <Link href={`/meet/tasks/${task.id}`} className="hover:underline">{task.title}</Link>
                      </h4>
                      <div className="flex items-center justify-between text-[12px] text-muted pt-2 border-t border-border">
                        <span>{task.owner?.full_name || "Unassigned"}</span>
                        <span>{task.revised_due_date || task.due_date}</span>
                      </div>
                      <label className="block">
                        <span className="sr-only">Move to</span>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="w-full rounded border border-border bg-surface px-2 py-1 text-[12px] text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="on_hold">On Hold</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extension Modal */}
      {extensionTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Request TAT Extension</h3>
              <button
                onClick={() => setExtensionTask(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExtension} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Requested Due Date *
                </label>
                <input
                  type="date"
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  min={todayStr}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Justification / Reason *
                </label>
                <textarea
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Provide concrete reason for deadline extension..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
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

      {/* New Task Modal */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Create Action Item</h3>
              <button
                onClick={() => setIsCreateTaskOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                  placeholder="What needs to be done..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={2}
                  placeholder="Additional context or deliverables..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Assignee
                  </label>
                  <select
                    value={newTaskOwnerId}
                    onChange={(e) => setNewTaskOwnerId(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as PointPriority)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Start Date, TAT, Due Date with Working Days Engine */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newTaskStartDate}
                    onChange={(e) => handleNewTaskStartDateChange(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    TAT (Working Days)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={newTaskTat}
                      onChange={(e) => handleNewTaskTatChange(Number(e.target.value))}
                      min={1}
                      max={60}
                      className="w-full rounded border border-border bg-background px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none font-semibold"
                    />
                    <span className="text-[11px] text-muted">days</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    min={newTaskStartDate}
                    onChange={(e) => handleNewTaskDueDateChange(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Live TAT & Working Days Helper Banner */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11.5px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Due: {formatPrettyDate(newTaskDueDate)}
                  </span>
                  <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-surface border border-border text-muted">
                    {newTaskTat} working {newTaskTat === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted" /> Mon–Sat calendar
                  </span>
                  {newTaskSkippedDays > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
                      ⚡ {newTaskSkippedDays} non-working {newTaskSkippedDays === 1 ? "day" : "days"} skipped (Sundays / statutory holidays)
                    </span>
                  )}
                </div>
              </div>

              {/* Verification Checkbox Toggle */}
              <label className="flex items-start gap-2 p-2 rounded-lg border border-border bg-sunken/40 cursor-pointer hover:bg-sunken/70 transition-colors">
                <input
                  type="checkbox"
                  checked={newTaskRequiresVerification}
                  onChange={(e) => setNewTaskRequiresVerification(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <div className="text-[11.5px]">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Requires Verification Sign-off
                  </span>
                  <p className="text-[10.5px] text-muted">
                    Sign-off needed from assigner / chair before task completion is finalized.
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Checklist Items (press Enter to add)
                </label>
                <input
                  type="text"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={handleAddChecklistItem}
                  placeholder="Type item and press Enter..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
                {newTaskChecklist.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newTaskChecklist.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11.5px] bg-sunken/40 px-2 py-1 rounded">
                        <span>• {item}</span>
                        <button
                          type="button"
                          onClick={() => setNewTaskChecklist((p) => p.filter((_, i) => i !== idx))}
                          className="text-muted hover:text-danger-text"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateTaskOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Create Action Item
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
