"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { fetchWorkspaceStakeholders } from '@/lib/actions/workspaces';

export async function fetchMigrationMetadata(targetWorkspaceId?: string) {
  try {
    // Fetch common master data
    const { data: departments } = await supabaseAdmin.from('departments').select('id, name').eq('is_deleted', false);
    const { data: priorities } = await supabaseAdmin.from('priority_master').select('id, priority_name').eq('is_deleted', false);
    const { data: statuses } = await supabaseAdmin.from('status_master').select('id, status_name').eq('scope_type', 'TASK').eq('is_deleted', false);
    
    // Fetch workspace stakeholders if target is provided
    let stakeholders: any[] = [];
    if (targetWorkspaceId) {
      stakeholders = await fetchWorkspaceStakeholders(targetWorkspaceId);
    }

    return {
      departments: departments || [],
      priorities: priorities || [],
      statuses: statuses || [],
      stakeholders
    };
  } catch (err: any) {
    console.error("fetchMigrationMetadata Error:", err);
    return { error: err.message };
  }
}
