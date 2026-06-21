import { Suspense } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getVisibleWorkspaces } from "@/lib/repositories/workspaces";
import TransferTasksClient from "./Client"; 
import { Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function TransferTasksPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  // Fetch workspaces the user can access
  const workspaces = await getVisibleWorkspaces(user.id);

  // Fetch all tasks the user can access
  // In a real scenario, this would likely be paginated or limited, but for bulk transfer we fetch what we can
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id,
      subject,
      task_code,
      description,
      workspace_id,
      parent_task_id,
      status:status_master(status_name, status_code),
      priority:priority_master(priority_name, priority_code),
      created_at,
      assigned_to,
      owner_id,
      workspace:workspaces!tasks_workspace_id_fkey(workspace_name, workspace_code)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching tasks for transfer:", error);
  }

  // Also fetch users to use in assignee dropdowns
  const { data: allUsers } = await supabase
    .from('user_master')
    .select('id, full_name, email')
    .eq('is_active', true);

  // Fetch workspace members to know who is in what workspace
  const { data: wsMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role');

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col space-y-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Transfer Tasks</h1>
        <p className="text-sm text-gray-400">
          Bulk move tasks between workspaces and reassign owners or watchers if needed.
        </p>
      </div>

      <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}>
        <TransferTasksClient 
          initialTasks={tasks || []} 
          workspaces={workspaces || []} 
          allUsers={allUsers || []}
          wsMembers={wsMembers || []}
        />
      </Suspense>
    </div>
  );
}
