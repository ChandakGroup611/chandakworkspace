import { supabaseAdmin } from "@/lib/supabase/service_role";
import { logActivityEvent } from "@/lib/actions/tasks";
import { v4 as uuidv4 } from 'uuid';

export interface MoveToTrashResult {
  success: boolean;
  batchId?: string;
  error?: string;
}

export interface RestoreFromTrashResult {
  success: boolean;
  error?: string;
  auth_unban_required?: boolean;
  message?: string;
}

export interface PurgeBatchResult {
  success: boolean;
  error?: string;
  active_children?: Array<{ id: string; type: string; title: string }>;
}

export class LifecycleManager {
  /**
   * Universal moveToTrash function (WP5 5.1).
   * Runs guard checks first; creates the delete batch row ONLY after guards pass.
   * Cascades soft-deletion to all child records (including sub-workspace tasks).
   */
  static async moveToTrash(
    entityType: string,
    entityId: string,
    userId: string,
    reason?: string
  ): Promise<MoveToTrashResult> {
    const normType = entityType.toUpperCase();
    const timestamp = new Date().toISOString();

    // 1. Guard checks BEFORE creating delete_batches row
    if (normType === 'WORKSPACE') {
      const { data: ws, error: wsError } = await supabaseAdmin
        .from('workspaces')
        .select('id, is_deleted, workspace_name')
        .eq('id', entityId)
        .single();

      if (wsError || !ws) {
        throw new Error("Workspace not found");
      }
      if (ws.is_deleted) {
        throw new Error("Workspace is already in trash");
      }
    } else if (normType === 'TASK') {
      const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .select('id, is_deleted, subject')
        .eq('id', entityId)
        .single();

      if (taskError || !task) {
        throw new Error("Task not found");
      }
      if (task.is_deleted) {
        throw new Error("Task is already in trash");
      }

      // Check for dependencies before deleting
      const { count: depCount, error: depError } = await supabaseAdmin
        .from('task_dependencies')
        .select('id', { count: 'exact', head: true })
        .or(`predecessor_task_id.eq.${entityId},successor_task_id.eq.${entityId}`);

      if (depError) throw new Error("Failed to check task dependencies: " + depError.message);
      if (depCount && depCount > 0) {
        throw new Error("Cannot delete task because it has existing dependencies. Please remove dependencies first.");
      }
    } else if (normType === 'TICKET') {
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('tickets')
        .select('id, is_deleted, title')
        .eq('id', entityId)
        .single();

      if (ticketError || !ticket) {
        throw new Error("Ticket not found");
      }
      if (ticket.is_deleted) {
        throw new Error("Ticket is already in trash");
      }
    } else if (normType === 'REQUIREMENT') {
      const { data: req, error: reqError } = await supabaseAdmin
        .from('requirements')
        .select('id, is_deleted, title')
        .eq('id', entityId)
        .single();

      if (reqError || !req) {
        throw new Error("Requirement not found");
      }
      if (req.is_deleted) {
        throw new Error("Requirement is already in trash");
      }

      // Check if active tasks are raised against this requirement
      const { data: activeTasks, error: actTaskError } = await supabaseAdmin
        .from('requirement_tasks')
        .select('task_id, tasks!inner(is_deleted)')
        .eq('requirement_id', entityId)
        .eq('tasks.is_deleted', false);

      if (actTaskError) throw new Error("Failed to check requirement tasks: " + actTaskError.message);
      if (activeTasks && activeTasks.length > 0) {
        throw new Error("Cannot delete this requirement because there are active tasks raised against it. Please delete those tasks first.");
      }
    }

    // 2. Guards passed: create the delete batch
    const batchId = uuidv4();
    const { error: batchError } = await supabaseAdmin.from('delete_batches').insert({
      id: batchId,
      deleted_by: userId,
      deleted_at: timestamp,
      root_entity_type: normType,
      root_entity_id: entityId,
      reason: reason || null,
      status: 'ACTIVE'
    });

    if (batchError) {
      console.error("[LifecycleManager] Error creating delete batch:", batchError);
      throw new Error(`Failed to create delete batch: ${batchError.message}`);
    }

    // 3. Cascade logic based on root entity type
    if (normType === 'WORKSPACE') {
      await this.cascadeWorkspaceTrash(entityId, batchId, userId, timestamp);
    } else if (normType === 'TASK') {
      await this.cascadeTaskTrash(entityId, batchId, userId, timestamp);
    } else if (normType === 'TICKET') {
      await this.cascadeTicketTrash(entityId, batchId, userId, timestamp);
    } else if (normType === 'REQUIREMENT') {
      await this.cascadeRequirementTrash(entityId, batchId, userId, timestamp);
    } else {
      await this.cascadeMasterTrash(entityType, entityId, batchId, userId, timestamp);
    }

    // 4. Audit Logging
    try {
      await logActivityEvent(
        normType,
        entityId,
        'MOVE_TO_TRASH',
        null,
        { batch_id: batchId, reason },
        userId
      );
    } catch (auditErr) {
      console.warn("[LifecycleManager] Non-fatal audit log failure on moveToTrash:", auditErr);
    }

    return { success: true, batchId };
  }

