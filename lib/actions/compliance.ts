"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");
  if (!isSuperAdmin) throw new Error("Forbidden: Super Admin access required");
}

/**
 * Fetches workspaces, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceWorkspaces(isDeleted: boolean = false) {
  await verifySuperAdmin();
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('id, workspace_name, workspace_code, is_deleted, created_at, updated_at')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching workspaces for compliance:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetches tasks, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceTasks(isDeleted: boolean = false) {
  await verifySuperAdmin();
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, subject, description, is_deleted, created_at, updated_at, workspace_id')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching tasks for compliance:", error);
    return [];
  }
  return data || [];
}

export async function fetchComplianceRequirements(isDeleted: boolean = false) {
  await verifySuperAdmin();
  const { data, error } = await supabaseAdmin
    .from('requirements')
    .select('id, title, code, is_deleted, created_at, updated_at')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching requirements for compliance:", error);
    return [];
  }
  return data || [];
}

export async function fetchComplianceMaster(table: string, nameKey: string, codeKey: string, isDeleted: boolean = false) {
  await verifySuperAdmin();
  // Safe list of allowed tables to prevent SQL injection or bad requests
  const allowedTables = ['user_master', 'status_master', 'priority_master', 'department_master', 'designation_master', 'company_master'];
  if (!allowedTables.includes(table)) throw new Error("Invalid master table");

  // Select id, the dynamic name and code columns, plus tracking cols
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(`id, ${nameKey}, ${codeKey}, is_deleted, created_at, updated_at`)
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(`Error fetching ${table} for compliance:`, error);
    return [];
  }
  return data || [];
}

export type ComplianceEntity = 'workspaces' | 'tasks' | 'requirements' | 'user_master' | 'status_master' | 'priority_master' | 'department_master' | 'designation_master' | 'company_master';

/**
 * HARD DELETES records permanently from the database.
 * This completely destroys the rows.
 */
export async function hardDeleteEntity(entityType: ComplianceEntity, ids: string[]) {
  await verifySuperAdmin();
  if (!ids || ids.length === 0) return { success: true };

  const { error } = await supabaseAdmin
    .from(entityType)
    .delete()
    .in('id', ids);

  if (error) {
    console.error(`Failed to hard delete ${entityType} ${ids}:`, error);
    // Code 23503 is postgres foreign_key_violation
    if (error.code === '23503') {
      throw new Error(`Cannot delete ${entityType}. They contain attached child records (like tasks or members) which must be deleted first.`);
    }
    throw new Error(`Hard delete failed: ${error.message}`);
  }

  revalidatePath('/compliance');
  return { success: true };
}

/**
 * RESTORES soft-deleted records back to active status.
 */
export async function restoreEntity(entityType: ComplianceEntity, ids: string[]) {
  await verifySuperAdmin();
  if (!ids || ids.length === 0) return { success: true };

  const { error } = await supabaseAdmin
    .from(entityType)
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) {
    console.error(`Failed to restore ${entityType} ${ids}:`, error);
    throw new Error(`Restore failed: ${error.message}`);
  }

  revalidatePath('/compliance');
  revalidatePath(`/${entityType}`);
  return { success: true };
}

export async function fetchWorkspaceStakeholders(workspaceId: string) {
  await verifySuperAdmin();
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role, user:user_master(id, full_name, user_code, email)')
    .eq('workspace_id', workspaceId);
  
  if (error) {
    console.error("Error fetching workspace stakeholders:", error);
    return [];
  }
  
  return data.map(d => ({
    user_id: d.user_id,
    role: d.role,
    ...((d.user as any) || {})
  }));
}

export async function fetchTaskParticipants(taskId: string) {
  await verifySuperAdmin();
  const { data } = await supabaseAdmin
    .from('task_participants')
    .select('user_id')
    .eq('task_id', taskId);
  return data?.map(p => p.user_id) || [];
}

export async function moveTasksBatchOperation(
  taskIds: string[], 
  targetWorkspaceId: string, 
  reassignments: Record<string, { newExecutive?: string; newWatchers?: string[] }>
) {
  await verifySuperAdmin();
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  for (const taskId of taskIds) {
    // get task
    const { data: task } = await supabaseAdmin.from('tasks').select('*').eq('id', taskId).single();
    if (!task) continue;

    const reassignment = reassignments[taskId] || {};
    
    // determine new executive
    let newExecutive = task.assigned_to;
    if (reassignment.newExecutive !== undefined) {
      newExecutive = reassignment.newExecutive;
    }

    // determine new watchers
    let newWatchers = reassignment.newWatchers;

    // update task
    const { error: taskError } = await supabaseAdmin
      .from('tasks')
      .update({
        workspace_id: targetWorkspaceId,
        assigned_to: newExecutive,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (taskError) {
      console.error(`Failed to update workspace for task ${taskId}:`, taskError);
      throw new Error(`Failed to update workspace for task ${taskId}: ${taskError.message}`);
    }

    // update participants if needed
    if (newWatchers !== undefined) {
      // delete existing participants
      await supabaseAdmin.from('task_participants').delete().eq('task_id', taskId);
      // insert new watchers
      if (newWatchers.length > 0) {
        await supabaseAdmin.from('task_participants').insert(
          newWatchers.map(uid => ({
            task_id: taskId,
            user_id: uid,
            participation_role: 'watcher'
          }))
        );
      }
    }

    // add to audit log
    await supabaseAdmin.from('task_activity_logs').insert([{
      task_id: taskId,
      actor_id: userId,
      action: 'WORKSPACE_CHANGE',
      new_state: {
        workspace_id: targetWorkspaceId,
        assigned_to: newExecutive,
        watchers: newWatchers !== undefined ? newWatchers : 'kept existing'
      }
    }]);

    // add remark to chat
    await supabaseAdmin.from('task_comments').insert([{
      task_id: taskId,
      author_id: userId,
      content: `System: Task moved to a new workspace.`
    }]);
  }
  
  revalidatePath('/compliance');
  revalidatePath('/workspaces');
  return { success: true };
}
