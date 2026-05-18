import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList } from "lucide-react";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import TaskRealtimeChat from "@/components/tasks/TaskRealtimeChat";
import TaskActivityTimeline from "@/components/tasks/TaskActivityTimeline";
import { getTaskDetails } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";

interface TaskPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function TaskDetailsPage({ params }: TaskPageProps) {
  const { taskId } = await params;
  let task;

  try {
    task = await getTaskDetails(taskId);
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
          href="/workspaces"
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace task list
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white/90 p-3 text-right shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Workspace</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {task.workspace?.name || task.workspace?.code || "Workspace"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Task detail</p>
                <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{task.title}</h1>
                <p className="mt-1 text-sm text-gray-500">{task.description}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-200">
                <ClipboardList className="h-4 w-4" />
                Full task page
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-4 dark:border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Creator</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{task.creator?.full_name || "Unknown"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Created At</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{new Date(task.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Last Status</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/20">
                    {task.status?.name || "Open"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Last Updated</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{task.updated_at ? new Date(task.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "Never"}</p>
              </div>
            </div>
          </div>

          <TaskExecutionController taskId={taskId} />
        </div>

        <div className="space-y-6">
          <TaskRealtimeChat taskId={taskId} />
          <TaskActivityTimeline taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
