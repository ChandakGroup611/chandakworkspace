import { can, RecordScopeConstraint } from "../module-access";

export const VEHICLE_DESK_MODULE = "VEHICLE_DESK" as const;

export const VEHICLE_ROLES = {
  FLEET_ADMIN: "FLEET_ADMIN",
  FLEET_LEAD: "FLEET_LEAD",
  REQUESTER: "REQUESTER", // STANDARD (D8)
  VIEWER: "VIEWER",
} as const;

export const VEHICLE_PERMISSIONS = {
  VEHICLES_VIEW: "VEHICLES_VIEW",
  VEHICLES_CREATE: "VEHICLES_CREATE",
  VEHICLES_UPDATE: "VEHICLES_UPDATE",
  VEHICLES_DOCUMENTS: "VEHICLES_DOCUMENTS",
  VEHICLES_DECOMMISSION: "VEHICLES_DECOMMISSION",
  MAINTENANCE_VIEW: "MAINTENANCE_VIEW",
  MAINTENANCE_MANAGE: "MAINTENANCE_MANAGE",
  PARTS_VENDORS_MANAGE: "PARTS_VENDORS_MANAGE",
  DRIVERS_MANAGE: "DRIVERS_MANAGE",
  TRIPS_VIEW: "TRIPS_VIEW",
  TRIPS_REQUEST: "TRIPS_REQUEST",
  TRIPS_DISPATCH: "TRIPS_DISPATCH",
  FLEET_SETTINGS: "FLEET_SETTINGS",
} as const;

export type VehicleRole = keyof typeof VEHICLE_ROLES;
export type VehiclePermission = keyof typeof VEHICLE_PERMISSIONS;

export async function canVehicle(
  userId: string,
  permission: VehiclePermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  return can(userId, VEHICLE_DESK_MODULE, permission, record);
}
