import { supabaseAdmin } from '@/lib/supabase/service_role';

export async function getVisibleWorkspaces(userId: string) {
  // 1. Fetch ALL workspaces without filters first to ensure no PostgREST query parsing issues
  let { data: allWorkspaces, error } = await supabaseAdmin
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
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!allWorkspaces) return [];

  // 2. Fetch user's direct memberships
  const { data: memberWorkspaces } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('is_deleted', false);
    
  const workspaceIds = new Set(memberWorkspaces?.map(w => w.workspace_id) || []);
  
  // 3. Fetch user's team-based memberships
  const { data: teamMemberships } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('is_deleted', false);
    
  if (teamMemberships && teamMemberships.length > 0) {
    const teamIds = teamMemberships.map(t => t.team_id);
    const { data: workspaceTeams } = await supabaseAdmin
      .from('workspace_teams')
      .select('workspace_id')
      .in('team_id', teamIds)
      .eq('is_deleted', false);
      
    if (workspaceTeams) {
      workspaceTeams.forEach(w => workspaceIds.add(w.workspace_id));
    }
  }

  // 4. Filter workspaces in memory to be absolutely bulletproof
  const visibleWorkspaces = allWorkspaces.filter(w => {
    // Assignee / Team check
    if (workspaceIds.has(w.id)) return true;
    
    return false;
  });

  return visibleWorkspaces;
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  // First verify visibility
  const visible = await getVisibleWorkspaces(userId);
  const found = visible.find((w: any) => w.id === workspaceId);
  if (!found) throw new Error("Workspace not found or access denied");
  return found;
}
