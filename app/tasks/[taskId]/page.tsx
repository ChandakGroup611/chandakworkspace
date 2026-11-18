import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList, Type, AlignLeft, ShieldAlert } from "lucide-react";
import { TaskBackButton } from "@/components/tasks/TaskBackButton";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import { EditableTaskTitle } from "@/components/tasks/EditableTaskTitle";
import { EditableTaskDescription } from "@/components/tasks/EditableTaskDescription";
import { getTaskDetails, getTaskStatuses, getDepartments } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";
import SafeHtml from "@/components/ui/SafeHtml";
import { AppCard } from "@/components/ui/AppCard";
import { StatusBadge } from "@/components/ui/data";

interface TaskPageProps {
  params: Promise<{
    taskId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TaskDetailsPage({ params, searchParams }: TaskPageProps) {
  const { taskId } = await params;
  const sp = await searchParams;
  const isViewMode = sp?.mode === 'view';
  let task;
  let statuses: any[] = [];
  let departments: any[] = [];

  try {
    task = await getTaskDetails(taskId);
    statuses = await getTaskStatuses();
    departments = await getDepartments();
  } catch (error) {
    task = null;
  }

  if (!task || task.error) {
    notFound();
  }

  const { hasPermission } = await import("@/lib/permissions");
  const { cookies } = await import("next/headers");
  const { createClient } = await import("@/utils/supabase/server");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const isSuperAdmin = user ? await hasPermission(user.id, "SUPER_ADMIN") : false;
  const isTaskAssigneeOrOwner = user ? (task.assigned_to === user.id || task.owner_id === user.id) : false;
  const isExecutor = user ? (task.task_assignees?.some((a: any) => a.id === user.id)) : false;
  const canManageClosedTask = isSuperAdmin || isTaskAssigneeOrOwner;

  const isClosed = task.status?.is_closed === true;
  const isFrozen = isClosed && !canManageClosedTask;
  const effectiveReadOnly = isViewMode || isFrozen;
  const canEditTitle = !effectiveReadOnly && (isSuperAdmin || isTaskAssigneeOrOwner || isExecutor);

  return (
    <div className="space-y-5 pb-6 pt-2">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <nav aria-label="Task navigation" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <TaskBackButton
            fallbackHref={task.parent_task_id ? `/tasks/${task.parent_task_id}` : (task.sub_workspace_id ? `/workspaces/tasks?workspaceId=${task.sub_workspace_id}` : (task.workspace_id ? `/workspaces/tasks?workspaceId=${task.workspace_id}` : "/workspaces"))}
            label={`Back to ${task.parent_task_id ? "parent task" : "task list"}`}
            className="inline-flex items-center gap-1.5 font-medium text-accent-soft-text hover:underline"
          />
          <span aria-hidden className="text-muted">/</span>
          <Link
            href={`/workspaces${(task.sub_workspace_id || task.workspace_id) ? `?workspace=${task.sub_workspace_id || task.workspace_id}&restoreHierarchy=true` : '?restoreHierarchy=true'}`}
            className="font-medium text-muted transition-colors hover:text-foreground"
          >
            Execution hierarchy
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{task.task_code || "TASK"}</span>
          <StatusBadge status={task.status?.name || task.status?.status_name || null} />
          <span className="text-[12.5px] text-muted">
            {task.workspace?.code ? `${task.workspace.code} · ` : ""}{task.workspace?.name || "No workspace"}
          </span>
        </div>

        <div>
          {effectiveReadOnly || !canEditTitle ? (
            <h1 className="w-full whitespace-normal break-words text-[20px] font-semibold leading-snug text-heading">{task.title || task.subject}</h1>
          ) : (
            <EditableTaskTitle task={task} asHeading={true} readOnly={effectiveReadOnly || !canEditTitle} />
          )}
        </div>
      </header>

      <div className="space-y-5">
        <AppCard className="space-y-4 border border-border bg-surface p-5 shadow-xs">
          <EditableTaskDescription task={task} readOnly={effectiveReadOnly || !canEditTitle} />

          {typeof task.custom_fields?.progress_percentage === 'number' && (
            <div className="flex items-center gap-3 border-t border-border pt-3">
              <span className="text-[12.5px] text-muted">Subtask progress</span>
              <div className="h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={task.custom_fields.progress_percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Subtask progress">
                <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
              </div>
              <span className="text-[12.5px] font-medium tabular-nums text-foreground">{task.custom_fields.progress_percentage}%</span>
            </div>
          )}
        </AppCard>

        <div className="w-full">
          {isFrozen && (
            <div role="status" className="mb-4 flex items-start gap-3 rounded-md border border-warning-border bg-warning-soft p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden />
              <div>
                <h4 className="text-[13.5px] font-semibold text-warning-text">This task is closed and locked</h4>
                <p className="mt-1 text-[13px] text-warning-text">
                  Only a super admin or the task owner can edit or reopen it.
                </p>
              </div>
            </div>
          )}
          <TaskExecutionController taskId={taskId} initialTask={task} initialStatuses={statuses} initialDepartments={departments} readOnly={effectiveReadOnly} />
        </div>
      </div>
    </div>
  );
}
