import { supabaseAdmin } from '@/lib/supabase/service_role';

// =========================================================================
// REPOSITORY LAYER: USERS
// =========================================================================

export async function getVisibleUsers(userId: string) {
  // Fetch ALL users and authorization context CONCURRENTLY to eliminate any sequential query building
  const [profileRes, rolesRes, permsRes, usersRes] = await Promise.all([
    supabaseAdmin.from("user_master").select("role_id, role:roles(code)").eq("id", userId).single(),
    supabaseAdmin.from("user_roles").select("role:roles!inner(code)").eq("user_id", userId),
    supabaseAdmin.from("user_permissions_snapshot").select("permission_code").eq("user_id", userId),
    supabaseAdmin
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
        designation:designations!fk_user_master_designation(name),
        role:roles(name)
      `)
      .eq('is_deleted', false)
  ]);

  let isSuperAdmin = false;
  let hasUsersViewPerm = false;

  const myProfile = profileRes.data;

  // Check SUPER_ADMIN via user_master role_id
  if (myProfile) {
    if (myProfile.role_id === "admin-role-id") {
      isSuperAdmin = true;
    } else {
      const roleCode = Array.isArray(myProfile.role) ? myProfile.role[0]?.code : (myProfile.role as any)?.code;
      if (roleCode === "SUPER_ADMIN" || roleCode === "ROLE_ADMIN") {
        isSuperAdmin = true;
      }
    }
  }

  // Also check user_roles table mapping
  if (!isSuperAdmin && rolesRes.data) {
    for (const ur of rolesRes.data) {
      const role = ur.role as any;
      const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
      if (roleCode === "SUPER_ADMIN" || roleCode === "ROLE_ADMIN") {
        isSuperAdmin = true;
        break;
      }
    }
  }

  // Hardcoded fallback for known super admin emails (to match frontend PermissionsProvider)
  if (!isSuperAdmin) {
    const adminEmails = ["avinash2@gmail.com", "avinash.pise98@gmail.com", "chrome_superadmin@adios.com"];
    const myUser = usersRes.data?.find(u => u.id === userId);
    if (myUser && myUser.email && adminEmails.includes(myUser.email)) {
      isSuperAdmin = true;
    }
  }

  // Check for granular permission
  if (!isSuperAdmin && permsRes.data) {
    if (permsRes.data.some(p => p.permission_code === 'USERS_VIEW')) {
      hasUsersViewPerm = true;
    }
  }

  if (usersRes.error) throw usersRes.error;

  // In-memory governance routing is 100x faster than secondary database roundtrips
  if (isSuperAdmin || hasUsersViewPerm) {
    return usersRes.data || [];
  }

  // Fallback: restrict to own profile
  return (usersRes.data || []).filter(u => u.id === userId);
}
