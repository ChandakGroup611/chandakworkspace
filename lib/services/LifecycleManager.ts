import { supabaseAdmin } from "@/lib/supabase/service_role";
import { logActivityEvent } from "@/lib/actions/tasks";
import { v4 as uuidv4 } from 'uuid';

export class LifecycleManager {
  /**
   * Universal moveToTrash function.
   * Generates a single delete batch and cascades the trash operation to descendants.
   */
  static async moveToTrash(
    entityType: string,
    entityId: string,
    userId: string,
    reason?: string
  ) {
    const batchId = uuidv4();
    const timestamp = new Date().toISOString();

    // 1. Create the delete batch
    const { error: batchError } = await supabaseAdmin.from('delete_batches').insert({
      id: batchId,
      deleted_by: userId,
      deleted_at: timestamp,
      root_entity_type: entityType,
      root_entity_id: entityId,
      reason: reason || null,
      status: 'ACTIVE'
    });

    if (batchError) {
      console.error("[LifecycleManager] Error creating delete batch:", batchError);
      throw new Error(`Failed to create delete batch: ${batchError.message}`);
    }

    // 2. Cascade logic based on root entity type
    if (entityType === 'WORKSPACE') {
      await this.cascadeWorkspaceTrash(entityId, batchId, userId, timestamp);
    } else if (entityType === 'TASK') {
      await this.cascadeTaskTrash(entityId, batchId, userId, timestamp);
    } else {
      // Generic fallback for entities without specific cascade logic
      console.warn(`[LifecycleManager] No cascade logic defined for ${entityType}. Batch created but no records updated.`);
    }

    // 3. Audit Logging
    await logActivityEvent(
      entityType,
      entityId,
      'MOVE_TO_TRASH',
      null,
      { batch_id: batchId, reason },
      userId
    );

    return { success: true, batchId };
  }

  static async restoreFromTrash(batchId: string, userId: string) {
    // 1. Fetch batch
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('delete_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      throw new Error("Delete batch not found.");
    }

    if (batch.status !== 'ACTIVE') {
      throw new Error(`Cannot restore batch in status: ${batch.status}`);
    }

    // 2. Restore logic based on root entity type
    if (batch.root_entity_type === 'WORKSPACE') {
      await this.restoreWorkspaceBatch(batchId);
    } else if (batch.root_entity_type === 'TASK') {
      await this.restoreTaskBatch(batchId);
    }

    // 3. Update batch status
    await supabaseAdmin
      .from('delete_batches')
      .update({ status: 'RESTORED' })
      .eq('id', batchId);

    // 4. Audit
    await logActivityEvent(
      batch.root_entity_type,
      batch.root_entity_id,
      'RESTORE_FROM_TRASH',
      null,
      { batch_id: batchId },
      userId
    );

    return { success: true };
  }

  static async permanentDeleteBatch(batchId: string, userId: string) {
    // Note: Security rule enforces Super Admin execution only
    const { data: userProps } = await supabaseAdmin.from('user_master').select('role_id').eq('id', userId).single();
    // Simplified Super Admin check
    if (userProps?.role_id !== 1) {
      throw new Error("Unauthorized: Permanent deletion requires Super Admin privileges.");
    }

    const { data: batch } = await supabaseAdmin.from('delete_batches').select('*').eq('id', batchId).single();
    if (!batch) throw new Error("Delete batch not found.");

    if (batch.status !== 'ACTIVE') {
      throw new Error(`Cannot permanently delete batch in status: ${batch.status}`);
    }

    // Since physical permanent cascade deletion is highly complex and module-specific,
    // we just mark it as permanently deleted to prevent further restores.
    await supabaseAdmin
      .from('delete_batches')
      .update({ status: 'PERMANENTLY_DELETED' })
      .eq('id', batchId);

    await logActivityEvent(
      batch.root_entity_type,
      batch.root_entity_id,
      'PERMANENT_DELETE',
      null,
      { batch_id: batchId },
      userId
    );

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

    // 1. Trash the target workspace
    await supabaseAdmin.from('workspaces').update(payload).eq('id', workspaceId);

    // 2. Trash sub-workspaces
    const { data: subWs } = await supabaseAdmin.from('workspaces').select('id').eq('parent_workspace_id', workspaceId).eq('is_deleted', false);
    if (subWs && subWs.length > 0) {
      const subIds = subWs.map(w => w.id);
      await supabaseAdmin.from('workspaces').update(payload).in('id', subIds);
    }

    // 3. Trash tasks within the workspace
    await supabaseAdmin.from('tasks').update(payload).eq('workspace_id', workspaceId).eq('is_deleted', false);

    // 4. Trash members
    await supabaseAdmin.from('workspace_members').update(payload).eq('workspace_id', workspaceId).eq('is_deleted', false);
  }

  private static async cascadeTaskTrash(taskId: string, batchId: string, userId: string, timestamp: string) {
    const payload = {
      is_deleted: true,
      delete_batch_id: batchId,
      deleted_by: userId,
      deleted_at: timestamp
    };

    await supabaseAdmin.from('tasks').update(payload).eq('id', taskId);
    await supabaseAdmin.from('tasks').update(payload).eq('parent_task_id', taskId).eq('is_deleted', false);
    await supabaseAdmin.from('task_participants').update(payload).eq('task_id', taskId).eq('is_deleted', false);
    await supabaseAdmin.from('requirements').update(payload).eq('task_id', taskId).eq('is_deleted', false);
  }

  private static async restoreWorkspaceBatch(batchId: string) {
    const payload = {
      is_deleted: false,
      delete_batch_id: null,
      deleted_by: null,
      deleted_at: null
    };
    await supabaseAdmin.from('workspaces').update(payload).eq('delete_batch_id', batchId);
    await supabaseAdmin.from('workspace_members').update(payload).eq('delete_batch_id', batchId);
    await supabaseAdmin.from('tasks').update(payload).eq('delete_batch_id', batchId);
    await supabaseAdmin.from('task_participants').update(payload).eq('delete_batch_id', batchId);
    await supabaseAdmin.from('requirements').update(payload).eq('delete_batch_id', batchId);
  }

  private static async restoreTaskBatch(batchId: string) {
    const payload = {
      is_deleted: false,
      delete_batch_id: null,
      deleted_by: null,
      deleted_at: null
    };
    await supabaseAdmin.from('tasks').update(payload).eq('delete_batch_id', batchId);
    await supabaseAdmin.from('task_participants').update(payload).eq('delete_batch_id', batchId);
    await supabaseAdmin.from('requirements').update(payload).eq('delete_batch_id', batchId);
  }
}
