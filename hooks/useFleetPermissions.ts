"use client";

import { useState, useEffect, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { FleetMasterStore } from "@/components/vehicle/services/fleetMasterStore";
import { FleetFunctionalModule, FleetRoleCode, FleetMovementAccessScope } from "@/types/vehicleRbacTypes";

export function useFleetPermissions() {
  const { userId, roleCode: globalRoleCode, hasPermission, loading: authLoading } = usePermissions();
  const [storeState, setStoreState] = useState(() => FleetMasterStore.getState());

  useEffect(() => {
    const unsubscribe = FleetMasterStore.subscribe(() => {
      setStoreState({ ...FleetMasterStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  const isGlobalSuperAdmin = useMemo(() => {
    const code = (globalRoleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN_ROLE", "ROLE_ADMIN", "ADMIN"].includes(code) || hasPermission("SUPER_ADMIN");
  }, [globalRoleCode, hasPermission]);

  const userAccessRecord = useMemo(() => {
    if (!userId) return null;
    return storeState.userAccessList.find(a => a.userId === userId) || null;
  }, [storeState.userAccessList, userId]);

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

  const canReadModule = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): boolean => {
      if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") {
        return false;
      }
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      if (pol) {
        return pol.canRead;
      }
      return effectiveFleetRole === "FLEET_ADMIN";
    };
  }, [policies, effectiveFleetRole, userAccessRecord]);

  const canCreateModule = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): boolean => {
      if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      if (pol) return pol.canCreate;
      return effectiveFleetRole === "FLEET_ADMIN";
    };
  }, [policies, effectiveFleetRole, userAccessRecord]);

  const canUpdateModule = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): boolean => {
      if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      if (pol) return pol.canUpdate;
      return effectiveFleetRole === "FLEET_ADMIN";
    };
  }, [policies, effectiveFleetRole, userAccessRecord]);

  const canDeleteModule = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): boolean => {
      if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      if (pol) return pol.canDelete;
      return effectiveFleetRole === "FLEET_ADMIN";
    };
  }, [policies, effectiveFleetRole, userAccessRecord]);

  const canApproveModule = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): boolean => {
      if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      if (pol) return pol.canApprove;
      return effectiveFleetRole === "FLEET_ADMIN";
    };
  }, [policies, effectiveFleetRole, userAccessRecord]);

  const canExportModule = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): boolean => {
      if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      if (pol) return pol.canExport;
      return effectiveFleetRole === "FLEET_ADMIN";
    };
  }, [policies, effectiveFleetRole, userAccessRecord]);

  const getMovementScope = useMemo(() => {
    return (moduleCode: FleetFunctionalModule): FleetMovementAccessScope => {
      const pol = policies.find(p => p.roleCode === effectiveFleetRole && (p.module === moduleCode || p.module === "ALL"));
      return pol?.movementAccessScope || (effectiveFleetRole === "FLEET_ADMIN" ? "ALL" : "ASSIGNED_ONLY");
    };
  }, [policies, effectiveFleetRole]);

  const hasAnyFleetAccess = useMemo(() => {
    if (userAccessRecord && (userAccessRecord.fleetRole as any) === "NONE") return false;
    if (effectiveFleetRole === "FLEET_ADMIN") return true;
    return policies.some(p => p.roleCode === effectiveFleetRole && p.canRead);
  }, [userAccessRecord, effectiveFleetRole, policies]);

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
    loading: authLoading
  };
}
