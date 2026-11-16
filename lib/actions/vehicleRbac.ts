"use server";

import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { can, invalidateModuleAccessCache } from "@/lib/permissions/module-access";
import { 
  FleetWorkspaceUser, 
  FleetUserAccessRecord, 
  FleetRbacPolicy 
} from "@/types/vehicleRbacTypes";
import { DEFAULT_FLEET_POLICIES } from "@/components/vehicle/services/fleetMasterStore";

async function verifyAdminOrFleetLead() {
  const { user } = await getCachedUser();
  if (!user) throw new Error("Unauthenticated request");

  const { data: profile } = await supabaseAdmin
    .from("user_master")
    .select("role:roles(code), platform_role")
    .eq("id", user.id)
    .single();

  const roleCode = (profile?.role as any)?.code || "";
  const platformRole = profile?.platform_role || "";
  const isAdmin = ["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN_ROLE", "ADMIN"].includes(roleCode) || platformRole === "SUPER_ADMIN";

  if (isAdmin) return { user, isAdmin: true };

  const canSettings = await can(user.id, "VEHICLE_DESK", "FLEET_SETTINGS");
  if (canSettings) return { user, isAdmin: false };

  const { data: fleetAccess } = await supabaseAdmin
    .from("fleet_user_access")
    .select("fleet_role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isFleetAdmin = fleetAccess?.fleet_role === "FLEET_ADMIN";

  if (!isFleetAdmin) {
    throw new Error("Unauthorized: Fleet Administrator or System Admin permissions required.");
  }

  return { user, isAdmin: false };
}

/**
 * Fetch all workspace users with department, designation, global role, 
 * vehicle module status, and fleet_user_access details.
 */
export async function fetchFleetWorkspaceUsersAction(): Promise<{
  success: boolean;
  users?: FleetWorkspaceUser[];
  error?: string;
}> {
  try {
    const [
      usersRes,
      deptRes,
      desigRes,
      rolesRes,
      modulesRes,
      userModulesRes,
      userModuleAccessRes,
      fleetAccessRes
    ] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, user_code, profile_photo, is_active, role_id, department_id, designation_id, platform_role")
        .eq("is_deleted", false)
        .order("full_name", { ascending: true }),
      supabaseAdmin.from("departments").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("designations").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("roles").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("modules_master").select("id, code").eq("code", "VEHICLE_DESK").maybeSingle(),
      supabaseAdmin.from("user_modules").select("user_id, module_id"),
      supabaseAdmin.from("user_module_access").select("user_id, role_code, scope").eq("module_code", "VEHICLE_DESK"),
      supabaseAdmin.from("fleet_user_access").select("*")
    ]);

    const usersData = usersRes.data || [];
    const deptMap = new Map((deptRes.data || []).map(d => [d.id, d.name]));
    const desigMap = new Map((desigRes.data || []).map(d => [d.id, d.name]));
    const roleMap = new Map((rolesRes.data || []).map(r => [r.id, { name: r.name, code: r.code }]));

    const vehicleModuleId = modulesRes.data?.id;
    const usersWithModuleAccess = new Set<string>();

    (userModulesRes.data || []).forEach(um => {
      if (vehicleModuleId && um.module_id === vehicleModuleId) {
        usersWithModuleAccess.add(um.user_id);
      }
    });

    const umaMap = new Map<string, any>();
    (userModuleAccessRes.data || []).forEach((uma: any) => {
      usersWithModuleAccess.add(uma.user_id);
      umaMap.set(uma.user_id, uma);
    });

    const fleetAccessMap = new Map<string, FleetUserAccessRecord>();
    (fleetAccessRes.data || []).forEach((row: any) => {
      fleetAccessMap.set(row.user_id, {
        id: row.id,
        userId: row.user_id,
        fleetRole: row.fleet_role,
        scopeType: row.scope_type || "ALL_VEHICLES",
        assignedVehicleIds: row.assigned_vehicle_ids || [],
        canManageVehicles: !!row.can_manage_vehicles,
        canManageDrivers: !!row.can_manage_drivers,
        canDispatchTrips: !!row.can_dispatch_trips,
        canManageMaintenance: !!row.can_manage_maintenance,
        canViewReports: !!row.can_view_reports,
        canManageSettings: !!row.can_manage_settings,
        updatedAt: row.updated_at
      });
    });

    // Backfill from user_module_access if fleet_user_access record doesn't exist
    umaMap.forEach((uma, uId) => {
      if (!fleetAccessMap.has(uId)) {
        const isFleetAdmin = uma.role_code === "FLEET_ADMIN";
        const isFleetLead = uma.role_code === "FLEET_LEAD";
        const isViewer = uma.role_code === "VIEWER";
        const vehicleScope = uma.scope?.type === "vehicles" ? (uma.scope.vehicle_ids || []) : [];
        fleetAccessMap.set(uId, {
          id: `uma-${uId}`,
          userId: uId,
          fleetRole: isFleetAdmin ? "FLEET_ADMIN" : isFleetLead ? "FLEET_MANAGER" : isViewer ? "FLEET_VIEWER" : "TRAVELER",
          scopeType: vehicleScope.length > 0 ? "ASSIGNED_ONLY" : "ALL_VEHICLES",
          assignedVehicleIds: vehicleScope,
          canManageVehicles: isFleetAdmin || isFleetLead,
          canManageDrivers: isFleetAdmin || isFleetLead,
          canDispatchTrips: isFleetAdmin || isFleetLead,
          canManageMaintenance: isFleetAdmin || isFleetLead,
          canViewReports: isFleetAdmin || isFleetLead || isViewer,
          canManageSettings: isFleetAdmin,
          updatedAt: new Date().toISOString()
        });
      }
    });

    const workspaceUsers: FleetWorkspaceUser[] = usersData.map((u: any) => {
      const globalRole = roleMap.get(u.role_id);
      const isGlobalAdmin = globalRole?.code === "SUPER_ADMIN" || globalRole?.code === "ROLE_ADMIN" || u.platform_role === "SUPER_ADMIN";
      const hasAccess = isGlobalAdmin || usersWithModuleAccess.has(u.id);

      return {
        id: u.id,
        fullName: u.full_name || u.email || "Unknown User",
        email: u.email || "",
        userCode: u.user_code || "",
        profilePhoto: u.profile_photo || null,
        isActive: !!u.is_active,
        departmentName: u.department_id ? deptMap.get(u.department_id) : undefined,
        designationName: u.designation_id ? desigMap.get(u.designation_id) : undefined,
        globalRoleCode: globalRole?.code,
        hasModuleAccess: hasAccess,
        fleetAccess: fleetAccessMap.get(u.id)
      };
    });

    return { success: true, users: workspaceUsers };
  } catch (err: any) {
    console.error("fetchFleetWorkspaceUsersAction error:", err);
    return { success: false, error: err.message || "Failed to fetch fleet personnel" };
  }
}

