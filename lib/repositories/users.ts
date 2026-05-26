import { supabaseAdmin } from '@/lib/supabase/service_role';

// =========================================================================
// REPOSITORY LAYER: USERS
// =========================================================================

export async function getVisibleUsers(userId: string) {
  // Typically directory access requires authentication and potentially company isolation,
  // but for basic listing, we just pull active users.
  let isSuperAdmin = false;

  // Check SUPER_ADMIN via user_master role_id
  const { data: myProfile } = await supabaseAdmin
    .from("user_master")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (myProfile) {
    if (
      myProfile.role_id === "admin-role-id"
    ) {
      isSuperAdmin = true;
    } else if (myProfile.role_id) {
      const { data: roleData } = await supabaseAdmin
        .from("roles")
        .select("code")
        .eq("id", myProfile.role_id)
        .single();

      if (roleData?.code === "SUPER_ADMIN" || roleData?.code === "ROLE_ADMIN") {
        isSuperAdmin = true;
      }
    }
  }

  // Also check user_roles table
  if (!isSuperAdmin) {
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role:roles!inner(code)")
      .eq("user_id", userId);

    if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode === "SUPER_ADMIN") {
          isSuperAdmin = true;
          break;
        }
      }
    }
  }

  let query = supabaseAdmin
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

  if (!isSuperAdmin) {
    query = query.eq('id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
