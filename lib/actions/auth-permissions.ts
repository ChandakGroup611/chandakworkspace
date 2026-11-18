"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function fetchServerPermissions() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { profileData: null, secondaryRoles: [], snapshotPerms: [], isSuperAdmin: false, tickedDashboards: [] };
    }

    const [profileRes, secondaryRolesRes, snapshotRes] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, profile_photo, is_deleted, created_at, role_id, role:roles(code, role_permissions(permissions(code)))")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role:roles(code, role_permissions(permissions(code)))")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("user_permissions_snapshot")
        .select("permission_code")
        .eq("user_id", user.id)
    ]);

    if (profileRes.error) {
      console.error("[fetchServerPermissions] Error fetching profile:", profileRes.error);
    }

    // Attempt fallback role fetch if join failed
    let profileData = profileRes.data;
    if (profileData && !profileData.role && profileData.role_id) {
      const { data: fallbackRole } = await supabaseAdmin
        .from("roles")
        .select("code, role_permissions(permissions(code))")
        .eq("id", profileData.role_id)
        .maybeSingle();
      if (fallbackRole) {
        profileData.role = fallbackRole as any;
      }
    }

    const snapshotPerms = snapshotRes.data?.map(s => s.permission_code) || [];

    const primaryCode = Array.isArray(profileData?.role) ? (profileData?.role[0] as any)?.code : (profileData?.role as any)?.code;
    const secondaryCodes = (secondaryRolesRes.data || []).map((r: any) => {
      return Array.isArray(r.role) ? r.role[0]?.code : r.role?.code;
    }).filter(Boolean);

    const allCodes = [primaryCode, ...secondaryCodes].filter(Boolean).map(c => c.toUpperCase());
    const isSuperAdmin = allCodes.some(c => 
      c === "SUPER_ADMIN" || c === "ROLE_SUPER_ADMIN"
    ) || snapshotPerms.includes("SUPER_ADMIN") || snapshotPerms.includes("SUPER_ADMIN_ACCESS");

    const [umaRes, legacyRes] = await Promise.all([
      supabaseAdmin
        .from("user_module_access")
        .select("dashboard_key")
        .eq("user_id", user.id)
        .eq("module_code", "DASHBOARDS")
        .not("dashboard_key", "is", null),
      supabaseAdmin
        .from("dashboard_user_access")
        .select("dashboard_key")
        .eq("user_id", user.id)
        .not("dashboard_key", "is", null)
    ]);

    const tickedDashboards = Array.from(new Set([
      ...(umaRes.data || []).map((d: any) => d.dashboard_key),
      ...(legacyRes.data || []).map((d: any) => d.dashboard_key)
    ].filter(Boolean)));

    return {
      profileData,
      secondaryRoles: secondaryRolesRes.data || [],
      snapshotPerms,
      isSuperAdmin,
      tickedDashboards
    };
  } catch (err) {
    console.error("[fetchServerPermissions] Unhandled Exception:", err);
    return { profileData: null, secondaryRoles: [], snapshotPerms: [], isSuperAdmin: false, tickedDashboards: [] };
  }
}

export async function fetchOnboardingMasters() {
  try {
    const [deptRes, desigRes, rolesRes] = await Promise.all([
      supabaseAdmin.from("departments").select("id, name").eq("is_active", true).order("name"),
      supabaseAdmin.from("designations").select("id, name, department_id").eq("is_active", true).order("name"),
      supabaseAdmin.from("roles").select("id, code")
    ]);
    return {
      departments: deptRes.data || [],
      designations: desigRes.data || [],
      roles: rolesRes.data || []
    };
  } catch (err) {
    console.error("[fetchOnboardingMasters] Unhandled Exception:", err);
    return { departments: [], designations: [], roles: [] };
  }
}