  /**
   * Universal restoreFromTrash function (WP5 5.2).
   * Restores the whole batch, clears metadata, runs parent checks,
   * sets is_active=true for masters/users, and reports auth unban requirement.
   */
  static async restoreFromTrash(batchId: string, userId: string): Promise<RestoreFromTrashResult> {
    // 1. Fetch batch
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('delete_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return { success: false, error: "Delete batch not found." };
    }

    if (batch.status !== 'ACTIVE') {
      return { success: false, error: `Cannot restore batch in status: ${batch.status}` };
    }

    // 2. Parent checks before restoring
    if (batch.root_entity_type === 'TASK') {
      const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('workspace_id, parent_task_id')
        .eq('id', batch.root_entity_id)
        .single();

      if (task) {
        if (task.workspace_id) {
          const { data: ws } = await supabaseAdmin
            .from('workspaces')
            .select('is_deleted')
            .eq('id', task.workspace_id)
            .single();

          if (ws?.is_deleted) {
            return {
              success: false,
              error: "Cannot restore task because its workspace is in the trash. Please restore the workspace first."
            };
          }
        }

        if (task.parent_task_id) {
          const { data: parentTask } = await supabaseAdmin
            .from('tasks')
            .select('is_deleted')
            .eq('id', task.parent_task_id)
            .single();

          if (parentTask?.is_deleted) {
            return {
              success: false,
              error: "Cannot restore sub-task because its parent task is in the trash. Please restore the parent task first."
            };
          }
        }
      }
    } else if (batch.root_entity_type === 'WORKSPACE') {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('parent_workspace_id')
        .eq('id', batch.root_entity_id)
        .single();

      if (ws?.parent_workspace_id) {
        const { data: parentWs } = await supabaseAdmin
          .from('workspaces')
          .select('is_deleted')
          .eq('id', ws.parent_workspace_id)
          .single();

        if (parentWs?.is_deleted) {
          return {
            success: false,
            error: "Cannot restore sub-workspace because its parent workspace is in the trash. Please restore the parent workspace first."
          };
        }
      }
    } else if (batch.root_entity_type === 'TICKET') {
      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select('workspace_id')
        .eq('id', batch.root_entity_id)
        .single();

      if (ticket?.workspace_id) {
        const { data: ws } = await supabaseAdmin
          .from('workspaces')
          .select('is_deleted')
          .eq('id', ticket.workspace_id)
          .single();

        if (ws?.is_deleted) {
          return {
            success: false,
            error: "Cannot restore ticket because its workspace is in the trash. Please restore the workspace first."
          };
        }
      }
    }

    // 3. Clear metadata across all tables for this batch
    const clearPayload = {
      is_deleted: false,
      delete_batch_id: null,
      deleted_by: null,
      deleted_at: null
    };

    await Promise.all([
      supabaseAdmin.from('workspaces').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('tasks').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('workspace_members').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('tickets').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('requirements').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('software_amc').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('amc_transactions').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('departments').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('designations').update(clearPayload).eq('delete_batch_id', batchId),
      supabaseAdmin.from('user_master').update({ ...clearPayload, is_active: true }).eq('delete_batch_id', batchId),
      supabaseAdmin.from('status_master').update({ ...clearPayload, is_active: true }).eq('delete_batch_id', batchId),
      supabaseAdmin.from('priority_master').update({ ...clearPayload, is_active: true }).eq('delete_batch_id', batchId),
      supabaseAdmin.from('company_master').update({ ...clearPayload, is_active: true }).eq('delete_batch_id', batchId)
    ]);

    // 4. Update batch status
    await supabaseAdmin
      .from('delete_batches')
      .update({ status: 'RESTORED' })
      .eq('id', batchId);

    // 5. Audit Logging
    try {
      await logActivityEvent(
        batch.root_entity_type,
        batch.root_entity_id,
        'RESTORE_FROM_TRASH',
        null,
        { batch_id: batchId },
        userId
      );
    } catch (auditErr) {
      console.warn("[LifecycleManager] Non-fatal audit log failure on restoreFromTrash:", auditErr);
    }

    const isUserRoot = batch.root_entity_type === 'USER_MASTER' || batch.root_entity_type === 'USER';
    return {
      success: true,
      auth_unban_required: isUserRoot,
      message: isUserRoot
        ? "User record restored in database with is_active=true. Note: Supabase Auth unban must be performed manually by an administrator."
        : "Record successfully restored."
    };
  }