/**
 * Save user fleet role and granular functional permissions
 */
export async function saveFleetUserAccessAction(record: FleetUserAccessRecord): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await verifyAdminOrFleetLead();

    const payload = {
      user_id: record.userId,
      fleet_role: record.fleetRole,
      scope_type: record.scopeType || "ALL_VEHICLES",
      assigned_vehicle_ids: record.assignedVehicleIds || [],
      can_manage_vehicles: record.canManageVehicles,
      can_manage_drivers: record.canManageDrivers,
      can_dispatch_trips: record.canDispatchTrips,
      can_manage_maintenance: record.canManageMaintenance,
      can_view_reports: record.canViewReports,
      can_manage_settings: record.canManageSettings,
      updated_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("fleet_user_access")
      .upsert(payload, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("saveFleetUserAccessAction upsert error:", upsertErr);
      return { success: false, error: upsertErr.message };
    }

    // Auto-ensure user_modules has VEHICLE_DESK module assigned
    const { data: moduleData } = await supabaseAdmin
      .from("modules_master")
      .select("id")
      .eq("code", "VEHICLE_DESK")
      .maybeSingle();

    if (moduleData) {
      await supabaseAdmin
        .from("user_modules")
        .upsert(
          { user_id: record.userId, module_id: moduleData.id, is_default: false },
          { onConflict: "user_id,module_id" }
        );
    }

    // Sync to user_module_access table
    let moduleRoleCode = "REQUESTER";
    if (record.fleetRole === "FLEET_ADMIN" || record.canManageSettings) {
      moduleRoleCode = "FLEET_ADMIN";
    } else if (
      ["FLEET_MANAGER", "FLEET_STAFF", "FLEET_WORKSHOP", "FLEET_DISPATCHER", "FLEET_OFFICER"].includes(record.fleetRole) ||
      record.canManageVehicles ||
      record.canDispatchTrips ||
      record.canManageMaintenance
    ) {
      moduleRoleCode = "FLEET_LEAD";
    } else if (record.fleetRole === "FLEET_VIEWER") {
      moduleRoleCode = "VIEWER";
    }

    const scopeObj = (record.scopeType === "ASSIGNED_ONLY" && record.assignedVehicleIds && record.assignedVehicleIds.length > 0)
      ? { type: "vehicles", vehicle_ids: record.assignedVehicleIds }
      : { type: "all" };

    await supabaseAdmin
      .from("user_module_access")
      .upsert({
        user_id: record.userId,
        module_code: "VEHICLE_DESK",
        role_code: moduleRoleCode,
        scope: scopeObj,
        is_default: false,
        granted_by: user.id,
        granted_at: new Date().toISOString()
      }, { onConflict: "user_id,module_code,dashboard_key" });

    invalidateModuleAccessCache(record.userId);

    return { success: true };
  } catch (err: any) {
    console.error("saveFleetUserAccessAction error:", err);
    return { success: false, error: err.message || "Failed to save fleet access" };
  }
}

