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

/**
 * HARD DELETES records permanently from the database.
 * This completely destroys the rows.
 */
export async function hardDeleteEntity(entityType: 'workspaces' | 'tasks', ids: string[]) {
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
export async function restoreEntity(entityType: 'workspaces' | 'tasks', ids: string[]) {
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
