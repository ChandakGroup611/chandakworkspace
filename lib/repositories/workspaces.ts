import { supabaseAdmin } from '@/lib/supabase/service_role';

export async function getVisibleWorkspaces(userId: string) {
  // 1. Fetch user's direct memberships
  const { data: memberWorkspaces } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('is_deleted', false);
    
  const workspaceIds = new Set<string>(memberWorkspaces?.map((w: any) => w.workspace_id) || []);
  
  // 2. Fetch user's team-based memberships
  const { data: teamMemberships } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('is_deleted', false);
    
  if (teamMemberships && teamMemberships.length > 0) {
    const teamIds = teamMemberships.map((t: any) => t.team_id);
    const { data: workspaceTeams } = await supabaseAdmin
      .from('workspace_teams')
      .select('workspace_id')
      .in('team_id', teamIds)
      .eq('is_deleted', false);
      
    if (workspaceTeams) {
      workspaceTeams.forEach((w: any) => workspaceIds.add(w.workspace_id));
    }
  }

  // If user has no workspace access, return empty array immediately
  if (workspaceIds.size === 0) {
    return [];
  }

  const authorizedWorkspaceIds = Array.from(workspaceIds);

  // 3. Fetch ONLY the authorized workspaces from the database
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
      members:workspace_members(user_id, role),
      teams:workspace_teams(team_id)
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
