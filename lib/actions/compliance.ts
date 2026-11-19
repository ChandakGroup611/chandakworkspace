"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";

async function verifyAccess(requiredPermission: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");
    if (isSuperAdmin) return true;

    if (requiredPermission) {
      const hasAccess = await hasPermission(user.id, requiredPermission);
      if (!hasAccess) throw new Error(`Forbidden: ${requiredPermission} access required`);
    } else {
      throw new Error("Forbidden: Super Admin access required");
    }
  } catch (err: any) {
    if (err?.message?.includes('Forbidden') || err?.message?.includes('Unauthorized')) {
      throw err;
    }
    throw new Error("Unauthorized");
  }
}

/**
 * Hydrates deleted records with delete_batch metadata, deleter user name, and deletion reason.
 */
async function hydrateTrashMetadata(records: any[]) {
  if (!records || records.length === 0) return [];
  const batchIds = [...new Set(records.map(r => r.delete_batch_id).filter(Boolean))];
  const userIds = [...new Set(records.map(r => r.deleted_by).filter(Boolean))];

  const batchMap = new Map<string, any>();
  if (batchIds.length > 0) {
    const { data: batches } = await supabaseAdmin
      .from('delete_batches')
      .select('id, reason, deleted_by, deleted_at, status')
      .in('id', batchIds);
    if (batches) {
      for (const b of batches) {
        batchMap.set(b.id, b);
        if (b.deleted_by) userIds.push(b.deleted_by);
      }
    }
  }

  const userMap = new Map<string, string>();
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('user_master')
      .select('id, full_name, user_code')
      .in('id', uniqueUserIds);
    if (users) {
      for (const u of users) {
        userMap.set(u.id, u.full_name || u.user_code || u.id);
      }
    }
  }

  return records.map(r => {
    const batch = r.delete_batch_id ? batchMap.get(r.delete_batch_id) : null;
    const deleterId = r.deleted_by || batch?.deleted_by;
    const deleterName = deleterId ? (userMap.get(deleterId) || 'System') : '—';
    const deletedOn = r.deleted_at || batch?.deleted_at || r.updated_at;
    const reason = batch?.reason || r.reason || '—';
    return {
      ...r,
      deleted_by_name: deleterName,
      deleted_on: deletedOn,
      reason: reason
    };
  });
}