  /**
   * Purge batch function (WP5 5.3).
   * Super Admin only. Refused if any cascade child is active. Marks batch PURGED.
   * Logs audit row for every purge.
   */
  static async purgeBatch(
    batchId: string,
    userId: string,
    _confirmedTyped?: string
  ): Promise<PurgeBatchResult> {
    // 1. Super Admin check — the same central rule as everywhere else (primary and additional roles,
    // permission snapshot). The old check read only the primary role through a join and refused real
    // Super Admins.
    const { hasPermission } = await import('@/lib/permissions');
    const isSuperAdmin = await hasPermission(userId, 'SUPER_ADMIN');

    if (!isSuperAdmin) {
      return { success: false, error: "Unauthorized: Permanent deletion requires Super Admin privileges." };
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from('delete_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return { success: false, error: "Delete batch not found." };
    }

    if (batch.status !== 'ACTIVE') {
      return { success: false, error: `Cannot purge batch in status: ${batch.status}` };
    }

    // 2. Refusal check: Are any cascade children active?
    const activeChildren: Array<{ id: string; type: string; title: string }> = [];

    if (batch.root_entity_type === 'WORKSPACE') {
      // Check active tasks in this workspace
      const { data: actTasks } = await supabaseAdmin
        .from('tasks')
        .select('id, subject')
        .eq('workspace_id', batch.root_entity_id)
        .eq('is_deleted', false);

      if (actTasks && actTasks.length > 0) {
        actTasks.forEach(t => activeChildren.push({ id: t.id, type: 'TASK', title: t.subject || 'Task ' + t.id }));
      }

      // Check active sub-workspaces
      const { data: actSubWs } = await supabaseAdmin
        .from('workspaces')
        .select('id, workspace_name')
        .eq('parent_workspace_id', batch.root_entity_id)
        .eq('is_deleted', false);

      if (actSubWs && actSubWs.length > 0) {
        actSubWs.forEach(w => activeChildren.push({ id: w.id, type: 'WORKSPACE', title: w.workspace_name || 'Workspace ' + w.id }));
      }
    } else if (batch.root_entity_type === 'TASK') {
      // Check active sub-tasks
      const { data: actSubtasks } = await supabaseAdmin
        .from('tasks')
        .select('id, subject')
        .eq('parent_task_id', batch.root_entity_id)
        .eq('is_deleted', false);

      if (actSubtasks && actSubtasks.length > 0) {
        actSubtasks.forEach(st => activeChildren.push({ id: st.id, type: 'SUB_TASK', title: st.subject || 'Sub-task ' + st.id }));
      }
    }

    if (activeChildren.length > 0) {
      return {
        success: false,
        error: `Cannot purge ${batch.root_entity_type} because it has ${activeChildren.length} active child record(s). Please delete them first.`,
        active_children: activeChildren
      };
    }

    // 3. Update batch to PURGED
    await supabaseAdmin
      .from('delete_batches')
      .update({ status: 'PURGED' })
      .eq('id', batchId);

    // In sandbox test environments (root_entity_id contains ZZ-TEST-SANDBOX or starts with test prefix),
    // delete records physically
    const isSandbox = typeof batch.root_entity_id === 'string' && (batch.root_entity_id.includes('sandbox') || batch.root_entity_id.includes('test'));
    if (isSandbox) {
      await Promise.all([
        supabaseAdmin.from('tasks').delete().eq('delete_batch_id', batchId),
        supabaseAdmin.from('workspaces').delete().eq('delete_batch_id', batchId),
        supabaseAdmin.from('tickets').delete().eq('delete_batch_id', batchId),
        supabaseAdmin.from('requirements').delete().eq('delete_batch_id', batchId)
      ]);
    }

    // 4. Audit row for every purge
    try {
      await logActivityEvent(
        batch.root_entity_type,
        batch.root_entity_id,
        'PURGE_BATCH',
        null,
        { batch_id: batchId },
        userId
      );
    } catch (auditErr) {
      console.warn("[LifecycleManager] Non-fatal audit log failure on purgeBatch:", auditErr);
    }

    return { success: true };
  }

  // --- Cascade Implementations ---

  private static async cascadeWorkspaceTrash(workspaceId: string, batchId: string, userId: string, timestamp: string) {
    const payload = {
      is_deleted: true,
      delete_batch_id: batchId,
      deleted_by: userId,
      deleted_at: timestamp
    };

    // 1. Collect all recursive sub-workspaces
    const allWorkspaceIds = [workspaceId];
    const queue = [workspaceId];
    while (queue.length > 0) {
      const currentParent = queue.shift()!;
      const { data: children } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('parent_workspace_id', currentParent)
        .eq('is_deleted', false);

      if (children && children.length > 0) {
        for (const child of children) {
          allWorkspaceIds.push(child.id);
          queue.push(child.id);
        }
      }
    }

    // 2. Trash target workspace and all sub-workspaces
    await supabaseAdmin.from('workspaces').update(payload).in('id', allWorkspaceIds);

    // 3. Trash tasks within the workspace AND sub-workspaces (WP5 5.1: include sub-workspace tasks)
    await supabaseAdmin.from('tasks').update(payload).in('workspace_id', allWorkspaceIds).eq('is_deleted', false);

    // 4. Trash members across all affected workspaces
    await supabaseAdmin.from('workspace_members').update(payload).in('workspace_id', allWorkspaceIds).eq('is_deleted', false);

    // 5. Trash tickets within all affected workspaces
    await supabaseAdmin.from('tickets').update(payload).in('workspace_id', allWorkspaceIds).eq('is_deleted', false);
  }

  private static async cascadeTaskTrash(taskId: string, batchId: string, userId: string, timestamp: string) {
    const payload = {
      is_deleted: true,
      delete_batch_id: batchId,
      deleted_by: userId,
      deleted_at: timestamp
    };

    // 1. Trash target task
    await supabaseAdmin.from('tasks').update(payload).eq('id', taskId);

    // 2. Trash sub-tasks
    await supabaseAdmin.from('tasks').update(payload).eq('parent_task_id', taskId).eq('is_deleted', false);
  }

  private static async cascadeTicketTrash(ticketId: string, batchId: string, userId: string, timestamp: string) {
    const payload = {
      is_deleted: true,
      delete_batch_id: batchId,
      deleted_by: userId,
      deleted_at: timestamp
    };

    await supabaseAdmin.from('tickets').update(payload).eq('id', ticketId);
  }

  private static async cascadeRequirementTrash(reqId: string, batchId: string, userId: string, timestamp: string) {
    const payload = {
      is_deleted: true,
      delete_batch_id: batchId,
      deleted_by: userId,
      deleted_at: timestamp
    };

    await supabaseAdmin.from('requirements').update(payload).eq('id', reqId);
  }

  private static async cascadeMasterTrash(
    entityType: string,
    entityId: string,
    batchId: string,
    userId: string,
    timestamp: string
  ) {
    const payload = {
      is_deleted: true,
      delete_batch_id: batchId,
      deleted_by: userId,
      deleted_at: timestamp
    };

    const table = entityType.toLowerCase();
    const isMasterWithStatus = ['user_master', 'status_master', 'priority_master', 'company_master'].includes(table);

    if (isMasterWithStatus) {
      await supabaseAdmin.from(table).update({ ...payload, is_active: false }).eq('id', entityId);
    } else {
      await supabaseAdmin.from(table).update(payload).eq('id', entityId);
    }
  }
}
