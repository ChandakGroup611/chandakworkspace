// ==============================================================================
// Types for Enterprise Fleet & Vehicle RBAC Governance
// ==============================================================================

export type FleetRoleCode = 
  | "FLEET_ADMIN"
  | "FLEET_DISPATCHER"
  | "FLEET_WORKSHOP"
  | "DRIVER"
  | "TRAVELER"
  | "FLEET_VIEWER"
  | string;

export type FleetFunctionalModule = 
  | "VEHICLES"
  | "REGISTER"
  | "DRIVERS"
  | "TRIPS"
  | "TRAVELERS"
  | "MAINTENANCE"
  | "PARTS"
  | "VENDORS"
  | "ALERTS"
  | "REPORTS"
  | "MY_GARAGE"
  | "LEARNING"
  | "RBAC"
  | "SETTINGS";

export type FleetMovementAccessScope = 
  | "ALL"
  | "ASSIGNED_ONLY"
  | "CREATED_ONLY"
  | "BRANCH_ONLY"
  | "DEPARTMENT_ONLY"
  | "NONE";

export type FleetScopeType = 
  | "ALL_VEHICLES"
  | "ASSIGNED_ONLY"
  | "BRANCH_SCOPED";

export interface FleetRoleDefinition {
  id: string;
  code: FleetRoleCode;
  label: string;
  badgeColor: string;
  description: string;
  isSystem: boolean;
  movementAccessScope: FleetMovementAccessScope;
  defaultPermissions: {
    canManageVehicles: boolean;
    canManageDrivers: boolean;
    canDispatchTrips: boolean;
    canManageMaintenance: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
}

export interface FleetUserAccessRecord {
  id?: string;
  userId: string;
  fleetRole: FleetRoleCode;
  scopeType: FleetScopeType;
  assignedVehicleIds: string[];
  canManageVehicles: boolean;
  canManageDrivers: boolean;
  canDispatchTrips: boolean;
  canManageMaintenance: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FleetWorkspaceUser {
  id: string;
  fullName: string;
  email: string;
  userCode?: string;
  profilePhoto?: string;
  isActive: boolean;
  departmentName?: string;
  designationName?: string;
  globalRoleCode?: string;
  hasModuleAccess: boolean;
  fleetAccess?: FleetUserAccessRecord;
}

export interface FleetRbacPolicy {
  id: string;
  roleCode: FleetRoleCode;
  module: FleetFunctionalModule | "ALL";
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  movementAccessScope: FleetMovementAccessScope;
}