/**
 * Fetches workspaces, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceWorkspaces(isDeleted: boolean = false) {
  await verifyAccess("TRASH_VIEW");
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('id, workspace_name, workspace_code, is_deleted, created_at, updated_at, deleted_by, deleted_at, delete_batch_id')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching workspaces for compliance:", error);
    throw new Error(`Failed to fetch compliance workspaces: ${error.message}`);
  }
  return await hydrateTrashMetadata(data || []);
}

/**
 * Fetches tasks, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceTasks(isDeleted: boolean = false) {
  await verifyAccess("TRASH_VIEW");
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, task_code, subject, description, is_deleted, created_at, updated_at, workspace_id, deleted_by, deleted_at, delete_batch_id')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching tasks for compliance:", error);
    throw new Error(`Failed to fetch compliance tasks: ${error.message}`);
  }
  return await hydrateTrashMetadata(data || []);
}

/**
 * Fetches requirements, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceRequirements(isDeleted: boolean = false) {
  await verifyAccess("TRASH_VIEW");
  const { data, error } = await supabaseAdmin
    .from('requirements')
    .select('id, title, code, is_deleted, created_at, updated_at, deleted_by, deleted_at, delete_batch_id')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching requirements for compliance:", error);
    throw new Error(`Failed to fetch compliance requirements: ${error.message}`);
  }
  return await hydrateTrashMetadata(data || []);
}

/**
 * Fetches tickets, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceTickets(isDeleted: boolean = false) {
  await verifyAccess("TRASH_VIEW");
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select('id, code, title, is_deleted, created_at, updated_at, deleted_by, deleted_at, delete_batch_id')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching tickets for compliance:", error);
    throw new Error(`Failed to fetch compliance tickets: ${error.message}`);
  }
  return await hydrateTrashMetadata(data || []);
}

/**
 * Fetches AMC contracts, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceAmc(isDeleted: boolean = false) {
  await verifyAccess("TRASH_VIEW");
  const { data, error } = await supabaseAdmin
    .from('software_amc')
    .select('id, software_name, vendor_name, is_deleted, created_at, updated_at, deleted_by, deleted_at, delete_batch_id')
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching AMC for compliance:", error);
    throw new Error(`Failed to fetch compliance AMC: ${error.message}`);
  }
  return await hydrateTrashMetadata(data || []);
}

export async function fetchComplianceMaster(table: string, nameKey: string, codeKey: string, isDeleted: boolean = false) {
  await verifyAccess("TRASH_VIEW");
  // Map aliases to real tables
  let actualTable = table;
  if (table === 'department_master') actualTable = 'departments';
  if (table === 'designation_master') actualTable = 'designations';

  const allowedTables = ['user_master', 'status_master', 'priority_master', 'departments', 'designations', 'company_master'];
  if (!allowedTables.includes(actualTable)) throw new Error("Invalid master table: " + table);

  const { data, error } = await supabaseAdmin
    .from(actualTable)
    .select(`id, ${nameKey}, ${codeKey}, is_deleted, created_at, updated_at, deleted_by, deleted_at, delete_batch_id`)
    .eq('is_deleted', isDeleted)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(`Error fetching ${actualTable} for compliance:`, error);
    throw new Error(`Failed to fetch compliance master ${actualTable}: ${error.message}`);
  }
  return await hydrateTrashMetadata(data || []);
}

export type ComplianceEntity =
  | 'workspaces'
  | 'tasks'
  | 'tickets'
  | 'requirements'
  | 'software_amc'
  | 'user_master'
  | 'status_master'
  | 'priority_master'
  | 'departments'
  | 'designations'
  | 'company_master'
  | 'department_master'
  | 'designation_master';

/**
 * RESTORES soft-deleted records back to active status (WP5 5.2).
 * Uses LifecycleManager.restoreFromTrash for batch-managed records,
 * and runs parent checks and is_active=true for standalone legacy records.
 */
