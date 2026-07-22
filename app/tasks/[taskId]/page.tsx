import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList } from "lucide-react";
import DOMPurify from 'dompurify';
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import dynamic from "next/dynamic";

const TaskRightPanel = dynamic(() => import("@/components/tasks/TaskRightPanel"), {
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-32 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Panel...</div>
});
import { getTaskDetails, getTaskStatuses, getDepartments } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";

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
        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr] items-stretch">
          <div className="rounded-3xl p-6 theme-card-structural border-transparent">
            
            {/* Top row: Tags and Button */}
            <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-[11px] font-mono tracking-wider text-accent bg-accent/10 dark:bg-accent/10 px-2 py-0.5 rounded font-bold">
                  {task.task_code || "TASK"}
                </p>
                <p className="text-[11px] tracking-wider text-gray-500 px-2 py-0.5 border border-gray-200 dark:border-white/10 rounded font-bold bg-white dark:bg-transparent">
                  WORKSPACE: {task.workspace?.code ? `[${task.workspace.code}] ` : ""}{task.workspace?.name || "Unknown"}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-accent/10 px-4 py-2 text-xs font-semibold text-accent dark:bg-accent/10 dark:text-purple-200 shrink-0">
                <ClipboardList className="h-4 w-4" />
                Full task page
              </div>
            </div>

            {/* Content row: Title, description, etc. */}
            <div className="min-w-0 w-full mt-1">
                <div className="mt-3 w-full">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                    Subject
                  </span>
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <h1 className="text-lg font-bold text-accent dark:text-accent break-words whitespace-normal w-full">{task.title}</h1>
                  </div>
                </div>
                
                {task.description && (
                  <div className="mt-6 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5" /> Description
                    </span>
                    <div 
                      className="text-[13px] sm:text-sm text-gray-700 dark:text-gray-300 w-full max-w-full leading-relaxed prose prose-sm dark:prose-invert bg-gray-50/80 dark:bg-[#111827]/50 p-4 rounded-xl border border-gray-200/60 dark:border-white/10 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.description) }} 
                    />
                  </div>
                )}
                

                {typeof task.custom_fields?.progress_percentage === 'number' && (
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subtask Progress</span>
                    <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${task.custom_fields.progress_percentage}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{task.custom_fields.progress_percentage}%</span>
                  </div>
                )}
              </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-4 dark:border-white/5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Creator</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{task.creator?.full_name || "Unknown"}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Created At</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{new Date(task.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Last Status</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent ring-1 ring-inset ring-accent/10 dark:bg-accent/10 dark:text-accent dark:ring-accent/20">
                    {task.status?.name || "Open"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Last Updated</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{task.updated_at ? new Date(task.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "Never"}</p>
              </div>
            </div>
          </div>
          
          <div className="relative w-full h-full xl:h-auto">
            <div className="xl:absolute xl:inset-0 w-full h-full">
              <TaskRightPanel taskId={taskId} />
            </div>
          </div>
        </div>

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
