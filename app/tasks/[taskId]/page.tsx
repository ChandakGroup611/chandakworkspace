import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList } from "lucide-react";
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
}

export default async function TaskDetailsPage({ params }: TaskPageProps) {
  const { taskId } = await params;
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

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={task.parent_task_id ? `/tasks/${task.parent_task_id}` : (task.workspace_id ? `/workspaces/tasks?workspaceId=${task.workspace_id}` : "/workspaces")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800"
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
        {/* Removed redundant floating workspace widget */}
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr] items-stretch">
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/80 h-full flex flex-col">
            
            {/* Top row: Tags and Button */}
            <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-[11px] font-mono tracking-wider text-purple-700 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded font-bold">
                  {task.task_code || "TASK"}
                </p>
                <p className="text-[11px] tracking-wider text-gray-500 px-2 py-0.5 border border-gray-200 dark:border-white/10 rounded font-bold bg-white dark:bg-transparent">
                  WORKSPACE: {task.workspace?.code ? `[${task.workspace.code}] ` : ""}{task.workspace?.name || "Unknown"}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-200 shrink-0">
                <ClipboardList className="h-4 w-4" />
                Full task page
              </div>
            </div>

            {/* Content row: Title, description, etc. */}
            <div className="min-w-0 w-full flex-1 mt-1">
                <div className="mt-3 w-full">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                    Subject
                  </span>
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <h1 className="text-lg font-bold text-purple-700 dark:text-purple-400 break-words whitespace-normal w-full">{task.title}</h1>
                  </div>
                </div>
                
                {task.description && (
                  <div className="mt-6 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5" /> Description
                    </span>
                    <div 
                      className="text-[13px] sm:text-sm text-gray-700 dark:text-gray-300 w-full max-w-full leading-relaxed prose prose-sm dark:prose-invert bg-gray-50/80 dark:bg-[#111827]/50 p-4 rounded-xl border border-gray-200/60 dark:border-white/10 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: task.description }} 
                    />
                  </div>
                )}
                
                {task.custom_fields?.link_url && task.custom_fields.link_url !== "null" && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 w-full overflow-hidden">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0 uppercase tracking-wider">External Link:</span>
                    <a 
                      href={task.custom_fields.link_url.startsWith('http') ? task.custom_fields.link_url : `https://${task.custom_fields.link_url}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-all whitespace-normal"
                    >
                      {task.custom_fields.link_url}
                    </a>
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
                  <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/20">
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
          
          <div className="h-full">
            <TaskRightPanel taskId={taskId} />
          </div>
        </div>

        <div className="w-full">
          <TaskExecutionController taskId={taskId} initialTask={task} initialStatuses={statuses} initialDepartments={departments} />
        </div>
      </div>
    </div>
  );
}
