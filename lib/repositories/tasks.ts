import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

export async function getVisibleTasks(userId: string) {
  const canViewAll = await hasPermission(userId, 'TASKS_MANAGE');
  
  let query = supabaseAdmin
    .from('tasks')
    .select(`
      *,
      status:status_master(status_name, status_color, status_order, is_closed),
      priority:priority_master(priority_name, priority_color, min_sla_hours, max_sla_hours, warning_sla_hours, sla_start_from),
      creator:user_master!created_by(full_name, profile_photo),
      assignees:task_assignees(user:user_master!user_id(full_name)),
      teams:task_teams(team:teams!team_id(team_name)),
      workspace:workspaces(workspace_name)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (!canViewAll) {
    let orFilters = [`created_by.eq.${userId}`];
    let taskIds: string[] = [];

    // 1. Direct assignments
    const { data: assignments } = await supabaseAdmin
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    if (assignments) taskIds.push(...assignments.map(a => a.task_id));

    // 2. Team assignments
    const { data: userTeams } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (userTeams && userTeams.length > 0) {
      const teamIds = userTeams.map(t => t.team_id);
      const { data: teamAssignments } = await supabaseAdmin
        .from('task_teams')
        .select('task_id')
        .in('team_id', teamIds)
        .eq('is_deleted', false);
      if (teamAssignments) taskIds.push(...teamAssignments.map(t => t.task_id));
    }

    // 3. Watchers
    const { data: watchers } = await supabaseAdmin
      .from('task_watchers')
      .select('task_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    if (watchers) taskIds.push(...watchers.map(w => w.task_id));

    // 4. Workspace membership implies visibility of tasks within workspace
    const { data: workspaceMemberships } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    let workspaceIds: string[] = workspaceMemberships?.map(w => w.workspace_id) || [];

    // Check workspace teams as well
    if (userTeams && userTeams.length > 0) {
      const teamIds = userTeams.map(t => t.team_id);
      const { data: workspaceTeams } = await supabaseAdmin
        .from('workspace_teams')
        .select('workspace_id')
        .in('team_id', teamIds)
        .eq('is_deleted', false);
      if (workspaceTeams) workspaceIds.push(...workspaceTeams.map(w => w.workspace_id));
    }

    // Add manager logic: managers can see tasks created by or assigned to subordinates
    const { data: subordinates } = await supabaseAdmin
      .from('user_master')
      .select('id')
      .eq('manager_id', userId)
      .eq('is_deleted', false);

    if (subordinates && subordinates.length > 0) {
      const subIds = subordinates.map(s => s.id);
      const subIdsStr = subIds.join(',');
      orFilters.push(`created_by.in.(${subIdsStr})`);

      // Subordinate assignments
      const { data: subAssigns } = await supabaseAdmin
        .from('task_assignees')
        .select('task_id')
        .in('user_id', subIds)
        .eq('is_deleted', false);
      if (subAssigns) taskIds.push(...subAssigns.map(a => a.task_id));
    }

    if (taskIds.length > 0) {
      const uniqueTaskIds = [...new Set(taskIds)];
      orFilters.push(`id.in.(${uniqueTaskIds.join(',')})`);
    }

    if (workspaceIds.length > 0) {
      const uniqueWids = [...new Set(workspaceIds)];
      orFilters.push(`workspace_id.in.(${uniqueWids.join(',')})`);
    }

    query = query.or(orFilters.join(','));
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data;
}
