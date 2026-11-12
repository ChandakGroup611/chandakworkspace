"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

/**
 * Enterprise IAM & RBAC Server Actions
 * Architecture: Centralized identity governance for Roles and Permissions.
 * Gated by: checkIAMAuthorization helper for strict capability checking.
 */

import { checkServerPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";

async function checkIAMAuthorization(requiredPermission?: string) {
  try {
    const { getCachedUser } = await import("@/lib/auth/cached-user");
    const { user } = await getCachedUser();
    if (!user) {
      throw new Error("Unauthenticated request. Please log in.");
    }

    const { hasPermission } = await import("@/lib/permissions");
    const isAuthorized = await hasPermission(user.id, "SUPER_ADMIN") || await hasPermission(user.id, requiredPermission || "IAM_MANAGE");

    if (!isAuthorized) {
      throw new Error("Unauthorized: You do not have capabilities to perform this IAM operation.");
    }
  } catch (err: any) {
    throw new Error(err.message || "IAM Authorization failed");
  }
}

export async function fetchRoles() {
  await checkIAMAuthorization("IAM_VIEW");
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("roles")
    .select("*, department:departments(name)")
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (error) {
    console.error("[IAM] Error fetching roles:", error);
    return [];
  }
  return data || [];
}

export async function fetchPermissions() {
  await checkIAMAuthorization("IAM_VIEW");
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("module", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[IAM] Error fetching permissions:", error);
    return [];
  }
  return data || [];
}

export async function fetchRolePermissions(roleId: string) {
  try {
    await checkIAMAuthorization("IAM_VIEW");
  } catch (err) {
    return [];
  }
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);

  if (error) {
    console.error("[IAM] Error fetching role permissions:", error);
    return [];
  }
  const perms = data.map(rp => rp.permission_id);
  return perms;
}

export async function createRole(formData: { name: string, code: string, description: string, department_id?: string }) {
  await checkIAMAuthorization("IAM_MANAGE");
  const supabase = supabaseAdmin;

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
  revalidatePath("/rbac");
  return data;
}

export async function updateRole(roleId: string, updates: any) {
  await checkIAMAuthorization("IAM_MANAGE");
  const supabase = supabaseAdmin;

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
  revalidatePath("/rbac");
  return { success: true };
}

export async function syncRolePermissions(roleId: string, permissionIds: string[]) {
  await checkIAMAuthorization("IAM_MANAGE");
  const supabase = supabaseAdmin;

  // Deduplicate and filter valid IDs
  const validPermissionIds = new Set(permissionIds.filter(Boolean));

  // 1. Fetch current role permissions to compute delta (NEVER blindly delete all)
  const { data: currentRows, error: fetchError } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);

  if (fetchError) {
    console.error("[IAM] Error fetching current role permissions:", fetchError);
    throw new Error("Failed to inspect role permissions.");
  }

  const currentIds = new Set((currentRows || []).map(r => r.permission_id));

  // Determine what to delete (in currentIds but not in target validPermissionIds)
  const toDelete = Array.from(currentIds).filter(id => !validPermissionIds.has(id));
  // Determine what to insert (in validPermissionIds but not in currentIds)
  const toInsert = Array.from(validPermissionIds).filter(id => !currentIds.has(id));

  // 2. Perform delta deletions
  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_id", toDelete);

    if (delError) {
      console.error("[IAM] Error clearing unselected role permissions:", delError);
      throw new Error("Failed to remove permissions.");
    }
  }

  // 3. Perform delta insertions
  if (toInsert.length > 0) {
    const mappings = toInsert.map(pid => ({
      role_id: roleId,
      permission_id: pid
    }));

    const { error: insertError } = await supabase
      .from("role_permissions")
      .insert(mappings);

    if (insertError) {
      console.error("[IAM] Error adding new role permissions:", insertError);
      throw new Error("Failed to map role permissions.");
    }
  }

  // Refresh snapshots for all users affected by this role change
  try {
    const [uMasterRes, uRolesRes] = await Promise.all([
      supabase.from("user_master").select("id").eq("role_id", roleId).eq("is_deleted", false),
      supabase.from("user_roles").select("user_id").eq("role_id", roleId)
    ]);
    const userIds = new Set<string>();
    uMasterRes.data?.forEach(u => userIds.add(u.id));
    uRolesRes.data?.forEach(u => userIds.add(u.user_id));

    for (const uid of userIds) {
      await supabase.rpc("refresh_single_user_permissions_snapshot", { p_user_id: uid });
    }
  } catch (refErr) {
    console.warn("[IAM] Snapshot refresh notice:", refErr);
  }

  revalidatePath("/iam");
  revalidatePath("/rbac");
  return { success: true };
}

