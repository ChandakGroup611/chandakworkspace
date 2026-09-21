"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Users, 
  UserPlus, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  RefreshCw, 
  FileText, 
  Check, 
  Layers, 
  Globe, 
  Building, 
  ChevronDown, 
  Sparkles, 
  AlertCircle,
  FileSpreadsheet,
  Send,
  HelpCircle,
  Settings,
  X,
  UserCheck,
  Briefcase,
  Sliders,
  ChevronRight,
  ExternalLink,
  Copy,
  Download,
  Info,
  Car,
  FolderKanban,
  CheckSquare,
  Square,
  Shield,
  Eye,
  Plus,
  Play,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  FolderCheck,
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

// Badge colors palette for custom role creation
const ROLE_BADGE_COLORS = [
  { id: "amber", label: "Amber / Gold", class: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { id: "indigo", label: "Indigo / Violet", class: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
  { id: "blue", label: "Sky Blue", class: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { id: "emerald", label: "Emerald Green", class: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { id: "cyan", label: "Cyan / Teal", class: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
  { id: "orange", label: "Orange / Coral", class: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  { id: "purple", label: "Royal Purple", class: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  { id: "slate", label: "Neutral Slate", class: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
  { id: "rose", label: "Rose Crimson", class: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" }
];

const TICKET_SCOPE_OPTIONS: Array<{ value: DesignTicketAccessScope; label: string; icon: any; desc: string }> = [
  { value: "ALL", label: "All Items (Global Project)", icon: Globe, desc: "Full visibility across all drawings, transmittals, queries and matrix entries." },
  { value: "ASSIGNED_ONLY", label: "Assigned Only (Consultant / User Scoped)", icon: Target, desc: "Restricted strictly to RFIs, drawings, or tasks assigned to this user or their firm." },
  { value: "CREATED_ONLY", label: "Created / Raised by Me Only", icon: UserCheck, desc: "Only allows managing items/RFIs initially submitted by this specific person." },
  { value: "PROJECT_ONLY", label: "Assigned Projects Scope Only", icon: Building2, desc: "Restricted to records belonging to explicitly assigned construction projects." },
  { value: "DEPARTMENT_ONLY", label: "Department / Team Scope Only", icon: Briefcase, desc: "Access limited to records originating within the user's operational department." },
  { value: "NONE", label: "Explicit Deny (No Access)", icon: XCircle, desc: "Blocks all access to items in this functional module." }
];

const MODULE_LIST: Array<{ code: DesignRbacPolicy["module"]; label: string; icon: any; desc: string }> = [
  { code: "DESIGN_MATRIX", label: "Tender Design Matrix", icon: Layers, desc: "Package schedule, delivery dates & consultant allocations" },
  { code: "DRAWINGS", label: "Drawing Sheet Register", icon: FileText, desc: "Architectural, structural & MEP sheet registers" },
  { code: "LOOK_AHEAD", label: "30/60 Day Look-Ahead", icon: Sparkles, desc: "Upcoming milestone forecasts and expedited schedules" },
  { code: "LIAISON", label: "Statutory Liaisoning", icon: ShieldCheck, desc: "Authority NOCs, file numbers and approval stages" },
  { code: "TRANSMITTALS", label: "Transmittals & GFC Slips", icon: Send, desc: "Formal digital dispatches and site handovers" },
  { code: "RFIS", label: "RFI & Site Queries (Tickets)", icon: HelpCircle, desc: "Site clarifications, design clashes, queries & responses" },
  { code: "CONSULTANTS", label: "Consultant Directory", icon: Users, desc: "Empanelled vendor agreements and contact book" },
  { code: "MASTERS", label: "Masters Setup", icon: Settings, desc: "Projects, towers, work packages and disciplines" }
];

export const DesignRbacGovernance: React.FC = () => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [workspaceUsers, setWorkspaceUsers] = useState<DesignWorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active View Tabs: PERSONNEL | ROLE_BUILDER | ROLES_MATRIX | SIMULATOR
  const [activeTab, setActiveTab] = useState<"PERSONNEL" | "ROLE_BUILDER" | "ROLES_MATRIX" | "SIMULATOR">("PERSONNEL");

  // Filters & Search for Tab 1 (Personnel)
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

  // Dynamic Role Builder State (Tab 2)
  const [selectedBuilderRoleCode, setSelectedBuilderRoleCode] = useState<string>("DESIGN_ADMIN");
  const [isCreatingRoleModal, setIsCreatingRoleModal] = useState(false);
  const [isEditingRoleModal, setIsEditingRoleModal] = useState(false);
  const [isCloningRoleModal, setIsCloningRoleModal] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    code: "",
    label: "",
    description: "",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    ticketAccessScope: "ASSIGNED_ONLY" as DesignTicketAccessScope,
    canMatrixEdit: true,
    canDrawingsUpload: true,
    canDrawingsApproveGfc: false,
    canTransmittalsCreate: true,
    canRfisManage: true,
    canMastersManage: false
  });
  const [roleToDelete, setRoleToDelete] = useState<DesignRoleDefinition | null>(null);

  // Role-Based & Ticket-Based Policy Matrix State (Tab 3)
  const [matrixRole, setMatrixRole] = useState<string>("DESIGN_COORDINATOR");
  const [matrixProject, setMatrixProject] = useState<string>("ALL");
  const [policyRecords, setPolicyRecords] = useState<DesignRbacPolicy[]>(() => DesignMasterStore.getRbacPolicies());
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

  // Live Permission Simulator State (Tab 4)
  const [simUserId, setSimUserId] = useState<string>("");
  const [simProjectId, setSimProjectId] = useState<string>("ALL");
  const [simModule, setSimModule] = useState<DesignRbacPolicy["module"]>("RFIS");
  const [simIsAssignee, setSimIsAssignee] = useState(false);
  const [simIsCreator, setSimIsCreator] = useState(false);

  // Listen to DesignMasterStore
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
      setPolicyRecords(DesignMasterStore.getRbacPolicies());
    });
    return () => unsubscribe();
  }, []);

  // Fetch workspace users from server action
  const loadWorkspaceUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchDesignWorkspaceUsersAction();
      if (res.success && res.users) {
        setWorkspaceUsers(res.users);

        // Synchronize store's local user access list with remote
        res.users.forEach(u => {
          if (u.designAccess) {
            DesignMasterStore.saveUserAccess(u.designAccess);
          }
        });
      } else {
        // Fallback: build representation from store's userAccessList
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
      console.warn("Could not fetch workspace users, using local store fallback:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceUsers();
  }, []);

  // Roles list from store (Standard + Custom)
  const allRoles = useMemo(() => {
    return DesignMasterStore.getRoles();
  }, [storeState.customRoles]);

  const roleMap = useMemo(() => {
    return new Map(allRoles.map(r => [r.code, r]));
  }, [allRoles]);

  // Projects list from store
  const projects = storeState.projects || [];
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    workspaceUsers.forEach(u => {
      if (u.departmentName) set.add(u.departmentName);
    });
    return Array.from(set).sort();
  }, [workspaceUsers]);

  // Merge workspace users with local store access updates
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

  // Set default sim user once loaded
  useEffect(() => {
    if (!simUserId && mergedUsers.length > 0) {
      setSimUserId(mergedUsers[0].id);
    }
  }, [mergedUsers, simUserId]);

  // Filtered users for Personnel Table
  const filteredUsers = useMemo(() => {
    return mergedUsers.filter(u => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchDept = u.departmentName?.toLowerCase().includes(q);
        const matchDesig = u.designationName?.toLowerCase().includes(q);
        const matchCode = u.userCode?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept && !matchDesig && !matchCode) {
          return false;
        }
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

      if (deptFilter !== "ALL") {
        if (u.departmentName !== deptFilter) return false;
      }

      return true;
    });
  }, [mergedUsers, searchQuery, roleFilter, scopeFilter, moduleAccessFilter, deptFilter]);

  // KPIs
  const totalWorkspaceCount = mergedUsers.length;
  const activeTrackingUsersCount = mergedUsers.filter(u => u.hasModuleAccess).length;
  const adminLeadCount = mergedUsers.filter(u => u.designAccess?.designRole === "DESIGN_ADMIN" || u.designAccess?.designRole === "DESIGN_LEAD").length;
  const specificScopeCount = mergedUsers.filter(u => u.designAccess?.projectAccessType === "SPECIFIC").length;
  const customRolesCount = (storeState.customRoles || []).length;

  // Handlers for Drawer
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

  const handleRoleChangeInDrawer = (newRole: DesignRoleCode) => {
    setDrawerDesignRole(newRole);
    const def = roleMap.get(newRole)?.defaultPermissions;
    if (def) {
      setPermMatrixEdit(def.canMatrixEdit);
      setPermDrawingsUpload(def.canDrawingsUpload);
      setPermGfcApproval(def.canDrawingsApproveGfc);
      setPermTransmittalsCreate(def.canTransmittalsCreate);
      setPermRfisManage(def.canRfisManage);
      setPermMastersManage(def.canMastersManage);
    }
  };

  const handleToggleProjectAssignment = (projectId: string) => {
    setDrawerAssignedProjectIds(prev => 
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSelectAllProjects = () => {
    setDrawerAssignedProjectIds(projects.map(p => p.id));
  };

  const handleDeselectAllProjects = () => {
    setDrawerAssignedProjectIds([]);
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
        setFeedbackMessage({
          type: "success",
          text: `RBAC access permissions updated successfully.`
        });
        setIsDrawerOpen(false);
        loadWorkspaceUsers();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to persist to database, updated locally."
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: `Error saving access: ${err.message}`
      });
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
        setFeedbackMessage({
          type: "success",
          text: `${user.fullName} Design Tracking module access ${newStatus ? "granted" : "restricted"}.`
        });
        loadWorkspaceUsers();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to update module access."
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: `Toggle error: ${err.message}`
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleRevokeAccess = async (user: DesignWorkspaceUser) => {
    if (!confirm(`Are you sure you want to revoke Design Tracking permissions for ${user.fullName}?`)) return;
    try {
      DesignMasterStore.deleteUserAccess(user.id);
      await deleteDesignUserAccessAction(user.id);
      setFeedbackMessage({
        type: "success",
        text: `Design Tracking access revoked for ${user.fullName}.`
      });
      loadWorkspaceUsers();
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: `Failed to revoke access: ${err.message}`
      });
    }
  };

  // ============================================================================
  // Dynamic Role Builder Handlers (Tab 2)
  // ============================================================================

  const currentBuilderRole = useMemo(() => {
    return roleMap.get(selectedBuilderRoleCode) || allRoles[0];
  }, [roleMap, selectedBuilderRoleCode, allRoles]);

  const handleOpenCreateRoleModal = () => {
    setRoleFormData({
      code: "",
      label: "",
      description: "",
      badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      ticketAccessScope: "ASSIGNED_ONLY",
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: false
    });
    setIsCreatingRoleModal(true);
  };

  const handleSaveCreateRole = () => {
    if (!roleFormData.label.trim()) {
      alert("Role Name is required.");
      return;
    }
    const cleanCode = (roleFormData.code.trim() || roleFormData.label.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"));
    try {
      const created = DesignMasterStore.addCustomRole({
        code: cleanCode,
        label: roleFormData.label,
        description: roleFormData.description || "Custom enterprise role for Design & Engineering tracking.",
        badgeColor: roleFormData.badgeColor,
        ticketAccessScope: roleFormData.ticketAccessScope,
        defaultPermissions: {
          canMatrixEdit: roleFormData.canMatrixEdit,
          canDrawingsUpload: roleFormData.canDrawingsUpload,
          canDrawingsApproveGfc: roleFormData.canDrawingsApproveGfc,
          canTransmittalsCreate: roleFormData.canTransmittalsCreate,
          canRfisManage: roleFormData.canRfisManage,
          canMastersManage: roleFormData.canMastersManage
        }
      });
      setSelectedBuilderRoleCode(created.code);
      setIsCreatingRoleModal(false);
      setFeedbackMessage({
        type: "success",
        text: `Custom role '${created.label}' created and initialized in policy matrix.`
      });
    } catch (err: any) {
      alert(err.message || "Failed to create custom role");
    }
  };

  const handleOpenEditRoleModal = () => {
    if (!currentBuilderRole) return;
    setRoleFormData({
      code: currentBuilderRole.code,
      label: currentBuilderRole.label,
      description: currentBuilderRole.description,
      badgeColor: currentBuilderRole.badgeColor,
      ticketAccessScope: currentBuilderRole.ticketAccessScope || "ALL",
      canMatrixEdit: currentBuilderRole.defaultPermissions.canMatrixEdit,
      canDrawingsUpload: currentBuilderRole.defaultPermissions.canDrawingsUpload,
      canDrawingsApproveGfc: currentBuilderRole.defaultPermissions.canDrawingsApproveGfc,
      canTransmittalsCreate: currentBuilderRole.defaultPermissions.canTransmittalsCreate,
      canRfisManage: currentBuilderRole.defaultPermissions.canRfisManage,
      canMastersManage: currentBuilderRole.defaultPermissions.canMastersManage
    });
    setIsEditingRoleModal(true);
  };

  const handleSaveEditRole = () => {
    if (!currentBuilderRole) return;
    try {
      if (currentBuilderRole.isSystem) {
        // System roles: allow updating description & default switches, but code/name are standard
        DesignMasterStore.updateCustomRole(currentBuilderRole.code, {
          description: roleFormData.description,
          badgeColor: roleFormData.badgeColor,
          ticketAccessScope: roleFormData.ticketAccessScope,
          defaultPermissions: {
            canMatrixEdit: roleFormData.canMatrixEdit,
            canDrawingsUpload: roleFormData.canDrawingsUpload,
            canDrawingsApproveGfc: roleFormData.canDrawingsApproveGfc,
            canTransmittalsCreate: roleFormData.canTransmittalsCreate,
            canRfisManage: roleFormData.canRfisManage,
            canMastersManage: roleFormData.canMastersManage
          }
        });
      } else {
        DesignMasterStore.updateCustomRole(currentBuilderRole.code, {
          label: roleFormData.label,
          description: roleFormData.description,
          badgeColor: roleFormData.badgeColor,
          ticketAccessScope: roleFormData.ticketAccessScope,
          defaultPermissions: {
            canMatrixEdit: roleFormData.canMatrixEdit,
            canDrawingsUpload: roleFormData.canDrawingsUpload,
            canDrawingsApproveGfc: roleFormData.canDrawingsApproveGfc,
            canTransmittalsCreate: roleFormData.canTransmittalsCreate,
            canRfisManage: roleFormData.canRfisManage,
            canMastersManage: roleFormData.canMastersManage
          }
        });
      }
      setIsEditingRoleModal(false);
      setFeedbackMessage({
        type: "success",
        text: `Role '${currentBuilderRole.label}' specifications updated.`
      });
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  const handleOpenCloneRoleModal = () => {
    if (!currentBuilderRole) return;
    setRoleFormData({
      code: `${currentBuilderRole.code}_COPY`,
      label: `${currentBuilderRole.label} (Copy)`,
      description: `Cloned from ${currentBuilderRole.label}. ${currentBuilderRole.description}`,
      badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      ticketAccessScope: currentBuilderRole.ticketAccessScope || "ASSIGNED_ONLY",
      canMatrixEdit: currentBuilderRole.defaultPermissions.canMatrixEdit,
      canDrawingsUpload: currentBuilderRole.defaultPermissions.canDrawingsUpload,
      canDrawingsApproveGfc: currentBuilderRole.defaultPermissions.canDrawingsApproveGfc,
      canTransmittalsCreate: currentBuilderRole.defaultPermissions.canTransmittalsCreate,
      canRfisManage: currentBuilderRole.defaultPermissions.canRfisManage,
      canMastersManage: currentBuilderRole.defaultPermissions.canMastersManage
    });
    setIsCloningRoleModal(true);
  };

  const handleSaveCloneRole = () => {
    if (!currentBuilderRole) return;
    try {
      const cloned = DesignMasterStore.cloneCustomRole(currentBuilderRole.code, {
        code: roleFormData.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        label: roleFormData.label,
        description: roleFormData.description,
        badgeColor: roleFormData.badgeColor
      });
      setSelectedBuilderRoleCode(cloned.code);
      setIsCloningRoleModal(false);
      setFeedbackMessage({
        type: "success",
        text: `Role '${currentBuilderRole.label}' cloned into '${cloned.label}'.`
      });
    } catch (err: any) {
      alert(err.message || "Failed to clone role");
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
        text: `Custom role '${roleToDelete.label}' has been deleted.`
      });
    } catch (err: any) {
      alert(err.message || "Failed to delete role");
    }
  };

  // ============================================================================
  // Role Policy Matrix Handlers (Tab 3)
  // ============================================================================

  const getPolicy = (moduleCode: DesignRbacPolicy["module"]) => {
    const match = policyRecords.find(p => 
      p.roleCode === matrixRole && 
      p.projectId === matrixProject && 
      p.module === moduleCode
    );
    if (match) return match;

    const fallbackAll = policyRecords.find(p => 
      p.roleCode === matrixRole && 
      p.projectId === "ALL" && 
      p.module === moduleCode
    );

    const targetRoleObj = roleMap.get(matrixRole);

    return fallbackAll || {
      id: `rbac-${matrixRole.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: targetRoleObj?.label || matrixRole,
      projectId: matrixProject,
      projectName: matrixProject === "ALL" ? "All Development Projects" : (projectMap.get(matrixProject)?.name || matrixProject),
      module: moduleCode,
      canCreate: targetRoleObj?.defaultPermissions.canMatrixEdit ?? true,
      canRead: true,
      canUpdate: targetRoleObj?.defaultPermissions.canMatrixEdit ?? true,
      canDelete: false,
      canApprove: targetRoleObj?.defaultPermissions.canDrawingsApproveGfc ?? false,
      canExport: true,
      ticketAccessScope: targetRoleObj?.ticketAccessScope || "ASSIGNED_ONLY",
      updatedAt: new Date().toISOString()
    };
  };

  const handlePolicyToggle = (moduleCode: DesignRbacPolicy["module"], field: "canCreate" | "canRead" | "canUpdate" | "canDelete" | "canApprove" | "canExport") => {
    const current = getPolicy(moduleCode);
    const targetRoleObj = roleMap.get(matrixRole);
    const updated: DesignRbacPolicy = {
      ...current,
      id: `rbac-${matrixRole.toLowerCase()}-${matrixProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: targetRoleObj?.label || matrixRole,
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
    const targetRoleObj = roleMap.get(matrixRole);
    const updated: DesignRbacPolicy = {
      ...current,
      id: `rbac-${matrixRole.toLowerCase()}-${matrixProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: targetRoleObj?.label || matrixRole,
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
      setFeedbackMessage({
        type: "success",
        text: `Role-based policy matrix committed successfully for ${roleMap.get(matrixRole)?.label || matrixRole}.`
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: `Error saving policies: ${err.message}`
      });
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // Export audit summary
  const handleExportAudit = () => {
    const rows = mergedUsers.map(u => ({
      "User ID": u.id,
      "Employee Code": u.userCode || "N/A",
      "Full Name": u.fullName,
      "Email Address": u.email,
      "Department": u.departmentName || "N/A",
      "Designation": u.designationName || "N/A",
      "Tracking Access": u.hasModuleAccess ? "ENABLED" : "RESTRICTED",
      "Design Role": u.designAccess?.designRole || "UNASSIGNED",
      "Project Scope": u.designAccess?.projectAccessType || "UNASSIGNED",
      "Ticket Scope": u.designAccess?.ticketAccessScope || "ALL",
      "Matrix Edit": u.designAccess?.canMatrixEdit ? "YES" : "NO",
      "Drawings Upload": u.designAccess?.canDrawingsUpload ? "YES" : "NO",
      "GFC Approval": u.designAccess?.canDrawingsApproveGfc ? "YES" : "NO",
      "Transmittals Create": u.designAccess?.canTransmittalsCreate ? "YES" : "NO",
      "RFIs Manage": u.designAccess?.canRfisManage ? "YES" : "NO",
      "Masters Manage": u.designAccess?.canMastersManage ? "YES" : "NO"
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(rows[0] || {}).join(",") + "\n" +
      rows.map(r => Object.values(r).map(v => `"${v}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chandak_rbac_governance_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedDrawerUser = useMemo(() => {
    return mergedUsers.find(u => u.id === drawerUserId);
  }, [mergedUsers, drawerUserId]);

  const filteredDrawerProjects = useMemo(() => {
    if (!drawerProjectSearch.trim()) return projects;
    const q = drawerProjectSearch.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.location || "").toLowerCase().includes(q));
  }, [projects, drawerProjectSearch]);

  // Simulation Evaluation for Tab 4
  const simUser = useMemo(() => mergedUsers.find(u => u.id === simUserId), [mergedUsers, simUserId]);
  const simRoleCode = simUser?.designAccess?.designRole || "VIEWER";
  const simRoleDef = roleMap.get(simRoleCode);
  const simPolicy = useMemo(() => {
    return getPolicy(simModule);
  }, [simModule, matrixRole, matrixProject, policyRecords]);

  const simResults = useMemo(() => {
    if (!simUser) return null;
    if (!simUser.hasModuleAccess) {
      return {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        reason: "User has not been granted entitlement to the Design & Tracking module."
      };
    }

    const isDesignAdmin = simRoleCode === "DESIGN_ADMIN" || simRoleCode === "SUPER_ADMIN";
    const projectRestricted = simUser.designAccess?.projectAccessType === "SPECIFIC" && 
      simProjectId !== "ALL" && 
      !(simUser.designAccess?.assignedProjectIds || []).includes(simProjectId);

    if (projectRestricted && !isDesignAdmin) {
      return {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        reason: `User is restricted to specific projects and does not have access to ${projectMap.get(simProjectId)?.name || simProjectId}.`
      };
    }

    const ticketScope = simPolicy.ticketAccessScope || simUser.designAccess?.ticketAccessScope || "ALL";
    let scopeBlocked = false;
    let scopeExplanation = "Global project access granted.";

    if (ticketScope === "ASSIGNED_ONLY" && !simIsAssignee && !isDesignAdmin) {
      scopeBlocked = true;
      scopeExplanation = "Ticket/Item Scope is set to ASSIGNED_ONLY, but user is not the designated assignee or consultant.";
    } else if (ticketScope === "CREATED_ONLY" && !simIsCreator && !isDesignAdmin) {
      scopeBlocked = true;
      scopeExplanation = "Ticket/Item Scope is set to CREATED_ONLY, but user was not the original creator/author.";
    } else if (ticketScope === "NONE" && !isDesignAdmin) {
      scopeBlocked = true;
      scopeExplanation = "Explicit Deny: Access to items in this module is blocked by policy.";
    }

    return {
      canView: isDesignAdmin || (simPolicy.canRead && (!scopeBlocked || simIsAssignee || simIsCreator)),
      canCreate: isDesignAdmin || simPolicy.canCreate,
      canUpdate: isDesignAdmin || (simPolicy.canUpdate && !scopeBlocked),
      canDelete: isDesignAdmin || (simPolicy.canDelete && !scopeBlocked),
      canApprove: isDesignAdmin || (!!simPolicy.canApprove && !scopeBlocked),
      canExport: isDesignAdmin || !!simPolicy.canExport,
      reason: isDesignAdmin ? "Bypass Granted (Full Administrative Role)" : scopeExplanation
    };
  }, [simUser, simRoleCode, simProjectId, simModule, simPolicy, simIsAssignee, simIsCreator, projectMap]);

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-300">
      {/* 1. Platform Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Link href="/" className="hover:text-foreground transition-colors">Workspace</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/design" className="hover:text-foreground transition-colors">Design & Tracking</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-purple-600 dark:text-purple-400 font-bold">RBAC & Governance</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25 shrink-0 shadow-xs">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Design & Tracking RBAC Policy Governance
              </h1>
              <p className="text-xs text-muted mt-0.5">
                Role-Based & Ticket-Based access control, dynamic custom roles CRUD, project scoping, and granular CRUD matrices.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadWorkspaceUsers}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-foreground bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Refresh Directory from Postgres Database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-500" : ""}`} />
            <span>Sync Directory</span>
          </button>

          <button
            type="button"
            onClick={handleExportAudit}
            className="px-3 py-2 text-xs font-semibold text-foreground bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export CSV Audit of all RBAC assignments"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>Export Audit</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateRoleModal}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Custom Role</span>
          </button>
        </div>
      </div>

      {/* Dismissable Feedback Toast */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200 ${
          feedbackMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMessage(null)}
            className="hover:opacity-75 p-1 rounded-md cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Metric KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Personnel</span>
            <div className="text-2xl font-bold text-foreground tracking-tight">{totalWorkspaceCount}</div>
            <p className="text-[10px] text-muted">Identity Registry</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Tracking Active</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{activeTrackingUsersCount}</div>
            <p className="text-[10px] text-muted">Entitled Users</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Admins & Leads</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">{adminLeadCount}</div>
            <p className="text-[10px] text-muted">GFC Authorities</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Scoped Scopes</span>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">{specificScopeCount}</div>
            <p className="text-[10px] text-muted">Specific Projects</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Roles Registry</span>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">{allRoles.length}</div>
            <p className="text-[10px] text-muted">{customRolesCount} Custom Dynamic</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Navigation Switcher */}
      <div className="border-b border-border flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2 min-w-max pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("PERSONNEL")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "PERSONNEL"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-lg"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Personnel Access Matrix (User-Wise)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted font-bold">
              {filteredUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ROLE_BUILDER")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "ROLE_BUILDER"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-lg"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Role Builder & Dynamic Roles CRUD</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold">
              {allRoles.length} Roles
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ROLES_MATRIX")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "ROLES_MATRIX"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-lg"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Role & Ticket Policy Matrix (Project & Module CRUD)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SIMULATOR")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "SIMULATOR"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-lg"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Play className="h-4 w-4" />
            <span>Live Permission Simulator & Tester</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERSONNEL ACCESS MATRIX                                            */}
      {/* ========================================================================= */}
      {activeTab === "PERSONNEL" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search personnel (Name, UIN, Email, Dept, Role)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={moduleAccessFilter}
                onChange={(e) => setModuleAccessFilter(e.target.value)}
                aria-label="Filter by Tracking Module Access"
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Entitlements</option>
                <option value="ENABLED">✅ Tracking Enabled</option>
                <option value="RESTRICTED">🚫 Restricted Only</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by Design Role"
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                {allRoles.map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
                <option value="UNASSIGNED">Unassigned Access</option>
              </select>

              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                aria-label="Filter by Project Scope"
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Project Scopes</option>
                <option value="GLOBAL">🌐 Global (All Projects)</option>
                <option value="SPECIFIC">🏢 Specific Projects</option>
              </select>

              {departments.length > 0 && (
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  aria-label="Filter by Department"
                  className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3.5 px-4">Personnel Identity</th>
                    <th className="py-3.5 px-3">Module Entitlement</th>
                    <th className="py-3.5 px-3">Assigned Role</th>
                    <th className="py-3.5 px-3">Project & Ticket Scope</th>
                    <th className="py-3.5 px-3">Granular Capabilities</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="h-8 w-8 text-muted/50" />
                          <p className="font-semibold text-sm">No personnel matched current filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const access = user.designAccess;
                      const roleMeta = access?.designRole ? roleMap.get(access.designRole) : null;
                      const isToggling = togglingUserId === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {user.profilePhoto ? (
                                <img
                                  src={user.profilePhoto}
                                  alt={user.fullName}
                                  className="h-9 w-9 rounded-xl object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center border border-purple-500/20 shrink-0">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-foreground">{user.fullName}</span>
                                  {user.userCode && (
                                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-muted/60 text-muted border border-border/60">
                                      {user.userCode}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 flex-wrap">
                                  <span>{user.email}</span>
                                  {user.departmentName && (
                                    <>
                                      <span>•</span>
                                      <span className="font-medium text-foreground">{user.departmentName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={user.hasModuleAccess}
                                  disabled={isToggling}
                                  onChange={(e) => handleToggleModuleAccess(user, e as any)}
                                  className="sr-only peer"
                                />
                                <div className={`w-9 h-5 rounded-full peer peer-focus:outline-none transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                  user.hasModuleAccess 
                                    ? "bg-emerald-600 peer-checked:after:translate-x-full" 
                                    : "bg-slate-300 dark:bg-slate-700"
                                }`}></div>
                              </label>

                              {isToggling ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-600" />
                              ) : user.hasModuleAccess ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                                  <XCircle className="h-3 w-3" /> Restricted
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {roleMeta ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${roleMeta.badgeColor}`}>
                                <Shield className="h-3 w-3" />
                                {roleMeta.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {access?.projectAccessType === "SPECIFIC" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                                  <Building2 className="h-3 w-3" />
                                  {access.assignedProjectIds.length} Project(s)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  <Globe className="h-3 w-3" /> Global (All Projects)
                                </span>
                              )}
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                  <Target className="h-2.5 w-2.5" /> Scope: {access?.ticketAccessScope || "ALL"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${access?.canMatrixEdit ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"}`}>
                                Matrix
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${access?.canDrawingsUpload ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"}`}>
                                Upload
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${access?.canDrawingsApproveGfc ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"}`}>
                                GFC Stamp
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${access?.canTransmittalsCreate ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"}`}>
                                Dispatch
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${access?.canRfisManage ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"}`}>
                                RFIs
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(user)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                                <span>Configure</span>
                              </button>

                              {user.designAccess && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeAccess(user)}
                                  className="p-1.5 text-xs font-semibold rounded-lg text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer"
                                  title="Revoke Access"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLE BUILDER & DYNAMIC ROLES CRUD (WORKSPACE & IAM PATTERN)        */}
      {/* ========================================================================= */}
      {activeTab === "ROLE_BUILDER" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Roles Explorer */}
          <div className="lg:col-span-1 bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span>Roles Registry ({allRoles.length})</span>
                </h3>
                <p className="text-[11px] text-muted">Standard & Custom Roles</p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateRoleModal}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Role</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {allRoles.map(r => {
                const isSelected = r.code === selectedBuilderRoleCode;
                const assignedCount = mergedUsers.filter(u => u.designAccess?.designRole === r.code).length;

                return (
                  <div
                    key={r.code}
                    onClick={() => setSelectedBuilderRoleCode(r.code)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected 
                        ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-500/50 shadow-xs ring-1 ring-purple-500/30" 
                        : "bg-background hover:bg-slate-50 dark:hover:bg-slate-800/60 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${r.badgeColor}`}>
                          {r.code}
                        </span>
                        {r.isSystem ? (
                          <span className="text-[10px] text-muted flex items-center gap-0.5" title="System Standard Role">
                            <Lock className="h-3 w-3" /> System
                          </span>
                        ) : (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                            Custom
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-semibold text-muted bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {assignedCount} User(s)
                      </span>
                    </div>

                    <div className="text-xs font-bold text-foreground">
                      {r.label}
                    </div>

                    <p className="text-[11px] text-muted line-clamp-2">
                      {r.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Role Specifications & Actions */}
          <div className="lg:col-span-2 space-y-4">
            {currentBuilderRole && (
              <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs space-y-5">
                {/* Role Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-foreground">
                        {currentBuilderRole.label}
                      </h2>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${currentBuilderRole.badgeColor}`}>
                        {currentBuilderRole.code}
                      </span>
                      {currentBuilderRole.isSystem ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-muted border border-border/60 flex items-center gap-1">
                          <Lock className="h-3 w-3" /> System Standard
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          Custom Dynamic Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      {currentBuilderRole.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenCloneRoleModal}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground border border-border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Duplicate this role into a new custom role"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Clone</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenEditRoleModal}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Role</span>
                    </button>

                    {!currentBuilderRole.isSystem && (
                      <button
                        type="button"
                        onClick={() => setRoleToDelete(currentBuilderRole)}
                        className="p-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                        title="Delete custom role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Default Capabilities Bundle */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-purple-600" />
                    <span>Default Capability Switches for this Role:</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${currentBuilderRole.defaultPermissions.canMatrixEdit ? "bg-emerald-500/5 border-emerald-500/30" : "bg-muted/20 border-border/60"}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Tender Matrix Edit</span>
                        <span className="text-[10px] text-muted">Planned/Actual dates & status</span>
                      </div>
                      {currentBuilderRole.defaultPermissions.canMatrixEdit ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-muted/60" />}
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between ${currentBuilderRole.defaultPermissions.canDrawingsUpload ? "bg-blue-500/5 border-blue-500/30" : "bg-muted/20 border-border/60"}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Drawing Uploads</span>
                        <span className="text-[10px] text-muted">Upload revision sheets</span>
                      </div>
                      {currentBuilderRole.defaultPermissions.canDrawingsUpload ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <XCircle className="h-4 w-4 text-muted/60" />}
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between ${currentBuilderRole.defaultPermissions.canDrawingsApproveGfc ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/20 border-border/60"}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">GFC Stamp Approval</span>
                        <span className="text-[10px] text-muted">Authorize GFC releases</span>
                      </div>
                      {currentBuilderRole.defaultPermissions.canDrawingsApproveGfc ? <CheckCircle2 className="h-4 w-4 text-amber-600" /> : <XCircle className="h-4 w-4 text-muted/60" />}
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between ${currentBuilderRole.defaultPermissions.canTransmittalsCreate ? "bg-purple-500/5 border-purple-500/30" : "bg-muted/20 border-border/60"}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Transmittals Dispatch</span>
                        <span className="text-[10px] text-muted">Generate handover slips</span>
                      </div>
                      {currentBuilderRole.defaultPermissions.canTransmittalsCreate ? <CheckCircle2 className="h-4 w-4 text-purple-600" /> : <XCircle className="h-4 w-4 text-muted/60" />}
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between ${currentBuilderRole.defaultPermissions.canRfisManage ? "bg-cyan-500/5 border-cyan-500/30" : "bg-muted/20 border-border/60"}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">RFI & Site Queries</span>
                        <span className="text-[10px] text-muted">Raise & resolve queries</span>
                      </div>
                      {currentBuilderRole.defaultPermissions.canRfisManage ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <XCircle className="h-4 w-4 text-muted/60" />}
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between ${currentBuilderRole.defaultPermissions.canMastersManage ? "bg-rose-500/5 border-rose-500/30" : "bg-muted/20 border-border/60"}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Masters Setup</span>
                        <span className="text-[10px] text-muted">Add projects, packages, towers</span>
                      </div>
                      {currentBuilderRole.defaultPermissions.canMastersManage ? <CheckCircle2 className="h-4 w-4 text-rose-600" /> : <XCircle className="h-4 w-4 text-muted/60" />}
                    </div>
                  </div>
                </div>

                {/* Assigned Personnel List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      <span>Personnel Assigned this Role:</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleFilter(currentBuilderRole.code);
                        setActiveTab("PERSONNEL");
                      }}
                      className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View in Matrix</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {mergedUsers.filter(u => u.designAccess?.designRole === currentBuilderRole.code).length === 0 ? (
                      <div className="col-span-2 py-6 text-center text-xs text-muted border border-dashed border-border rounded-xl">
                        No personnel currently assigned to this role.
                      </div>
                    ) : (
                      mergedUsers
                        .filter(u => u.designAccess?.designRole === currentBuilderRole.code)
                        .map(u => (
                          <div key={u.id} className="p-2.5 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xs shrink-0">
                                {u.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-foreground block truncate">{u.fullName}</span>
                                <span className="text-[10px] text-muted truncate block">{u.email}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(u)}
                              className="px-2 py-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 rounded-lg hover:bg-purple-100 transition-all"
                            >
                              Configure
                            </button>
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

      {/* ========================================================================= */}
      {/* TAB 3: ROLE-BASED & TICKET-BASED POLICY MATRIX                            */}
      {/* ========================================================================= */}
      {activeTab === "ROLES_MATRIX" && (
        <div className="space-y-5">
          {/* Dimension Selectors: Target Role & Target Project Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-purple-600" />
                <span>1. Select Target Role to Configure:</span>
              </label>
              <select
                value={matrixRole}
                onChange={(e) => setMatrixRole(e.target.value)}
                className="w-full text-xs font-bold bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                {allRoles.map(r => (
                  <option key={r.code} value={r.code}>{r.label} ({r.code})</option>
                ))}
              </select>
              <p className="text-[11px] text-muted">
                {roleMap.get(matrixRole)?.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                <span>2. Select Project Scope Context:</span>
              </label>
              <select
                value={matrixProject}
                onChange={(e) => setMatrixProject(e.target.value)}
                className="w-full text-xs font-bold bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">🌐 All Development Projects (Universal Baseline)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.location || "Site"})</option>
                ))}
              </select>
              <p className="text-[11px] text-muted">
                {matrixProject === "ALL" ? "Applies across all construction projects unless specifically overridden." : "Custom overrides specific to this development site."}
              </p>
            </div>
          </div>

          {/* Interactive Policy Matrix Grid */}
          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/80 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>CRUD & Ticket Scoping Matrix</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${roleMap.get(matrixRole)?.badgeColor}`}>
                    {roleMap.get(matrixRole)?.label}
                  </span>
                </h3>
                <p className="text-xs text-muted">
                  Configure Create, Read, Update, Delete, GFC Approval, Export, and Ticket-Based scoping options per module.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAllPolicies}
                  disabled={isSavingPolicies}
                  className="px-4 py-2 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>{isSavingPolicies ? "Committing..." : "Commit Policies Matrix"}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-100/60 dark:bg-slate-900/80 border-b border-border/80 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Functional Module</th>
                    <th className="py-3 px-3 text-center">Create [C]</th>
                    <th className="py-3 px-3 text-center">Read [R]</th>
                    <th className="py-3 px-3 text-center">Update [U]</th>
                    <th className="py-3 px-3 text-center">Delete [D]</th>
                    <th className="py-3 px-3 text-center">GFC Approval [A]</th>
                    <th className="py-3 px-3 text-center">Export [E]</th>
                    <th className="py-3 px-4">Ticket / Item Access Scope Option</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {MODULE_LIST.map((mod) => {
                    const policy = getPolicy(mod.code);
                    const Icon = mod.icon;

                    return (
                      <tr key={mod.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 border border-border/60">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{mod.label}</span>
                              <span className="text-[11px] text-muted">{mod.desc}</span>
                            </div>
                          </div>
                        </td>

                        {/* Create */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePolicyToggle(mod.code, "canCreate")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              policy.canCreate 
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" 
                                : "bg-muted/30 text-muted/40 border-border/40"
                            }`}
                          >
                            {policy.canCreate ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* Read */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePolicyToggle(mod.code, "canRead")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              policy.canRead 
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" 
                                : "bg-muted/30 text-muted/40 border-border/40"
                            }`}
                          >
                            {policy.canRead ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* Update */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePolicyToggle(mod.code, "canUpdate")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              policy.canUpdate 
                                ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" 
                                : "bg-muted/30 text-muted/40 border-border/40"
                            }`}
                          >
                            {policy.canUpdate ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* Delete */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePolicyToggle(mod.code, "canDelete")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              policy.canDelete 
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" 
                                : "bg-muted/30 text-muted/40 border-border/40"
                            }`}
                          >
                            {policy.canDelete ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* GFC Approval */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePolicyToggle(mod.code, "canApprove")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              policy.canApprove 
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" 
                                : "bg-muted/30 text-muted/40 border-border/40"
                            }`}
                          >
                            {policy.canApprove ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* Export */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePolicyToggle(mod.code, "canExport")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              policy.canExport 
                                ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" 
                                : "bg-muted/30 text-muted/40 border-border/40"
                            }`}
                          >
                            {policy.canExport ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* Ticket / Item Access Scope Option Dropdown */}
                        <td className="py-3.5 px-4">
                          <select
                            value={policy.ticketAccessScope || "ALL"}
                            onChange={(e) => handlePolicyTicketScopeChange(mod.code, e.target.value as DesignTicketAccessScope)}
                            className="text-xs bg-background border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-medium cursor-pointer w-full max-w-[240px]"
                          >
                            {TICKET_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE PERMISSION SIMULATOR & POLICY TESTER                          */}
      {/* ========================================================================= */}
      {activeTab === "SIMULATOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Setup Laboratory */}
          <div className="lg:col-span-1 bg-surface border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Play className="h-4 w-4 text-purple-600" />
                <span>Simulation Test Parameters</span>
              </h3>
              <p className="text-xs text-muted">
                Inspect how policy rules evaluate for any user in a specific item context.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Target Personnel:</label>
                <select
                  value={simUserId}
                  onChange={(e) => setSimUserId(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  {mergedUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.designAccess?.designRole || "Unassigned"})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Project Scope Context:</label>
                <select
                  value={simProjectId}
                  onChange={(e) => setSimProjectId(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  <option value="ALL">🌐 Global (All Projects)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Functional Module / Ticket Type:</label>
                <select
                  value={simModule}
                  onChange={(e) => setSimModule(e.target.value as any)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  {MODULE_LIST.map(m => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Item Ownership Context toggles */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <span className="text-xs font-bold text-muted block">Simulated Ticket Ownership:</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIsAssignee}
                    onChange={(e) => setSimIsAssignee(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span>User is the Assigned Consultant / Lead</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIsCreator}
                    onChange={(e) => setSimIsCreator(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span>User is the Initial Creator / Submitter</span>
                </label>
              </div>
            </div>
          </div>

          {/* Test Evaluation Output */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-border/80 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FolderCheck className="h-4 w-4 text-emerald-600" />
                  <span>Real-Time Policy Evaluation Outcome</span>
                </h3>
                <p className="text-xs text-muted">
                  Computed capability status based on active roles, project assignments, and ticket scoping rules.
                </p>
              </div>

              {simUser && simResults && (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    simResults.canView 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200" 
                      : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                  }`}>
                    {simResults.canView ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />}
                    <div>
                      <span className="font-bold text-xs block">
                        {simResults.canView ? "Access Entitled & Verified" : "Access Denied by Policy Scope"}
                      </span>
                      <p className="text-xs mt-0.5 opacity-90">{simResults.reason}</p>
                    </div>
                  </div>

                  {/* Actions Matrix Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className={`p-3.5 rounded-xl border ${simResults.canView ? "bg-blue-500/10 border-blue-500/30" : "bg-muted/30 border-border/60"}`}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Read / View [R]</span>
                      <span className={`text-base font-bold mt-1 block ${simResults.canView ? "text-blue-600 dark:text-blue-400" : "text-muted"}`}>
                        {simResults.canView ? "ALLOWED ✅" : "DENIED 🚫"}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${simResults.canCreate ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30 border-border/60"}`}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Create [C]</span>
                      <span className={`text-base font-bold mt-1 block ${simResults.canCreate ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}>
                        {simResults.canCreate ? "ALLOWED ✅" : "DENIED 🚫"}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${simResults.canUpdate ? "bg-indigo-500/10 border-indigo-500/30" : "bg-muted/30 border-border/60"}`}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Update / Edit [U]</span>
                      <span className={`text-base font-bold mt-1 block ${simResults.canUpdate ? "text-indigo-600 dark:text-indigo-400" : "text-muted"}`}>
                        {simResults.canUpdate ? "ALLOWED ✅" : "DENIED 🚫"}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${simResults.canDelete ? "bg-rose-500/10 border-rose-500/30" : "bg-muted/30 border-border/60"}`}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Delete / Purge [D]</span>
                      <span className={`text-base font-bold mt-1 block ${simResults.canDelete ? "text-rose-600 dark:text-rose-400" : "text-muted"}`}>
                        {simResults.canDelete ? "ALLOWED ✅" : "DENIED 🚫"}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${simResults.canApprove ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30 border-border/60"}`}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">GFC Approval [A]</span>
                      <span className={`text-base font-bold mt-1 block ${simResults.canApprove ? "text-amber-600 dark:text-amber-400" : "text-muted"}`}>
                        {simResults.canApprove ? "ALLOWED ✅" : "DENIED 🚫"}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${simResults.canExport ? "bg-teal-500/10 border-teal-500/30" : "bg-muted/30 border-border/60"}`}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Reports / Export [E]</span>
                      <span className={`text-base font-bold mt-1 block ${simResults.canExport ? "text-teal-600 dark:text-teal-400" : "text-muted"}`}>
                        {simResults.canExport ? "ALLOWED ✅" : "DENIED 🚫"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER PERMISSION DRAWER (USER-WISE GOVERNANCE)                       */}
      {/* ========================================================================= */}
      {isDrawerOpen && selectedDrawerUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center border border-purple-500/20 text-sm">
                  {selectedDrawerUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedDrawerUser.fullName}</h3>
                  <p className="text-xs text-muted">{selectedDrawerUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-purple-600" />
                  <span>Assign Design & Tracking Role:</span>
                </label>
                <select
                  value={drawerDesignRole}
                  onChange={(e) => handleRoleChangeInDrawer(e.target.value as DesignRoleCode)}
                  className="w-full text-xs font-bold bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  {allRoles.map(r => (
                    <option key={r.code} value={r.code}>{r.label} ({r.code})</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted">
                  {roleMap.get(drawerDesignRole)?.description}
                </p>
              </div>

              {/* Ticket / Assignment Access Scope */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Ticket & Assignment Access Scope:</span>
                </label>
                <select
                  value={drawerTicketScope}
                  onChange={(e) => setDrawerTicketScope(e.target.value as DesignTicketAccessScope)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  {TICKET_SCOPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted">
                  Controls whether user sees only tickets/RFIs assigned to their agency or all project tickets.
                </p>
              </div>

              {/* Project Scope Selector */}
              <div className="space-y-2 border-t border-border/80 pt-4">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Project Governance Scope:</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerProjectAccessType("ALL")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      drawerProjectAccessType === "ALL"
                        ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30"
                        : "bg-background text-muted border-border hover:text-foreground"
                    }`}
                  >
                    🌐 Global (All Projects)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerProjectAccessType("SPECIFIC")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      drawerProjectAccessType === "SPECIFIC"
                        ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30"
                        : "bg-background text-muted border-border hover:text-foreground"
                    }`}
                  >
                    🏢 Specific Projects
                  </button>
                </div>

                {drawerProjectAccessType === "SPECIFIC" && (
                  <div className="space-y-2.5 pt-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={drawerProjectSearch}
                        onChange={(e) => setDrawerProjectSearch(e.target.value)}
                        className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground flex-1 focus:outline-none"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSelectAllProjects}
                          className="text-[10px] font-semibold text-purple-600 hover:underline px-1.5 py-0.5"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllProjects}
                          className="text-[10px] font-semibold text-muted hover:underline px-1.5 py-0.5"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar border border-border/80 rounded-xl p-2 bg-background">
                      {filteredDrawerProjects.map(p => {
                        const isAssigned = drawerAssignedProjectIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              isAssigned ? "bg-purple-50/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleProjectAssignment(p.id)}
                              className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                            />
                            <span className="truncate">{p.name} ({p.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Granular Capability Overrides */}
              <div className="space-y-2.5 border-t border-border/80 pt-4">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-purple-600" />
                  <span>Granular Functional Capabilities:</span>
                </label>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background cursor-pointer text-xs">
                    <span className="font-semibold text-foreground">Tender Matrix Edit</span>
                    <input type="checkbox" checked={permMatrixEdit} onChange={e => setPermMatrixEdit(e.target.checked)} className="rounded text-purple-600 h-4 w-4" />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background cursor-pointer text-xs">
                    <span className="font-semibold text-foreground">Drawing Register Upload</span>
                    <input type="checkbox" checked={permDrawingsUpload} onChange={e => setPermDrawingsUpload(e.target.checked)} className="rounded text-purple-600 h-4 w-4" />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background cursor-pointer text-xs">
                    <span className="font-semibold text-foreground">GFC Release Stamp Approval</span>
                    <input type="checkbox" checked={permGfcApproval} onChange={e => setPermGfcApproval(e.target.checked)} className="rounded text-purple-600 h-4 w-4" />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background cursor-pointer text-xs">
                    <span className="font-semibold text-foreground">Transmittals Dispatch</span>
                    <input type="checkbox" checked={permTransmittalsCreate} onChange={e => setPermTransmittalsCreate(e.target.checked)} className="rounded text-purple-600 h-4 w-4" />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background cursor-pointer text-xs">
                    <span className="font-semibold text-foreground">RFI & Site Queries</span>
                    <input type="checkbox" checked={permRfisManage} onChange={e => setPermRfisManage(e.target.checked)} className="rounded text-purple-600 h-4 w-4" />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background cursor-pointer text-xs">
                    <span className="font-semibold text-foreground">Masters Setup Access</span>
                    <input type="checkbox" checked={permMastersManage} onChange={e => setPermMastersManage(e.target.checked)} className="rounded text-purple-600 h-4 w-4" />
                  </label>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDrawerAccess}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Commit Access"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CUSTOM ROLE                                                 */}
      {/* ========================================================================= */}
      {isCreatingRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-600" />
                <span>Create New Custom Role</span>
              </h3>
              <button type="button" onClick={() => setIsCreatingRoleModal(false)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Role Title / Label *</label>
                <input
                  type="text"
                  placeholder="e.g. Façade Engineering Specialist"
                  value={roleFormData.label}
                  onChange={e => setRoleFormData({ ...roleFormData, label: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Role Identifier Code (Auto-formatted)</label>
                <input
                  type="text"
                  placeholder="e.g. FACADE_SPECIALIST"
                  value={roleFormData.code}
                  onChange={e => setRoleFormData({ ...roleFormData, code: e.target.value.toUpperCase() })}
                  className="w-full font-mono bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Role Description</label>
                <textarea
                  placeholder="Describe the operational responsibilities of this role..."
                  rows={2}
                  value={roleFormData.description}
                  onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Badge Theme</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_BADGE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRoleFormData({ ...roleFormData, badgeColor: c.class })}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${c.class} ${roleFormData.badgeColor === c.class ? "ring-2 ring-purple-500" : "opacity-75"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Default Ticket Access Scope</label>
                <select
                  value={roleFormData.ticketAccessScope}
                  onChange={e => setRoleFormData({ ...roleFormData, ticketAccessScope: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  {TICKET_SCOPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsCreatingRoleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCreateRole}
                className="px-5 py-2 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT ROLE                                                          */}
      {/* ========================================================================= */}
      {isEditingRoleModal && currentBuilderRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-purple-600" />
                <span>Edit Role: {currentBuilderRole.label}</span>
              </h3>
              <button type="button" onClick={() => setIsEditingRoleModal(false)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {!currentBuilderRole.isSystem && (
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Role Title / Label</label>
                  <input
                    type="text"
                    value={roleFormData.label}
                    onChange={e => setRoleFormData({ ...roleFormData, label: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-foreground">Role Description</label>
                <textarea
                  rows={3}
                  value={roleFormData.description}
                  onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Badge Theme</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_BADGE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRoleFormData({ ...roleFormData, badgeColor: c.class })}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${c.class} ${roleFormData.badgeColor === c.class ? "ring-2 ring-purple-500" : "opacity-75"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Default Ticket Access Scope</label>
                <select
                  value={roleFormData.ticketAccessScope}
                  onChange={e => setRoleFormData({ ...roleFormData, ticketAccessScope: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  {TICKET_SCOPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsEditingRoleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditRole}
                className="px-5 py-2 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs"
              >
                Commit Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLONE ROLE                                                         */}
      {/* ========================================================================= */}
      {isCloningRoleModal && currentBuilderRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Copy className="h-4 w-4 text-purple-600" />
                <span>Clone Role from {currentBuilderRole.label}</span>
              </h3>
              <button type="button" onClick={() => setIsCloningRoleModal(false)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">New Role Title *</label>
                <input
                  type="text"
                  value={roleFormData.label}
                  onChange={e => setRoleFormData({ ...roleFormData, label: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">New Identifier Code</label>
                <input
                  type="text"
                  value={roleFormData.code}
                  onChange={e => setRoleFormData({ ...roleFormData, code: e.target.value.toUpperCase() })}
                  className="w-full font-mono bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={roleFormData.description}
                  onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsCloningRoleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCloneRole}
                className="px-5 py-2 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs"
              >
                Create Cloned Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE ROLE CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-rose-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Custom Role?</h3>
                <p className="text-xs text-muted">This action will remove the role '{roleToDelete.label}' ({roleToDelete.code}) and all its associated policies.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
