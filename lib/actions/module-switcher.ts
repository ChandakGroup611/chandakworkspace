"use server";

import { cookies } from "next/headers";
import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export interface ModuleInfo {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  route_path: string;
  display_order: number;
  is_active: boolean;
  is_default?: boolean;
}

export interface UserModulesResult {
  modules: ModuleInfo[];
  defaultModule: ModuleInfo | null;
  activeModuleCode: string | null;
  isAdmin: boolean;
  userFullName?: string;
  userEmail?: string;
}

/**
 * Fetch all modules that the current logged-in user has permission to access.
 */
export async function getUserAllowedModules(targetUserId?: string): Promise<UserModulesResult> {
  try {
    let userId = targetUserId;
    if (!userId) {
      const { user } = await getCachedUser();
      if (!user) {
        return { modules: [], defaultModule: null, activeModuleCode: null, isAdmin: false };
      }
      userId = user.id;
    }

    // Fetch user profile and role
    const { data: userProfile } = await supabaseAdmin
      .from("user_master")
      .select("id, full_name, email, role:roles(code)")
      .eq("id", userId)
      .single();

    const roleCode = (userProfile?.role as any)?.code || "";
    const isAdmin = roleCode === "SUPER_ADMIN" || roleCode === "ROLE_ADMIN";

    // Fetch all active modules
    const { data: allActiveModules, error: modErr } = await supabaseAdmin
      .from("modules_master")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (modErr || !allActiveModules) {
      console.error("[module-switcher] Failed to fetch modules_master:", modErr);
      return { modules: [], defaultModule: null, activeModuleCode: null, isAdmin };
    }

    // Fetch user assigned modules
    const { data: userAssignments } = await supabaseAdmin
      .from("user_modules")
      .select("module_id, is_default, module:modules_master(code)")
      .eq("user_id", userId);

    const assignedModuleIds = new Set((userAssignments || []).map(a => a.module_id));
    const defaultAssignment = (userAssignments || []).find(a => a.is_default);

    // All active modules (Workspace, Vehicle, Design Tracking) are available to users
    let allowedModules: ModuleInfo[] = allActiveModules.map(m => ({
      ...m,
      is_default: defaultAssignment ? defaultAssignment.module_id === m.id : m.code === "TASK_WORKFLOW"
    }));

    // If user explicitly has a subset assigned in user_modules, ensure at least the 3 primary modules exist
    if (allowedModules.length === 0) {
      allowedModules = allActiveModules;
    }

    // Determine default module
    const defaultModule =
      allowedModules.find(m => m.is_default) ||
      allowedModules.find(m => m.code === "TASK_WORKFLOW") ||
      allowedModules[0] ||
      null;

    // Read active module cookie
    const cookieStore = await cookies();
    const activeModuleCookie = cookieStore.get("active_module")?.value || null;

    // Validate that the active cookie belongs to user's allowed modules
    const isValidActive = activeModuleCookie && allowedModules.some(m => m.code === activeModuleCookie);
    const resolvedActiveCode = isValidActive ? activeModuleCookie : (defaultModule?.code || null);

    return {
      modules: allowedModules,
      defaultModule,
      activeModuleCode: resolvedActiveCode,
      isAdmin,
      userFullName: userProfile?.full_name,
      userEmail: userProfile?.email
    };
  } catch (error) {
    console.error("[module-switcher] Unexpected error in getUserAllowedModules:", error);
    return { modules: [], defaultModule: null, activeModuleCode: null, isAdmin: false };
  }
}

/**
 * Switch the active module for the current session and optionally update default preference.
 */
export async function setActiveModule(
  moduleCode: string,
  setAsDefault: boolean = false
): Promise<{ success: boolean; redirectUrl: string; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) {
      return { success: false, redirectUrl: "/login", error: "Not authenticated" };
    }

    const { modules } = await getUserAllowedModules(user.id);
    const targetModule = modules.find(m => m.code === moduleCode);

    if (!targetModule) {
      return {
        success: false,
        redirectUrl: "/",
        error: `You do not have permission to access the ${moduleCode} module.`
      };
    }

    // Set cookie for 30 days
    const cookieStore = await cookies();
    cookieStore.set("active_module", targetModule.code, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      httpOnly: false
    });

    // Optionally update user default module in DB
    if (setAsDefault) {
      try {
        // Reset all defaults for this user
        await supabaseAdmin
          .from("user_modules")
          .update({ is_default: false })
          .eq("user_id", user.id);

        // Set target module as default
        await supabaseAdmin
          .from("user_modules")
          .update({ is_default: true })
          .eq("user_id", user.id)
          .eq("module_id", targetModule.id);
      } catch (dbErr) {
        console.warn("[module-switcher] Failed to update default module preference in DB:", dbErr);
      }
    }

    return {
      success: true,
      redirectUrl: targetModule.route_path
    };
  } catch (error: any) {
    console.error("[module-switcher] setActiveModule error:", error);
    return { success: false, redirectUrl: "/", error: error.message || "Failed to switch module" };
  }
}

/**
 * Get current active module info.
 */
export async function getActiveModule(): Promise<ModuleInfo | null> {
  const userModules = await getUserAllowedModules();
  if (!userModules.activeModuleCode) return userModules.defaultModule;
  return userModules.modules.find(m => m.code === userModules.activeModuleCode) || userModules.defaultModule;
}

/**
 * Admin action: Assign or update modules for a specific user.
 */
export async function assignUserModules(
  targetUserId: string,
  moduleCodes: string[],
  defaultCode: string = "TASK_WORKFLOW"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify requesting user is admin
    const { data: adminProfile } = await supabaseAdmin
      .from("user_master")
      .select("role:roles(code)")
      .eq("id", user.id)
      .single();

    const roleCode = (adminProfile?.role as any)?.code || "";
    const isRoleAdmin = roleCode === "SUPER_ADMIN" || roleCode === "ROLE_ADMIN";
    if (!isRoleAdmin) {
      const { hasPermission } = await import("@/lib/permissions");
      const canManage = await hasPermission(user.id, "USERS_MANAGE") || await hasPermission(user.id, "USERS_UPDATE");
      if (!canManage) {
        return { success: false, error: "Only administrators can assign workspace modules." };
      }
    }

    // Get module IDs
    const { data: allModules } = await supabaseAdmin
      .from("modules_master")
      .select("id, code");

    if (!allModules) {
      return { success: false, error: "Could not fetch modules master." };
    }

    const codeToIdMap = new Map(allModules.map(m => [m.code, m.id]));

    // Delete existing user modules
    await supabaseAdmin
      .from("user_modules")
      .delete()
      .eq("user_id", targetUserId);

    // Insert new assignments
    const rowsToInsert = moduleCodes
      .filter(code => codeToIdMap.has(code))
      .map(code => ({
        user_id: targetUserId,
        module_id: codeToIdMap.get(code)!,
        is_default: code === defaultCode
      }));

    if (rowsToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from("user_modules")
        .insert(rowsToInsert);

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("[assignUserModules] Error:", error);
    return { success: false, error: error.message || "Failed to assign modules" };
  }
}

/**
 * Clear the active module cookie (used on logout or session reset).
 */
export async function clearActiveModule(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("active_module");
    return { success: true };
  } catch (e) {
    console.error("[clearActiveModule] Error:", e);
    return { success: false };
  }
}

