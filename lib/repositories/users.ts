import { supabaseAdmin } from '@/lib/supabase/service_role';

// =========================================================================
// REPOSITORY LAYER: USERS
// =========================================================================

export async function getVisibleUsers(userId: string) {
  // Typically directory access requires authentication and potentially company isolation,
  // but for basic listing, we just pull active users.
  
  const { data, error } = await supabaseAdmin
    .from('user_master')
    .select(`
      id,
      user_code,
      full_name,
      email,
      profile_photo,
      is_active,
      manager_id,
      department_id,
      designation_id,
      role_id,
      department:departments(name),
      designation:designations(name),
      role:roles(name)
    `)
    .eq('is_deleted', false);

  if (error) throw error;
  return data;
}
