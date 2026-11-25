"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Users, 
  Car, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  FileText, 
  Check, 
  Layers, 
  Globe, 
  Sparkles, 
  AlertCircle,
  Send,
  HelpCircle,
  Settings,
  X,
  UserCheck,
  Briefcase,
  Sliders,
  ChevronRight,
  Copy,
  Download,
  Shield,
  Plus,
  PlusCircle,
  Play,
  Target,
  Wrench,
  Package,
  Calendar,
  LineChart,
  LifeBuoy,
  BookOpen,
  Tag
} from "lucide-react";
import { 
  FleetMasterStore, 
  FleetMasterStoreState,
  STANDARD_FLEET_ROLES,
  DEFAULT_FLEET_POLICIES
} from "./services/fleetMasterStore";
import { 
  FleetWorkspaceUser, 
  FleetUserAccessRecord, 
  FleetRoleCode, 
  FleetRoleDefinition,
  FleetMovementAccessScope,
  FleetScopeType, 
  FleetRbacPolicy,
  FleetFunctionalModule
} from "@/types/vehicleRbacTypes";
import { 
  fetchFleetWorkspaceUsersAction, 
  saveFleetUserAccessAction, 
  deleteFleetUserAccessAction,
  toggleUserFleetModuleAccessAction,
  fetchFleetRbacPoliciesAction,
  saveSingleFleetRbacPolicyAction,
  saveFleetRbacPoliciesAction
} from "@/lib/actions/vehicleRbac";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import ChandakLoader from "@/components/ui/ChandakLoader";

const ROLE_BADGE_COLORS = [
  { id: "amber", label: "Amber", class: "bg-warning-soft text-warning-text border-warning/30" },
  { id: "indigo", label: "Indigo", class: "bg-surface text-theme-icon border-border" },
  { id: "blue", label: "Sky Blue", class: "bg-info-soft text-info-text border-info/30" },
  { id: "emerald", label: "Emerald", class: "bg-success-soft text-success-text border-success/30" },
  { id: "cyan", label: "Cyan", class: "bg-surface text-theme-icon border-border" },
  { id: "orange", label: "Orange", class: "bg-warning-soft text-warning-text border-warning/30" },
  { id: "purple", label: "Purple", class: "bg-surface text-theme-icon border-border" },
  { id: "slate", label: "Slate", class: "bg-sunken text-muted border-border" },
  { id: "rose", label: "Rose", class: "bg-danger-soft text-danger-text border-danger/30" }
];

const MOVEMENT_SCOPE_OPTIONS: Array<{ value: FleetMovementAccessScope; label: string }> = [
  { value: "ALL", label: "All movements (global)" },
  { value: "ASSIGNED_ONLY", label: "Assigned vehicle / chauffeur" },
  { value: "CREATED_ONLY", label: "Booked by me only" },
  { value: "BRANCH_ONLY", label: "Branch / depot scoped" },
  { value: "DEPARTMENT_ONLY", label: "Department Scoped" },
  { value: "NONE", label: "No movement access" }
];

const FLEET_MODULE_LIST: Array<{ code: FleetFunctionalModule; label: string; icon: any }> = [
  { code: "VEHICLES", label: "Vehicle inventory", icon: Car },
  { code: "REGISTER", label: "Register vehicle", icon: PlusCircle },
  { code: "DRIVERS", label: "Chauffeur & driver roster", icon: Users },
  { code: "TRIPS", label: "Daily trip movements & dispatch", icon: Calendar },
  { code: "TRAVELERS", label: "Traveller & dept allocations", icon: UserCheck },
  { code: "MAINTENANCE", label: "Maintenance & job cards", icon: Wrench },
  { code: "PARTS", label: "Parts & Accessories", icon: Package },
  { code: "VENDORS", label: "Insurance vendor master", icon: ShieldCheck },
  { code: "ALERTS", label: "Statutory compliance & alerts", icon: ShieldAlert },
  { code: "REPORTS", label: "Fleet reports & analytics", icon: LineChart },
  { code: "SALES", label: "Vehicle sales & disposals", icon: Tag },
  { code: "MY_GARAGE", label: "My assigned vehicles (garage)", icon: LifeBuoy },
  { code: "LEARNING", label: "Fleet guidelines / SOPs", icon: BookOpen },
  { code: "RBAC", label: "RBAC access policies", icon: Key },
  { code: "SETTINGS", label: "Fleet system settings", icon: Settings }
];

interface ModulePermRow {
  module: FleetFunctionalModule;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  movementAccessScope: FleetMovementAccessScope;
}

