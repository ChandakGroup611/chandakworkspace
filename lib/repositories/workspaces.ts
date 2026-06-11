import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

export async function getVisibleWorkspaces(userId: string, isSuperAdmin?: boolean) {
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
        members:workspace_members(user_id, role)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return visibleWorkspaces || [];
  }

  // 2. Optimized single query for standard users using PostgREST OR syntax
  // We fetch workspaces where the user is EITHER the owner OR a member
  // Note: PostgREST embedded filters handle this efficiently when properly structured,
  // but to guarantee performance across complex ORs on relations, we use a subquery/RPC or two parallel light queries.
  // We'll use two parallel light queries to get IDs, then one fetch. It's faster than 3 sequential.
  const [memberRes, ownerRes] = await Promise.all([
    supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).eq('is_deleted', false),
    supabaseAdmin.from('workspaces').select('id').eq('workspace_owner_id', userId).eq('is_deleted', false)
  ]);
    
  const workspaceIds = new Set<string>();
  memberRes.data?.forEach((w: any) => workspaceIds.add(w.workspace_id));
  ownerRes.data?.forEach((w: any) => workspaceIds.add(w.id));

  if (workspaceIds.size === 0) {
    return [];
  }

  const authorizedWorkspaceIds = Array.from(workspaceIds);

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
      members:workspace_members(user_id, role)
    `)
    .in('id', authorizedWorkspaceIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return visibleWorkspaces || [];
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  // First verify visibility
  const visible = await getVisibleWorkspaces(userId);
  const found = visible.find((w: any) => w.id === workspaceId);
  if (!found) throw new Error("Workspace not found or access denied");
  return found;
}
