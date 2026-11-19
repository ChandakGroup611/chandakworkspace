"use client";

import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { ModuleCode } from "@/lib/permissions/module-access";

export interface ModuleAccessHookResult {
  hasAccess: boolean;
  roleCode: string | null;
  roleName: string | null;
  permissions: string[];
  scope: any;
  isSuperAdmin: boolean;
  isLoading: boolean;
  can: (action: string) => boolean;
}

/**
 * Enterprise client-side hook for module-scoped RBAC authorization.
 * Conforms to Master Programme WP7.4 & docs/access/MODULE_ROLES.md.
 */
export function useModuleAccess(
  moduleCode: ModuleCode,
  dashboardKey?: string
): ModuleAccessHookResult {
  const { roleCode: globalRoleCode, permissions: globalPerms, loading, tickedDashboards } = usePermissions();

  const isSuperAdmin = useMemo(() => {
    const code = (globalRoleCode || "").toUpperCase();
    return code === "SUPER_ADMIN" || code === "ROLE_SUPER_ADMIN" || (globalPerms || []).includes("SUPER_ADMIN");
  }, [globalRoleCode, globalPerms]);

  const hasAccess = useMemo(() => {
    if (isSuperAdmin) return true;
    if (moduleCode === "DASHBOARDS") {
      if (dashboardKey) {
        return (tickedDashboards || []).includes(dashboardKey);
      }
      return (tickedDashboards || []).length > 0;
    }
    const prefix = moduleCode === "TASK_WORKFLOW" ? "TASKS_"
      : moduleCode === "VEHICLE_DESK" ? "VEHICLES_"
      : moduleCode === "DESIGN_TRACKING" ? "DESIGN_"
      : moduleCode === "CHANDAK_MEET" ? "MEETINGS_"
      : moduleCode === "ORG_BUDGET" ? "BUDGET_"
      : moduleCode;
    return (globalPerms || []).some(p => p.startsWith(prefix) || p.startsWith(`${moduleCode}_`));
  }, [isSuperAdmin, moduleCode, dashboardKey, tickedDashboards, globalPerms]);

  const canAction = useMemo(() => {
    return (action: string) => {
      if (isSuperAdmin) return true;
      if (!hasAccess) return false;
      return (globalPerms || []).includes(action) || (globalPerms || []).includes(`${moduleCode}_${action}`);
    };
  }, [isSuperAdmin, hasAccess, globalPerms, moduleCode]);

  return {
    hasAccess,
    roleCode: isSuperAdmin ? "SUPER_ADMIN" : globalRoleCode,
    roleName: isSuperAdmin ? "Super Administrator" : globalRoleCode,
    permissions: isSuperAdmin ? ["*"] : (globalPerms || []),
    scope: { type: "all" },
    isSuperAdmin,
    isLoading: loading,
    can: canAction,
  };
}
