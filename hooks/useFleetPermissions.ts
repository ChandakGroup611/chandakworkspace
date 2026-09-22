"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { FleetMasterStore } from "@/components/vehicle/services/fleetMasterStore";
import { fetchMyFleetAccessAction } from "@/lib/actions/vehicleRbac";
import { FleetFunctionalModule, FleetRoleCode, FleetMovementAccessScope, FleetUserAccessRecord } from "@/types/vehicleRbacTypes";

export function useFleetPermissions() {
  const { userId, roleCode: globalRoleCode, hasPermission, loading: authLoading } = usePermissions();
  const [storeState, setStoreState] = useState(() => FleetMasterStore.getState());
  const [serverUserAccess, setServerUserAccess] = useState<FleetUserAccessRecord | null>(null);
  const [serverLoaded, setServerLoaded] = useState(false);

  // Sync with store
  useEffect(() => {
    const unsubscribe = FleetMasterStore.subscribe(() => {
      setStoreState({ ...FleetMasterStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  // Fetch actual user access record from server
  useEffect(() => {
    let isMounted = true;
    async function loadMyAccess() {
      try {
        const res = await fetchMyFleetAccessAction();
        if (isMounted && res.success && res.fleetAccess) {
          setServerUserAccess(res.fleetAccess);
          FleetMasterStore.saveUserAccess(res.fleetAccess);
        }
      } catch (err) {
        console.warn("[useFleetPermissions] fetchMyFleetAccess error:", err);
      } finally {
        if (isMounted) setServerLoaded(true);
      }
    }

    if (userId) {
      loadMyAccess();
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const isGlobalSuperAdmin = useMemo(() => {
    const code = (globalRoleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN_ROLE", "ROLE_ADMIN", "ADMIN"].includes(code) || hasPermission("SUPER_ADMIN");
  }, [globalRoleCode, hasPermission]);

  const userAccessRecord = useMemo(() => {
    if (serverUserAccess) return serverUserAccess;
    if (!userId) return null;
    return storeState.userAccessList.find(a => a.userId === userId) || null;
  }, [serverUserAccess, storeState.userAccessList, userId]);

  const effectiveFleetRole = useMemo<FleetRoleCode>(() => {
    if (userAccessRecord?.fleetRole) {
      return userAccessRecord.fleetRole;
    }
    if (isGlobalSuperAdmin) {
      return "FLEET_ADMIN";
    }
    return "TRAVELER";
  }, [userAccessRecord, isGlobalSuperAdmin]);

  const policies = storeState.rbacPolicies;

  const canReadModule = useCallback((moduleCode: FleetFunctionalModule): boolean => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin) return true;

    // Check specific module IAM permissions
    if (moduleCode === "VEHICLES" && (hasPermission("VEHICLES_VIEW") || hasPermission("VEHICLES_MANAGE") || userAccessRecord?.canManageVehicles)) return true;
    if (moduleCode === "REGISTER" && (hasPermission("VEHICLES_CREATE") || hasPermission("VEHICLES_MANAGE") || userAccessRecord?.canManageVehicles)) return true;
    if (moduleCode === "DRIVERS" && (hasPermission("DRIVERS_VIEW") || hasPermission("DRIVERS_MANAGE") || userAccessRecord?.canManageDrivers)) return true;
    if (moduleCode === "TRIPS" && (hasPermission("TRIPS_VIEW") || hasPermission("TRIPS_MANAGE") || userAccessRecord?.canDispatchTrips)) return true;
    if (moduleCode === "TRAVELERS" && (hasPermission("TRIPS_VIEW") || hasPermission("TRIPS_MANAGE") || userAccessRecord?.canDispatchTrips)) return true;
    if (moduleCode === "MAINTENANCE" && (hasPermission("FLEET_MAINTENANCE_VIEW") || hasPermission("FLEET_MAINTENANCE_MANAGE") || userAccessRecord?.canManageMaintenance)) return true;
    if (moduleCode === "REPORTS" && (hasPermission("FLEET_REPORTS_VIEW") || hasPermission("VEHICLES_MANAGE") || userAccessRecord?.canViewReports)) return true;
    if (moduleCode === "RBAC" && (hasPermission("USERS_VIEW") || effectiveFleetRole === "FLEET_ADMIN")) return true;
    if (moduleCode === "SETTINGS" && (hasPermission("SETTINGS_MANAGE") || userAccessRecord?.canManageSettings || effectiveFleetRole === "FLEET_ADMIN")) return true;

    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    if (pol) {
      return pol.canRead;
    }
    return effectiveFleetRole === "FLEET_ADMIN";
  }, [policies, effectiveFleetRole, userAccessRecord, isGlobalSuperAdmin, hasPermission]);

  const canCreateModule = useCallback((moduleCode: FleetFunctionalModule): boolean => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin) return true;

    if (moduleCode === "VEHICLES" && (hasPermission("VEHICLES_CREATE") || hasPermission("VEHICLES_MANAGE") || userAccessRecord?.canManageVehicles)) return true;
    if (moduleCode === "REGISTER" && (hasPermission("VEHICLES_CREATE") || hasPermission("VEHICLES_MANAGE") || userAccessRecord?.canManageVehicles)) return true;
    if (moduleCode === "DRIVERS" && (hasPermission("DRIVERS_CREATE") || hasPermission("DRIVERS_MANAGE") || userAccessRecord?.canManageDrivers)) return true;
    if (moduleCode === "TRIPS" && (hasPermission("TRIPS_CREATE") || hasPermission("TRIPS_DISPATCH") || hasPermission("TRIPS_MANAGE") || userAccessRecord?.canDispatchTrips)) return true;
    if (moduleCode === "TRAVELERS" && (hasPermission("TRIPS_CREATE") || hasPermission("TRIPS_DISPATCH") || userAccessRecord?.canDispatchTrips)) return true;
    if (moduleCode === "MAINTENANCE" && (hasPermission("FLEET_MAINTENANCE_CREATE") || hasPermission("FLEET_MAINTENANCE_MANAGE") || userAccessRecord?.canManageMaintenance)) return true;

    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    if (pol) return pol.canCreate;
    return effectiveFleetRole === "FLEET_ADMIN";
  }, [policies, effectiveFleetRole, userAccessRecord, isGlobalSuperAdmin, hasPermission]);

  const canUpdateModule = useCallback((moduleCode: FleetFunctionalModule): boolean => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin) return true;

    if (moduleCode === "VEHICLES" && (hasPermission("VEHICLES_UPDATE") || hasPermission("VEHICLES_EDIT") || hasPermission("VEHICLES_MANAGE") || userAccessRecord?.canManageVehicles)) return true;
    if (moduleCode === "DRIVERS" && (hasPermission("DRIVERS_UPDATE") || hasPermission("DRIVERS_EDIT") || hasPermission("DRIVERS_MANAGE") || userAccessRecord?.canManageDrivers)) return true;
    if (moduleCode === "TRIPS" && (hasPermission("TRIPS_UPDATE") || hasPermission("TRIPS_DISPATCH") || hasPermission("TRIPS_MANAGE") || userAccessRecord?.canDispatchTrips)) return true;
    if (moduleCode === "MAINTENANCE" && (hasPermission("FLEET_MAINTENANCE_UPDATE") || hasPermission("FLEET_MAINTENANCE_MANAGE") || userAccessRecord?.canManageMaintenance)) return true;

    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    if (pol) return pol.canUpdate;
    return effectiveFleetRole === "FLEET_ADMIN";
  }, [policies, effectiveFleetRole, userAccessRecord, isGlobalSuperAdmin, hasPermission]);

  const canDeleteModule = useCallback((moduleCode: FleetFunctionalModule): boolean => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin) return true;

    if (moduleCode === "VEHICLES" && (hasPermission("VEHICLES_DELETE") || hasPermission("VEHICLES_MANAGE"))) return true;
    if (moduleCode === "DRIVERS" && (hasPermission("DRIVERS_DELETE") || hasPermission("DRIVERS_MANAGE"))) return true;
    if (moduleCode === "TRIPS" && (hasPermission("TRIPS_DELETE") || hasPermission("TRIPS_MANAGE"))) return true;
    if (moduleCode === "MAINTENANCE" && (hasPermission("FLEET_MAINTENANCE_DELETE") || hasPermission("FLEET_MAINTENANCE_MANAGE"))) return true;

    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    if (pol) return pol.canDelete;
    return effectiveFleetRole === "FLEET_ADMIN";
  }, [policies, effectiveFleetRole, userAccessRecord, isGlobalSuperAdmin, hasPermission]);

  const canApproveModule = useCallback((moduleCode: FleetFunctionalModule): boolean => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin) return true;

    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    if (pol) return pol.canApprove;
    return effectiveFleetRole === "FLEET_ADMIN";
  }, [policies, effectiveFleetRole, userAccessRecord, isGlobalSuperAdmin]);

  const canExportModule = useCallback((moduleCode: FleetFunctionalModule): boolean => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin) return true;

    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    if (pol) return pol.canExport;
    return effectiveFleetRole === "FLEET_ADMIN";
  }, [policies, effectiveFleetRole, userAccessRecord, isGlobalSuperAdmin]);

  const getMovementScope = useCallback((moduleCode: FleetFunctionalModule): FleetMovementAccessScope => {
    const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
    return pol?.movementAccessScope || (effectiveFleetRole === "FLEET_ADMIN" ? "ALL" : "ASSIGNED_ONLY");
  }, [policies, effectiveFleetRole]);

  const hasAnyFleetAccess = useMemo(() => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (isGlobalSuperAdmin || effectiveFleetRole === "FLEET_ADMIN") return true;
    return policies.some(p => p.roleCode === effectiveFleetRole && p.canRead);
  }, [userAccessRecord, isGlobalSuperAdmin, effectiveFleetRole, policies]);

  return {
    userId,
    globalRoleCode,
    effectiveFleetRole,
    userAccessRecord,
    isGlobalSuperAdmin,
    hasAnyFleetAccess,
    canReadModule,
    canCreateModule,
    canUpdateModule,
    canDeleteModule,
    canApproveModule,
    canExportModule,
    getMovementScope,
    loading: authLoading || !serverLoaded
  };
}