export async function restoreEntity(entityType: ComplianceEntity | string, ids: string[]) {
  await verifyAccess("TRASH_UPDATE");
  if (!ids || ids.length === 0) return { success: true };

  let userId = 'system';
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {}

  const { LifecycleManager } = await import('@/lib/services/LifecycleManager');

  let targetTable = entityType;
  if (entityType === 'department_master') targetTable = 'departments';
  if (entityType === 'designation_master') targetTable = 'designations';

  const { data: records, error: fetchErr } = await supabaseAdmin
    .from(targetTable)
    .select('id, delete_batch_id')
    .in('id', ids);

  if (fetchErr) return { success: false, error: fetchErr.message };

  const batchesToRestore = new Set<string>();
  const standaloneIds: string[] = [];

  for (const r of (records || [])) {
    if (r.delete_batch_id) {
      batchesToRestore.add(r.delete_batch_id);
    } else {
      standaloneIds.push(r.id);
    }
  }

  // Restore via batches (LifecycleManager handles all cascade children, parent checks, and clearing metadata)
  for (const batchId of batchesToRestore) {
    const res = await LifecycleManager.restoreFromTrash(batchId, userId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
  }

  // For standalone legacy rows without delete_batch_id, run parent checks and restore
  if (standaloneIds.length > 0) {
    const parentChecks: Record<string, { parentTable: string, foreignKey: string, parentName: string }> = {
      'tasks': { parentTable: 'workspaces', foreignKey: 'workspace_id', parentName: 'Workspace' },
      'tickets': { parentTable: 'workspaces', foreignKey: 'workspace_id', parentName: 'Workspace' },
      'sub_tasks': { parentTable: 'tasks', foreignKey: 'parent_task_id', parentName: 'Parent Task' },
      'workspaces': { parentTable: 'workspaces', foreignKey: 'parent_workspace_id', parentName: 'Parent Workspace' },
      'requirements': { parentTable: 'workspaces', foreignKey: 'workspace_id', parentName: 'Workspace' }
    };

    if (parentChecks[targetTable]) {
      const check = parentChecks[targetTable];
      const { data: recs } = await supabaseAdmin.from(targetTable).select(`id, ${check.foreignKey}`).in('id', standaloneIds);
      if (recs && recs.length > 0) {
        const parentIds = [...new Set(recs.map((r: any) => r[check.foreignKey]).filter(Boolean))];
        if (parentIds.length > 0) {
          const { data: deletedParents } = await supabaseAdmin.from(check.parentTable).select('id').in('id', parentIds as string[]).eq('is_deleted', true);
          if (deletedParents && deletedParents.length > 0) {
            return {
              success: false,
              error: `Cannot restore these ${targetTable} because their parent (${check.parentName}) is in the trash. Please restore the parent first.`
            };
          }
        }
      }
    }

    const clearPayload: any = {
      is_deleted: false,
      delete_batch_id: null,
      deleted_by: null,
      deleted_at: null,
      updated_at: new Date().toISOString()
    };
    if (['user_master', 'status_master', 'priority_master', 'company_master'].includes(targetTable)) {
      clearPayload.is_active = true;
    }
    await supabaseAdmin.from(targetTable).update(clearPayload).in('id', standaloneIds);
  }

  revalidatePath('/compliance');
  revalidatePath(`/${targetTable}`);
  return { success: true };
}

/**
 * Purges deleted records permanently (WP5 5.3).
 * Uses LifecycleManager.purgeBatch. Strictly Super Admin only.
 */
export async function hardDeleteEntity(entityType: ComplianceEntity | string, ids: string[]) {
  await verifyAccess("TRASH_DELETE");
  if (!ids || ids.length === 0) return { success: true };

  let userId = 'system';
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {}

  const { LifecycleManager } = await import('@/lib/services/LifecycleManager');

  let targetTable = entityType;
  if (entityType === 'department_master') targetTable = 'departments';
  if (entityType === 'designation_master') targetTable = 'designations';

  const { data: records, error: fetchErr } = await supabaseAdmin
    .from(targetTable)
    .select('id, delete_batch_id')
    .in('id', ids);

  if (fetchErr) return { success: false, error: fetchErr.message };

  for (const r of (records || [])) {
    if (r.delete_batch_id) {
      const res = await LifecycleManager.purgeBatch(r.delete_batch_id, userId);
      if (!res.success) {
        return { success: false, error: res.error, active_children: res.active_children };
      }
    } else {
      // Legacy item without batch - create batch and purge
      const { batchId } = await LifecycleManager.moveToTrash(targetTable, r.id, userId, "Purging legacy trash item");
      if (batchId) {
        const res = await LifecycleManager.purgeBatch(batchId, userId);
        if (!res.success) return { success: false, error: res.error, active_children: res.active_children };
      }
    }
  }

  revalidatePath('/compliance');
  return { success: true };
}

export async function fetchWorkspaceStakeholders(workspaceId: string) {
  await verifyAccess("SUPER_ADMIN");
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role, user:user_master(id, full_name, user_code, email)')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false);

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
  await verifyAccess("SUPER_ADMIN");
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
  await verifyAccess("SUPER_ADMIN");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  for (const taskId of taskIds) {
    const { data: task } = await supabaseAdmin.from('tasks').select('*').eq('id', taskId).single();
    if (!task) continue;

    const reassignment = reassignments[taskId] || {};
    let newExecutive = task.assigned_to;
    if (reassignment.newExecutive !== undefined) {
      newExecutive = reassignment.newExecutive;
    }
    const newWatchers = reassignment.newWatchers;

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

    if (newWatchers !== undefined) {
      await supabaseAdmin.from('task_participants').delete().eq('task_id', taskId);
      if (newWatchers.length > 0) {
        await supabaseAdmin.from('task_participants').insert(
          newWatchers.map(uid => ({
            task_id: taskId,
            user_id: uid,
            participation_role: 'WATCHER'
          }))
        );
      }
    }

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
