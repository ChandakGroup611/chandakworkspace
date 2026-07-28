const fs = require('fs');

const pageContent = `import Link from "next/link";
import { ArrowLeft, MessageCircle, ClipboardList, Flag, ChevronDown, ChevronUp } from "lucide-react";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import dynamic from "next/dynamic";
import { getTaskDetails, getTaskStatuses, getDepartments } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";

const TaskRightPanel = dynamic(() => import("@/components/tasks/TaskRightPanel"), {
  loading: () => <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-surface/[0.02] animate-pulse h-32 flex items-center justify-center text-gray-400 text-xs font-bold">Loading Panel...</div>
});

import SafeHtml from "@/components/ui/SafeHtml";

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
  
  const workspaceName = task.workspace?.name || "Workspace";
  const parentTaskCode = task.parent_task_id ? (task.parent_task?.task_code || "Parent Task") : null;
  const taskCode = task.task_code || "TASK-100";

  return (
    <div className="w-full bg-[#f4f5f7] dark:bg-[#091e42] min-h-screen text-[#172b4d] dark:text-[#b3bac5] font-sans pb-10">
      <div className="max-w-[1400px] mx-auto px-6 pt-6">
        
        {/* Breadcrumbs */}
        <div className="text-sm font-medium text-[#5e6c84] dark:text-[#8993a4] mb-3 flex items-center gap-2">
          <Link href="/workspaces" className="hover:underline">{workspaceName}</Link>
          <span>/</span>
          {parentTaskCode && (
            <>
              <Link href={\`/tasks/\${task.parent_task_id}\`} className="hover:underline">{parentTaskCode}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#172b4d] dark:text-[#b3bac5] font-semibold cursor-default">{taskCode}</span>
        </div>

        {/* Title Header Row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <h1 className="text-3xl md:text-[2rem] font-semibold text-[#172b4d] dark:text-white leading-tight">
            {task.title} <span className="text-[#5e6c84] dark:text-[#8993a4] text-xl font-normal ml-2">[{taskCode}]</span>
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-sm bg-[#dfe1e6] dark:bg-[#283447] text-[#42526e] dark:text-[#b3bac5] text-xs font-bold uppercase tracking-wider">
              {task.status?.name || "OPEN"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#ffebe6] dark:bg-[#4a1c1c] text-[#de350b] dark:text-[#ff7452] text-xs font-bold uppercase tracking-wider">
              <Flag className="w-3.5 h-3.5" />
              High
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr] items-start">
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-8 min-w-0">
            
            {/* Description Block */}
            <div className="bg-white dark:bg-[#101214] border border-[#dfe1e6] dark:border-[#283447] rounded-sm p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-[#172b4d] dark:text-white">Description</h2>
              
              <div className="border border-[#dfe1e6] dark:border-[#283447] rounded-sm bg-white dark:bg-[#101214]">
                {/* Fake Rich Text Toolbar */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-[#dfe1e6] dark:border-[#283447] bg-[#f4f5f7] dark:bg-[#1d2125]">
                  <span className="font-serif font-bold text-gray-600 dark:text-gray-400 cursor-pointer">B</span>
                  <span className="font-serif italic text-gray-600 dark:text-gray-400 cursor-pointer">I</span>
                  <span className="font-serif underline text-gray-600 dark:text-gray-400 cursor-pointer">U</span>
                  <span className="font-serif line-through text-gray-600 dark:text-gray-400 cursor-pointer">S</span>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                  <ClipboardList className="w-4 h-4 text-gray-600 dark:text-gray-400 cursor-pointer" />
                </div>
                
                {/* Markdown Content */}
                <div className="p-4 min-h-[150px]">
                  {task.description ? (
                    <SafeHtml 
                      className="whitespace-pre-wrap text-[14px] text-[#172b4d] dark:text-[#b3bac5] w-full max-w-full leading-relaxed prose prose-sm dark:prose-invert"
                      html={task.description} 
                    />
                  ) : (
                    <p className="text-gray-400 italic text-sm">No description provided.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Task Execution Controller (Activity & Comments) */}
            <div className="w-full">
              {isFrozen && (
                <div className="mb-4 rounded-sm bg-[#ffebe6] dark:bg-[#4a1c1c] border border-[#ffbdad] dark:border-[#bf2600] p-4 flex items-start gap-3">
                  <span className="text-xl shrink-0">🧊</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#bf2600] dark:text-[#ff7452]">Task is Frozen</h4>
                    <p className="text-xs text-[#de350b] dark:text-[#ff8f73] mt-1">This task is strictly frozen because its status is Closed. Only Super Admins and Executives can edit or reopen it.</p>
                  </div>
                </div>
              )}
              
              <h2 className="text-lg font-semibold mb-4 text-[#172b4d] dark:text-white">Activity & Comments</h2>
              <TaskExecutionController taskId={taskId} initialTask={task} initialStatuses={statuses} initialDepartments={departments} readOnly={effectiveReadOnly} />
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            
            {/* Details Card */}
            <div className="bg-white dark:bg-[#101214] border border-[#dfe1e6] dark:border-[#283447] rounded-sm shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#dfe1e6] dark:border-[#283447] bg-[#f4f5f7] dark:bg-[#1d2125] flex justify-between items-center cursor-pointer">
                <h3 className="font-semibold text-[#172b4d] dark:text-white">Details</h3>
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </div>
              <div className="p-5 flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Assignee</span>
                  <span className="text-[#172b4d] dark:text-[#b3bac5] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                      {task.assigned_to ? task.assigned_to.charAt(0).toUpperCase() : "?"}
                    </div>
                    {task.assigned_to ? "Assigned User" : "Unassigned"}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Reporter</span>
                  <span className="text-[#172b4d] dark:text-[#b3bac5] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs">
                      {task.creator?.full_name ? task.creator.full_name.charAt(0) : "?"}
                    </div>
                    {task.creator?.full_name || "Unknown"}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#dfe1e6] dark:bg-[#283447] text-[#42526e] dark:text-[#b3bac5] text-[11px] font-bold uppercase w-fit">
                    {task.status?.name || "OPEN"}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Priority</span>
                  <span className="inline-flex items-center gap-1 text-[#de350b] dark:text-[#ff7452] text-xs font-bold uppercase">
                    <Flag className="w-3.5 h-3.5" /> High
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Labels</span>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-[#ebecf0] dark:bg-[#2c333f] rounded-full text-xs font-medium text-[#42526e] dark:text-[#9fadbc]">
                      {task.workspace?.code || "WS"}
                    </span>
                    <span className="px-2 py-0.5 bg-[#ebecf0] dark:bg-[#2c333f] rounded-full text-xs font-medium text-[#42526e] dark:text-[#9fadbc]">
                      {task.task_type || "Task"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="bg-white dark:bg-[#101214] border border-[#dfe1e6] dark:border-[#283447] rounded-sm shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#dfe1e6] dark:border-[#283447] bg-[#f4f5f7] dark:bg-[#1d2125] flex justify-between items-center cursor-pointer">
                <h3 className="font-semibold text-[#172b4d] dark:text-white">Dates</h3>
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </div>
              <div className="p-5 flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Created</span>
                  <span className="text-[#172b4d] dark:text-[#b3bac5]">
                    {new Date(task.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[#5e6c84] dark:text-[#8993a4] font-semibold">Updated</span>
                  <span className="text-[#172b4d] dark:text-[#b3bac5]">
                    {task.updated_at ? new Date(task.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Log Panel */}
            <div className="bg-white dark:bg-[#101214] border border-[#dfe1e6] dark:border-[#283447] rounded-sm shadow-sm overflow-hidden min-h-[400px]">
               <div className="px-5 py-3 border-b border-[#dfe1e6] dark:border-[#283447] bg-[#f4f5f7] dark:bg-[#1d2125] flex justify-between items-center">
                <h3 className="font-semibold text-[#172b4d] dark:text-white">Audit Log</h3>
              </div>
              <div className="p-4 relative w-full h-[400px]">
                <div className="absolute inset-0 w-full h-full p-2">
                  <TaskRightPanel taskId={taskId} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('d:/adios/app/tasks/[taskId]/page.tsx', pageContent, 'utf8');
console.log('Jira layout written to page.tsx');
