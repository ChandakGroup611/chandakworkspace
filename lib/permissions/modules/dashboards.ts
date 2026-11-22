import { can, RecordScopeConstraint } from "../module-access";

export const DASHBOARDS_MODULE = "DASHBOARDS" as const;

export const DASHBOARD_ROLES = {
  EDITOR: "EDITOR",
  STANDARD: "STANDARD",
  VIEWER: "STANDARD", // Alias for backward compatibility
} as const;

export const DASHBOARD_PERMISSIONS = {
  VIEW: "VIEW",
  DETAILS: "DETAILS",
  EXPORT: "EXPORT",
  SCHEDULE: "SCHEDULE",
  CHAT: "CHAT",
  ADMIN: "ADMIN",
} as const;

export type DashboardRole = keyof typeof DASHBOARD_ROLES;
export type DashboardPermission = keyof typeof DASHBOARD_PERMISSIONS;

export async function canDashboard(
  userId: string,
  permission: DashboardPermission,
  dashboardKey?: string
): Promise<boolean> {
  return can(userId, DASHBOARDS_MODULE, permission, { dashboard_key: dashboardKey });
}
