// ==============================================================================
// Fleet & Vehicle Master RBAC Store
// ==============================================================================

import {
  FleetRoleCode,
  FleetRoleDefinition,
  FleetUserAccessRecord,
  FleetRbacPolicy,
  FleetFunctionalModule,
  FleetMovementAccessScope
} from "@/types/vehicleRbacTypes";

const STORAGE_KEY = "CHANDAK_FLEET_RBAC_STORE_V1";

export const STANDARD_FLEET_ROLES: FleetRoleDefinition[] = [
  {
    id: "role-fleet-admin",
    code: "FLEET_ADMIN",
    label: "Fleet Administrator",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description: "Full administrative control across all vehicles, drivers, trips, maintenance logs, and fleet settings.",
    isSystem: true,
    movementAccessScope: "ALL",
    defaultPermissions: {
      canManageVehicles: true,
      canManageDrivers: true,
      canDispatchTrips: true,
      canManageMaintenance: true,
      canViewReports: true,
      canManageSettings: true
    }
  },
  {
    id: "role-fleet-dispatcher",
    code: "FLEET_DISPATCHER",
    label: "Transport Dispatcher / Supervisor",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    description: "Authority to dispatch trips, allocate vehicles & drivers, and manage daily transit schedules.",
    isSystem: true,
    movementAccessScope: "ALL",
    defaultPermissions: {
      canManageVehicles: true,
      canManageDrivers: true,
      canDispatchTrips: true,
      canManageMaintenance: false,
      canViewReports: true,
      canManageSettings: false
    }
  },
  {
    id: "role-fleet-workshop",
    code: "FLEET_WORKSHOP",
    label: "Workshop & Maintenance Head",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description: "Manages periodic services, repairs, parts inventory, job cards, and fitness/PUC compliance.",
    isSystem: true,
    movementAccessScope: "ALL",
    defaultPermissions: {
      canManageVehicles: false,
      canManageDrivers: false,
      canDispatchTrips: false,
      canManageMaintenance: true,
      canViewReports: true,
      canManageSettings: false
    }
  },
  {
    id: "role-driver",
    code: "DRIVER",
    label: "Chauffeur / Fleet Driver",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description: "Assigned trips, daily log sheets, vehicle condition checklist, and route updates.",
    isSystem: true,
    movementAccessScope: "ASSIGNED_ONLY",
    defaultPermissions: {
      canManageVehicles: false,
      canManageDrivers: false,
      canDispatchTrips: false,
      canManageMaintenance: false,
      canViewReports: false,
      canManageSettings: false
    }
  },
  {
    id: "role-traveler",
    code: "TRAVELER",
    label: "Corporate Traveler / Employee",
    badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    description: "Book transit requests, view assigned vehicle movements, and track personal trip history.",
    isSystem: true,
    movementAccessScope: "CREATED_ONLY",
    defaultPermissions: {
      canManageVehicles: false,
      canManageDrivers: false,
      canDispatchTrips: false,
      canManageMaintenance: false,
      canViewReports: false,
      canManageSettings: false
    }
  },
  {
    id: "role-fleet-viewer",
    code: "FLEET_VIEWER",
    label: "Executive Viewer",
    badgeColor: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    description: "Read-only access to fleet analytics, vehicle inventory, utilization KPIs, and compliance oversight.",
    isSystem: true,
    movementAccessScope: "ALL",
    defaultPermissions: {
      canManageVehicles: false,
      canManageDrivers: false,
      canDispatchTrips: false,
      canManageMaintenance: false,
      canViewReports: true,
      canManageSettings: false
    }
  }
];

