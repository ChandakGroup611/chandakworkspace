import { can, RecordScopeConstraint } from "../module-access";

export const DESIGN_TRACKING_MODULE = "DESIGN_TRACKING" as const;

export const DESIGN_ROLES = {
  DESIGN_ADMIN: "DESIGN_ADMIN",
  DESIGN_LEAD: "DESIGN_LEAD",
  STANDARD: "STANDARD",
  CONTRIBUTOR: "STANDARD", // Alias for backward compatibility
  VIEWER: "VIEWER",
} as const;

export const DESIGN_PERMISSIONS = {
  DESIGN_PROJECTS_VIEW: "DESIGN_PROJECTS_VIEW",
  DESIGN_PROJECTS_MANAGE: "DESIGN_PROJECTS_MANAGE",
  DESIGN_MASTERS_MANAGE: "DESIGN_MASTERS_MANAGE",
  MATRIX_EDIT: "MATRIX_EDIT",
  DRAWINGS_VIEW: "DRAWINGS_VIEW",
  DRAWINGS_UPLOAD: "DRAWINGS_UPLOAD",
  DRAWINGS_APPROVE_GFC: "DRAWINGS_APPROVE_GFC",
  TRANSMITTALS_CREATE: "TRANSMITTALS_CREATE",
  RFIS_VIEW: "RFIS_VIEW",
  RFIS_RAISE: "RFIS_RAISE",
  RFIS_RESPOND: "RFIS_RESPOND",
  DESIGN_SETTINGS: "DESIGN_SETTINGS",
} as const;

export type DesignRole = keyof typeof DESIGN_ROLES;
export type DesignPermission = keyof typeof DESIGN_PERMISSIONS;

export async function canDesign(
  userId: string,
  permission: DesignPermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  return can(userId, DESIGN_TRACKING_MODULE, permission, record);
}
