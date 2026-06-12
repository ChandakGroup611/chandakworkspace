import { supabaseAdmin } from '@/lib/supabase/service_role';
import { hasPermission } from '@/lib/permissions';

// =========================================================================
// REPOSITORY LAYER: TICKETS
// 
// This layer is responsible for optimized data fetching.
// Filtering MUST happen inside the DB query using explicit backend scopes.
// =========================================================================

export async function getVisibleTickets(userId: string, customSelect?: string) {
  const canViewAll = await hasPermission(userId, 'TICKETS_MANAGE');
  
  const defaultSelect = `
      *,
      creator:user_master!fk_tickets_creator(full_name, profile_photo),
      assignee:user_master!fk_tickets_assignee(full_name, profile_photo),
      department:departments(name),
      priority:priority_master(priority_name, priority_color),
      status:status_master(status_name, status_color, is_terminal)
  `;

  let query = supabaseAdmin
    .from('tickets')
    .select(customSelect || defaultSelect)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (!canViewAll) {
    // Determine explicitly assigned boundaries (SELF, ASSIGNED, QUEUE_OWNER)
    let explicitOrFilters = [
      `creator_id.eq.${userId}`, 
      `assignee_id.eq.${userId}`,
      `queue_owner_id.eq.${userId}`
    ];

    // Determine MANAGER boundaries (subordinates)
    const { data: subordinates } = await supabaseAdmin
      .from('user_master')
      .select('id')
      .eq('manager_id', userId)
      .eq('is_deleted', false);

    if (subordinates && subordinates.length > 0) {
      const subIds = subordinates.map(s => s.id).join(',');
      explicitOrFilters.push(`creator_id.in.(${subIds})`);
      explicitOrFilters.push(`assignee_id.in.(${subIds})`);
      explicitOrFilters.push(`queue_owner_id.in.(${subIds})`);
    }

    // Apply strict boundaries via OR
    query = query.or(explicitOrFilters.join(','));
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching visible tickets:', error);
    throw new Error(`Failed to fetch tickets: ${error.message} (Hint: ${error.hint || 'none'}, Details: ${error.details || 'none'})`);
  }

  return data;
}

export async function createTicket(payload: any) {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}