export const DEFAULT_FLEET_POLICIES: FleetRbacPolicy[] = [
  // FLEET_ADMIN
  { id: "pol-fa-veh", roleCode: "FLEET_ADMIN", module: "VEHICLES", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-drv", roleCode: "FLEET_ADMIN", module: "DRIVERS", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-trp", roleCode: "FLEET_ADMIN", module: "TRIPS", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-mnt", roleCode: "FLEET_ADMIN", module: "MAINTENANCE", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-prt", roleCode: "FLEET_ADMIN", module: "PARTS", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-alt", roleCode: "FLEET_ADMIN", module: "ALERTS", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-rep", roleCode: "FLEET_ADMIN", module: "REPORTS", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fa-set", roleCode: "FLEET_ADMIN", module: "SETTINGS", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, movementAccessScope: "ALL" },

  // FLEET_DISPATCHER
  { id: "pol-fd-veh", roleCode: "FLEET_DISPATCHER", module: "VEHICLES", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fd-drv", roleCode: "FLEET_DISPATCHER", module: "DRIVERS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fd-trp", roleCode: "FLEET_DISPATCHER", module: "TRIPS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fd-mnt", roleCode: "FLEET_DISPATCHER", module: "MAINTENANCE", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  { id: "pol-fd-prt", roleCode: "FLEET_DISPATCHER", module: "PARTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  { id: "pol-fd-alt", roleCode: "FLEET_DISPATCHER", module: "ALERTS", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fd-rep", roleCode: "FLEET_DISPATCHER", module: "REPORTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fd-set", roleCode: "FLEET_DISPATCHER", module: "SETTINGS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },

  // FLEET_WORKSHOP
  { id: "pol-fw-veh", roleCode: "FLEET_WORKSHOP", module: "VEHICLES", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fw-drv", roleCode: "FLEET_WORKSHOP", module: "DRIVERS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  { id: "pol-fw-trp", roleCode: "FLEET_WORKSHOP", module: "TRIPS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  { id: "pol-fw-mnt", roleCode: "FLEET_WORKSHOP", module: "MAINTENANCE", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fw-prt", roleCode: "FLEET_WORKSHOP", module: "PARTS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fw-alt", roleCode: "FLEET_WORKSHOP", module: "ALERTS", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fw-rep", roleCode: "FLEET_WORKSHOP", module: "REPORTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fw-set", roleCode: "FLEET_WORKSHOP", module: "SETTINGS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },

  // DRIVER
  { id: "pol-dr-veh", roleCode: "DRIVER", module: "VEHICLES", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ASSIGNED_ONLY" },
  { id: "pol-dr-drv", roleCode: "DRIVER", module: "DRIVERS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ASSIGNED_ONLY" },
  { id: "pol-dr-trp", roleCode: "DRIVER", module: "TRIPS", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ASSIGNED_ONLY" },
  { id: "pol-dr-mnt", roleCode: "DRIVER", module: "MAINTENANCE", canCreate: true, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ASSIGNED_ONLY" },
  { id: "pol-dr-prt", roleCode: "DRIVER", module: "PARTS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-dr-alt", roleCode: "DRIVER", module: "ALERTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ASSIGNED_ONLY" },
  { id: "pol-dr-rep", roleCode: "DRIVER", module: "REPORTS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-dr-set", roleCode: "DRIVER", module: "SETTINGS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },

  // TRAVELER
  { id: "pol-tr-veh", roleCode: "TRAVELER", module: "VEHICLES", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ASSIGNED_ONLY" },
  { id: "pol-tr-drv", roleCode: "TRAVELER", module: "DRIVERS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-tr-trp", roleCode: "TRAVELER", module: "TRIPS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "CREATED_ONLY" },
  { id: "pol-tr-mnt", roleCode: "TRAVELER", module: "MAINTENANCE", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-tr-prt", roleCode: "TRAVELER", module: "PARTS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-tr-alt", roleCode: "TRAVELER", module: "ALERTS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-tr-rep", roleCode: "TRAVELER", module: "REPORTS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },
  { id: "pol-tr-set", roleCode: "TRAVELER", module: "SETTINGS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" },

  // FLEET_VIEWER
  { id: "pol-fv-veh", roleCode: "FLEET_VIEWER", module: "VEHICLES", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-drv", roleCode: "FLEET_VIEWER", module: "DRIVERS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-trp", roleCode: "FLEET_VIEWER", module: "TRIPS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-mnt", roleCode: "FLEET_VIEWER", module: "MAINTENANCE", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-prt", roleCode: "FLEET_VIEWER", module: "PARTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-alt", roleCode: "FLEET_VIEWER", module: "ALERTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-rep", roleCode: "FLEET_VIEWER", module: "REPORTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  { id: "pol-fv-set", roleCode: "FLEET_VIEWER", module: "SETTINGS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" }
];

export interface FleetMasterStoreState {
  customRoles: FleetRoleDefinition[];
  userAccessList: FleetUserAccessRecord[];
  rbacPolicies: FleetRbacPolicy[];
}

class FleetMasterStoreClass {
  private state: FleetMasterStoreState = {
    customRoles: [],
    userAccessList: [],
    rbacPolicies: [...DEFAULT_FLEET_POLICIES]
  };

  private listeners: Set<() => void> = new Set();
  private isLoaded = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = {
          customRoles: parsed.customRoles || [],
          userAccessList: parsed.userAccessList || [],
          rbacPolicies: parsed.rbacPolicies?.length ? parsed.rbacPolicies : [...DEFAULT_FLEET_POLICIES]
        };
      }
    } catch (e) {
      console.warn("[FleetMasterStore] Failed to load from local storage:", e);
    }
    this.isLoaded = true;
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("[FleetMasterStore] Failed to save to local storage:", e);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): FleetMasterStoreState {
    return this.state;
  }

  public getRoles(): FleetRoleDefinition[] {
    return [...STANDARD_FLEET_ROLES, ...this.state.customRoles];
  }

  public getRole(code: string): FleetRoleDefinition | undefined {
    return this.getRoles().find(r => r.code === code);
  }

  public saveRole(role: FleetRoleDefinition) {
    const isStandard = STANDARD_FLEET_ROLES.some(r => r.code === role.code);
    if (isStandard) {
      // Update custom override in storage if needed
      return;
    }
    const idx = this.state.customRoles.findIndex(r => r.code === role.code);
    if (idx >= 0) {
      this.state.customRoles[idx] = role;
    } else {
      this.state.customRoles.push(role);
    }
    this.saveToStorage();
  }

  public deleteRole(roleCode: string) {
    this.state.customRoles = this.state.customRoles.filter(r => r.code !== roleCode);
    this.state.rbacPolicies = this.state.rbacPolicies.filter(p => p.roleCode !== roleCode);
    this.saveToStorage();
  }

  public getUserAccessList(): FleetUserAccessRecord[] {
    return this.state.userAccessList;
  }

  public getUserAccess(userId: string): FleetUserAccessRecord | undefined {
    return this.state.userAccessList.find(a => a.userId === userId);
  }

  public saveUserAccess(record: FleetUserAccessRecord) {
    const idx = this.state.userAccessList.findIndex(a => a.userId === record.userId);
    if (idx >= 0) {
      this.state.userAccessList[idx] = record;
    } else {
      this.state.userAccessList.push(record);
    }
    this.saveToStorage();
  }

  public deleteUserAccess(userId: string) {
    this.state.userAccessList = this.state.userAccessList.filter(a => a.userId !== userId);
    this.saveToStorage();
  }

  public getRbacPolicies(): FleetRbacPolicy[] {
    return this.state.rbacPolicies;
  }

  public saveRbacPolicies(policies: FleetRbacPolicy[]) {
    this.state.rbacPolicies = policies;
    this.saveToStorage();
  }
}

export const FleetMasterStore = new FleetMasterStoreClass();