export async function toggleRolePermission(roleId: string, permissionId: string, enabled: boolean) {
  await checkIAMAuthorization("IAM_MANAGE");
  const supabase = supabaseAdmin;

  if (enabled) {
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: "role_id,permission_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) throw new Error(error.message);
  }

  // Refresh snapshots for all users affected by this role change
  try {
    const [uMasterRes, uRolesRes] = await Promise.all([
      supabase.from("user_master").select("id").eq("role_id", roleId).eq("is_deleted", false),
      supabase.from("user_roles").select("user_id").eq("role_id", roleId)
    ]);
    const userIds = new Set<string>();
    uMasterRes.data?.forEach(u => userIds.add(u.id));
    uRolesRes.data?.forEach(u => userIds.add(u.user_id));

    for (const uid of userIds) {
      await supabase.rpc("refresh_single_user_permissions_snapshot", { p_user_id: uid });
    }
  } catch (refErr) {
    console.warn("[IAM] Snapshot refresh notice:", refErr);
  }

  revalidatePath("/iam");
  revalidatePath("/rbac");
  return { success: true };
}

export async function cloneRole(sourceRoleId: string, newRoleName: string, newRoleCode: string) {
  await checkIAMAuthorization("IAM_MANAGE");
  const supabase = supabaseAdmin;

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
  const supabase = supabaseAdmin;

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
  revalidatePath("/rbac");
  return { success: true };
}


export async function fetchDepartments() {
  const supabase = supabaseAdmin;
  const { data } = await supabase.from('departments').select('*').eq('is_deleted', false).order('name', { ascending: true });
  return data || [];
}

/**
 * Register or update active user session with device metadata and log
 */
export async function registerUserSession(sessionToken: string, userAgent?: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) return { success: false, error: "Unauthenticated" };

    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";
    const clientUserAgent = userAgent || headersList.get("user-agent") || "Unknown Device";

    const now = new Date().toISOString();

    // 1. Upsert into active_sessions table
    await supabaseAdmin
      .from("active_sessions")
      .upsert({
        user_id: user.id,
        session_token: sessionToken,
        last_active_at: now
      }, { onConflict: "user_id" });

    // 2. Mark any other session tokens for this user as inactive in auth_session_logs
    await supabaseAdmin
      .from("auth_session_logs")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("session_token", sessionToken);

    // 3. Upsert / insert active session log
    const { data: existingLog } = await supabaseAdmin
      .from("auth_session_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (existingLog) {
      await supabaseAdmin
        .from("auth_session_logs")
        .update({
          ip_address: ipAddress,
          user_agent: clientUserAgent,
          last_activity: now,
          is_active: true
        })
        .eq("id", existingLog.id);
    } else {
      await supabaseAdmin
        .from("auth_session_logs")
        .insert([{
          user_id: user.id,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: clientUserAgent,
          login_time: now,
          last_activity: now,
          is_active: true
        }]);
    }

    // 4. Update user_master last_login_at and last_active_at
    await supabaseAdmin
      .from("user_master")
      .update({
        last_login_at: now,
        last_active_at: now
      })
      .eq("id", user.id);

    return { success: true };
  } catch (err: any) {
    console.error("[IAM] registerUserSession error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if the user is actively logged in on another device/browser with a different session token.
 */
export async function checkActiveSessionConflict(userId: string, currentSessionToken?: string) {
  try {
    const { data: activeSession } = await supabaseAdmin
      .from("active_sessions")
      .select("session_token, last_active_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!activeSession || !activeSession.session_token) {
      return { hasConflict: false };
    }

    // If the client already has the exact same session token, it's the same browser session
    if (currentSessionToken && activeSession.session_token === currentSessionToken) {
      return { hasConflict: false };
    }

    // Check if the session is within 24 hours
    const lastActive = activeSession.last_active_at ? new Date(activeSession.last_active_at).getTime() : 0;
    const now = Date.now();
    const isRecent = (now - lastActive) < 24 * 60 * 60 * 1000;

    return {
      hasConflict: isRecent,
      lastActiveAt: activeSession.last_active_at
    };
  } catch (err) {
    return { hasConflict: false };
  }
}

export async function fetchActiveSessions() {
  await checkIAMAuthorization("IAM_VIEW");
  const supabase = supabaseAdmin;

  // Join with user_master to get user details
  const { data, error } = await supabase
    .from("auth_session_logs")
    .select("*, user:user_master(id, full_name, email, user_code)")
    .eq("is_active", true)
    .order("last_activity", { ascending: false });

  if (error) {
    console.error("[IAM] Error fetching active sessions:", error);
    return [];
  }
  return data || [];
}

export async function killSession(sessionId: string) {
  await checkIAMAuthorization("IAM_MANAGE");
  const supabase = supabaseAdmin;

  const { data: sessionLog } = await supabase
    .from("auth_session_logs")
    .select("user_id, session_token")
    .eq("id", sessionId)
    .maybeSingle();

  const { error } = await supabase
    .from("auth_session_logs")
    .update({ is_active: false })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to kill session: ${error.message}`);
  }

  if (sessionLog) {
    await supabase
      .from("active_sessions")
      .delete()
      .eq("user_id", sessionLog.user_id);
  }

  revalidatePath("/iam/sessions");
}