/**
 * Delete / Reset user fleet access
 */
export async function deleteFleetUserAccessAction(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await verifyAdminOrFleetLead();

    const { error } = await supabaseAdmin
      .from("fleet_user_access")
      .delete()
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Sync deletion to user_module_access
    await supabaseAdmin
      .from("user_module_access")
      .delete()
      .eq("user_id", userId)
      .eq("module_code", "VEHICLE_DESK");

    invalidateModuleAccessCache(userId);

    return { success: true };
  } catch (err: any) {
    console.error("deleteFleetUserAccessAction error:", err);
    return { success: false, error: err.message || "Failed to delete fleet access" };
  }
}

/**
 * Toggle user's general access to the VEHICLE_DESK module
 */
export async function toggleUserFleetModuleAccessAction(userId: string, enable: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await verifyAdminOrFleetLead();

    const { data: moduleData } = await supabaseAdmin
      .from("modules_master")
      .select("id")
      .eq("code", "VEHICLE_DESK")
      .single();

    if (!moduleData) {
      return { success: false, error: "Vehicle module record not found" };
    }

    if (enable) {
      const { error } = await supabaseAdmin
        .from("user_modules")
        .upsert(
          { user_id: userId, module_id: moduleData.id, is_default: false },
          { onConflict: "user_id,module_id" }
        );
      if (error) return { success: false, error: error.message };

      await supabaseAdmin
        .from("user_module_access")
        .upsert({
          user_id: userId,
          module_code: "VEHICLE_DESK",
          role_code: "REQUESTER",
          scope: { type: "all" },
          is_default: false,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        }, { onConflict: "user_id,module_code,dashboard_key" });
    } else {
      const { error } = await supabaseAdmin
        .from("user_modules")
        .delete()
        .eq("user_id", userId)
        .eq("module_id", moduleData.id);
      if (error) return { success: false, error: error.message };

      await supabaseAdmin
        .from("user_module_access")
        .delete()
        .eq("user_id", userId)
        .eq("module_code", "VEHICLE_DESK");
    }

    invalidateModuleAccessCache(userId);

    return { success: true };
  } catch (err: any) {
    console.error("toggleUserFleetModuleAccessAction error:", err);
    return { success: false, error: err.message || "Failed to toggle module access" };
  }
}

