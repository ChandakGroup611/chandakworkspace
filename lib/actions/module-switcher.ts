"use server";

import { cookies } from "next/headers";
import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";

// Static metadata cache for modules_master
let cachedActiveModules: any[] | null = null;
let cachedActiveModulesTimestamp = 0;
const MODULES_MASTER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  hasExplicitDefault?: boolean;
  activeModuleCode: string | null;
  isAdmin: boolean;
  userFullName?: string;
  userEmail?: string;
}

const ALLOWED_CORE_MODULE_CODES = new Set(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING", "DASHBOARDS", "CHANDAK_MEET", "ORG_BUDGET", "CHANDAK_MESSENGER"]);

const DEFAULT_FALLBACK_MODULES: ModuleInfo[] = [
  {
    id: "mod-task",
    code: "TASK_WORKFLOW",
    name: "Task & Workspace Management",
    description: "Core Operations, Workspace, Tasks & Ticketing",
    icon: "FolderKanban",
    route_path: "/",
    display_order: 1,
    is_active: true,
    is_default: true
  },
  {
    id: "mod-vehicle",
    code: "VEHICLE_DESK",
    name: "Vehicle Management Desk",
    description: "Fleet, Trips & Maintenance Logistics",
    icon: "Car",
    route_path: "/vehicle",
    display_order: 2,
    is_active: true,
    is_default: false
  },
  {
    id: "mod-design",
    code: "DESIGN_TRACKING",
    name: "Design & Drawing Tracking",
    description: "Architecture, Drawing Registers & Approvals",
    icon: "Compass",
    route_path: "/design/matrix",
    display_order: 3,
    is_active: true,
    is_default: false
  },
  {
    id: "mod-dashboards",
    code: "DASHBOARDS",
    name: "Dashboards",
    description: "Department budget & expense dashboards on live IN4 data",
    icon: "LineChart",
    route_path: "/dashboards",
    display_order: 4,
    is_active: true,
    is_default: false
  },
  {
    id: "mod-meet",
    code: "CHANDAK_MEET",
    name: "Chandak Meet",
    description: "Meetings, Agendas, Points with Carry-Forward, Decisions & Action Items",
    icon: "Video",
    route_path: "/meet",
    display_order: 5,
    is_active: true,
    is_default: false
  },
  {
    id: "mod-budget",
    code: "ORG_BUDGET",
    name: "Organization Budget",
    description: "Project, tower and department budgets, versions, cost incurred, Summary and Detail reports",
    icon: "Wallet",
    route_path: "/budget",
    display_order: 6,
    is_active: true,
    is_default: false
  }
];

/**
 * Fetch all modules that the current logged-in user has permission to access.
 */
export async function getUserAllowedModules(targetUserId?: string): Promise<UserModulesResult> {
  try {
    let userId = targetUserId;
    if (!userId) {
      const { user } = await getCachedUser();
      if (!user) {
        return { modules: DEFAULT_FALLBACK_MODULES, defaultModule: DEFAULT_FALLBACK_MODULES[0], activeModuleCode: "TASK_WORKFLOW", isAdmin: false };
      }
      userId = user.id;
    }

    // Fetch user profile and role with maybeSingle + role_id fallback
    const { data: userProfile } = await supabaseAdmin
      .from("user_master")
      .select("id, full_name, email, role_id, role:roles(code)")
      .eq("id", userId)
      .maybeSingle();

    let rawRoleCode = (userProfile?.role as any)?.code || "";
    if (!rawRoleCode && userProfile?.role_id) {
      const { data: fallbackRole } = await supabaseAdmin
        .from("roles")
        .select("code")
        .eq("id", userProfile.role_id)
        .maybeSingle();
      if (fallbackRole?.code) {
        rawRoleCode = fallbackRole.code;
      }
    }
    const roleCode = String(rawRoleCode || "").toUpperCase();
    const isAdmin = ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN", "ADMIN_ROLE"].includes(roleCode);

    // Fetch all active modules (with 5-minute memory cache)
    let allActiveModules: any[] | null = null;
    const now = Date.now();
    if (cachedActiveModules && (now - cachedActiveModulesTimestamp < MODULES_MASTER_CACHE_TTL_MS)) {
      allActiveModules = cachedActiveModules;
    } else {
      const { data: fetchedModules } = await supabaseAdmin
        .from("modules_master")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (fetchedModules && fetchedModules.length > 0) {
        allActiveModules = fetchedModules;
        cachedActiveModules = fetchedModules;
        cachedActiveModulesTimestamp = now;
      } else {
        allActiveModules = DEFAULT_FALLBACK_MODULES;
      }
    }

    // Fetch user assigned modules
    const { data: userAssignments } = await supabaseAdmin
      .from("user_modules")
      .select("module_id, is_default, module:modules_master(code)")
      .eq("user_id", userId);

    const assignedModuleIds = new Set((userAssignments || []).map(a => a.module_id));
    const defaultAssignment = (userAssignments || []).find(a => a.is_default);

    // Check if user has dashboard RBAC permissions (DASH_*)
    let hasDashboardPerms = false;
    if (!isAdmin) {
      const { data: dashPerms } = await supabaseAdmin
        .from("user_permissions_snapshot")
        .select("permission_code")
        .eq("user_id", userId)
        .like("permission_code", "DASH_%");
      hasDashboardPerms = Array.isArray(dashPerms) && dashPerms.length > 0;
    }

    // Filter modules based on user assignments and RBAC permissions (Super Admins see all active modules)
    let allowedModules: ModuleInfo[] = (allActiveModules || DEFAULT_FALLBACK_MODULES)
      .filter(m => {
        if (!ALLOWED_CORE_MODULE_CODES.has(m.code)) return false;
        if (isAdmin) return true;
        if (m.code === "DASHBOARDS" && hasDashboardPerms) return true;
        if (assignedModuleIds.size === 0) return m.code === "TASK_WORKFLOW";
        return assignedModuleIds.has(m.id) || assignedModuleIds.has(m.code);
      })
      .map(m => {
        let route = m.route_path;
        if (m.code === "TASK_WORKFLOW" && (!route || route === "/workspaces/tasks")) route = "/";
        if (m.code === "VEHICLE_DESK" && (!route || route === "/vehicle/dashboard")) route = "/vehicle";
        if (m.code === "DESIGN_TRACKING" && (!route || route === "/design/dashboard")) route = "/design/matrix";
        if (m.code === "DASHBOARDS" && !route) route = "/dashboards";
        if (m.code === "CHANDAK_MEET" && !route) route = "/meet";
        if (m.code === "ORG_BUDGET" && !route) route = "/budget";
        if (m.code === "CHANDAK_MESSENGER" && !route) route = "/messenger";
        return {
          ...m,
          route_path: route,
          is_default: defaultAssignment ? (defaultAssignment.module_id === m.id || defaultAssignment.module_id === m.code) : m.code === "TASK_WORKFLOW"
        };
      });

    // If no specific rows matched, fallback to default modules
    if (allowedModules.length === 0) {
      allowedModules = [DEFAULT_FALLBACK_MODULES[0]];
    }

    // Determine default module
    const defaultModule =
      allowedModules.find(m => m.is_default) ||
      allowedModules.find(m => m.code === "TASK_WORKFLOW") ||
      allowedModules[0] ||
      DEFAULT_FALLBACK_MODULES[0];

    // Read active module cookie
    let activeModuleCookie: string | null = null;
    try {
      const cookieStore = await cookies();
      activeModuleCookie = cookieStore.get("active_module")?.value || null;
    } catch {}

    // Validate that the active cookie belongs to user's allowed modules
    const isValidActive = activeModuleCookie && allowedModules.some(m => m.code === activeModuleCookie);
    const resolvedActiveCode = isValidActive ? activeModuleCookie : (defaultModule?.code || "TASK_WORKFLOW");

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
    return { 
      modules: DEFAULT_FALLBACK_MODULES, 
      defaultModule: DEFAULT_FALLBACK_MODULES[0], 
      activeModuleCode: "TASK_WORKFLOW", 
      isAdmin: false 
    };
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
  defaultCode: string = "TASK_WORKFLOW",
  dashboardKeys?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user && process.env.NODE_ENV !== "test") {
      return { success: false, error: "Unauthorized" };
    }

    if (user) {
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

    // Ensure at least one module is designated default
    if (rowsToInsert.length > 0 && !rowsToInsert.some(r => r.is_default)) {
      rowsToInsert[0].is_default = true;
    }

    if (rowsToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from("user_modules")
        .insert(rowsToInsert);

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }
    }

    // Synchronize design_user_access if DESIGN_TRACKING is included
    if (moduleCodes.includes("DESIGN_TRACKING")) {
      try {
        const { data: existingAccess } = await supabaseAdmin
          .from("design_user_access")
          .select("id")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (!existingAccess) {
          await supabaseAdmin
            .from("design_user_access")
            .insert({
              user_id: targetUserId,
              design_role: "DESIGN_COORDINATOR",
              project_access_type: "ALL",
              assigned_project_ids: [],
              can_matrix_edit: true,
              can_drawings_upload: true,
              can_drawings_approve_gfc: false,
              can_transmittals_create: true,
              can_rfis_manage: true,
              can_masters_manage: false,
              updated_at: new Date().toISOString(),
              updated_by: "Module Assignment Sync"
            });
        }
      } catch (accessErr) {
        console.warn("[assignUserModules] design_user_access sync warning:", accessErr);
      }
    }

    // Synchronize dashboard_user_access if DASHBOARDS is included
    if (moduleCodes.includes("DASHBOARDS")) {
      if (Array.isArray(dashboardKeys)) {
        if (dashboardKeys.length === 0) {
          await supabaseAdmin
            .from("dashboard_user_access")
            .delete()
            .eq("user_id", targetUserId);
        } else {
          // Delete any existing entries not in the new list
          const { data: existingRows } = await supabaseAdmin
            .from("dashboard_user_access")
            .select("id, dashboard_key")
            .eq("user_id", targetUserId);

          const existingKeys = new Set((existingRows || []).map((r: any) => r.dashboard_key));
          const keysToDelete = (existingRows || []).filter((r: any) => !dashboardKeys.includes(r.dashboard_key));

          if (keysToDelete.length > 0) {
            await supabaseAdmin
              .from("dashboard_user_access")
              .delete()
              .in("id", keysToDelete.map((r: any) => r.id));
          }

          for (const key of dashboardKeys) {
            if (!existingKeys.has(key)) {
              await supabaseAdmin
                .from("dashboard_user_access")
                .insert({
                  user_id: targetUserId,
                  dashboard_key: key,
                  updated_at: new Date().toISOString()
                });
            }
          }
        }
      }
    } else {
      await supabaseAdmin
        .from("dashboard_user_access")
        .delete()
        .eq("user_id", targetUserId);
    }

    try {
      await supabaseAdmin.rpc("refresh_single_user_permissions_snapshot", { p_user_id: targetUserId });
    } catch {}

    // Synchronize fleet_user_access if VEHICLE_DESK is included
    if (moduleCodes.includes("VEHICLE_DESK")) {
      try {
        const { data: existingFleet } = await supabaseAdmin
          .from("fleet_user_access")
          .select("id")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (!existingFleet) {
          await supabaseAdmin
            .from("fleet_user_access")
            .insert({
              user_id: targetUserId,
              fleet_role: "FLEET_STAFF",
              scope_type: "ALL_VEHICLES",
              assigned_vehicle_ids: [],
              can_manage_vehicles: true,
              can_manage_drivers: true,
              can_dispatch_trips: true,
              can_manage_maintenance: true,
              can_view_reports: true,
              can_manage_settings: false,
              updated_at: new Date().toISOString()
            });
        }
      } catch (fleetErr) {
        console.warn("[assignUserModules] fleet_user_access sync warning:", fleetErr);
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

/**
 * Fetch all dashboard keys assigned to a specific user.
 */
export async function fetchUserDashboardKeys(targetUserId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("dashboard_user_access")
      .select("dashboard_key")
      .eq("user_id", targetUserId);

    if (error || !data) return [];
    return data.map((r: { dashboard_key: string }) => r.dashboard_key);
  } catch (err) {
    console.error("[fetchUserDashboardKeys] Error:", err);
    return [];
  }
}

/**
 * Update dashboard access for a specific user.
 */
export async function assignUserDashboardAccess(
  targetUserId: string,
  dashboardKeys: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Unauthorized" };
    // Granting dashboard access is a user-administration action (it was open to any signed-in user)
    const { hasPermission } = await import("@/lib/permissions");
    const allowed = (await hasPermission(user.id, "SUPER_ADMIN")) || (await hasPermission(user.id, "USERS_MANAGE")) || (await hasPermission(user.id, "USERS_UPDATE"));
    if (!allowed) return { success: false, error: "Unauthorized: only user administrators can change dashboard access." };

    if (dashboardKeys.length === 0) {
      await supabaseAdmin
        .from("dashboard_user_access")
        .delete()
        .eq("user_id", targetUserId);
    } else {
      const { data: existingRows } = await supabaseAdmin
        .from("dashboard_user_access")
        .select("id, dashboard_key")
        .eq("user_id", targetUserId);

      const existingKeys = new Set((existingRows || []).map((r: any) => r.dashboard_key));
      const keysToDelete = (existingRows || []).filter((r: any) => !dashboardKeys.includes(r.dashboard_key));

      if (keysToDelete.length > 0) {
        await supabaseAdmin
          .from("dashboard_user_access")
          .delete()
          .in("id", keysToDelete.map((r: any) => r.id));
      }

      for (const key of dashboardKeys) {
        if (!existingKeys.has(key)) {
          await supabaseAdmin
            .from("dashboard_user_access")
            .insert({
              user_id: targetUserId,
              dashboard_key: key,
              updated_at: new Date().toISOString()
            });
        }
      }
    }

    try {
      await supabaseAdmin.rpc("refresh_single_user_permissions_snapshot", { p_user_id: targetUserId });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("[assignUserDashboardAccess] Error:", err);
    return { success: false, error: err.message || "Failed to update dashboard access" };
  }
}

