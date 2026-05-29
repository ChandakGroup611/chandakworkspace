import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

export async function getVisibleWorkspaces(userId: string) {
  // 1. Super Admin bypass
  const canManageAll = await hasPermission(userId, "WORKSPACES_MANAGE");
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
        members:workspace_members(user_id, role)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return visibleWorkspaces || [];
  }

  // 2. Fetch user's direct memberships
  const { data: memberWorkspaces } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('is_deleted', false);
    
  const workspaceIds = new Set<string>(memberWorkspaces?.map((w: any) => w.workspace_id) || []);

  // 3. Fetch workspaces where user is the owner
  const { data: ownerWorkspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('workspace_owner_id', userId)
    .eq('is_deleted', false);
    
  if (ownerWorkspaces) {
    ownerWorkspaces.forEach((w: any) => workspaceIds.add(w.id));
  }

  // If user has no workspace access, return empty array immediately
  if (workspaceIds.size === 0) {
    return [];
  }

  const authorizedWorkspaceIds = Array.from(workspaceIds);

  // 4. Fetch ONLY the authorized workspaces from the database
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
