"use server";

import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { invalidateModuleAccessCache } from "@/lib/permissions/module-access";
import { getModuleManifest, MODULE_REGISTRY } from "@/lib/modules/registry.generated";
import { revalidatePath } from "next/cache";

export interface ModuleRoleData {
  role_code: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  policy_version: number;
  is_customized: boolean;
  user_count: number;
}

export interface ModuleRbacResponse {
  success: boolean;
  error?: string;
  manifest?: any;
  roles?: ModuleRoleData[];
  auditLogs?: any[];
}

export interface ModuleSummaryData {
  code: string;
  name: string;
  description: string;
  icon: string;
  routePath: string;
  rbacAdminRoute?: string;
  totalRoles: number;
  totalPermissions: number;
  customizedRolesCount: number;
  assignedUsersCount: number;
  hasStandardRole: boolean;
}

/**
 * Authorize the caller: must be Super Admin or have module-specific admin rights.
 */
async function authorizeAdmin(moduleCode?: string): Promise<{ userId: string; isSuperAdmin: boolean }> {
  const { user } = await getCachedUser();
  if (!user) {
    throw new Error("Authentication required.");
  }

  const { checkIsSuperAdmin } = await import("@/lib/repositories/users");
  const isSuper = await checkIsSuperAdmin(user.id);
  if (isSuper) {
    return { userId: user.id, isSuperAdmin: true };
  }

  const { hasPermission } = await import("@/lib/permissions");
  const canManageUsers = await hasPermission(user.id, "USERS_MANAGE");
  if (canManageUsers) {
    return { userId: user.id, isSuperAdmin: false };
  }

  if (moduleCode === "CHANDAK_MEET") {
    const { requireMeet } = await import("@/lib/permissions/meet");
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
    return { userId: user.id, isSuperAdmin: false };
  }

  throw new Error("Unauthorized: Super Admin or Module Administrator privileges required.");
}

/**
 * Fetch complete RBAC state for any registered business module.
 */
export async function getModuleRbacDataAction(moduleCode: string): Promise<ModuleRbacResponse> {
  try {
    await authorizeAdmin(moduleCode);

    const manifest = getModuleManifest(moduleCode);
    if (!manifest) {
      throw new Error(`Module manifest not registered for: ${moduleCode}`);
    }

    // 1. Fetch module roles
    const { data: dbRoles, error: rolesError } = await supabaseAdmin
      .from("module_roles")
      .select("role_code, name, description, permissions, is_system, policy_version, is_customized")
      .eq("module_code", moduleCode)
      .order("role_code");

    if (rolesError) throw rolesError;

    // 2. Fetch assigned user counts
    const { data: accessCounts } = await supabaseAdmin
      .from("user_module_access")
      .select("role_code")
      .eq("module_code", moduleCode);

    const countsMap: Record<string, number> = {};
    (accessCounts || []).forEach((row) => {
      countsMap[row.role_code] = (countsMap[row.role_code] || 0) + 1;
    });

    // 3. Normalize roles and prioritize STANDARD role at the top
    const roles: ModuleRoleData[] = (dbRoles || [])
      .map((r) => ({
        role_code: r.role_code,
        name: r.name,
        description: r.description || "",
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
        is_system: Boolean(r.is_system),
        policy_version: r.policy_version || 1,
        is_customized: Boolean(r.is_customized),
        user_count: countsMap[r.role_code] || 0,
      }))
      .sort((a, b) => {
        if (a.role_code === "STANDARD") return -1;
        if (b.role_code === "STANDARD") return 1;
        if (a.is_system && !b.is_system) return -1;
        if (!a.is_system && b.is_system) return 1;
        return a.name.localeCompare(b.name);
      });

    // 4. Fetch recent audit logs for this module
    const { data: logs } = await supabaseAdmin
      .from("rbac_sync_audit_logs")
      .select("*")
      .eq("module_code", moduleCode)
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
      error: err.message || `Failed to load RBAC data for ${moduleCode}`,
    };
  }
}

/**
 * Save customized permissions for a role in a module.
 */
