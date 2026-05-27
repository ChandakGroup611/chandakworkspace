import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

export async function getVisibleRequirements(userId: string, customSelect?: string) {
  const canViewAll = await hasPermission(userId, 'REQUIREMENTS_MANAGE');
  
  const defaultSelect = `
      *,
      department:departments(name),
      status:status_master(status_name, status_color),
      priority:priority_master(priority_name, priority_color),
      creator:user_master!created_by(full_name, profile_photo),
      analyst:user_master!assigned_analyst_id(full_name, profile_photo),
      watchers:requirement_watchers(user_id),
      approvers:requirement_approvals(approver_id, status)
  `;

  let query = supabaseAdmin
    .from('requirements')
    .select(customSelect || defaultSelect)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (!canViewAll) {
    let orFilters = [
      `created_by.eq.${userId}`,
      `assigned_analyst_id.eq.${userId}`
    ];
    let reqIds: string[] = [];

    // Watchers
    const { data: watchers } = await supabaseAdmin
      .from('requirement_watchers')
      .select('requirement_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    if (watchers) reqIds.push(...watchers.map(w => w.requirement_id));

    // Approvers
    const { data: approvers } = await supabaseAdmin
      .from('requirement_approvals')
      .select('requirement_id')
      .eq('approver_id', userId);
    if (approvers) reqIds.push(...approvers.map(a => a.requirement_id));

    // Department Manager (can see all dept requirements)
    const { data: deptInfo } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('manager_id', userId)
      .eq('is_deleted', false);
      
    if (deptInfo && deptInfo.length > 0) {
      const deptIds = deptInfo.map(d => d.id).join(',');
      orFilters.push(`department_id.in.(${deptIds})`);
    }

    if (reqIds.length > 0) {
      const uniqueIds = [...new Set(reqIds)];
      orFilters.push(`id.in.(${uniqueIds.join(',')})`);
    }

    query = query.or(orFilters.join(','));
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data;
}

export async function getRequirementById(requirementId: string, userId: string) {
  const visible = await getVisibleRequirements(userId);
  const found = visible.find((r: any) => r.id === requirementId);
  if (!found) throw new Error("Requirement not found or access denied");
  return found;
}

export async function canModifyRequirement(requirementId: string, userId: string): Promise<boolean> {
  const req = await getRequirementById(requirementId, userId) as any;
  const canManage = await hasPermission(userId, 'REQUIREMENTS_MANAGE');
  if (canManage) return true;
  
  // Creator, Analyst, or Approver can modify
  if (req.created_by === userId) return true;
  if (req.assigned_analyst_id === userId) return true;
  if (req.approvers?.some((a: any) => a.approver_id === userId)) return true;
  
  return false;
}