/**
 * Fetch the current authenticated user's own fleet access record
 */
export async function fetchMyFleetAccessAction(): Promise<{
  success: boolean;
  fleetAccess?: FleetUserAccessRecord | null;
  globalRoleCode?: string;
  isSuperAdmin?: boolean;
  error?: string;
}> {
  try {
    const { user } = await getCachedUser();
    if (!user) {
      return { success: false, error: "Unauthenticated" };
    }

    const [profileRes, fleetAccessRes, umaRes] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("role:roles(code), platform_role")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("fleet_user_access")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_module_access")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_code", "VEHICLE_DESK")
        .maybeSingle()
    ]);

    const globalRoleCode = (profileRes.data?.role as any)?.code || "";
    const platformRole = profileRes.data?.platform_role || "";
    const isSuperAdmin = ["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN_ROLE", "ADMIN"].includes(globalRoleCode.toUpperCase()) || platformRole === "SUPER_ADMIN";

    let fleetAccess: FleetUserAccessRecord | null = null;
    if (fleetAccessRes.data) {
      const row = fleetAccessRes.data;
      fleetAccess = {
        id: row.id,
        userId: row.user_id,
        fleetRole: row.fleet_role,
        scopeType: row.scope_type || "ALL_VEHICLES",
        assignedVehicleIds: row.assigned_vehicle_ids || [],
        canManageVehicles: !!row.can_manage_vehicles,
        canManageDrivers: !!row.can_manage_drivers,
        canDispatchTrips: !!row.can_dispatch_trips,
        canManageMaintenance: !!row.can_manage_maintenance,
        canViewReports: !!row.can_view_reports,
        canManageSettings: !!row.can_manage_settings,
        updatedAt: row.updated_at
      };
    } else if (umaRes.data) {
      const uma = umaRes.data;
      const isFleetAdmin = uma.role_code === "FLEET_ADMIN";
      const isFleetLead = uma.role_code === "FLEET_LEAD";
      const isViewer = uma.role_code === "VIEWER";
      const vehicleScope = uma.scope?.type === "vehicles" ? (uma.scope.vehicle_ids || []) : [];
      fleetAccess = {
        id: uma.id,
        userId: uma.user_id,
        fleetRole: isFleetAdmin ? "FLEET_ADMIN" : isFleetLead ? "FLEET_MANAGER" : isViewer ? "FLEET_VIEWER" : "TRAVELER",
        scopeType: vehicleScope.length > 0 ? "ASSIGNED_ONLY" : "ALL_VEHICLES",
        assignedVehicleIds: vehicleScope,
        canManageVehicles: isFleetAdmin || isFleetLead,
        canManageDrivers: isFleetAdmin || isFleetLead,
        canDispatchTrips: isFleetAdmin || isFleetLead,
        canManageMaintenance: isFleetAdmin || isFleetLead,
        canViewReports: isFleetAdmin || isFleetLead || isViewer,
        canManageSettings: isFleetAdmin,
        updatedAt: uma.granted_at
      };
    }

    return {
      success: true,
      fleetAccess,
      globalRoleCode,
      isSuperAdmin
    };
  } catch (err: any) {
    console.error("fetchMyFleetAccessAction error:", err);
    return { success: false, error: err.message || "Failed to fetch user fleet access" };
  }
}

