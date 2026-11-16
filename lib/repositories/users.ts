import { supabaseAdmin } from '@/lib/supabase/service_role';

// =========================================================================
// REPOSITORY LAYER: USERS
// =========================================================================

export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const [profileRes, rolesRes, permsRes, emailRes] = await Promise.all([
    supabaseAdmin.from("user_master").select("id, email, role_id, role:roles(code)").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_roles").select("role:roles!inner(code)").eq("user_id", userId),
    supabaseAdmin.from("user_permissions_snapshot").select("permission_code").eq("user_id", userId),
    supabaseAdmin.from("user_master").select("email").eq("id", userId).maybeSingle()
  ]);

  const myProfile = profileRes.data;
  if (myProfile) {
    if (myProfile.role_id === "admin-role-id") return true;
    const roleCode = Array.isArray(myProfile.role) ? myProfile.role[0]?.code : (myProfile.role as any)?.code;
    if (roleCode?.toUpperCase() === "SUPER_ADMIN" || roleCode?.toUpperCase() === "ROLE_ADMIN") return true;
  }

  if (rolesRes.data) {
    for (const ur of rolesRes.data) {
      const role = ur.role as any;
      const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
      if (roleCode?.toUpperCase() === "SUPER_ADMIN" || roleCode?.toUpperCase() === "ROLE_ADMIN") return true;
    }
  }

  if (permsRes.data?.some(p => p.permission_code === 'SUPER_ADMIN')) return true;

  // Super-admin comes only from the database role (user_master / roles), never from user_metadata (which a user can edit on their own account) or a list of email addresses.
  return false;
}

export async function getVisibleUsers(userId: string, isSuperAdminOverride?: boolean) {
  // Fetch ALL users and authorization context CONCURRENTLY to eliminate any sequential query building
  const [profileRes, rolesRes, permsRes, usersRes] = await Promise.all([
    supabaseAdmin.from("user_master").select("id, email, role_id, role:roles(code)").eq("id", userId).maybeSingle(),
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

  let isSuperAdmin = isSuperAdminOverride ?? false;

  if (!isSuperAdmin) {
    const myProfile = profileRes.data;

    // Check SUPER_ADMIN via user_master role_id
    if (myProfile) {
      if (myProfile.role_id === "admin-role-id") {
        isSuperAdmin = true;
      } else {
        const roleCode = Array.isArray(myProfile.role) ? myProfile.role[0]?.code : (myProfile.role as any)?.code;
        if (roleCode?.toUpperCase() === "SUPER_ADMIN" || roleCode?.toUpperCase() === "ROLE_ADMIN") {
          isSuperAdmin = true;
        }
      }
    }

    // Also check user_roles table mapping
    if (!isSuperAdmin && rolesRes.data) {
      for (const ur of rolesRes.data) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode?.toUpperCase() === "SUPER_ADMIN" || roleCode?.toUpperCase() === "ROLE_ADMIN") {
          isSuperAdmin = true;
          break;
        }
      }
    }

    // Check user_permissions_snapshot
    if (!isSuperAdmin && permsRes.data?.some(p => p.permission_code === 'SUPER_ADMIN')) {
      isSuperAdmin = true;
    }

    // Super-admin comes only from the database role (user_master / roles), never from user_metadata (which a user can edit on their own account) or a list of email addresses.
  }

  if (usersRes.error) throw usersRes.error;

  // STRICT POLICY: Only super admin can see entire user list; otherwise user can see its own profile in list only
  if (isSuperAdmin) {
    return usersRes.data || [];
  }

  // Fallback: restrict to own profile only
  const allUsers = usersRes.data || [];
  const selfById = allUsers.filter(u => u.id === userId);
  if (selfById.length > 0) return selfById;

  const myEmail = profileRes.data?.email;
  if (myEmail) {
    const selfByEmail = allUsers.filter(u => u.email?.toLowerCase() === myEmail.toLowerCase());
    if (selfByEmail.length > 0) return selfByEmail;
  }

  return [];
}
