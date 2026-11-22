import type { ModuleManifest } from "../types";

/**
 * Vehicle Desk — Module Manifest
 * Governance: Master Architecture Blueprint v2.0
 */
export const vehicleManifest: ModuleManifest = {
  code: "VEHICLE_DESK",
  name: "Vehicle Management Desk",
  description: "Fleet roster, vehicle requisition, drivers, trips, and maintenance logistics",
  icon: "Car",
  routePath: "/vehicle",
  displayOrder: 2,
  status: "ACTIVE",
  rbacAdminRoute: "/vehicle/settings/rbac",
  scopeConfig: {
    supportedTypes: ["all", "vehicles"],
    defaultType: "all",
    entityLabel: "Vehicle",
  },
  roles: [
    {
      code: "STANDARD",
      name: "Vehicle Requester",
      description: "Standard employee who can view fleet status and raise trip requests.",
      isSystem: true,
    },
    {
      code: "FLEET_LEAD",
      name: "Fleet Dispatcher / Lead",
      description: "Manages trips dispatch, drivers assignment, and daily maintenance logs.",
      isSystem: false,
    },
    {
      code: "FLEET_ADMIN",
      name: "Fleet Administrator",
      description: "Full control over vehicle assets, documents, vendors, and decommission.",
      isSystem: false,
    },
    {
      code: "VIEWER",
      name: "Fleet Viewer",
      description: "Read-only access to view vehicles and trip schedules.",
      isSystem: false,
    },
  ],
  permissions: [
    { code: "VEHICLES_VIEW", name: "View Vehicles", category: "VIEW", description: "View fleet roster and vehicle status" },
    { code: "VEHICLES_CREATE", name: "Create Vehicles", category: "CREATE", description: "Add new vehicle assets to the fleet" },
    { code: "VEHICLES_UPDATE", name: "Update Vehicles", category: "EDIT", description: "Update vehicle specs, odometer, and assignments" },
    { code: "VEHICLES_DOCUMENTS", name: "Manage Documents", category: "EDIT", description: "Upload and update insurance, PUC, and RC documents" },
    { code: "VEHICLES_DECOMMISSION", name: "Decommission Vehicles", category: "DELETE", description: "Decommission or retire fleet vehicles", isSensitive: true },
    { code: "MAINTENANCE_VIEW", name: "View Maintenance", category: "VIEW", description: "View service history and maintenance logs" },
    { code: "MAINTENANCE_MANAGE", name: "Manage Maintenance", category: "EDIT", description: "Schedule services, log costs, and approve work orders" },
    { code: "PARTS_VENDORS_MANAGE", name: "Manage Parts & Vendors", category: "ADMINISTER", description: "Configure parts inventory, service centers, and vendors" },
    { code: "DRIVERS_MANAGE", name: "Manage Drivers", category: "ADMINISTER", description: "Assign drivers, manage licenses, and roster" },
    { code: "TRIPS_VIEW", name: "View Trips", category: "VIEW", description: "View trip schedules, itineraries, and logs" },
    { code: "TRIPS_REQUEST", name: "Request Trips", category: "CREATE", description: "Raise new trip requisitions" },
    { code: "TRIPS_DISPATCH", name: "Dispatch Trips", category: "APPROVE", description: "Approve, assign vehicles/drivers, and dispatch trips" },
    { code: "FLEET_SETTINGS", name: "Manage Fleet Settings", category: "CONFIGURE", description: "Configure vehicle policies, fuel logs, and module RBAC", isSensitive: true },
  ],
  defaultPolicies: {
    STANDARD: [
      "VEHICLES_VIEW",
      "TRIPS_VIEW",
      "TRIPS_REQUEST",
    ],
    VIEWER: [
      "VEHICLES_VIEW",
      "TRIPS_VIEW",
    ],
    FLEET_LEAD: [
      "VEHICLES_VIEW",
      "MAINTENANCE_VIEW",
      "MAINTENANCE_MANAGE",
      "DRIVERS_MANAGE",
      "TRIPS_VIEW",
      "TRIPS_REQUEST",
      "TRIPS_DISPATCH",
    ],
    FLEET_ADMIN: [
      "VEHICLES_VIEW",
      "VEHICLES_CREATE",
      "VEHICLES_UPDATE",
      "VEHICLES_DOCUMENTS",
      "VEHICLES_DECOMMISSION",
      "MAINTENANCE_VIEW",
      "MAINTENANCE_MANAGE",
      "PARTS_VENDORS_MANAGE",
      "DRIVERS_MANAGE",
      "TRIPS_VIEW",
      "TRIPS_REQUEST",
      "TRIPS_DISPATCH",
      "FLEET_SETTINGS",
    ],
  },
};

export default vehicleManifest;