/**
 * Fetch all Fleet RBAC Policies from Supabase Postgres
 */
export async function fetchFleetRbacPoliciesAction(): Promise<{
  success: boolean;
  policies?: FleetRbacPolicy[];
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("fleet_rbac_policies")
      .select("*")
      .order("module", { ascending: true });

    if (error) {
      console.error("fetchFleetRbacPoliciesAction error:", error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      const mapped: FleetRbacPolicy[] = data.map((row: any) => ({
        id: row.id,
        roleCode: row.role_code,
        module: row.module,
        canCreate: !!row.can_create,
        canRead: !!row.can_read,
        canUpdate: !!row.can_update,
        canDelete: !!row.can_delete,
        canApprove: !!row.can_approve,
        canExport: !!row.can_export,
        movementAccessScope: row.movement_access_scope || "ALL"
      }));
      return { success: true, policies: mapped };
    }

    // Seed defaults if empty
    const defaultRows = DEFAULT_FLEET_POLICIES.map(p => ({
      id: p.id,
      role_code: p.roleCode,
      module: p.module,
      can_create: !!p.canCreate,
      can_read: !!p.canRead,
      can_update: !!p.canUpdate,
      can_delete: !!p.canDelete,
      can_approve: !!p.canApprove,
      can_export: !!p.canExport,
      movement_access_scope: p.movementAccessScope || "ALL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    await supabaseAdmin
      .from("fleet_rbac_policies")
      .upsert(defaultRows, { onConflict: "role_code,module" });

    return { success: true, policies: DEFAULT_FLEET_POLICIES };
  } catch (err: any) {
    console.error("fetchFleetRbacPoliciesAction error:", err);
    return { success: false, error: err.message || "Failed to fetch fleet policies" };
  }
}

/**
 * Atomic save / update for a single Fleet RBAC Policy
 */
export async function saveSingleFleetRbacPolicyAction(policy: FleetRbacPolicy): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await verifyAdminOrFleetLead();

    const row = {
      id: policy.id || `pol-${policy.roleCode.toLowerCase()}-${policy.module.toLowerCase()}`,
      role_code: policy.roleCode,
      module: policy.module,
      can_create: !!policy.canCreate,
      can_read: !!policy.canRead,
      can_update: !!policy.canUpdate,
      can_delete: !!policy.canDelete,
      can_approve: !!policy.canApprove,
      can_export: !!policy.canExport,
      movement_access_scope: policy.movementAccessScope || "ALL",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin
      .from("fleet_rbac_policies")
      .upsert(row, { onConflict: "role_code,module" });

    if (error) {
      console.error("saveSingleFleetRbacPolicyAction error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("saveSingleFleetRbacPolicyAction error:", err);
    return { success: false, error: err.message || "Failed to save fleet policy" };
  }
}

/**
 * Bulk save / update Fleet RBAC Policies
 */
export async function saveFleetRbacPoliciesAction(policies: FleetRbacPolicy[]): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await verifyAdminOrFleetLead();

    if (!policies || policies.length === 0) {
      return { success: true };
    }

    const rows = policies.map(p => ({
      id: p.id || `pol-${p.roleCode.toLowerCase()}-${p.module.toLowerCase()}`,
      role_code: p.roleCode,
      module: p.module,
      can_create: !!p.canCreate,
      can_read: !!p.canRead,
      can_update: !!p.canUpdate,
      can_delete: !!p.canDelete,
      can_approve: !!p.canApprove,
      can_export: !!p.canExport,
      movement_access_scope: p.movementAccessScope || "ALL",
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from("fleet_rbac_policies")
      .upsert(rows, { onConflict: "role_code,module" });

    if (error) {
      console.error("saveFleetRbacPoliciesAction error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("saveFleetRbacPoliciesAction error:", err);
    return { success: false, error: err.message || "Failed to save fleet policies" };
  }
}

