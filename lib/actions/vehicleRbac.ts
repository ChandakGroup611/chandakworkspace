"use server";

import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { 
  FleetWorkspaceUser, 
  FleetUserAccessRecord, 
  FleetRbacPolicy 
} from "@/types/vehicleRbacTypes";

async function verifyAdminOrFleetLead() {
  const { user } = await getCachedUser();
  if (!user) throw new Error("Unauthenticated request");

  const { data: profile } = await supabaseAdmin
    .from("user_master")
    .select("role:roles(code)")
    .eq("id", user.id)
    .single();

  const roleCode = (profile?.role as any)?.code || "";
  const isAdmin = ["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN_ROLE", "ADMIN"].includes(roleCode);

  if (isAdmin) return { user, isAdmin: true };

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
      fleetAccessRes
    ] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, user_code, profile_photo, is_active, role_id, department_id, designation_id")
        .eq("is_deleted", false)
        .order("full_name", { ascending: true }),
      supabaseAdmin.from("departments").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("designations").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("roles").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("modules_master").select("id, code").eq("code", "VEHICLE_DESK").maybeSingle(),
      supabaseAdmin.from("user_modules").select("user_id, module_id"),
      supabaseAdmin.from("fleet_user_access").select("*")
    ]);

    const usersData = usersRes.data || [];
    const deptMap = new Map((deptRes.data || []).map(d => [d.id, d.name]));
    const desigMap = new Map((desigRes.data || []).map(d => [d.id, d.name]));
    const roleMap = new Map((rolesRes.data || []).map(r => [r.id, { name: r.name, code: r.code }]));

    const vehicleModuleId = modulesRes.data?.id;
    const usersWithModuleAccess = new Set(
      (userModulesRes.data || [])
        .filter(um => vehicleModuleId && um.module_id === vehicleModuleId)
        .map(um => um.user_id)
    );

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

    const workspaceUsers: FleetWorkspaceUser[] = usersData.map((u: any) => {
      const globalRole = roleMap.get(u.role_id);
      const isGlobalAdmin = globalRole?.code === "SUPER_ADMIN" || globalRole?.code === "ROLE_ADMIN";
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
    await verifyAdminOrFleetLead();

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
    } else {
      const { error } = await supabaseAdmin
        .from("user_modules")
        .delete()
        .eq("user_id", userId)
        .eq("module_id", moduleData.id);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("toggleUserFleetModuleAccessAction error:", err);
    return { success: false, error: err.message || "Failed to toggle module access" };
  }
}
