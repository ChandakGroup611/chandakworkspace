import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

export async function getVisibleTasks(
  userId: string, 
  customSelect?: string,
  options?: { limit?: number; offset?: number; page?: number }
) {
  const canViewAll = await hasPermission(userId, 'TASKS_MANAGE');
  
  const defaultSelect = `
      *,
      status:status_master(status_name, status_color, status_order, is_closed),
      priority:priority_master(priority_name, priority_color, min_sla_hours, max_sla_hours, warning_sla_hours, sla_start_from),
      creator:user_master!created_by(full_name, profile_photo),
      assigned_user:user_master!assigned_to(full_name, profile_photo),
      participants:task_participants(user:user_master(full_name), participation_role),
      workspace:workspaces(workspace_name)
  `;

  const maxLimit = Math.min(options?.limit || 1000, 1000);
  const offset = options?.offset ?? (options?.page ? (options.page - 1) * maxLimit : 0);

  let query = supabaseAdmin
    .from('tasks')
    .select(customSelect || defaultSelect, { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + maxLimit - 1);

  if (!canViewAll) {
    let orFilters = [`created_by.eq.${userId}`, `assigned_to.eq.${userId}`];
    let taskIds: string[] = [];

    // 1. Direct assignments & participant roles
    const { data: participants } = await supabaseAdmin
      .from('task_participants')
      .select('task_id')
      .eq('user_id', userId);
    if (participants) taskIds.push(...participants.map(a => a.task_id));

    // 2. Watchers
    const { data: watchers } = await supabaseAdmin
      .from('task_watchers')
      .select('task_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    if (watchers) taskIds.push(...watchers.map(w => w.task_id));

    // 3. Workspace membership implies visibility of tasks within workspace
    const { data: workspaceMemberships } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    let workspaceIds: string[] = workspaceMemberships?.map(w => w.workspace_id) || [];

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
      orFilters.push(`assigned_to.in.(${subIdsStr})`);

      // Subordinate participant tasks
      const { data: subParts } = await supabaseAdmin
        .from('task_participants')
        .select('task_id')
        .in('user_id', subIds);
      if (subParts) taskIds.push(...subParts.map(a => a.task_id));
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
