"use server";

import { requireMeet } from "@/lib/permissions/meet";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { invalidateModuleAccessCache } from "@/lib/permissions/module-access";
import { getModuleManifest } from "@/lib/modules/registry.generated";
import { revalidatePath } from "next/cache";

export interface MeetRoleData {
  role_code: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  policy_version: number;
  is_customized: boolean;
  user_count: number;
}

export interface MeetRbacResponse {
  success: boolean;
  error?: string;
  manifest?: any;
  roles?: MeetRoleData[];
  auditLogs?: any[];
}

/**
 * Fetch complete RBAC state for Chandak Meet.
 * Accessible to users with MEET_ADMIN or SUPER_ADMIN.
 */
export async function getMeetRbacDataAction(): Promise<MeetRbacResponse> {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });

    const manifest = getModuleManifest("CHANDAK_MEET");

    // Fetch roles from module_roles
    const { data: dbRoles, error: rolesError } = await supabaseAdmin
      .from("module_roles")
      .select("role_code, name, description, permissions, is_system, policy_version, is_customized")
      .eq("module_code", "CHANDAK_MEET")
      .order("role_code");

    if (rolesError) throw rolesError;

    // Fetch user counts from user_module_access
    const { data: accessCounts } = await supabaseAdmin
      .from("user_module_access")
      .select("role_code")
      .eq("module_code", "CHANDAK_MEET");

    const countsMap: Record<string, number> = {};
    (accessCounts || []).forEach((row) => {
      countsMap[row.role_code] = (countsMap[row.role_code] || 0) + 1;
    });

    const roles: MeetRoleData[] = (dbRoles || []).map((r) => ({
      role_code: r.role_code,
      name: r.name,
      description: r.description || "",
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      is_system: Boolean(r.is_system),
      policy_version: r.policy_version || 1,
      is_customized: Boolean(r.is_customized),
      user_count: countsMap[r.role_code] || 0,
    }));

    // Fetch recent audit logs
    const { data: logs } = await supabaseAdmin
      .from("rbac_sync_audit_logs")
      .select("*")
      .eq("module_code", "CHANDAK_MEET")
      .order("executed_at", { ascending: false })
      .limit(10);

    return {
      success: true,
      manifest,
      roles,
      auditLogs: logs || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to load Meet RBAC configuration",
    };
  }
}

/**
 * Save customized permissions for a Chandak Meet role.
 */
export async function saveMeetRolePolicyAction(
  roleCode: string,
  newPermissions: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireMeet("MEET_ADMIN", { requireAdmin: true });

    const cleanPerms = Array.from(new Set(newPermissions.filter(Boolean)));

    // Fetch current state
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("module_roles")
      .select("policy_version, permissions")
      .eq("module_code", "CHANDAK_MEET")
      .eq("role_code", roleCode)
      .single();

    if (fetchErr || !existing) {
      throw new Error(`Role ${roleCode} not found in CHANDAK_MEET.`);
    }

    const nextVersion = (existing.policy_version || 1) + 1;

    // Update role
    const { error: updateErr } = await supabaseAdmin
      .from("module_roles")
      .update({
        permissions: cleanPerms,
        policy_version: nextVersion,
        is_customized: true,
        updated_by: userId,
      })
      .eq("module_code", "CHANDAK_MEET")
      .eq("role_code", roleCode);

    if (updateErr) throw updateErr;

    // Record in audit log
    await supabaseAdmin.from("rbac_sync_audit_logs").insert({
      module_code: "CHANDAK_MEET",
      previous_version: existing.policy_version || 1,
      new_version: nextVersion,
      added_permissions: cleanPerms.filter((p) => !(existing.permissions || []).includes(p)),
      modified_roles: [roleCode],
      sync_status: "SUCCESS",
      details: {
        role_code: roleCode,
        previous_count: (existing.permissions || []).length,
        new_count: cleanPerms.length,
      },
      executed_by: userId,
    });

    // Invalidate authorization engine cache
    invalidateModuleAccessCache();
    revalidatePath("/meet/settings/rbac");
    revalidatePath("/meet/admin");

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to save role policy",
    };
  }
}

/**
 * Reset a role to manifest defaults.
 */
export async function resetMeetRoleToDefaultAction(
  roleCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireMeet("MEET_ADMIN", { requireAdmin: true });

    const manifest = getModuleManifest("CHANDAK_MEET");
    const defaultPerms = manifest?.defaultPolicies[roleCode];

    if (!defaultPerms) {
      throw new Error(`No manifest default policy declared for role ${roleCode}`);
    }

    const { data: existing } = await supabaseAdmin
      .from("module_roles")
      .select("policy_version")
      .eq("module_code", "CHANDAK_MEET")
      .eq("role_code", roleCode)
      .single();

    const nextVersion = ((existing?.policy_version || 1) + 1);

    await supabaseAdmin
      .from("module_roles")
      .update({
        permissions: defaultPerms,
        policy_version: nextVersion,
        is_customized: false,
        updated_by: userId,
      })
      .eq("module_code", "CHANDAK_MEET")
      .eq("role_code", roleCode);

    await supabaseAdmin.from("rbac_sync_audit_logs").insert({
      module_code: "CHANDAK_MEET",
      previous_version: existing?.policy_version || 1,
      new_version: nextVersion,
      modified_roles: [roleCode],
      sync_status: "SUCCESS",
      details: {
        action: "RESET_TO_MANIFEST_DEFAULT",
        role_code: roleCode,
      },
      executed_by: userId,
    });

    invalidateModuleAccessCache();
    revalidatePath("/meet/settings/rbac");
    revalidatePath("/meet/admin");

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to reset role policy",
    };
  }
}
