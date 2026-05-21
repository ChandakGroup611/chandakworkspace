"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Enterprise IAM & RBAC Server Actions
 * Architecture: Centralized identity governance for Roles and Permissions.
 * Gated by: checkIAMAuthorization helper for strict capability checking.
 */

async function checkIAMAuthorization(requiredPermission?: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthenticated request. Please log in.");
    }
    
    // 1. Fetch user's profile and check if they are SUPER_ADMIN via role_id
    const { data: profileData } = await supabase
      .from("user_master")
      .select("role_id")
      .eq("id", user.id)
      .single();

    if (profileData?.role_id) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("code")
        .eq("id", profileData.role_id)
        .single();

      if (roleData?.code === "SUPER_ADMIN") {
        console.log("[checkIAMAuthorization] User is SUPER_ADMIN");
        return; // SUPER_ADMIN has full access
      }
    }

    // Also check user_roles table
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role:roles(code)")
      .eq("user_id", user.id);

    if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode === "SUPER_ADMIN") {
          console.log("[checkIAMAuthorization] User is SUPER_ADMIN via user_roles");
          return;
        }
      }
    }
    
    // 2. Check for IAM_MANAGE or the specific requested permission in user snapshot
    const { data: userPerms } = await supabase
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", user.id);
      
    const perms = userPerms ? userPerms.map((r: any) => r.permission_code) : [];
    
    if (perms.includes("IAM_MANAGE")) {
      return; // IAM_MANAGE allows all IAM actions
    }
    
    if (requiredPermission && perms.includes(requiredPermission)) {
      return;
    }
    
    throw new Error("Unauthorized: You do not have capabilities to perform this IAM operation.");
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[checkIAMAuthorization] Error: ${msg}`);
    throw new Error(msg);
  }
}

export async function fetchRoles() {
  await checkIAMAuthorization("IAM_VIEW");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("roles")
    .select("*, department:departments(name)")
    .eq("is_deleted", false)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });
    
  if (error) {
    console.error("[IAM] Error fetching roles:", error);
    return [];
  }
  return data || [];
}

export async function fetchPermissions() {
  await checkIAMAuthorization("IAM_VIEW");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("module", { ascending: true })
    .order("submodule", { ascending: true });
    
  if (error) {
    console.error("[IAM] Error fetching permissions:", error);
    return [];
  }
  return data || [];
}

export async function fetchRolePermissions(roleId: string) {
  await checkIAMAuthorization("IAM_VIEW");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);
    
  if (error) {
    console.error("[IAM] Error fetching role permissions:", error);
    return [];
  }
  return data.map(rp => rp.permission_id);
}

export async function createRole(formData: { name: string, code: string, description: string, department_id?: string }) {
  await checkIAMAuthorization("IAM_MANAGE");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("roles")
    .insert([{
      ...formData,
      is_active: true,
      is_system: false
    }])
    .select()
    .single();
    
  if (error) {
    console.error("[IAM] Error creating role:", error);
    throw new Error(error.message);
  }
  
  revalidatePath("/iam");
  return data;
}

export async function updateRole(roleId: string, updates: any) {
  await checkIAMAuthorization("IAM_MANAGE");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Protect system roles from certain modifications if needed
  const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).single();
  if (role?.is_system && updates.code) {
    throw new Error("System role codes cannot be modified.");
  }

  const { error } = await supabase
    .from("roles")
    .update(updates)
    .eq("id", roleId);
    
  if (error) {
    console.error("[IAM] Error updating role:", error);
    throw new Error(error.message);
  }
  
  revalidatePath("/iam");
}

export async function syncRolePermissions(roleId: string, permissionIds: string[]) {
  await checkIAMAuthorization("IAM_MANAGE");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Clear existing mappings
  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);
    
  if (deleteError) {
    console.error("[IAM] Error clearing role permissions:", deleteError);
    throw new Error("Failed to reset role permissions.");
  }
  
  if (permissionIds.length === 0) return;

  // 2. Insert new mappings
  const mappings = permissionIds.map(pid => ({
    role_id: roleId,
    permission_id: pid
  }));
  
  const { error: insertError } = await supabase
    .from("role_permissions")
    .insert(mappings);
    
  if (insertError) {
    console.error("[IAM] Error syncing role permissions:", insertError);
    throw new Error("Failed to map role permissions.");
  }
  
  revalidatePath("/iam");
}

export async function cloneRole(sourceRoleId: string, newRoleName: string, newRoleCode: string) {
  await checkIAMAuthorization("IAM_MANAGE");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Fetch source role and its permissions
  const { data: sourceRole } = await supabase.from("roles").select("*").eq("id", sourceRoleId).single();
  const { data: sourcePerms } = await supabase.from("role_permissions").select("permission_id").eq("role_id", sourceRoleId);
  
  if (!sourceRole) throw new Error("Source role not found.");

  // 2. Create new role
  const { data: newRole, error: roleError } = await supabase
    .from("roles")
    .insert([{
      name: newRoleName,
      code: newRoleCode,
      description: `Cloned from ${sourceRole.name}. ${sourceRole.description || ""}`,
      department_id: sourceRole.department_id,
      is_active: true,
      is_system: false
    }])
    .select()
    .single();
    
  if (roleError) throw new Error(`Failed to create cloned role: ${roleError.message}`);

  // 3. Copy permissions
  if (sourcePerms && sourcePerms.length > 0) {
    const newMappings = sourcePerms.map(rp => ({
      role_id: newRole.id,
      permission_id: rp.permission_id
    }));
    await supabase.from("role_permissions").insert(newMappings);
  }
  
  revalidatePath("/iam");
  return newRole;
}

export async function deleteRole(roleId: string) {
  await checkIAMAuthorization("IAM_MANAGE");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Check if system role
  const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).single();
  if (role?.is_system) {
    throw new Error("System critical roles cannot be deleted.");
  }

  const { error } = await supabase
    .from("roles")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", roleId);
    
  if (error) {
    console.error("[IAM] Error deleting role:", error);
    throw new Error(error.message);
  }
  
  revalidatePath("/iam");
}
