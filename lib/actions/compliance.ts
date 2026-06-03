"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';

/**
 * Fetches workspaces, optionally filtering by soft-deleted status.
 */
export async function fetchComplianceWorkspaces(isDeleted: boolean = false) {
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

/**
 * HARD DELETES a record permanently from the database.
 * This completely destroys the row. Use with extreme caution.
 */
export async function hardDeleteEntity(entityType: 'workspaces' | 'tasks', id: string) {
  // Execute actual DELETE query. 
  // Because of foreign key constraints (like task_activity_logs or workspace_members),
  // this assumes ON DELETE CASCADE is set up in the DB, OR we must delete children first.
  // Assuming the DB has cascading deletes for the hard delete path.
  
  const { error } = await supabaseAdmin
    .from(entityType)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Failed to hard delete ${entityType} ${id}:`, error);
    throw new Error(`Hard delete failed: ${error.message}`);
  }

  // Revalidate the compliance page so the UI updates
  revalidatePath('/compliance');
  return { success: true };
}
