import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList, Type, AlignLeft } from "lucide-react";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import { EditableTaskTitle } from "@/components/tasks/EditableTaskTitle";
import { getTaskDetails, getTaskStatuses, getDepartments } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";
import SafeHtml from "@/components/ui/SafeHtml";
import { AppCard } from "@/components/ui/AppCard";

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

  const isExecutive = user ? (await hasPermission(user.id, "WORKSPACES_MANAGE") || await hasPermission(user.id, "REQUIREMENTS_MANAGE")) : false;

  const isClosed = task.status?.is_closed === true;
  const isFrozen = isClosed && !isExecutive;
  const effectiveReadOnly = isViewMode || isFrozen;

  return (
    <div className="space-y-6 pb-6 pt-2">
      <AppCard className="p-6 mb-6 border border-border/60 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={task.parent_task_id ? `/tasks/${task.parent_task_id}` : (task.workspace_id ? `/workspaces/tasks?workspaceId=${task.workspace_id}` : "/workspaces")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-theme-icon hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {task.parent_task_id ? "Parent Task" : "Task List"}
            </Link>
            <span className="hidden sm:inline text-muted/50 dark:text-subtle/50">|</span>
            <Link
              href="/workspaces"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors"
            >
              Back to Workspace List
            </Link>
          </div>
        </div>

        {/* Header Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-[11px] font-mono tracking-wider text-theme-icon bg-theme-btn-primary/10 px-2 py-0.5 rounded font-bold border border-theme-btn-primary/20">
            {task.task_code || "TASK"}
          </p>
          <p className="text-[11px] tracking-wider text-muted px-2 py-0.5 border border-border dark:border-border rounded font-bold bg-surface dark:bg-transparent">
            WORKSPACE: {task.workspace?.code ? `[${task.workspace.code}] ` : ""}{task.workspace?.name || "Unknown"}
          </p>
        </div>
        
        <div>
          {effectiveReadOnly ? (
            <h1 className="text-2xl font-bold text-theme-heading break-words whitespace-normal w-full">{task.title || task.subject}</h1>
          ) : (
            <EditableTaskTitle task={task} asHeading={true} />
          )}
        </div>
      </AppCard>

      <div className="space-y-6">

        {/* DEDICATED CARD FOR SUBJECT AND DESCRIPTION */}
        <AppCard className="overflow-hidden border border-border/60 shadow-md p-0">
          <div className="bg-gradient-to-r from-accent/15 via-surface/90 to-surface/40 dark:from-accent/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 rounded-full bg-theme-btn-primary text-theme-btn-primary-text shadow-xs" />
              <Type className="w-4 h-4 text-accent dark:text-accent" />
              <h3 className="font-bold text-sm tracking-wide text-foreground">Task Subject & Description</h3>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-theme-icon bg-theme-btn-primary/10 px-2.5 py-0.5 rounded-full border border-theme-btn-primary/20">
              {task.task_code || "TASK"}
            </span>
          </div>
          <div className="p-6 space-y-6">
            
            {task.description && (
              <div className="w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Description
                </span>
                <SafeHtml 
                  className="whitespace-pre-wrap text-[13px] sm:text-sm text-subtle dark:text-muted w-full max-w-full leading-relaxed prose prose-sm dark:prose-invert bg-surface/80 dark:bg-[#111827]/50 p-4 rounded-xl border border-border/60 dark:border-border shadow-sm"
                  html={task.description} 
                />
              </div>
            )}
            
            {typeof task.custom_fields?.progress_percentage === 'number' && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Subtask Progress</span>
                <div className="w-64 h-1.5 bg-elevated dark:bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-subtle dark:text-muted">{task.custom_fields.progress_percentage}%</span>
              </div>
            )}
          </div>
        </AppCard>

        <div className="w-full">
          {isFrozen && (
            <div className="mb-4 rounded-xl bg-amber-50 dark:bg-warning/10 border border-amber-200 dark:border-amber-500/20 p-4 shadow-sm flex items-start gap-3">
              <span className="text-xl shrink-0">🧊</span>
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-warning">Task is Frozen</h4>
                <p className="text-xs text-amber-700 dark:text-warning mt-1">This task is strictly frozen because its status is Closed. Only Super Admins and Executives can edit or reopen it.</p>
              </div>
            </div>
          )}
          <TaskExecutionController taskId={taskId} initialTask={task} initialStatuses={statuses} initialDepartments={departments} readOnly={effectiveReadOnly} />
        </div>
      </div>
    </div>
  );
}