const DEFAULT_MODULE_PERMS: Record<FleetFunctionalModule, ModulePermRow> = {
  VEHICLES: { module: "VEHICLES", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  REGISTER: { module: "REGISTER", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  DRIVERS: { module: "DRIVERS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  TRIPS: { module: "TRIPS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  TRAVELERS: { module: "TRAVELERS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: true, canExport: true, movementAccessScope: "ALL" },
  MAINTENANCE: { module: "MAINTENANCE", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  PARTS: { module: "PARTS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  VENDORS: { module: "VENDORS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  ALERTS: { module: "ALERTS", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  REPORTS: { module: "REPORTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  SALES: { module: "SALES", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  MY_GARAGE: { module: "MY_GARAGE", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, movementAccessScope: "ALL" },
  LEARNING: { module: "LEARNING", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  RBAC: { module: "RBAC", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "ALL" },
  SETTINGS: { module: "SETTINGS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, movementAccessScope: "NONE" }
};

export default function FleetRbacGovernance() {
  const [storeState, setStoreState] = useState<FleetMasterStoreState>(FleetMasterStore.getState());
  const [workspaceUsers, setWorkspaceUsers] = useState<FleetWorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<"ROLES_BUILDER" | "PERSONNEL" | "POLICY_MATRIX" | "SIMULATOR">("ROLES_BUILDER");

  // Filters for Personnel Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  // Slide-Over Permission Drawer state (User-wise)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string>("");
  const [drawerFleetRole, setDrawerFleetRole] = useState<FleetRoleCode>("TRAVELER");
  const [drawerScopeType, setDrawerScopeType] = useState<FleetScopeType>("ALL_VEHICLES");
  
  // Drawer Granular permissions
  const [permVehiclesManage, setPermVehiclesManage] = useState(false);
  const [permDriversManage, setPermDriversManage] = useState(false);
  const [permTripsDispatch, setPermTripsDispatch] = useState(false);
  const [permMaintenanceManage, setPermMaintenanceManage] = useState(false);
  const [permReportsView, setPermReportsView] = useState(false);
  const [permSettingsManage, setPermSettingsManage] = useState(false);

  // Dynamic Role Management
  const [selectedBuilderRoleCode, setSelectedBuilderRoleCode] = useState<string>("FLEET_ADMIN");
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | "CLONE">("CREATE");

  // All-in-One Role Form State
  const [roleFormCode, setRoleFormCode] = useState("");
  const [roleFormLabel, setRoleFormLabel] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormBadgeColor, setRoleFormBadgeColor] = useState(ROLE_BADGE_COLORS[1].class);
  const [roleFormModules, setRoleFormModules] = useState<Record<FleetFunctionalModule, ModulePermRow>>(DEFAULT_MODULE_PERMS);

  // Policy Matrix State
  const [policyRecords, setPolicyRecords] = useState<FleetRbacPolicy[]>(() => FleetMasterStore.getRbacPolicies());

  // Permission Simulator State
  const [simUserId, setSimUserId] = useState<string>("");
  const [simModule, setSimModule] = useState<FleetFunctionalModule>("TRIPS");
  const [simIsAssignee, setSimIsAssignee] = useState(false);
  const [simIsCreator, setSimIsCreator] = useState(false);

  // Subscribe to store
  useEffect(() => {
    const unsubscribe = FleetMasterStore.subscribe(() => {
      setStoreState({ ...FleetMasterStore.getState() });
      setPolicyRecords(FleetMasterStore.getRbacPolicies());
    });
    return () => unsubscribe();
  }, []);

  // Fetch workspace users & policies
  const loadWorkspaceUsers = async () => {
    setIsLoading(true);
    try {
      const [usersRes, policiesRes] = await Promise.all([
        fetchFleetWorkspaceUsersAction(),
        fetchFleetRbacPoliciesAction()
      ]);

      if (usersRes.success && usersRes.users) {
        setWorkspaceUsers(usersRes.users);
        usersRes.users.forEach(u => {
          if (u.fleetAccess) {
            FleetMasterStore.saveUserAccess(u.fleetAccess);
          }
        });
      }

      if (policiesRes.success && policiesRes.policies) {
        setPolicyRecords(policiesRes.policies);
        FleetMasterStore.saveRbacPolicies(policiesRes.policies);
      }
    } catch (err: any) {
      console.warn("Could not fetch fleet personnel or policies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceUsers();
  }, []);

  const allRoles = useMemo(() => {
    return FleetMasterStore.getRoles();
  }, [storeState.customRoles]);

  const roleMap = useMemo(() => {
    return new Map(allRoles.map(r => [r.code, r]));
  }, [allRoles]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    workspaceUsers.forEach(u => {
      if (u.departmentName) set.add(u.departmentName);
    });
    return Array.from(set).sort();
  }, [workspaceUsers]);

  const mergedUsers = useMemo(() => {
    const storeAccessMap = new Map(FleetMasterStore.getUserAccessList().map(a => [a.userId, a]));
    return workspaceUsers.map(u => {
      const localAccess = storeAccessMap.get(u.id);
      return {
        ...u,
        fleetAccess: localAccess || u.fleetAccess
      };
    });
  }, [workspaceUsers, storeState.userAccessList]);

  // Filtered personnel
  const filteredUsers = useMemo(() => {
    return mergedUsers.filter(u => {
      const matchesSearch = 
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.userCode && u.userCode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const assignedRole = u.fleetAccess?.fleetRole || (u.hasModuleAccess ? "TRAVELER" : "NONE");
      const matchesRole = roleFilter === "ALL" || assignedRole === roleFilter;
      const matchesDept = deptFilter === "ALL" || u.departmentName === deptFilter;

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [mergedUsers, searchQuery, roleFilter, deptFilter]);

  // Selected Role for Builder
  const selectedRoleDef = useMemo(() => {
    return roleMap.get(selectedBuilderRoleCode) || allRoles[0];
  }, [selectedBuilderRoleCode, roleMap, allRoles]);

  // User count per role
  const userCountPerRole = useMemo(() => {
    const counts: Record<string, number> = {};
    allRoles.forEach(r => counts[r.code] = 0);
    mergedUsers.forEach(u => {
      if (u.fleetAccess?.fleetRole) {
        counts[u.fleetAccess.fleetRole] = (counts[u.fleetAccess.fleetRole] || 0) + 1;
      }
    });
    return counts;
  }, [allRoles, mergedUsers]);

  // Open Drawer for a user
  const handleOpenDrawer = (user: FleetWorkspaceUser) => {
    setDrawerUserId(user.id);
    const existing = user.fleetAccess;
    if (existing) {
      setDrawerFleetRole(existing.fleetRole);
      setDrawerScopeType(existing.scopeType || "ALL_VEHICLES");
      setPermVehiclesManage(existing.canManageVehicles);
      setPermDriversManage(existing.canManageDrivers);
      setPermTripsDispatch(existing.canDispatchTrips);
      setPermMaintenanceManage(existing.canManageMaintenance);
      setPermReportsView(existing.canViewReports);
      setPermSettingsManage(existing.canManageSettings);
    } else {
      setDrawerFleetRole("TRAVELER");
      setDrawerScopeType("ALL_VEHICLES");
      setPermVehiclesManage(false);
      setPermDriversManage(false);
      setPermTripsDispatch(false);
      setPermMaintenanceManage(false);
      setPermReportsView(false);
      setPermSettingsManage(false);
    }
    setIsDrawerOpen(true);
  };

  // Change Role in Drawer
  const handleDrawerRoleChange = (roleCode: FleetRoleCode) => {
    setDrawerFleetRole(roleCode);
    const rDef = roleMap.get(roleCode);
    if (rDef) {
      setPermVehiclesManage(rDef.defaultPermissions.canManageVehicles);
      setPermDriversManage(rDef.defaultPermissions.canManageDrivers);
      setPermTripsDispatch(rDef.defaultPermissions.canDispatchTrips);
      setPermMaintenanceManage(rDef.defaultPermissions.canManageMaintenance);
      setPermReportsView(rDef.defaultPermissions.canViewReports);
      setPermSettingsManage(rDef.defaultPermissions.canManageSettings);
    }
  };

  // Save User Access
  const handleSaveDrawer = async () => {
    if (!drawerUserId) return;
    setIsSaving(true);
    try {
      const record: FleetUserAccessRecord = {
        userId: drawerUserId,
        fleetRole: drawerFleetRole,
        scopeType: drawerScopeType,
        assignedVehicleIds: [],
        canManageVehicles: permVehiclesManage,
        canManageDrivers: permDriversManage,
        canDispatchTrips: permTripsDispatch,
        canManageMaintenance: permMaintenanceManage,
        canViewReports: permReportsView,
        canManageSettings: permSettingsManage,
        updatedAt: new Date().toISOString()
      };

      const res = await saveFleetUserAccessAction(record);
      if (res.success) {
        FleetMasterStore.saveUserAccess(record);
        setFeedbackMessage({ type: "success", text: "Personnel permissions updated successfully!" });
        toast.success("Personnel permissions updated successfully!");
        setIsDrawerOpen(false);
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to save permissions." });
        toast.error(res.error || "Failed to save permissions.");
      }
    } catch (e: any) {
      setFeedbackMessage({ type: "error", text: e.message || "An unexpected error occurred." });
      toast.error(e.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Toggle general module access
  const handleToggleModuleAccess = async (user: FleetWorkspaceUser) => {
    setTogglingUserId(user.id);
    const newStatus = !user.hasModuleAccess;
    try {
      const res = await toggleUserFleetModuleAccessAction(user.id, newStatus);
      if (res.success) {
        setWorkspaceUsers(prev => prev.map(u => u.id === user.id ? { ...u, hasModuleAccess: newStatus } : u));
        setFeedbackMessage({ type: "success", text: `${user.fullName}'s Vehicle Desk access was ${newStatus ? 'enabled' : 'revoked'}.` });
        toast.success(`${user.fullName}'s Vehicle Desk access was ${newStatus ? 'enabled' : 'revoked'}.`);
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to toggle access." });
        toast.error(res.error || "Failed to toggle access.");
      }
    } catch (e: any) {
      setFeedbackMessage({ type: "error", text: e.message });
      toast.error(e.message || "Failed to toggle access.");
    } finally {
      setTogglingUserId(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Real-time Permission Toggle handler (instant effect, no refresh / no relogin)
  const handleTogglePermission = (
    moduleCode: FleetFunctionalModule,
    field: "canRead" | "canCreate" | "canUpdate" | "canDelete" | "canApprove" | "canExport"
  ) => {
    const currentPolicies = [...FleetMasterStore.getRbacPolicies()];
    const existingIdx = currentPolicies.findIndex(
      p => p.roleCode === selectedRoleDef.code && p.module === moduleCode
    );

    let updatedPolicies: FleetRbacPolicy[];
    let targetPolicy: FleetRbacPolicy;

    if (existingIdx >= 0) {
      const existing = currentPolicies[existingIdx];
      targetPolicy = {
        ...existing,
        [field]: !existing[field]
      };
      updatedPolicies = [
        ...currentPolicies.slice(0, existingIdx),
        targetPolicy,
        ...currentPolicies.slice(existingIdx + 1)
      ];
    } else {
      const defaultPolicy = DEFAULT_MODULE_PERMS[moduleCode];
      targetPolicy = {
        id: `pol-${selectedRoleDef.code.toLowerCase()}-${moduleCode.toLowerCase()}`,
        roleCode: selectedRoleDef.code,
        module: moduleCode,
        canRead: defaultPolicy.canRead,
        canCreate: defaultPolicy.canCreate,
        canUpdate: defaultPolicy.canUpdate,
        canDelete: defaultPolicy.canDelete,
        canApprove: defaultPolicy.canApprove,
        canExport: defaultPolicy.canExport,
        movementAccessScope: selectedRoleDef.movementAccessScope || "ALL",
        [field]: !defaultPolicy[field]
      };
      updatedPolicies = [...currentPolicies, targetPolicy];
    }

    // Immediately update reactive state & local storage (zero refresh / zero relogin needed)
    setPolicyRecords(updatedPolicies);
    FleetMasterStore.saveRbacPolicies(updatedPolicies);

    // Asynchronously save to PostgreSQL in background
    saveSingleFleetRbacPolicyAction(targetPolicy).catch(err => {
      console.error("Failed to save fleet policy to database:", err);
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fleet-rbac-policy-updated", {
        detail: { roleCode: selectedRoleDef.code, moduleCode, field, policies: updatedPolicies }
      }));
    }
  };

  // Real-time Movement Scope Change handler (instant effect)
  const handleChangeMovementScope = (
    moduleCode: FleetFunctionalModule,
    scope: FleetMovementAccessScope
  ) => {
    const currentPolicies = [...FleetMasterStore.getRbacPolicies()];
    const existingIdx = currentPolicies.findIndex(
      p => p.roleCode === selectedRoleDef.code && p.module === moduleCode
    );

    let updatedPolicies: FleetRbacPolicy[];
    let targetPolicy: FleetRbacPolicy;

    if (existingIdx >= 0) {
      const existing = currentPolicies[existingIdx];
      targetPolicy = {
        ...existing,
        movementAccessScope: scope
      };
      updatedPolicies = [
        ...currentPolicies.slice(0, existingIdx),
        targetPolicy,
        ...currentPolicies.slice(existingIdx + 1)
      ];
    } else {
      const defaultPolicy = DEFAULT_MODULE_PERMS[moduleCode];
      targetPolicy = {
        id: `pol-${selectedRoleDef.code.toLowerCase()}-${moduleCode.toLowerCase()}`,
        roleCode: selectedRoleDef.code,
        module: moduleCode,
        canRead: defaultPolicy.canRead,
        canCreate: defaultPolicy.canCreate,
        canUpdate: defaultPolicy.canUpdate,
        canDelete: defaultPolicy.canDelete,
        canApprove: defaultPolicy.canApprove,
        canExport: defaultPolicy.canExport,
        movementAccessScope: scope
      };
      updatedPolicies = [...currentPolicies, targetPolicy];
    }

    setPolicyRecords(updatedPolicies);
    FleetMasterStore.saveRbacPolicies(updatedPolicies);

    // Asynchronously save to PostgreSQL in background
    saveSingleFleetRbacPolicyAction(targetPolicy).catch(err => {
      console.error("Failed to save movement scope to database:", err);
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fleet-rbac-policy-updated", {
        detail: { roleCode: selectedRoleDef.code, moduleCode, scope, policies: updatedPolicies }
      }));
    }
  };

  // Quick batch actions for selected role
  const handleGrantAllForRole = () => {
    const currentPolicies = [...FleetMasterStore.getRbacPolicies()];
    const modulesToUpdate = new Set<FleetFunctionalModule>(FLEET_MODULE_LIST.map(m => m.code));
    
    // Update existing or insert missing for all modules
    const updated = currentPolicies.map(p => {
      if (p.roleCode === selectedRoleDef.code) {
        modulesToUpdate.delete(p.module as FleetFunctionalModule);
        return {
          ...p,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
          canApprove: true,
          canExport: true,
          movementAccessScope: "ALL" as FleetMovementAccessScope
        };
      }
      return p;
    });

    modulesToUpdate.forEach(modCode => {
      updated.push({
        id: `pol-${selectedRoleDef.code.toLowerCase()}-${modCode.toLowerCase()}`,
        roleCode: selectedRoleDef.code,
        module: modCode,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
        movementAccessScope: "ALL"
      });
    });

    setPolicyRecords(updated);
    FleetMasterStore.saveRbacPolicies(updated);
    saveFleetRbacPoliciesAction(updated).catch(err => {
      console.error("Failed to persist bulk permissions to database:", err);
    });

    setFeedbackMessage({
      type: "success",
      text: `Granted Full CRUD permissions to ${selectedRoleDef.label}. Saved & applied!`
    });
    toast.success(`Granted Full CRUD permissions to ${selectedRoleDef.label}.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleSetReadOnlyForRole = () => {
    const currentPolicies = [...FleetMasterStore.getRbacPolicies()];
    const modulesToUpdate = new Set<FleetFunctionalModule>(FLEET_MODULE_LIST.map(m => m.code));

    const updated = currentPolicies.map(p => {
      if (p.roleCode === selectedRoleDef.code) {
        modulesToUpdate.delete(p.module as FleetFunctionalModule);
        return {
          ...p,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canApprove: false,
          canExport: true,
          movementAccessScope: "ALL" as FleetMovementAccessScope
        };
      }
      return p;
    });

    modulesToUpdate.forEach(modCode => {
      updated.push({
        id: `pol-${selectedRoleDef.code.toLowerCase()}-${modCode.toLowerCase()}`,
        roleCode: selectedRoleDef.code,
        module: modCode,
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: true,
        movementAccessScope: "ALL"
      });
    });

    setPolicyRecords(updated);
    FleetMasterStore.saveRbacPolicies(updated);
    saveFleetRbacPoliciesAction(updated).catch(err => {
      console.error("Failed to persist read-only permissions to database:", err);
    });

    setFeedbackMessage({
      type: "success",
      text: `Set ${selectedRoleDef.label} permissions to Read-Only. Saved & applied!`
    });
    toast.success(`Set ${selectedRoleDef.label} permissions to Read-Only.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleResetRoleDefaults = () => {
    const defaultRolePolicies = DEFAULT_FLEET_POLICIES.filter(p => p.roleCode === selectedRoleDef.code);
    const otherPolicies = FleetMasterStore.getRbacPolicies().filter(p => p.roleCode !== selectedRoleDef.code);
    const updated = [...otherPolicies, ...defaultRolePolicies];

    setPolicyRecords(updated);
    FleetMasterStore.saveRbacPolicies(updated);
    saveFleetRbacPoliciesAction(updated).catch(err => {
      console.error("Failed to persist default policies to database:", err);
    });

    setFeedbackMessage({
      type: "success",
      text: `Reset ${selectedRoleDef.label} to default system matrix template. Saved & applied!`
    });
    toast.success(`Reset ${selectedRoleDef.label} to default system matrix.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Selected User Object for Drawer
  const activeDrawerUser = useMemo(() => {
    return mergedUsers.find(u => u.id === drawerUserId);
  }, [mergedUsers, drawerUserId]);

  // Selected User Object & Policy for Simulator
  const activeSimUser = useMemo(() => {
    return mergedUsers.find(u => u.id === simUserId);
  }, [mergedUsers, simUserId]);

  const activeSimRoleCode = activeSimUser?.fleetAccess?.fleetRole || "TRAVELER";
  const activeSimRoleDef = useMemo(() => {
    return roleMap.get(activeSimRoleCode);
  }, [roleMap, activeSimRoleCode]);

  const activeSimPolicy = useMemo(() => {
    return policyRecords.find(p => p.roleCode === activeSimRoleCode && p.module === simModule) || {
      id: "sim-fallback",
      roleCode: activeSimRoleCode,
      module: simModule,
      canRead: activeSimRoleCode === "FLEET_ADMIN" || activeSimRoleCode === "FLEET_VIEWER",
      canCreate: activeSimRoleCode === "FLEET_ADMIN",
      canUpdate: activeSimRoleCode === "FLEET_ADMIN",
      canDelete: activeSimRoleCode === "FLEET_ADMIN",
      canApprove: activeSimRoleCode === "FLEET_ADMIN",
      canExport: activeSimRoleCode === "FLEET_ADMIN",
      movementAccessScope: (activeSimRoleDef?.movementAccessScope || "ALL") as FleetMovementAccessScope
    };
  }, [policyRecords, activeSimRoleCode, simModule, activeSimRoleDef]);

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-warning-soft text-warning-text border border-warning/30">
              <Car className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold tracking-wider text-warning-text">
              Fleet & Vehicle Desk governance
            </span>
          </div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">
            Vehicle RBAC access policies
          </h1>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in slide-in-from-top-2 duration-200 ${
          feedbackMessage.type === "success" 
            ? "bg-success-soft border-success/30 text-success-text" 
            : "bg-danger-soft border-danger/30 text-danger-text"
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMessage(null)} className="text-xs underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 overflow-x-auto scrollbar-hide pb-px">
        <AppButton
          variant="secondary"
          onClick={() => setActiveTab("ROLES_BUILDER")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap rounded-none ${
            activeTab === "ROLES_BUILDER"
              ? "border-theme-btn-primary text-theme-icon bg-accent-soft rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-3.5 w-3.5 text-theme-icon" />
          <span>Roles & permissions</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-accent-soft text-theme-icon font-bold border border-theme-btn-primary/20">
            {allRoles.length}
          </span>
        </AppButton>

        <AppButton
          variant="secondary"
          onClick={() => setActiveTab("PERSONNEL")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap rounded-none ${
            activeTab === "PERSONNEL"
              ? "border-theme-btn-primary text-theme-icon bg-accent-soft rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5 text-theme-icon" />
          <span>Personnel directory</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-accent-soft text-theme-icon font-bold border border-theme-btn-primary/20">
            {workspaceUsers.length}
          </span>
        </AppButton>

        <AppButton
          variant="secondary"
          onClick={() => setActiveTab("POLICY_MATRIX")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap rounded-none ${
            activeTab === "POLICY_MATRIX"
              ? "border-theme-btn-primary text-theme-icon bg-accent-soft rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-theme-icon" />
          <span>Policy matrix</span>
        </AppButton>

        <AppButton
          variant="secondary"
          onClick={() => setActiveTab("SIMULATOR")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap rounded-none ${
            activeTab === "SIMULATOR"
              ? "border-theme-btn-primary text-theme-icon bg-accent-soft rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="h-3.5 w-3.5 text-theme-icon" />
          <span>Permission tester</span>
        </AppButton>
      </div>

      {/* TAB 1: ROLES & PERMISSIONS BUILDER */}
      {activeTab === "ROLES_BUILDER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Defined Roles List */}
          <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                Defined fleet roles
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                {allRoles.length} Active
              </span>
            </div>

            <div className="space-y-2">
              {allRoles.map(role => {
                const isSelected = selectedBuilderRoleCode === role.code;
                const assignedCount = userCountPerRole[role.code] || 0;

                return (
                  <div
                    key={role.code}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBuilderRoleCode(role.code)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedBuilderRoleCode(role.code); }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-accent-soft border-theme-btn-primary/40 shadow-sm"
                        : "bg-surface/50 border-border/40 hover:bg-surface hover:border-border"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">
                        {role.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono mt-0.5">
                        {role.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-bold">{assignedCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Role Details & Matrix */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              {/* Role Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-foreground">
                      {selectedRoleDef.label}
                    </h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${selectedRoleDef.badgeColor}`}>
                      {selectedRoleDef.code}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-success-soft text-success-text border border-success/30 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Live reactive</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    {selectedRoleDef.description}
                  </p>
                </div>

                {/* Quick Role Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGrantAllForRole}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 transition-all cursor-pointer shadow-2xs"
                    title="Grant all CRUD and approval permissions to this role"
                  >
                    Grant all (full)
                  </button>
                  <button
                    type="button"
                    onClick={handleSetReadOnlyForRole}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-info-soft text-info-text border border-info/30 hover:bg-info-soft/80 transition-all cursor-pointer shadow-2xs"
                    title="Set view only permissions for this role"
                  >
                    Set read only
                  </button>
                  <button
                    type="button"
                    onClick={handleResetRoleDefaults}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-surface text-muted-foreground border border-border hover:bg-surface/80 hover:text-foreground transition-all cursor-pointer"
                    title="Reset this role to standard defaults"
                  >
                    Reset defaults
                  </button>
                </div>
              </div>

              {/* Module Permissions Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold tracking-wider text-muted-foreground flex items-center gap-2">
                    <span>Module permissions & movement scopes</span>
                  </h3>
                  <span className="text-xs text-muted-foreground italic">
                    Click any cell to tick/untick. Changes take effect immediately.
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface text-muted font-semibold text-xs tracking-wider border-b border-border">
                      <tr>
                        <th className="py-3 px-4">Module</th>
                        <th className="py-3 px-3 text-center">View</th>
                        <th className="py-3 px-3 text-center">Create</th>
                        <th className="py-3 px-3 text-center">Edit</th>
                        <th className="py-3 px-3 text-center">Delete</th>
                        <th className="py-3 px-3 text-center">Approve</th>
                        <th className="py-3 px-3 text-center">Export</th>
                        <th className="py-3 px-4">Movement scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {FLEET_MODULE_LIST.map(mod => {
                        const ModIcon = mod.icon;
                        const policy = policyRecords.find(p => p.roleCode === selectedRoleDef.code && p.module === mod.code) || {
                          canRead: selectedRoleDef.code === "FLEET_ADMIN" || selectedRoleDef.code === "FLEET_VIEWER",
                          canCreate: selectedRoleDef.code === "FLEET_ADMIN",
                          canUpdate: selectedRoleDef.code === "FLEET_ADMIN",
                          canDelete: selectedRoleDef.code === "FLEET_ADMIN",
                          canApprove: selectedRoleDef.code === "FLEET_ADMIN",
                          canExport: selectedRoleDef.code === "FLEET_ADMIN",
                          movementAccessScope: selectedRoleDef.movementAccessScope
                        };

                        return (
                          <tr key={mod.code} className="hover:bg-surface/50 transition-colors">
                            <td className="py-3 px-4 flex items-center gap-2 text-foreground font-semibold">
                              <ModIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{mod.label}</span>
                            </td>

                            {/* View / Read */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(mod.code, "canRead")}
                                title={`Click to ${policy.canRead ? "revoke" : "grant"} View access on ${mod.label}`}
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                  policy.canRead
                                    ? "bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 shadow-2xs"
                                    : "bg-surface text-muted/60 border border-border/60 hover:bg-sunken hover:text-foreground hover:border-border"
                                }`}
                              >
                                {policy.canRead ? <Check className="h-4 w-4 stroke-[2.5]" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </td>

                            {/* Create */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(mod.code, "canCreate")}
                                title={`Click to ${policy.canCreate ? "revoke" : "grant"} Create access on ${mod.label}`}
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                  policy.canCreate
                                    ? "bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 shadow-2xs"
                                    : "bg-surface text-muted/60 border border-border/60 hover:bg-sunken hover:text-foreground hover:border-border"
                                }`}
                              >
                                {policy.canCreate ? <Check className="h-4 w-4 stroke-[2.5]" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </td>

                            {/* Edit / Update */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(mod.code, "canUpdate")}
                                title={`Click to ${policy.canUpdate ? "revoke" : "grant"} Edit access on ${mod.label}`}
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                  policy.canUpdate
                                    ? "bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 shadow-2xs"
                                    : "bg-surface text-muted/60 border border-border/60 hover:bg-sunken hover:text-foreground hover:border-border"
                                }`}
                              >
                                {policy.canUpdate ? <Check className="h-4 w-4 stroke-[2.5]" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </td>

                            {/* Delete */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(mod.code, "canDelete")}
                                title={`Click to ${policy.canDelete ? "revoke" : "grant"} Delete access on ${mod.label}`}
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                  policy.canDelete
                                    ? "bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 shadow-2xs"
                                    : "bg-surface text-muted/60 border border-border/60 hover:bg-sunken hover:text-foreground hover:border-border"
                                }`}
                              >
                                {policy.canDelete ? <Check className="h-4 w-4 stroke-[2.5]" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </td>

                            {/* Approve */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(mod.code, "canApprove")}
                                title={`Click to ${policy.canApprove ? "revoke" : "grant"} Approval access on ${mod.label}`}
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                  policy.canApprove
                                    ? "bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 shadow-2xs"
                                    : "bg-surface text-muted/60 border border-border/60 hover:bg-sunken hover:text-foreground hover:border-border"
                                }`}
                              >
                                {policy.canApprove ? <Check className="h-4 w-4 stroke-[2.5]" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </td>

                            {/* Export */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(mod.code, "canExport")}
                                title={`Click to ${policy.canExport ? "revoke" : "grant"} Export access on ${mod.label}`}
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                  policy.canExport
                                    ? "bg-success-soft text-success-text border border-success/30 hover:bg-success-soft/80 shadow-2xs"
                                    : "bg-surface text-muted/60 border border-border/60 hover:bg-sunken hover:text-foreground hover:border-border"
                                }`}
                              >
                                {policy.canExport ? <Check className="h-4 w-4 stroke-[2.5]" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </td>

                            {/* Movement Scope Dropdown */}
                            <td className="py-2.5 px-4">
                              <select
                                value={policy.movementAccessScope || "ALL"}
                                onChange={e => handleChangeMovementScope(mod.code, e.target.value as FleetMovementAccessScope)}
                                className="text-xs font-semibold text-warning-text bg-warning-soft hover:bg-warning-soft/80 border border-warning/30 rounded-lg px-2.5 py-1 outline-none cursor-pointer transition-all w-full max-w-[190px]"
                                title="Change movement access scope"
                              >
                                {MOVEMENT_SCOPE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONNEL DIRECTORY */}
      {activeTab === "PERSONNEL" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-2 w-full md:w-80">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <AppInput
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground outline-none cursor-pointer"
              >
                <option value="ALL">All roles</option>
                {allRoles.map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>

              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground outline-none cursor-pointer"
              >
                <option value="ALL">All departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Personnel Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-muted font-semibold text-xs tracking-wider border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">Personnel</th>
                  <th className="py-3.5 px-4">Department & designation</th>
                  <th className="py-3.5 px-4">Vehicle module access</th>
                  <th className="py-3.5 px-4">Assigned fleet role</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <ChandakLoader size="md" subtitle="Loading fleet directory…" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No personnel match your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const assignedRoleCode = user.fleetAccess?.fleetRole || "TRAVELER";
                    const roleDef = roleMap.get(assignedRoleCode);

                    return (
                      <tr key={user.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-warning-soft text-warning-text font-semibold flex items-center justify-center border border-warning/30 text-xs shrink-0">
                              {user.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground truncate">
                                {user.fullName}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground font-semibold truncate">
                              {user.departmentName || "General Operations"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {user.designationName || "Personnel"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            disabled={togglingUserId === user.id}
                            onClick={() => handleToggleModuleAccess(user)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              user.hasModuleAccess
                                ? "bg-success-soft text-success-text border-success/30 hover:bg-success-soft/80"
                                : "bg-surface text-muted-foreground border-border hover:bg-surface/80"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${user.hasModuleAccess ? "bg-success animate-pulse" : "bg-muted"}`} />
                            <span>{user.hasModuleAccess ? "Access Active" : "Disabled"}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          {user.hasModuleAccess ? (
                            <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border inline-flex items-center gap-1.5 ${roleDef?.badgeColor || 'bg-surface text-muted-foreground border-border'}`}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>{roleDef?.label || assignedRoleCode}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Module not assigned
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <AppButton
                            variant="outline"
                            size="sm"
                            disabled={!user.hasModuleAccess}
                            onClick={() => handleOpenDrawer(user)}
                            className="text-xs flex items-center gap-1.5 ml-auto"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Configure</span>
                          </AppButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: POLICY MATRIX */}
      {activeTab === "POLICY_MATRIX" && (
        <div className="space-y-4">
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-bold text-foreground">Global vehicle policy matrix</h3>
                
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface text-muted font-semibold text-xs tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Fleet role</th>
                    {FLEET_MODULE_LIST.map(m => (
                      <th key={m.code} className="py-3 px-3 text-center">{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {allRoles.map(role => (
                    <tr key={role.code} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${role.badgeColor}`}>
                          {role.label}
                        </span>
                      </td>
                      {FLEET_MODULE_LIST.map(m => {
                        const pol = policyRecords.find(p => p.roleCode === role.code && p.module === m.code);
                        const hasFull = pol?.canCreate && pol?.canUpdate;
                        const hasRead = pol?.canRead;

                        return (
                          <td key={m.code} className="py-3 px-3 text-center">
                            {hasFull ? (
                              <span className="text-xs font-semibold text-success-text bg-success-soft px-2.5 py-0.5 rounded border border-success/30">Full (CRUD)</span>
                            ) : hasRead ? (
                              <span className="text-xs font-semibold text-info-text bg-info-soft px-2.5 py-0.5 rounded border border-info/30">View only</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERMISSION TESTER */}
      {activeTab === "SIMULATOR" && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Play className="h-4 w-4 text-theme-icon" />
              <span>Fleet permission simulation engine</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate operational conditions to verify which actions a user or role is permitted to perform in the Vehicle Module.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select personnel</label>
              <select
                value={simUserId}
                onChange={e => setSimUserId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground outline-none"
              >
                <option value="">Choose a user…</option>
                {mergedUsers.filter(u => u.hasModuleAccess).map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.fleetAccess?.fleetRole || "TRAVELER"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Target functional module</label>
              <select
                value={simModule}
                onChange={e => setSimModule(e.target.value as FleetFunctionalModule)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground outline-none"
              >
                {FLEET_MODULE_LIST.map(m => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Simulation Output */}
          {activeSimUser && (
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider text-theme-icon">
                    Simulation Evaluation:
                  </span>
                  <span className="text-xs font-bold text-foreground">{activeSimUser.fullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${activeSimRoleDef?.badgeColor || 'bg-surface text-muted-foreground border-border'}`}>
                    {activeSimRoleDef?.label || activeSimRoleCode}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-surface text-theme-icon font-bold border border-border">
                    Scope: {activeSimPolicy.movementAccessScope || "ALL"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
                <div className={`p-3 rounded-xl border ${activeSimPolicy.canRead ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">View / read</span>
                  <span className={`text-xs font-bold ${activeSimPolicy.canRead ? 'text-success-text' : 'text-muted'}`}>
                    {activeSimPolicy.canRead ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${activeSimPolicy.canCreate ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">Create / add</span>
                  <span className={`text-xs font-bold ${activeSimPolicy.canCreate ? 'text-success-text' : 'text-muted'}`}>
                    {activeSimPolicy.canCreate ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${activeSimPolicy.canUpdate ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">Update / edit</span>
                  <span className={`text-xs font-bold ${activeSimPolicy.canUpdate ? 'text-success-text' : 'text-muted'}`}>
                    {activeSimPolicy.canUpdate ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${activeSimPolicy.canDelete ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">Delete / remove</span>
                  <span className={`text-xs font-bold ${activeSimPolicy.canDelete ? 'text-success-text' : 'text-muted'}`}>
                    {activeSimPolicy.canDelete ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${activeSimPolicy.canApprove ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">Approve</span>
                  <span className={`text-xs font-bold ${activeSimPolicy.canApprove ? 'text-success-text' : 'text-muted'}`}>
                    {activeSimPolicy.canApprove ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${activeSimPolicy.canExport ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">Export logs</span>
                  <span className={`text-xs font-bold ${activeSimPolicy.canExport ? 'text-success-text' : 'text-muted'}`}>
                    {activeSimPolicy.canExport ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-Over Permission Drawer */}
      {isDrawerOpen && activeDrawerUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            role="button"
            tabIndex={0}
            aria-label="Close drawer backdrop"
            className="fixed inset-0 bg-[var(--overlay)] transition-opacity animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape' || e.key === ' ') setIsDrawerOpen(false); }}
          />
          <div className="relative z-50 w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-lg animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-warning-soft text-warning-text font-semibold flex items-center justify-center border border-warning/30 text-xs">
                  {activeDrawerUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{activeDrawerUser.fullName}</h3>
                  <p className="text-xs text-muted-foreground">{activeDrawerUser.email}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close drawer"
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-muted-foreground">
                  Assigned fleet role
                </label>
                <div className="space-y-2">
                  {allRoles.map(role => (
                    <label
                      key={role.code}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        drawerFleetRole === role.code
                          ? "bg-warning-soft border-warning/40"
                          : "bg-surface/50 border-border/40 hover:bg-surface"
                      }`}
                    >
                      <input
                        type="radio"
                        name="drawerRole"
                        value={role.code}
                        checked={drawerFleetRole === role.code}
                        onChange={() => handleDrawerRoleChange(role.code)}
                        className="mt-0.5 text-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Granular Overrides */}
              <div className="space-y-3 pt-3 border-t border-border/50">
                <label className="text-xs font-semibold tracking-wider text-muted-foreground">
                  Direct functional capabilities
                </label>
                
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
                    <span className="text-xs font-medium text-foreground">Can register / edit vehicles</span>
                    <input
                      type="checkbox"
                      checked={permVehiclesManage}
                      onChange={e => setPermVehiclesManage(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
                    <span className="text-xs font-medium text-foreground">Can manage drivers & chauffeurs</span>
                    <input
                      type="checkbox"
                      checked={permDriversManage}
                      onChange={e => setPermDriversManage(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
                    <span className="text-xs font-medium text-foreground">Can dispatch trips & movements</span>
                    <input
                      type="checkbox"
                      checked={permTripsDispatch}
                      onChange={e => setPermTripsDispatch(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
                    <span className="text-xs font-medium text-foreground">Can manage maintenance & workshops</span>
                    <input
                      type="checkbox"
                      checked={permMaintenanceManage}
                      onChange={e => setPermMaintenanceManage(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
                    <span className="text-xs font-medium text-foreground">Can view executive analytics & reports</span>
                    <input
                      type="checkbox"
                      checked={permReportsView}
                      onChange={e => setPermReportsView(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-card">
              <AppButton
                variant="ghost"
                size="sm"
                onClick={() => setIsDrawerOpen(false)}
              >
                Cancel
              </AppButton>

              <AppButton
                variant="primary"
                size="sm"
                disabled={isSaving}
                onClick={handleSaveDrawer}
                className="flex items-center gap-1.5"
              >
                {isSaving ? <ChandakLoader size="xs" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save permissions</span>
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
