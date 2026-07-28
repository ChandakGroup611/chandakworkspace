import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList, Type, AlignLeft } from "lucide-react";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={task.parent_task_id ? `/tasks/${task.parent_task_id}` : (task.workspace_id ? `/workspaces/tasks?workspaceId=${task.workspace_id}` : "/workspaces")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {task.parent_task_id ? "Parent Task" : "Task List"}
          </Link>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
          <Link
            href="/workspaces"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Back to Workspace List
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Header Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-[11px] font-mono tracking-wider text-accent bg-accent/10 dark:bg-accent/10 px-2 py-0.5 rounded font-bold">
            {task.task_code || "TASK"}
          </p>
          <p className="text-[11px] tracking-wider text-gray-500 px-2 py-0.5 border border-gray-200 dark:border-white/10 rounded font-bold bg-surface dark:bg-transparent">
            WORKSPACE: {task.workspace?.code ? `[${task.workspace.code}] ` : ""}{task.workspace?.name || "Unknown"}
          </p>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-accent dark:text-accent break-words whitespace-normal w-full">{task.title}</h1>
        </div>

        {/* DEDICATED CARD FOR SUBJECT AND DESCRIPTION */}
        <AppCard className="overflow-hidden border border-border/60 shadow-md p-0">
          <div className="bg-gradient-to-r from-blue-500/15 via-surface/90 to-surface/40 dark:from-blue-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 rounded-full bg-blue-500 shadow-xs" />
              <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm tracking-wide text-foreground">Task Subject & Description</h3>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
              {task.task_code || "TASK"}
            </span>
          </div>
          <div className="p-6 space-y-6">
            
            {task.description && (
              <div className="w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Description
                </span>
                <SafeHtml 
                  className="whitespace-pre-wrap text-[13px] sm:text-sm text-gray-700 dark:text-gray-300 w-full max-w-full leading-relaxed prose prose-sm dark:prose-invert bg-gray-50/80 dark:bg-[#111827]/50 p-4 rounded-xl border border-gray-200/60 dark:border-white/10 shadow-sm"
                  html={task.description} 
                />
              </div>
            )}
            
            {typeof task.custom_fields?.progress_percentage === 'number' && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subtask Progress</span>
                <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{task.custom_fields.progress_percentage}%</span>
              </div>
            )}
          </div>
        </AppCard>

        <div className="w-full">
          {isFrozen && (
            <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 shadow-sm flex items-start gap-3">
              <span className="text-xl shrink-0">🧊</span>
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Task is Frozen</h4>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">This task is strictly frozen because its status is Closed. Only Super Admins and Executives can edit or reopen it.</p>
              </div>
            </div>
          )}
          <TaskExecutionController taskId={taskId} initialTask={task} initialStatuses={statuses} initialDepartments={departments} readOnly={effectiveReadOnly} />
        </div>
      </div>
    </div>
  );
}
