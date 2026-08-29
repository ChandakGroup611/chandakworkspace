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
      return { profileData: null, secondaryRoles: [] };
    }

    const [profileRes, secondaryRolesRes] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, profile_photo, is_deleted, created_at, role_id, role:roles(code, role_permissions(permissions(code)))")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("user_roles")
        .select("role:roles(code, role_permissions(permissions(code)))")
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
        .single();
      if (fallbackRole) {
        profileData.role = fallbackRole as any;
      }
    }

    return {
      profileData,
      secondaryRoles: secondaryRolesRes.data || []
    };
  } catch (err) {
    console.error("[fetchServerPermissions] Unhandled Exception:", err);
    return { profileData: null, secondaryRoles: [] };
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
