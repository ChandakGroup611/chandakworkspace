"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Users, 
  Building2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  RefreshCw, 
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
  Play,
  Target
} from "lucide-react";
import { 
  DesignMasterStore, 
  MasterStoreState,
  STANDARD_DESIGN_ROLES
} from "../services/designMasterStore";
import { 
  DesignWorkspaceUser, 
  DesignUserAccessRecord, 
  DesignRoleCode, 
  DesignRoleDefinition,
  DesignTicketAccessScope,
  DesignProjectAccessType, 
  DesignRbacPolicy,
  ProjectMaster 
} from "../types/masterTypes";
import { 
  fetchDesignWorkspaceUsersAction, 
  saveDesignUserAccessAction, 
  deleteDesignUserAccessAction,
  toggleUserDesignModuleAccessAction,
  saveRbacPoliciesAction
} from "@/lib/actions/designTracking";

// Clean badge colors
const ROLE_BADGE_COLORS = [
  { id: "amber", label: "Amber", class: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { id: "indigo", label: "Indigo", class: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
  { id: "blue", label: "Sky Blue", class: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { id: "emerald", label: "Emerald", class: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { id: "cyan", label: "Cyan", class: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
  { id: "orange", label: "Orange", class: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  { id: "purple", label: "Purple", class: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  { id: "slate", label: "Slate", class: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
  { id: "rose", label: "Rose", class: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" }
];

const TICKET_SCOPE_OPTIONS: Array<{ value: DesignTicketAccessScope; label: string }> = [
  { value: "ALL", label: "All Items (Global)" },
  { value: "ASSIGNED_ONLY", label: "Assigned to Me / Consultant" },
  { value: "CREATED_ONLY", label: "Created by Me Only" },
  { value: "PROJECT_ONLY", label: "Project Scoped" },
  { value: "DEPARTMENT_ONLY", label: "Department Scoped" },
  { value: "NONE", label: "No Access" }
];

type FunctionalModuleCode = Exclude<DesignRbacPolicy["module"], "ALL">;

const MODULE_LIST: Array<{ code: FunctionalModuleCode; label: string; icon: any }> = [
  { code: "DESIGN_MATRIX", label: "Tender Matrix", icon: Layers },
  { code: "DRAWINGS", label: "Drawing Register", icon: FileText },
  { code: "LOOK_AHEAD", label: "Look-Ahead (30/60D)", icon: Sparkles },
  { code: "LIAISON", label: "Statutory Liaisoning", icon: ShieldCheck },
  { code: "TRANSMITTALS", label: "Transmittals & GFC", icon: Send },
  { code: "RFIS", label: "RFI & Site Queries (Tickets)", icon: HelpCircle },
  { code: "CONSULTANTS", label: "Consultant Directory", icon: Users },
  { code: "MASTERS", label: "Masters Setup", icon: Settings }
];

interface ModulePermRow {
  module: FunctionalModuleCode;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  ticketAccessScope: DesignTicketAccessScope;
}

const DEFAULT_MODULE_PERMS: Record<FunctionalModuleCode, ModulePermRow> = {
  DESIGN_MATRIX: { module: "DESIGN_MATRIX", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ALL" },
  DRAWINGS: { module: "DRAWINGS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ALL" },
  LOOK_AHEAD: { module: "LOOK_AHEAD", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ALL" },
  LIAISON: { module: "LIAISON", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ALL" },
  TRANSMITTALS: { module: "TRANSMITTALS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ALL" },
  RFIS: { module: "RFIS", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ASSIGNED_ONLY" },
  CONSULTANTS: { module: "CONSULTANTS", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: false, ticketAccessScope: "ALL" },
  MASTERS: { module: "MASTERS", canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, ticketAccessScope: "NONE" }
};

export const DesignRbacGovernance: React.FC = () => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [workspaceUsers, setWorkspaceUsers] = useState<DesignWorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<"ROLES_BUILDER" | "PERSONNEL" | "POLICY_MATRIX" | "SIMULATOR">("ROLES_BUILDER");

  // Filters for Personnel Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [moduleAccessFilter, setModuleAccessFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  // Slide-Over Permission Drawer state (User-wise)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string>("");
  const [drawerDesignRole, setDrawerDesignRole] = useState<DesignRoleCode>("DESIGN_COORDINATOR");
  const [drawerProjectAccessType, setDrawerProjectAccessType] = useState<DesignProjectAccessType>("ALL");
  const [drawerAssignedProjectIds, setDrawerAssignedProjectIds] = useState<string[]>([]);
  const [drawerProjectSearch, setDrawerProjectSearch] = useState("");
  const [drawerTicketScope, setDrawerTicketScope] = useState<DesignTicketAccessScope>("ALL");
  
  // Drawer Granular permissions
  const [permMatrixEdit, setPermMatrixEdit] = useState(true);
  const [permDrawingsUpload, setPermDrawingsUpload] = useState(true);
  const [permGfcApproval, setPermGfcApproval] = useState(false);
  const [permTransmittalsCreate, setPermTransmittalsCreate] = useState(true);
  const [permRfisManage, setPermRfisManage] = useState(true);
  const [permMastersManage, setPermMastersManage] = useState(false);

  // Dynamic Role Management
  const [selectedBuilderRoleCode, setSelectedBuilderRoleCode] = useState<string>("DESIGN_ADMIN");
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | "CLONE">("CREATE");
  const [roleToDelete, setRoleToDelete] = useState<DesignRoleDefinition | null>(null);

  // All-in-One Role Form State
  const [roleFormCode, setRoleFormCode] = useState("");
  const [roleFormLabel, setRoleFormLabel] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormBadgeColor, setRoleFormBadgeColor] = useState(ROLE_BADGE_COLORS[1].class);
  const [roleFormModules, setRoleFormModules] = useState<Record<FunctionalModuleCode, ModulePermRow>>(DEFAULT_MODULE_PERMS);
  const [roleFormProjectType, setRoleFormProjectType] = useState<DesignProjectAccessType>("ALL");
  const [roleFormProjectIds, setRoleFormProjectIds] = useState<string[]>([]);
  const [roleFormProjectSearch, setRoleFormProjectSearch] = useState("");
  const [roleFormAssignedUserIds, setRoleFormAssignedUserIds] = useState<string[]>([]);
  const [roleFormUserSearch, setRoleFormUserSearch] = useState("");

  // Policy Matrix State
  const [matrixRole, setMatrixRole] = useState<string>("DESIGN_COORDINATOR");
  const [matrixProject, setMatrixProject] = useState<string>("ALL");
  const [policyRecords, setPolicyRecords] = useState<DesignRbacPolicy[]>(() => DesignMasterStore.getRbacPolicies());
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

  // Permission Simulator State
  const [simUserId, setSimUserId] = useState<string>("");
  const [simProjectId, setSimProjectId] = useState<string>("ALL");
  const [simModule, setSimModule] = useState<DesignRbacPolicy["module"]>("RFIS");
  const [simIsAssignee, setSimIsAssignee] = useState(false);
  const [simIsCreator, setSimIsCreator] = useState(false);

  // Subscribe to store
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
      setPolicyRecords(DesignMasterStore.getRbacPolicies());
    });
    return () => unsubscribe();
  }, []);

  // Fetch workspace users
  const loadWorkspaceUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchDesignWorkspaceUsersAction();
      if (res.success && res.users) {
        setWorkspaceUsers(res.users);
        res.users.forEach(u => {
          if (u.designAccess) {
            DesignMasterStore.saveUserAccess(u.designAccess);
          }
        });
      } else {
        const storeAccess = DesignMasterStore.getUserAccessList();
        const fallbackUsers: DesignWorkspaceUser[] = storeAccess.map(a => ({
          id: a.userId,
          fullName: `Personnel (${a.userId.slice(0, 8)})`,
          email: `${a.userId}@chandakgroup.com`,
          isActive: true,
          hasModuleAccess: true,
          designAccess: a
        }));
        setWorkspaceUsers(fallbackUsers);
      }
    } catch (err: any) {
      console.warn("Could not fetch workspace users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceUsers();
  }, []);

  const allRoles = useMemo(() => {
    return DesignMasterStore.getRoles();
  }, [storeState.customRoles]);

  const roleMap = useMemo(() => {
    return new Map(allRoles.map(r => [r.code, r]));
  }, [allRoles]);

  const projects = storeState.projects || [];
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    workspaceUsers.forEach(u => {
      if (u.departmentName) set.add(u.departmentName);
    });
    return Array.from(set).sort();
  }, [workspaceUsers]);

  const mergedUsers = useMemo(() => {
    const storeAccessMap = new Map(DesignMasterStore.getUserAccessList().map(a => [a.userId, a]));
    return workspaceUsers.map(u => {
      const localAccess = storeAccessMap.get(u.id);
      const effectiveAccess = localAccess || u.designAccess;
      return {
        ...u,
        hasModuleAccess: u.hasModuleAccess || !!effectiveAccess,
        designAccess: effectiveAccess
      };
    });
  }, [workspaceUsers, storeState.userAccessList]);

  const selectedDrawerUser = useMemo(() => {
    return mergedUsers.find(u => u.id === drawerUserId);
  }, [mergedUsers, drawerUserId]);

  useEffect(() => {
    if (!simUserId && mergedUsers.length > 0) {
      setSimUserId(mergedUsers[0].id);
    }
  }, [mergedUsers, simUserId]);

  const filteredUsers = useMemo(() => {
    return mergedUsers.filter(u => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchDept = u.departmentName?.toLowerCase().includes(q);
        const matchDesig = u.designationName?.toLowerCase().includes(q);
        const matchCode = u.userCode?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept && !matchDesig && !matchCode) return false;
      }

      if (roleFilter !== "ALL") {
        if (roleFilter === "UNASSIGNED") {
          if (u.designAccess?.designRole) return false;
        } else {
          if (u.designAccess?.designRole !== roleFilter) return false;
        }
      }

      if (scopeFilter !== "ALL") {
        if (scopeFilter === "GLOBAL") {
          if (u.designAccess?.projectAccessType !== "ALL") return false;
        } else if (scopeFilter === "SPECIFIC") {
          if (u.designAccess?.projectAccessType !== "SPECIFIC") return false;
        } else if (scopeFilter === "UNASSIGNED") {
          if (u.designAccess) return false;
        }
      }

      if (moduleAccessFilter !== "ALL") {
        if (moduleAccessFilter === "ENABLED" && !u.hasModuleAccess) return false;
        if (moduleAccessFilter === "RESTRICTED" && u.hasModuleAccess) return false;
      }

      if (deptFilter !== "ALL" && u.departmentName !== deptFilter) return false;

      return true;
    });
  }, [mergedUsers, searchQuery, roleFilter, scopeFilter, moduleAccessFilter, deptFilter]);

  const totalPersonnel = mergedUsers.length;
  const activeTrackingUsers = mergedUsers.filter(u => u.hasModuleAccess).length;
  const specificScopeUsers = mergedUsers.filter(u => u.designAccess?.projectAccessType === "SPECIFIC").length;

  // Selected Role in Builder
  const currentBuilderRole = useMemo(() => {
    return roleMap.get(selectedBuilderRoleCode) || allRoles[0];
  }, [roleMap, selectedBuilderRoleCode, allRoles]);

  // Role Modal Handlers
  const handleOpenCreateRole = () => {
    setModalMode("CREATE");
    setRoleFormCode("");
    setRoleFormLabel("");
    setRoleFormDesc("");
    setRoleFormBadgeColor(ROLE_BADGE_COLORS[1].class);
    setRoleFormModules(JSON.parse(JSON.stringify(DEFAULT_MODULE_PERMS)));
    setRoleFormProjectType("ALL");
    setRoleFormProjectIds([]);
    setRoleFormProjectSearch("");
    setRoleFormAssignedUserIds([]);
    setRoleFormUserSearch("");
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: DesignRoleDefinition) => {
    setModalMode("EDIT");
    setRoleFormCode(role.code);
    setRoleFormLabel(role.label);
    setRoleFormDesc(role.description || "");
    setRoleFormBadgeColor(role.badgeColor || ROLE_BADGE_COLORS[1].class);

    // Populate module permissions from existing policies
    const policies = DesignMasterStore.getRbacPolicies().filter(p => p.roleCode === role.code && p.projectId === "ALL");
    const modMap: Record<FunctionalModuleCode, ModulePermRow> = JSON.parse(JSON.stringify(DEFAULT_MODULE_PERMS));

    policies.forEach(p => {
      if (p.module !== "ALL" && modMap[p.module as FunctionalModuleCode]) {
        modMap[p.module as FunctionalModuleCode] = {
          module: p.module as FunctionalModuleCode,
          canCreate: p.canCreate,
          canRead: p.canRead,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
          canApprove: !!p.canApprove,
          canExport: !!p.canExport,
          ticketAccessScope: p.ticketAccessScope || role.ticketAccessScope || "ALL"
        };
      }
    });
    setRoleFormModules(modMap);

    // Find users currently assigned this role
    const assignedUsers = mergedUsers.filter(u => u.designAccess?.designRole === role.code);
    const assignedIds = assignedUsers.map(u => u.id);
    setRoleFormAssignedUserIds(assignedIds);

    // If assigned users share specific project scope, reflect it
    const specificScopeUser = assignedUsers.find(u => u.designAccess?.projectAccessType === "SPECIFIC");
    if (specificScopeUser?.designAccess?.assignedProjectIds) {
      setRoleFormProjectType("SPECIFIC");
      setRoleFormProjectIds(specificScopeUser.designAccess.assignedProjectIds);
    } else {
      setRoleFormProjectType("ALL");
      setRoleFormProjectIds([]);
    }

    setRoleFormProjectSearch("");
    setRoleFormUserSearch("");
    setIsRoleModalOpen(true);
  };

  const handleOpenCloneRole = (role: DesignRoleDefinition) => {
    setModalMode("CLONE");
    setRoleFormCode(`${role.code}_COPY`);
    setRoleFormLabel(`${role.label} (Copy)`);
    setRoleFormDesc(`Cloned from ${role.label}. ${role.description || ""}`);
    setRoleFormBadgeColor(ROLE_BADGE_COLORS[6].class);

    const policies = DesignMasterStore.getRbacPolicies().filter(p => p.roleCode === role.code && p.projectId === "ALL");
    const modMap: Record<FunctionalModuleCode, ModulePermRow> = JSON.parse(JSON.stringify(DEFAULT_MODULE_PERMS));
    policies.forEach(p => {
      if (p.module !== "ALL" && modMap[p.module as FunctionalModuleCode]) {
        modMap[p.module as FunctionalModuleCode] = {
          module: p.module as FunctionalModuleCode,
          canCreate: p.canCreate,
          canRead: p.canRead,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
          canApprove: !!p.canApprove,
          canExport: !!p.canExport,
          ticketAccessScope: p.ticketAccessScope || role.ticketAccessScope || "ALL"
        };
      }
    });
    setRoleFormModules(modMap);
    setRoleFormProjectType("ALL");
    setRoleFormProjectIds([]);
    setRoleFormAssignedUserIds([]);
    setIsRoleModalOpen(true);
  };

  const handleApplyPreset = (preset: "READ_ONLY" | "FULL_ACCESS" | "CONSULTANT" | "SITE_ENGINEER") => {
    const next: Record<FunctionalModuleCode, ModulePermRow> = JSON.parse(JSON.stringify(roleFormModules));
    MODULE_LIST.forEach(m => {
      if (preset === "READ_ONLY") {
        next[m.code] = { module: m.code, canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "ALL" };
      } else if (preset === "FULL_ACCESS") {
        next[m.code] = { module: m.code, canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true, ticketAccessScope: "ALL" };
      } else if (preset === "CONSULTANT") {
        const isRfi = m.code === "RFIS" || m.code === "DRAWINGS";
        next[m.code] = { module: m.code, canCreate: isRfi, canRead: true, canUpdate: isRfi, canDelete: false, canApprove: false, canExport: false, ticketAccessScope: "ASSIGNED_ONLY" };
      } else if (preset === "SITE_ENGINEER") {
        const isExec = m.code === "TRANSMITTALS" || m.code === "RFIS";
        next[m.code] = { module: m.code, canCreate: isExec, canRead: true, canUpdate: isExec, canDelete: false, canApprove: false, canExport: true, ticketAccessScope: "PROJECT_ONLY" };
      }
    });
    setRoleFormModules(next);
  };

  const handleSaveRoleModal = async () => {
    if (!roleFormLabel.trim()) {
      alert("Please enter a Role Name.");
      return;
    }
    const cleanCode = roleFormCode.trim() || roleFormLabel.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    setIsSaving(true);

    try {
      let savedRole: DesignRoleDefinition;
      if (modalMode === "CREATE" || modalMode === "CLONE") {
        savedRole = DesignMasterStore.addCustomRole({
          code: cleanCode,
          label: roleFormLabel.trim(),
          description: roleFormDesc.trim(),
          badgeColor: roleFormBadgeColor,
          ticketAccessScope: roleFormModules.RFIS?.ticketAccessScope || "ASSIGNED_ONLY",
          defaultPermissions: {
            canMatrixEdit: roleFormModules.DESIGN_MATRIX?.canUpdate ?? true,
            canDrawingsUpload: roleFormModules.DRAWINGS?.canCreate ?? true,
            canDrawingsApproveGfc: roleFormModules.DRAWINGS?.canApprove ?? false,
            canTransmittalsCreate: roleFormModules.TRANSMITTALS?.canCreate ?? true,
            canRfisManage: roleFormModules.RFIS?.canUpdate ?? true,
            canMastersManage: roleFormModules.MASTERS?.canUpdate ?? false
          }
        });
      } else {
        savedRole = DesignMasterStore.updateCustomRole(cleanCode, {
          label: roleFormLabel.trim(),
          description: roleFormDesc.trim(),
          badgeColor: roleFormBadgeColor,
          ticketAccessScope: roleFormModules.RFIS?.ticketAccessScope || "ASSIGNED_ONLY",
          defaultPermissions: {
            canMatrixEdit: roleFormModules.DESIGN_MATRIX?.canUpdate ?? true,
            canDrawingsUpload: roleFormModules.DRAWINGS?.canCreate ?? true,
            canDrawingsApproveGfc: roleFormModules.DRAWINGS?.canApprove ?? false,
            canTransmittalsCreate: roleFormModules.TRANSMITTALS?.canCreate ?? true,
            canRfisManage: roleFormModules.RFIS?.canUpdate ?? true,
            canMastersManage: roleFormModules.MASTERS?.canUpdate ?? false
          }
        });
      }

      // Save all module policies
      const policiesToSave: DesignRbacPolicy[] = MODULE_LIST.map(m => {
        const conf = roleFormModules[m.code] || DEFAULT_MODULE_PERMS[m.code];
        return {
          id: `rbac-${cleanCode.toLowerCase()}-all-${m.code.toLowerCase()}`,
          roleCode: cleanCode,
          roleName: savedRole.label,
          projectId: "ALL",
          projectName: "All Development Projects",
          module: m.code,
          canCreate: conf.canCreate,
          canRead: conf.canRead,
          canUpdate: conf.canUpdate,
          canDelete: conf.canDelete,
          canApprove: conf.canApprove,
          canExport: conf.canExport,
          ticketAccessScope: conf.ticketAccessScope,
          updatedAt: new Date().toISOString()
        };
      });

      policiesToSave.forEach(p => DesignMasterStore.saveRbacPolicy(p));
      await saveRbacPoliciesAction(policiesToSave);

      // Assign selected users
      if (roleFormAssignedUserIds.length > 0) {
        for (const uId of roleFormAssignedUserIds) {
          const userPayload = {
            userId: uId,
            designRole: cleanCode as DesignRoleCode,
            projectAccessType: roleFormProjectType,
            assignedProjectIds: roleFormProjectType === "SPECIFIC" ? roleFormProjectIds : [],
            canMatrixEdit: roleFormModules.DESIGN_MATRIX?.canUpdate ?? true,
            canDrawingsUpload: roleFormModules.DRAWINGS?.canCreate ?? true,
            canDrawingsApproveGfc: roleFormModules.DRAWINGS?.canApprove ?? false,
            canTransmittalsCreate: roleFormModules.TRANSMITTALS?.canCreate ?? true,
            canRfisManage: roleFormModules.RFIS?.canUpdate ?? true,
            canMastersManage: roleFormModules.MASTERS?.canUpdate ?? false,
            ticketAccessScope: roleFormModules.RFIS?.ticketAccessScope || "ALL",
            updatedBy: "Design Administrator"
          };
          DesignMasterStore.saveUserAccess(userPayload);
          await saveDesignUserAccessAction(userPayload);
        }
      }

      setSelectedBuilderRoleCode(cleanCode);
      setIsRoleModalOpen(false);
      setFeedbackMessage({
        type: "success",
        text: `Role '${savedRole.label}' and its module permissions saved successfully.`
      });
      loadWorkspaceUsers();
    } catch (err: any) {
      alert(err.message || "Failed to save role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteRole = () => {
    if (!roleToDelete) return;
    try {
      DesignMasterStore.deleteCustomRole(roleToDelete.code);
      setSelectedBuilderRoleCode("DESIGN_ADMIN");
      setRoleToDelete(null);
      setFeedbackMessage({
        type: "success",
        text: `Role '${roleToDelete.label}' has been deleted.`
      });
    } catch (err: any) {
      alert(err.message || "Failed to delete role");
    }
  };

  // User Drawer Handlers
  const handleOpenDrawer = (user: DesignWorkspaceUser) => {
    setDrawerUserId(user.id);
    const access = user.designAccess;
    const assignedRole = access?.designRole || "DESIGN_COORDINATOR";
    setDrawerDesignRole(assignedRole);
    setDrawerProjectAccessType(access?.projectAccessType || "ALL");
    setDrawerAssignedProjectIds(access?.assignedProjectIds || []);
    setDrawerProjectSearch("");
    setDrawerTicketScope(access?.ticketAccessScope || "ALL");

    if (access) {
      setPermMatrixEdit(access.canMatrixEdit);
      setPermDrawingsUpload(access.canDrawingsUpload);
      setPermGfcApproval(access.canDrawingsApproveGfc);
      setPermTransmittalsCreate(access.canTransmittalsCreate);
      setPermRfisManage(access.canRfisManage);
      setPermMastersManage(access.canMastersManage);
    } else {
      const def = roleMap.get(assignedRole)?.defaultPermissions;
      setPermMatrixEdit(def?.canMatrixEdit ?? true);
      setPermDrawingsUpload(def?.canDrawingsUpload ?? true);
      setPermGfcApproval(def?.canDrawingsApproveGfc ?? false);
      setPermTransmittalsCreate(def?.canTransmittalsCreate ?? true);
      setPermRfisManage(def?.canRfisManage ?? true);
      setPermMastersManage(def?.canMastersManage ?? false);
    }
    setIsDrawerOpen(true);
  };

  const handleSaveDrawerAccess = async () => {
    if (!drawerUserId) return;
    setIsSaving(true);
    try {
      const payload = {
        userId: drawerUserId,
        designRole: drawerDesignRole,
        projectAccessType: drawerProjectAccessType,
        assignedProjectIds: drawerProjectAccessType === "SPECIFIC" ? drawerAssignedProjectIds : [],
        canMatrixEdit: permMatrixEdit,
        canDrawingsUpload: permDrawingsUpload,
        canDrawingsApproveGfc: permGfcApproval,
        canTransmittalsCreate: permTransmittalsCreate,
        canRfisManage: permRfisManage,
        canMastersManage: permMastersManage,
        ticketAccessScope: drawerTicketScope,
        updatedBy: "Design Administrator"
      };

      DesignMasterStore.saveUserAccess(payload);
      const res = await saveDesignUserAccessAction(payload);
      if (res.success) {
        setFeedbackMessage({ type: "success", text: "User access updated successfully." });
        setIsDrawerOpen(false);
        loadWorkspaceUsers();
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to update." });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleModuleAccess = async (user: DesignWorkspaceUser, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !user.hasModuleAccess;
    setTogglingUserId(user.id);
    try {
      const res = await toggleUserDesignModuleAccessAction(user.id, newStatus);
      if (res.success) {
        if (!newStatus) {
          DesignMasterStore.deleteUserAccess(user.id);
        } else {
          DesignMasterStore.saveUserAccess({
            userId: user.id,
            designRole: "DESIGN_COORDINATOR",
            projectAccessType: "ALL",
            assignedProjectIds: [],
            canMatrixEdit: true,
            canDrawingsUpload: true,
            canDrawingsApproveGfc: false,
            canTransmittalsCreate: true,
            canRfisManage: true,
            canMastersManage: false,
            ticketAccessScope: "ALL"
          });
        }
        setFeedbackMessage({ type: "success", text: `${user.fullName} access ${newStatus ? "enabled" : "disabled"}.` });
        loadWorkspaceUsers();
      }
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message });
    } finally {
      setTogglingUserId(null);
    }
  };

  // Policy Matrix Helper
  const getPolicy = (moduleCode: DesignRbacPolicy["module"]) => {
    const match = policyRecords.find(p => p.roleCode === matrixRole && p.projectId === matrixProject && p.module === moduleCode);
    if (match) return match;
    const fallback = policyRecords.find(p => p.roleCode === matrixRole && p.projectId === "ALL" && p.module === moduleCode);
    if (fallback) return fallback;

    const roleObj = roleMap.get(matrixRole);
    return {
      id: `rbac-${matrixRole.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: roleObj?.label || matrixRole,
      projectId: matrixProject,
      projectName: matrixProject === "ALL" ? "All Development Projects" : (projectMap.get(matrixProject)?.name || matrixProject),
      module: moduleCode,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
      canApprove: false,
      canExport: true,
      ticketAccessScope: roleObj?.ticketAccessScope || "ALL",
      updatedAt: new Date().toISOString()
    };
  };

  const handlePolicyToggle = (moduleCode: DesignRbacPolicy["module"], field: "canCreate" | "canRead" | "canUpdate" | "canDelete" | "canApprove" | "canExport") => {
    const current = getPolicy(moduleCode);
    const roleObj = roleMap.get(matrixRole);
    const updated: DesignRbacPolicy = {
      ...current,
      id: `rbac-${matrixRole.toLowerCase()}-${matrixProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: roleObj?.label || matrixRole,
      projectId: matrixProject,
      projectName: matrixProject === "ALL" ? "All Development Projects" : (projectMap.get(matrixProject)?.name || matrixProject),
      [field]: !current[field],
      updatedAt: new Date().toISOString()
    };
    DesignMasterStore.saveRbacPolicy(updated);
    setPolicyRecords(DesignMasterStore.getRbacPolicies());
  };

  const handlePolicyTicketScopeChange = (moduleCode: DesignRbacPolicy["module"], newScope: DesignTicketAccessScope) => {
    const current = getPolicy(moduleCode);
    const roleObj = roleMap.get(matrixRole);
    const updated: DesignRbacPolicy = {
      ...current,
      id: `rbac-${matrixRole.toLowerCase()}-${matrixProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: roleObj?.label || matrixRole,
      projectId: matrixProject,
      projectName: matrixProject === "ALL" ? "All Development Projects" : (projectMap.get(matrixProject)?.name || matrixProject),
      ticketAccessScope: newScope,
      updatedAt: new Date().toISOString()
    };
    DesignMasterStore.saveRbacPolicy(updated);
    setPolicyRecords(DesignMasterStore.getRbacPolicies());
  };

  const handleSaveAllPolicies = async () => {
    setIsSavingPolicies(true);
    try {
      const allPolicies = DesignMasterStore.getRbacPolicies();
      await saveRbacPoliciesAction(allPolicies);
      setFeedbackMessage({ type: "success", text: `Policies committed successfully for ${roleMap.get(matrixRole)?.label || matrixRole}.` });
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingPolicies(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-12 animate-in fade-in duration-200">
      {/* 1. Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-theme-btn-primary/10 text-theme-icon flex items-center justify-center border border-theme-btn-primary/20 shrink-0">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Design & Tracking RBAC Governance
            </h1>
            <p className="text-xs text-muted">
              Role permissions, ticket-based scopes, and user project access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadWorkspaceUsers}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-foreground bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-theme-icon" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="px-4 py-2 text-xs font-bold text-theme-btn-primary-text bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200 ${
          feedbackMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMessage(null)} className="hover:opacity-75 p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("ROLES_BUILDER")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "ROLES_BUILDER"
              ? "border-theme-btn-primary text-theme-icon bg-theme-btn-primary/10 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Roles & Permissions</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface text-muted font-bold">
            {allRoles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PERSONNEL")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "PERSONNEL"
              ? "border-theme-btn-primary text-theme-icon bg-theme-btn-primary/10 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Personnel Directory</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface text-muted font-bold">
            {filteredUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("POLICY_MATRIX")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "POLICY_MATRIX"
              ? "border-theme-btn-primary text-theme-icon bg-theme-btn-primary/10 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Policy Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SIMULATOR")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "SIMULATOR"
              ? "border-theme-btn-primary text-theme-icon bg-theme-btn-primary/10 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Play className="h-4 w-4" />
          <span>Permission Tester</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: ROLES & PERMISSIONS BUILDER                                      */}
      {/* ======================================================================= */}
      {activeTab === "ROLES_BUILDER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Roles List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Defined Roles</span>
              <button
                type="button"
                onClick={handleOpenCreateRole}
                className="text-xs font-bold text-theme-icon hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> New Role
              </button>
            </div>

            <div className="space-y-1.5">
              {allRoles.map(role => {
                const isSelected = selectedBuilderRoleCode === role.code;
                const userCount = mergedUsers.filter(u => u.designAccess?.designRole === role.code).length;

                return (
                  <div
                    key={role.code}
                    onClick={() => setSelectedBuilderRoleCode(role.code)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-theme-btn-primary/10 border-theme-btn-primary/40 ring-1 ring-theme-btn-primary/30 shadow-xs"
                        : "bg-surface border-border/80 hover:border-border hover:bg-surface/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">{role.label}</span>
                        {role.isSystem ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            System
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${role.badgeColor || "bg-indigo-500/15 text-indigo-600"}`}>
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted truncate mt-0.5">{role.code}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-semibold">{userCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Role Overview & Permissions */}
          <div className="lg:col-span-8 space-y-4">
            {currentBuilderRole && (
              <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs space-y-5">
                {/* Role Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-foreground">{currentBuilderRole.label}</h2>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${currentBuilderRole.badgeColor || "bg-indigo-500/15 text-indigo-600"}`}>
                        {currentBuilderRole.code}
                      </span>
                    </div>
                    {currentBuilderRole.description && (
                      <p className="text-xs text-muted">{currentBuilderRole.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenCloneRole(currentBuilderRole)}
                      className="px-3 py-1.5 text-xs font-semibold text-foreground bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      title="Clone role into a new custom role"
                    >
                      <Copy className="h-3.5 w-3.5 text-theme-icon" />
                      <span>Clone</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(currentBuilderRole)}
                      className="px-3 py-1.5 text-xs font-semibold text-foreground bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-amber-500" />
                      <span>Edit</span>
                    </button>

                    {!currentBuilderRole.isSystem && (
                      <button
                        type="button"
                        onClick={() => setRoleToDelete(currentBuilderRole)}
                        className="p-1.5 text-xs text-danger hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                        title="Delete custom role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Module Permissions Matrix */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Module Permissions & Ticket Scopes</span>
                  <div className="border border-border/80 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase">
                          <th className="py-2.5 px-3">Module</th>
                          <th className="py-2.5 px-2 text-center">View</th>
                          <th className="py-2.5 px-2 text-center">Create</th>
                          <th className="py-2.5 px-2 text-center">Edit</th>
                          <th className="py-2.5 px-2 text-center">Delete</th>
                          <th className="py-2.5 px-2 text-center">Approve</th>
                          <th className="py-2.5 px-2 text-center">Export</th>
                          <th className="py-2.5 px-3">Ticket Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {MODULE_LIST.map(m => {
                          const pol = policyRecords.find(p => p.roleCode === currentBuilderRole.code && p.projectId === "ALL" && p.module === m.code);
                          const canR = pol ? pol.canRead : true;
                          const canC = pol ? pol.canCreate : false;
                          const canU = pol ? pol.canUpdate : false;
                          const canD = pol ? pol.canDelete : false;
                          const canA = pol ? !!pol.canApprove : false;
                          const canE = pol ? !!pol.canExport : true;
                          const tScope = pol?.ticketAccessScope || currentBuilderRole.ticketAccessScope || "ALL";

                          return (
                            <tr key={m.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                                <m.icon className="h-3.5 w-3.5 text-muted" />
                                <span>{m.label}</span>
                              </td>
                              <td className="py-2.5 px-2 text-center">{canR ? <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted mx-auto" />}</td>
                              <td className="py-2.5 px-2 text-center">{canC ? <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted mx-auto" />}</td>
                              <td className="py-2.5 px-2 text-center">{canU ? <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted mx-auto" />}</td>
                              <td className="py-2.5 px-2 text-center">{canD ? <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted mx-auto" />}</td>
                              <td className="py-2.5 px-2 text-center">{canA ? <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted mx-auto" />}</td>
                              <td className="py-2.5 px-2 text-center">{canE ? <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted mx-auto" />}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  tScope === "ALL" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                                  tScope === "ASSIGNED_ONLY" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                  tScope === "NONE" ? "bg-rose-500/10 text-danger" :
                                  "bg-purple-500/10 text-theme-icon"
                                }`}>
                                  {TICKET_SCOPE_OPTIONS.find(o => o.value === tScope)?.label || tScope}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assigned Users List */}
                <div className="space-y-2 pt-2 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Assigned Personnel ({mergedUsers.filter(u => u.designAccess?.designRole === currentBuilderRole.code).length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {mergedUsers.filter(u => u.designAccess?.designRole === currentBuilderRole.code).length === 0 ? (
                      <p className="text-xs text-muted italic">No personnel currently assigned to this role.</p>
                    ) : (
                      mergedUsers.filter(u => u.designAccess?.designRole === currentBuilderRole.code).map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold">
                          <span className="text-foreground">{u.fullName}</span>
                          <span className="text-[10px] text-muted font-normal">({u.designAccess?.projectAccessType === "SPECIFIC" ? "Specific Projects" : "Global"})</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: PERSONNEL DIRECTORY                                              */}
      {/* ======================================================================= */}
      {activeTab === "PERSONNEL" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border/80 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search personnel by name, email, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none text-foreground"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                {allRoles.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>

              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Scopes</option>
                <option value="GLOBAL">Global</option>
                <option value="SPECIFIC">Specific Projects</option>
              </select>
            </div>
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase">
                  <th className="py-3 px-4">Personnel</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Project Scope</th>
                  <th className="py-3 px-3">Module Access</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">No personnel found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const access = user.designAccess;
                    const roleMeta = access?.designRole ? roleMap.get(access.designRole) : null;
                    const isToggling = togglingUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{user.fullName}</div>
                          <div className="text-[11px] text-muted">{user.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          {roleMeta ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${roleMeta.badgeColor || "bg-indigo-500/15 text-indigo-600"}`}>
                              {roleMeta.label}
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-semibold text-foreground">
                            {access?.projectAccessType === "SPECIFIC" ? `Specific (${access.assignedProjectIds?.length || 0} Projects)` : "Global"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={(e) => handleToggleModuleAccess(user, e)}
                            disabled={isToggling}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              user.hasModuleAccess
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-rose-500/10 hover:text-danger"
                                : "bg-slate-500/10 text-muted border border-slate-500/20 hover:bg-emerald-500/10 hover:text-emerald-600"
                            }`}
                          >
                            {user.hasModuleAccess ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(user)}
                            className="px-3 py-1 text-xs font-semibold text-foreground bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-lg transition-all"
                          >
                            Configure
                          </button>
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

      {/* ======================================================================= */}
      {/* TAB 3: POLICY MATRIX                                                    */}
      {/* ======================================================================= */}
      {activeTab === "POLICY_MATRIX" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted">Role:</span>
                <select
                  value={matrixRole}
                  onChange={(e) => setMatrixRole(e.target.value)}
                  className="text-xs bg-background border border-border rounded-xl px-3 py-1.5 text-foreground font-semibold"
                >
                  {allRoles.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted">Project:</span>
                <select
                  value={matrixProject}
                  onChange={(e) => setMatrixProject(e.target.value)}
                  className="text-xs bg-background border border-border rounded-xl px-3 py-1.5 text-foreground font-semibold"
                >
                  <option value="ALL">Global (All Projects)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAllPolicies}
              disabled={isSavingPolicies}
              className="px-4 py-1.5 text-xs font-bold text-theme-btn-primary-text bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>{isSavingPolicies ? "Saving..." : "Commit Policies"}</span>
            </button>
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase">
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-3 text-center">View</th>
                  <th className="py-3 px-3 text-center">Create</th>
                  <th className="py-3 px-3 text-center">Edit</th>
                  <th className="py-3 px-3 text-center">Delete</th>
                  <th className="py-3 px-3 text-center">Approve</th>
                  <th className="py-3 px-3 text-center">Export</th>
                  <th className="py-3 px-4">Ticket Access Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {MODULE_LIST.map(m => {
                  const pol = getPolicy(m.code);
                  return (
                    <tr key={m.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                        <m.icon className="h-4 w-4 text-muted" />
                        <span>{m.label}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" checked={pol.canRead} onChange={() => handlePolicyToggle(m.code, "canRead")} className="rounded text-theme-icon h-4 w-4" />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" checked={pol.canCreate} onChange={() => handlePolicyToggle(m.code, "canCreate")} className="rounded text-theme-icon h-4 w-4" />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" checked={pol.canUpdate} onChange={() => handlePolicyToggle(m.code, "canUpdate")} className="rounded text-theme-icon h-4 w-4" />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" checked={pol.canDelete} onChange={() => handlePolicyToggle(m.code, "canDelete")} className="rounded text-theme-icon h-4 w-4" />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" checked={!!pol.canApprove} onChange={() => handlePolicyToggle(m.code, "canApprove")} className="rounded text-theme-icon h-4 w-4" />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" checked={!!pol.canExport} onChange={() => handlePolicyToggle(m.code, "canExport")} className="rounded text-theme-icon h-4 w-4" />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={pol.ticketAccessScope || "ALL"}
                          onChange={(e) => handlePolicyTicketScopeChange(m.code, e.target.value as DesignTicketAccessScope)}
                          className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground"
                        >
                          {TICKET_SCOPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: PERMISSION TESTER (SIMULATOR)                                    */}
      {/* ======================================================================= */}
      {activeTab === "SIMULATOR" && (
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Test User</label>
              <select
                value={simUserId}
                onChange={(e) => setSimUserId(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
              >
                {mergedUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.designAccess?.designRole || "No Role"})</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Target Project</label>
              <select
                value={simProjectId}
                onChange={(e) => setSimProjectId(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
              >
                <option value="ALL">Global (All Projects)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Target Module</label>
              <select
                value={simModule}
                onChange={(e) => setSimModule(e.target.value as any)}
                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
              >
                {MODULE_LIST.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={simIsAssignee} onChange={e => setSimIsAssignee(e.target.checked)} className="rounded text-theme-icon" />
              <span>Simulate User as Ticket Assignee</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={simIsCreator} onChange={e => setSimIsCreator(e.target.checked)} className="rounded text-theme-icon" />
              <span>Simulate User as Ticket Creator</span>
            </label>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ALL-IN-ONE CREATE / EDIT ROLE MODAL                                     */}
      {/* ======================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-surface">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-theme-icon" />
                <h3 className="text-base font-bold text-foreground">
                  {modalMode === "CREATE" ? "Create New Role" : modalMode === "CLONE" ? "Clone Role" : "Edit Role"}
                </h3>
              </div>
              <button type="button" onClick={() => setIsRoleModalOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-6 custom-scrollbar">
              {/* 1. Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-foreground">Role Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Façade Consultant"
                    value={roleFormLabel}
                    onChange={(e) => {
                      setRoleFormLabel(e.target.value);
                      if (modalMode === "CREATE") {
                        setRoleFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"));
                      }
                    }}
                    className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-foreground">Role Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. FACADE_CONSULTANT"
                    value={roleFormCode}
                    onChange={(e) => setRoleFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                    disabled={modalMode === "EDIT" && currentBuilderRole.isSystem}
                    className="w-full text-xs font-mono bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-foreground">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={roleFormDesc}
                    onChange={(e) => setRoleFormDesc(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Badge Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Badge Theme</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_BADGE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRoleFormBadgeColor(c.class)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${c.class} ${roleFormBadgeColor === c.class ? "ring-2 ring-theme-btn-primary" : "opacity-75"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Module Permissions & Ticket Scopes */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Module Permissions & Ticket Scopes</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-muted mr-1">Presets:</span>
                    <button type="button" onClick={() => handleApplyPreset("READ_ONLY")} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border hover:bg-slate-100 dark:hover:bg-slate-800">
                      Read Only
                    </button>
                    <button type="button" onClick={() => handleApplyPreset("FULL_ACCESS")} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border hover:bg-slate-100 dark:hover:bg-slate-800">
                      Full Access
                    </button>
                    <button type="button" onClick={() => handleApplyPreset("CONSULTANT")} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border hover:bg-slate-100 dark:hover:bg-slate-800">
                      Consultant
                    </button>
                    <button type="button" onClick={() => handleApplyPreset("SITE_ENGINEER")} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border hover:bg-slate-100 dark:hover:bg-slate-800">
                      Site Engineer
                    </button>
                  </div>
                </div>

                <div className="border border-border/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase">
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-2 text-center">View</th>
                        <th className="py-2.5 px-2 text-center">Create</th>
                        <th className="py-2.5 px-2 text-center">Edit</th>
                        <th className="py-2.5 px-2 text-center">Delete</th>
                        <th className="py-2.5 px-2 text-center">Approve</th>
                        <th className="py-2.5 px-2 text-center">Export</th>
                        <th className="py-2.5 px-3">Ticket / Item Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {MODULE_LIST.map(m => {
                        const conf = roleFormModules[m.code] || DEFAULT_MODULE_PERMS[m.code];
                        const updateConf = (field: keyof ModulePermRow, val: any) => {
                          setRoleFormModules(prev => ({
                            ...prev,
                            [m.code]: { ...prev[m.code], [field]: val }
                          }));
                        };

                        return (
                          <tr key={m.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                              <m.icon className="h-3.5 w-3.5 text-muted" />
                              <span>{m.label}</span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={conf.canRead} onChange={e => updateConf("canRead", e.target.checked)} className="rounded text-theme-icon h-4 w-4" />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={conf.canCreate} onChange={e => updateConf("canCreate", e.target.checked)} className="rounded text-theme-icon h-4 w-4" />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={conf.canUpdate} onChange={e => updateConf("canUpdate", e.target.checked)} className="rounded text-theme-icon h-4 w-4" />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={conf.canDelete} onChange={e => updateConf("canDelete", e.target.checked)} className="rounded text-theme-icon h-4 w-4" />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={conf.canApprove} onChange={e => updateConf("canApprove", e.target.checked)} className="rounded text-theme-icon h-4 w-4" />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={conf.canExport} onChange={e => updateConf("canExport", e.target.checked)} className="rounded text-theme-icon h-4 w-4" />
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={conf.ticketAccessScope}
                                onChange={e => updateConf("ticketAccessScope", e.target.value as DesignTicketAccessScope)}
                                className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground"
                              >
                                {TICKET_SCOPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Project Governance Scope */}
              <div className="space-y-2.5 pt-2 border-t border-border/80">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Project Access Scope</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="projectScope"
                      checked={roleFormProjectType === "ALL"}
                      onChange={() => setRoleFormProjectType("ALL")}
                      className="text-theme-icon"
                    />
                    <span>All Projects (Global)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="projectScope"
                      checked={roleFormProjectType === "SPECIFIC"}
                      onChange={() => setRoleFormProjectType("SPECIFIC")}
                      className="text-theme-icon"
                    />
                    <span>Specific Projects</span>
                  </label>
                </div>

                {roleFormProjectType === "SPECIFIC" && (
                  <div className="space-y-2 border border-border rounded-xl p-3 bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={roleFormProjectSearch}
                        onChange={e => setRoleFormProjectSearch(e.target.value)}
                        className="text-xs bg-surface border border-border rounded-lg px-2.5 py-1 text-foreground flex-1 focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setRoleFormProjectIds(projects.map(p => p.id))} className="text-[10px] font-bold text-theme-icon hover:underline">
                          Select All
                        </button>
                        <button type="button" onClick={() => setRoleFormProjectIds([])} className="text-[10px] font-bold text-muted hover:underline">
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
                      {projects
                        .filter(p => !roleFormProjectSearch || p.name.toLowerCase().includes(roleFormProjectSearch.toLowerCase()) || p.code.toLowerCase().includes(roleFormProjectSearch.toLowerCase()))
                        .map(p => {
                          const isAssigned = roleFormProjectIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 p-1 rounded text-xs font-medium cursor-pointer hover:bg-surface">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => {
                                  setRoleFormProjectIds(prev => isAssigned ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                                }}
                                className="rounded text-theme-icon h-3.5 w-3.5"
                              />
                              <span className="truncate">{p.name} ({p.code})</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Assign Personnel (Optional) */}
              <div className="space-y-2.5 pt-2 border-t border-border/80">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Assign Users to this Role</span>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={roleFormUserSearch}
                  onChange={e => setRoleFormUserSearch(e.target.value)}
                  className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground w-full focus:outline-none"
                />

                <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar border border-border rounded-xl p-2 bg-background">
                  {mergedUsers
                    .filter(u => !roleFormUserSearch || u.fullName.toLowerCase().includes(roleFormUserSearch.toLowerCase()) || u.email.toLowerCase().includes(roleFormUserSearch.toLowerCase()))
                    .map(u => {
                      const isAssigned = roleFormAssignedUserIds.includes(u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-2 p-1 rounded text-xs font-medium cursor-pointer hover:bg-surface">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => {
                              setRoleFormAssignedUserIds(prev => isAssigned ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                            }}
                            className="rounded text-theme-icon h-3.5 w-3.5"
                          />
                          <span className="font-semibold text-foreground truncate">{u.fullName}</span>
                          <span className="text-[10px] text-muted truncate">({u.email})</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-border/80 flex items-center justify-end gap-2 bg-surface shrink-0">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoleModal}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-theme-btn-primary-text bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs"
              >
                {isSaving ? "Saving..." : "Save Role & Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer for Individual User Configuration */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-surface border-l border-border w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">User Permissions</h3>
                <p className="text-xs text-muted">{selectedDrawerUser?.fullName}</p>
              </div>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Role</label>
                <select
                  value={drawerDesignRole}
                  onChange={(e) => {
                    setDrawerDesignRole(e.target.value as DesignRoleCode);
                    const def = roleMap.get(e.target.value)?.defaultPermissions;
                    if (def) {
                      setPermMatrixEdit(def.canMatrixEdit);
                      setPermDrawingsUpload(def.canDrawingsUpload);
                      setPermGfcApproval(def.canDrawingsApproveGfc);
                      setPermTransmittalsCreate(def.canTransmittalsCreate);
                      setPermRfisManage(def.canRfisManage);
                      setPermMastersManage(def.canMastersManage);
                    }
                  }}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
                >
                  {allRoles.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Ticket Scope</label>
                <select
                  value={drawerTicketScope}
                  onChange={(e) => setDrawerTicketScope(e.target.value as DesignTicketAccessScope)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                >
                  {TICKET_SCOPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <span className="font-bold text-foreground">Project Scope</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="drProj" checked={drawerProjectAccessType === "ALL"} onChange={() => setDrawerProjectAccessType("ALL")} />
                    <span>Global</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="drProj" checked={drawerProjectAccessType === "SPECIFIC"} onChange={() => setDrawerProjectAccessType("SPECIFIC")} />
                    <span>Specific</span>
                  </label>
                </div>

                {drawerProjectAccessType === "SPECIFIC" && (
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar border border-border rounded-xl p-2 bg-background">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={drawerAssignedProjectIds.includes(p.id)}
                          onChange={() => {
                            setDrawerAssignedProjectIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                          }}
                          className="rounded text-theme-icon h-3.5 w-3.5"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-surface">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                Cancel
              </button>
              <button type="button" onClick={handleSaveDrawerAccess} disabled={isSaving} className="px-5 py-2 text-xs font-bold text-theme-btn-primary-text bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs">
                {isSaving ? "Saving..." : "Save Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-rose-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground">Delete Custom Role?</h3>
            <p className="text-xs text-muted">This will remove '{roleToDelete.label}' ({roleToDelete.code}) and its policies.</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button type="button" onClick={() => setRoleToDelete(null)} className="px-4 py-2 text-xs font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={handleConfirmDeleteRole} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
