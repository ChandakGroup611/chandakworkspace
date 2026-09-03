import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

export async function getVisibleWorkspaces(userId: string, isSuperAdmin?: boolean) {
  const tId = Math.random().toString(36).substr(2, 5);
  console.time(`[PROFILER] getVisibleWorkspaces_TOTAL_${tId}`);
  try {
  // 1. Super Admin bypass (cache leveraged in hasPermission)
  const canManageAll = isSuperAdmin !== undefined ? isSuperAdmin : await hasPermission(userId, "WORKSPACES_MANAGE");
  
  if (canManageAll) {
    const { data: visibleWorkspaces, error } = await supabaseAdmin
      .from('workspaces')
      .select(`
        id,
        name:workspace_name,
        code:workspace_code,
        description,
        owner_id:workspace_owner_id,
        parent_workspace_id,
        company_id,
        status_id,
        start_date,
        end_date,
        is_active,
        created_at,
        company:company_master(name:company_name),
        status:status_master(name:status_name, status_color),
        hierarchy_task_count,
        hierarchy_subws_count,
        members:workspace_members(user_id, role),
        stats:workspace_statistics(task_count, subtask_count)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return visibleWorkspaces || [];
  }

  // 2. Strict membership check for standard users
  const [memberRes, ownerRes] = await Promise.all([
    supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).eq('is_deleted', false),
    supabaseAdmin.from('workspaces').select('id, parent_workspace_id').eq('workspace_owner_id', userId).eq('is_deleted', false)
  ]);
    
  const workspaceIds = new Set<string>();
  memberRes.data?.forEach((w: any) => workspaceIds.add(w.workspace_id));
  ownerRes.data?.forEach((w: any) => workspaceIds.add(w.id));

  if (workspaceIds.size === 0) {
    return [];
  }

  // Include parents of enrolled sub-workspaces so top-level containers can be navigated
  const { data: enrolledWs } = await supabaseAdmin
    .from('workspaces')
    .select('id, parent_workspace_id')
    .in('id', Array.from(workspaceIds))
    .eq('is_deleted', false);

  const allRelevantIds = new Set<string>(workspaceIds);
  enrolledWs?.forEach((w: any) => {
    if (w.parent_workspace_id) {
      allRelevantIds.add(w.parent_workspace_id);
    }
  });

  let { data: visibleWorkspaces, error } = await supabaseAdmin
    .from('workspaces')
    .select(`
      id,
      name:workspace_name,
      code:workspace_code,
      description,
      owner_id:workspace_owner_id,
      parent_workspace_id,
      company_id,
      status_id,
      start_date,
      end_date,
      is_active,
      created_at,
      company:company_master(name:company_name),
      status:status_master(name:status_name, status_color),
      hierarchy_task_count,
      hierarchy_subws_count,
      members:workspace_members(user_id, role),
      stats:workspace_statistics(task_count, subtask_count)
    `)
    .in('id', Array.from(allRelevantIds))
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Gating rule: Sub-workspaces MUST be explicitly enrolled/owned by the user.
  // Root workspaces are visible if user is a direct member/owner OR has an enrolled sub-workspace.
  return (visibleWorkspaces || []).filter((w: any) => {
    if (w.parent_workspace_id) {
      return workspaceIds.has(w.id);
    }
    return true;
  });
  } finally {
    console.timeEnd(`[PROFILER] getVisibleWorkspaces_TOTAL_${tId}`);
  }
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  // First verify visibility
  const visible = await getVisibleWorkspaces(userId);
  const found = visible.find((w: any) => w.id === workspaceId);
  if (!found) throw new Error("Workspace not found or access denied");
  return found;
}