export async function saveModuleRolePolicyAction(
  moduleCode: string,
  roleCode: string,
  newPermissions: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await authorizeAdmin(moduleCode);

    const manifest = getModuleManifest(moduleCode);
    if (!manifest) throw new Error(`Manifest not registered for ${moduleCode}`);

    const cleanPerms = Array.from(new Set(newPermissions.filter(Boolean)));

    // Fetch existing role record
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("module_roles")
      .select("policy_version, permissions")
      .eq("module_code", moduleCode)
      .eq("role_code", roleCode)
      .single();

    if (fetchErr || !existing) {
      throw new Error(`Role ${roleCode} not found in ${moduleCode}.`);
    }

    const nextVersion = (existing.policy_version || 1) + 1;

    // Update module_roles
    const { error: updateErr } = await supabaseAdmin
      .from("module_roles")
      .update({
        permissions: cleanPerms,
        policy_version: nextVersion,
        is_customized: true,
        updated_by: userId,
      })
      .eq("module_code", moduleCode)
      .eq("role_code", roleCode);

    if (updateErr) throw updateErr;

    // Record overrides in module_role_overrides
    // Compare cleanPerms with manifest default
    const defaultPerms = new Set(manifest.defaultPolicies[roleCode] || []);
    const cleanSet = new Set(cleanPerms);

    // Remove existing overrides for this (module_code, role_code)
    await supabaseAdmin
      .from("module_role_overrides")
      .delete()
      .eq("module_code", moduleCode)
      .eq("role_code", roleCode);

    const overridesToInsert: any[] = [];
    manifest.permissions.forEach((perm) => {
      const isGrantedInNew = cleanSet.has(perm.code);
      const isGrantedInDefault = defaultPerms.has(perm.code);

      if (isGrantedInNew !== isGrantedInDefault) {
        overridesToInsert.push({
          module_code: moduleCode,
          role_code: roleCode,
          permission_code: perm.code,
          is_granted: isGrantedInNew,
          overridden_by: userId,
          notes: isGrantedInNew ? "Admin manual grant" : "Admin manual revoke",
        });
      }
    });

    if (overridesToInsert.length > 0) {
      await supabaseAdmin.from("module_role_overrides").insert(overridesToInsert);
    }

    // Insert sync audit log
    await supabaseAdmin.from("rbac_sync_audit_logs").insert({
      module_code: moduleCode,
      previous_version: existing.policy_version || 1,
      new_version: nextVersion,
      added_permissions: cleanPerms.filter((p) => !(existing.permissions || []).includes(p)),
      modified_roles: [roleCode],
      sync_status: "SUCCESS",
      details: {
        action: "SAVE_ROLE_POLICY",
        role_code: roleCode,
        previous_count: (existing.permissions || []).length,
        new_count: cleanPerms.length,
        overrides_count: overridesToInsert.length,
      },
      executed_by: userId,
    });

    // Invalidate access cache
    invalidateModuleAccessCache();

    // Revalidate paths
    revalidatePath("/rbac");
    if (manifest.rbacAdminRoute) {
      revalidatePath(manifest.rbacAdminRoute);
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || `Failed to save role policy for ${roleCode}`,
    };
  }
}

/**
 * Reset a role to manifest default policy.
 */
export async function resetModuleRoleToDefaultAction(
  moduleCode: string,
  roleCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await authorizeAdmin(moduleCode);

    const manifest = getModuleManifest(moduleCode);
    if (!manifest) throw new Error(`Manifest not registered for ${moduleCode}`);

    const defaultPerms = manifest.defaultPolicies[roleCode];
    if (!defaultPerms) {
      throw new Error(`No manifest default policy declared for role ${roleCode} in ${moduleCode}`);
    }

    const { data: existing } = await supabaseAdmin
      .from("module_roles")
      .select("policy_version")
      .eq("module_code", moduleCode)
      .eq("role_code", roleCode)
      .single();

    const nextVersion = (existing?.policy_version || 1) + 1;

    // Reset module_roles to manifest default
    await supabaseAdmin
      .from("module_roles")
      .update({
        permissions: defaultPerms,
        policy_version: nextVersion,
        is_customized: false,
        updated_by: userId,
      })
      .eq("module_code", moduleCode)
      .eq("role_code", roleCode);

    // Delete overrides
    await supabaseAdmin
      .from("module_role_overrides")
      .delete()
      .eq("module_code", moduleCode)
      .eq("role_code", roleCode);

    // Insert audit log
    await supabaseAdmin.from("rbac_sync_audit_logs").insert({
      module_code: moduleCode,
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

    // Invalidate cache
    invalidateModuleAccessCache();

    revalidatePath("/rbac");
    if (manifest.rbacAdminRoute) {
      revalidatePath(manifest.rbacAdminRoute);
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || `Failed to reset role policy for ${roleCode}`,
    };
  }
}

/**
 * Get summary across all registered business modules.
 */
export async function getAllModulesRbacSummaryAction(): Promise<{
  success: boolean;
  error?: string;
  modules?: ModuleSummaryData[];
}> {
  try {
    await authorizeAdmin();

    const manifests = Object.values(MODULE_REGISTRY);

    // Fetch all module_roles
    const { data: allRoles } = await supabaseAdmin
      .from("module_roles")
      .select("module_code, role_code, is_customized");

    // Fetch all user counts
    const { data: allAccess } = await supabaseAdmin
      .from("user_module_access")
      .select("module_code");

    const rolesByModule: Record<string, any[]> = {};
    (allRoles || []).forEach((r) => {
      if (!rolesByModule[r.module_code]) rolesByModule[r.module_code] = [];
      rolesByModule[r.module_code].push(r);
    });

    const accessCountsByModule: Record<string, number> = {};
    (allAccess || []).forEach((a) => {
      accessCountsByModule[a.module_code] = (accessCountsByModule[a.module_code] || 0) + 1;
    });

    const summaries: ModuleSummaryData[] = manifests.map((m) => {
      const modRoles = rolesByModule[m.code] || [];
      const customizedCount = modRoles.filter((r) => r.is_customized).length;
      const hasStandard = modRoles.some((r) => r.role_code === "STANDARD");

      return {
        code: m.code,
        name: m.name,
        description: m.description,
        icon: m.icon,
        routePath: m.routePath,
        rbacAdminRoute: m.rbacAdminRoute,
        totalRoles: modRoles.length || m.roles.length,
        totalPermissions: m.permissions.length,
        customizedRolesCount: customizedCount,
        assignedUsersCount: accessCountsByModule[m.code] || 0,
        hasStandardRole: hasStandard,
      };
    });

    return {
      success: true,
      modules: summaries,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to load modules RBAC summary",
    };
  }
}
