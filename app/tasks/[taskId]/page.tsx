import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList } from "lucide-react";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import dynamic from "next/dynamic";

const TaskRightPanel = dynamic(() => import("@/components/tasks/TaskRightPanel"), {
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02] animate-pulse h-32 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Panel...</div>
});
import { getTaskDetails, getTaskStatuses } from "@/lib/actions/tasks";
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

  try {
    task = await getTaskDetails(taskId);
    statuses = await getTaskStatuses();
  } catch (error) {
    task = null;
  }

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={task.workspace_id ? `/workspaces?workspace=${task.workspace_id}` : "/workspaces"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {/* Removed redundant floating workspace widget */}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-purple-700 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded font-bold">
                    Task detail
                  </p>
                  <p className="text-xs uppercase tracking-[0.28em] text-gray-500 px-2 py-1 border border-gray-200 dark:border-white/10 rounded font-bold">
                    Workspace: {task.workspace?.name || task.workspace?.code || "Unknown"}
                  </p>
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{task.title}</h1>
                <div 
                  className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: task.description || "" }} 
                />
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
              <div className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-200">
                <ClipboardList className="h-4 w-4" />
                Full task page
              </div>
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

          <TaskExecutionController taskId={taskId} initialTask={task} initialStatuses={statuses} />
        </div>

        <div className="space-y-6">
          <TaskRightPanel taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
