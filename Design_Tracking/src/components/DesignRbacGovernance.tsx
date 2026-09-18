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
  Plus
} from "lucide-react";
import { 
  DesignMasterStore, 
  MasterStoreState 
} from "../services/designMasterStore";
import { 
  DesignWorkspaceUser, 
  DesignUserAccessRecord, 
  DesignRoleCode, 
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

// Role configuration metadata
export const DESIGN_ROLE_DEFINITIONS: Record<DesignRoleCode, {
  label: string;
  badgeColor: string;
  description: string;
  defaultPermissions: {
    canMatrixEdit: boolean;
    canDrawingsUpload: boolean;
    canDrawingsApproveGfc: boolean;
    canTransmittalsCreate: boolean;
    canRfisManage: boolean;
    canMastersManage: boolean;
  };
}> = {
  DESIGN_ADMIN: {
    label: "Design Administrator",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description: "Full administrative control across all projects, drawing releases, masters, and access permissions.",
    defaultPermissions: {
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: true,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: true,
    }
  },
  DESIGN_LEAD: {
    label: "Design Lead / Principal",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    description: "Authority to approve drawings, stamp GFC releases, edit matrices, and manage RFIs.",
    defaultPermissions: {
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: true,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  DESIGN_COORDINATOR: {
    label: "Design Coordinator",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description: "Coordinates consultants, maintains delivery matrix, uploads drawings, and prepares transmittals.",
    defaultPermissions: {
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  CONSULTANT: {
    label: "Consultant / Architect",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description: "External partner: Uploads drawings and revision sheets, responds to RFIs and queries.",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  SITE_ENGINEER: {
    label: "Site Execution Engineer",
    badgeColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    description: "Site execution team: Downloads GFC drawings, acknowledges transmittals, raises site RFIs.",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: false,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  TPQA_AUDITOR: {
    label: "TPQA / Quality Auditor",
    badgeColor: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    description: "Third-party quality auditor: Reviews drawing compliance, audit trails, and certification history.",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: false,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: false,
      canMastersManage: false,
    }
  },
  VIEWER: {
    label: "Executive Viewer",
    badgeColor: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    description: "Read-only executive observer across dashboards, matrices, and project analytics.",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: false,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: false,
      canMastersManage: false,
    }
  }
};

const MODULE_LIST: Array<{ code: DesignRbacPolicy["module"]; label: string; icon: any; desc: string }> = [
  { code: "DESIGN_MATRIX", label: "Tender Design Matrix", icon: Layers, desc: "Package schedule, delivery dates & consultant allocations" },
  { code: "DRAWINGS", label: "Drawing Sheet Register", icon: FileText, desc: "Architectural, structural & MEP sheet registers" },
  { code: "LOOK_AHEAD", label: "30/60 Day Look-Ahead", icon: Sparkles, desc: "Upcoming milestone forecasts and expedited schedules" },
  { code: "LIAISON", label: "Statutory Liaisoning", icon: ShieldCheck, desc: "Authority NOCs, file numbers and approval stages" },
  { code: "TRANSMITTALS", label: "Transmittals & GFC Slips", icon: Send, desc: "Formal digital dispatches and site handovers" },
  { code: "RFIS", label: "RFI & Site Queries", icon: HelpCircle, desc: "Site clarifications, design clashes & responses" },
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

  // Active View Tabs: PERSONNEL | ROLES_MATRIX | MODULE_ENTITLEMENTS
  const [activeTab, setActiveTab] = useState<"PERSONNEL" | "ROLES_MATRIX" | "MODULE_ENTITLEMENTS">("PERSONNEL");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [moduleAccessFilter, setModuleAccessFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  // Slide-Over Permission Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string>("");
  const [drawerDesignRole, setDrawerDesignRole] = useState<DesignRoleCode>("DESIGN_COORDINATOR");
  const [drawerProjectAccessType, setDrawerProjectAccessType] = useState<DesignProjectAccessType>("ALL");
  const [drawerAssignedProjectIds, setDrawerAssignedProjectIds] = useState<string[]>([]);
  const [drawerProjectSearch, setDrawerProjectSearch] = useState("");
  
  // Drawer Granular permissions
  const [permMatrixEdit, setPermMatrixEdit] = useState(true);
  const [permDrawingsUpload, setPermDrawingsUpload] = useState(true);
  const [permGfcApproval, setPermGfcApproval] = useState(false);
  const [permTransmittalsCreate, setPermTransmittalsCreate] = useState(true);
  const [permRfisManage, setPermRfisManage] = useState(true);
  const [permMastersManage, setPermMastersManage] = useState(false);
  const [drawerHasModuleAccess, setDrawerHasModuleAccess] = useState(true);

  // Role-Based Policy Matrix State (Tab 2)
  const [matrixRole, setMatrixRole] = useState<DesignRoleCode>("DESIGN_COORDINATOR");
  const [matrixProject, setMatrixProject] = useState<string>("ALL");
  const [policyRecords, setPolicyRecords] = useState<DesignRbacPolicy[]>(() => DesignMasterStore.getRbacPolicies());
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

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

  // Filtered users for Personnel Table
  const filteredUsers = useMemo(() => {
    return mergedUsers.filter(u => {
      // Search
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

      // Role filter
      if (roleFilter !== "ALL") {
        if (roleFilter === "UNASSIGNED") {
          if (u.designAccess?.designRole) return false;
        } else {
          if (u.designAccess?.designRole !== roleFilter) return false;
        }
      }

      // Scope filter
      if (scopeFilter !== "ALL") {
        if (scopeFilter === "GLOBAL") {
          if (u.designAccess?.projectAccessType !== "ALL") return false;
        } else if (scopeFilter === "SPECIFIC") {
          if (u.designAccess?.projectAccessType !== "SPECIFIC") return false;
        } else if (scopeFilter === "UNASSIGNED") {
          if (u.designAccess) return false;
        }
      }

      // Module access filter
      if (moduleAccessFilter !== "ALL") {
        if (moduleAccessFilter === "ENABLED" && !u.hasModuleAccess) return false;
        if (moduleAccessFilter === "RESTRICTED" && u.hasModuleAccess) return false;
      }

      // Department filter
      if (deptFilter !== "ALL") {
        if (u.departmentName !== deptFilter) return false;
      }

      return true;
    });
  }, [mergedUsers, searchQuery, roleFilter, scopeFilter, moduleAccessFilter, deptFilter]);

  // KPI Metrics
  const totalWorkspaceCount = mergedUsers.length;
  const activeTrackingUsersCount = mergedUsers.filter(u => u.hasModuleAccess).length;
  const adminLeadCount = mergedUsers.filter(u => 
    u.designAccess?.designRole === "DESIGN_ADMIN" || u.designAccess?.designRole === "DESIGN_LEAD"
  ).length;
  const specificScopeCount = mergedUsers.filter(u => 
    u.designAccess?.projectAccessType === "SPECIFIC"
  ).length;

  // Handle 1-Click Module Access Toggle
  const handleToggleModuleAccess = async (user: DesignWorkspaceUser, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !user.hasModuleAccess;
    setTogglingUserId(user.id);

    try {
      // Optimistic UI update in store
      if (!newStatus && user.designAccess) {
        DesignMasterStore.deleteUserAccess(user.id);
      } else if (newStatus && !user.designAccess) {
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
          updatedAt: new Date().toISOString(),
          updatedBy: "Quick Toggle"
        });
      }

      const res = await toggleUserDesignModuleAccessAction(user.id, newStatus);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `Tracking module access ${newStatus ? "granted" : "revoked"} for ${user.fullName}.`
        });
        await loadWorkspaceUsers();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `Failed to update access: ${res.error}`
        });
      }
    } catch (err: any) {
      console.error("Toggle error:", err);
      setFeedbackMessage({
        type: "error",
        text: `Error updating access: ${err.message}`
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  // Open Drawer for a specific user
  const handleOpenDrawer = (user: DesignWorkspaceUser) => {
    setDrawerUserId(user.id);
    setDrawerHasModuleAccess(user.hasModuleAccess);
    setDrawerProjectSearch("");

    if (user.designAccess) {
      setDrawerDesignRole(user.designAccess.designRole);
      setDrawerProjectAccessType(user.designAccess.projectAccessType || "ALL");
      setDrawerAssignedProjectIds(user.designAccess.assignedProjectIds || []);
      setPermMatrixEdit(user.designAccess.canMatrixEdit);
      setPermDrawingsUpload(user.designAccess.canDrawingsUpload);
      setPermGfcApproval(user.designAccess.canDrawingsApproveGfc);
      setPermTransmittalsCreate(user.designAccess.canTransmittalsCreate);
      setPermRfisManage(user.designAccess.canRfisManage);
      setPermMastersManage(user.designAccess.canMastersManage);
    } else {
      applyRoleDefaults("DESIGN_COORDINATOR");
      setDrawerProjectAccessType("ALL");
      setDrawerAssignedProjectIds([]);
    }
    setIsDrawerOpen(true);
  };

  // Apply default permissions when role is selected in drawer
  const applyRoleDefaults = (role: DesignRoleCode) => {
    setDrawerDesignRole(role);
    const defaults = DESIGN_ROLE_DEFINITIONS[role].defaultPermissions;
    setPermMatrixEdit(defaults.canMatrixEdit);
    setPermDrawingsUpload(defaults.canDrawingsUpload);
    setPermGfcApproval(defaults.canDrawingsApproveGfc);
    setPermTransmittalsCreate(defaults.canTransmittalsCreate);
    setPermRfisManage(defaults.canRfisManage);
    setPermMastersManage(defaults.canMastersManage);
  };

  // Toggle assigned project in multi-select
  const toggleProjectAssignment = (projectId: string) => {
    setDrawerAssignedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  // Save drawer access configuration
  const handleSaveDrawerAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerUserId) return;

    if (drawerProjectAccessType === "SPECIFIC" && drawerAssignedProjectIds.length === 0) {
      alert("Please select at least one project for project-restricted access scope.");
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    const accessRecord: DesignUserAccessRecord = {
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
      updatedAt: new Date().toISOString(),
      updatedBy: "Design Administrator"
    };

    try {
      // 1. Save locally to store
      DesignMasterStore.saveUserAccess(accessRecord);

      // 2. Persist to database
      const res = await saveDesignUserAccessAction({
        userId: drawerUserId,
        designRole: drawerDesignRole,
        projectAccessType: drawerProjectAccessType,
        assignedProjectIds: accessRecord.assignedProjectIds,
        canMatrixEdit: permMatrixEdit,
        canDrawingsUpload: permDrawingsUpload,
        canDrawingsApproveGfc: permGfcApproval,
        canTransmittalsCreate: permTransmittalsCreate,
        canRfisManage: permRfisManage,
        canMastersManage: permMastersManage,
        updatedBy: "Design Administrator"
      });

      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `RBAC access policy committed successfully.`
        });
        setIsDrawerOpen(false);
        await loadWorkspaceUsers();
      } else {
        setFeedbackMessage({
          type: "success",
          text: `Permissions saved locally. Sync status: ${res.error || "Synchronized"}`
        });
        setIsDrawerOpen(false);
      }
    } catch (err: any) {
      console.error("Save access error:", err);
      setFeedbackMessage({
        type: "error",
        text: `Failed to commit access policy: ${err.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Revoke user access
  const handleRevokeAccess = async (user: DesignWorkspaceUser) => {
    if (!confirm(`Are you sure you want to revoke Design Tracking access and role privileges for "${user.fullName}"?`)) {
      return;
    }

    try {
      DesignMasterStore.deleteUserAccess(user.id);
      await deleteDesignUserAccessAction(user.id);
      setFeedbackMessage({
        type: "success",
        text: `Access permissions revoked for ${user.fullName}.`
      });
      await loadWorkspaceUsers();
    } catch (err: any) {
      console.error("Revoke error:", err);
      setFeedbackMessage({
        type: "error",
        text: `Failed to revoke access: ${err.message}`
      });
    }
  };

  // Helper for Role Policy Matrix (Tab 2)
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

    return fallbackAll || {
      id: `rbac-${matrixRole.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: DESIGN_ROLE_DEFINITIONS[matrixRole]?.label || matrixRole,
      projectId: matrixProject,
      projectName: matrixProject === "ALL" ? "All Development Projects" : (projectMap.get(matrixProject)?.name || matrixProject),
      module: moduleCode,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
      canApprove: false,
      canExport: true,
      updatedAt: new Date().toISOString()
    };
  };

  const handlePolicyToggle = (moduleCode: DesignRbacPolicy["module"], field: "canCreate" | "canRead" | "canUpdate" | "canDelete" | "canApprove" | "canExport") => {
    const current = getPolicy(moduleCode);
    const updated: DesignRbacPolicy = {
      ...current,
      id: `rbac-${matrixRole.toLowerCase()}-${matrixProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: matrixRole,
      roleName: DESIGN_ROLE_DEFINITIONS[matrixRole]?.label || matrixRole,
      projectId: matrixProject,
      projectName: matrixProject === "ALL" ? "All Development Projects" : (projectMap.get(matrixProject)?.name || matrixProject),
      [field]: !current[field],
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
        text: `Role-based policy matrix committed successfully for ${DESIGN_ROLE_DEFINITIONS[matrixRole]?.label}.`
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

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-300">
      {/* 1. Executive Platform Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Link href="/" className="hover:text-foreground transition-colors">Workspace</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/users" className="hover:text-foreground transition-colors">Identity Governance</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-purple-600 dark:text-purple-400 font-bold">RBAC Access Policies</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25 shrink-0 shadow-xs">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                RBAC Access Policies & User Governance
              </h1>
              <p className="text-xs text-muted mt-0.5">
                Manage Tracking module permissions, assign engineering roles, govern project scopes, and configure fine-grained CRUD matrices.
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

          <Link
            href="/users/new"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register Account</span>
          </Link>
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

      {/* 2. Executive Metric KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Personnel
            </span>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {totalWorkspaceCount}
            </div>
            <p className="text-[11px] text-muted">Enterprise Identity Registry</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Tracking Module Active
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center gap-2">
              <span>{activeTrackingUsersCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {totalWorkspaceCount > 0 ? Math.round((activeTrackingUsersCount / totalWorkspaceCount) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-muted">Entitled in Workspace</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Admins & Design Leads
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {adminLeadCount}
            </div>
            <p className="text-[11px] text-muted">GFC Approval Authorities</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Project-Restricted
            </span>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">
              {specificScopeCount}
            </div>
            <p className="text-[11px] text-muted">Specific Project Scopes</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Building2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation View Segmented Switcher */}
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
            onClick={() => setActiveTab("ROLES_MATRIX")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "ROLES_MATRIX"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-lg"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Role-Based Policy Matrix (Project & Module CRUD)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("MODULE_ENTITLEMENTS")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "MODULE_ENTITLEMENTS"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-lg"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Workspace Modules Cross-Audit</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERSONNEL ACCESS MATRIX (FULL ENTERPRISE TABLE VIEW)                */}
      {/* ========================================================================= */}
      {activeTab === "PERSONNEL" && (
        <div className="space-y-4">
          {/* Quick Filter Bar */}
          <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search across all personnel (Name, UIN, Email, Dept, Role)..."
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
              {/* Module Access Filter */}
              <select
                value={moduleAccessFilter}
                onChange={(e) => setModuleAccessFilter(e.target.value)}
                aria-label="Filter by Tracking Module Access"
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Module Entitlements</option>
                <option value="ENABLED">✅ Tracking Enabled Only</option>
                <option value="RESTRICTED">🚫 Restricted / Unassigned Only</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by Design Role"
                className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Engineering Roles</option>
                {Object.entries(DESIGN_ROLE_DEFINITIONS).map(([code, meta]) => (
                  <option key={code} value={code}>{meta.label}</option>
                ))}
                <option value="UNASSIGNED">Unassigned Access</option>
              </select>

              {/* Project Scope Filter */}
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

              {/* Department Filter */}
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

          {/* Full Data Table Shell */}
          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3.5 px-4">Personnel Identity</th>
                    <th className="py-3.5 px-3">Tracking Module Access</th>
                    <th className="py-3.5 px-3">Engineering Role</th>
                    <th className="py-3.5 px-3">Project Governance Scope</th>
                    <th className="py-3.5 px-3">Granular CRUD Capabilities</th>
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
                          <p className="text-xs text-muted max-w-sm">
                            Try resetting your search query, role filter, or department selection.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const access = user.designAccess;
                      const roleMeta = access?.designRole ? DESIGN_ROLE_DEFINITIONS[access.designRole] : null;
                      const isToggling = togglingUserId === user.id;

                      return (
                        <tr 
                          key={user.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* 1. Personnel Profile */}
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
                                  <span className="font-bold text-foreground">
                                    {user.fullName}
                                  </span>
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
                                  {user.designationName && (
                                    <span className="text-muted">({user.designationName})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Tracking Module Access 1-Click Toggle */}
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
                                  <CheckCircle2 className="h-3 w-3" /> Access Granted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                                  <XCircle className="h-3 w-3" /> Restricted
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Assigned Engineering Role */}
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

                          {/* 4. Project Governance Scope */}
                          <td className="py-3 px-3">
                            {access?.projectAccessType === "SPECIFIC" ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                                  <Building2 className="h-3 w-3" />
                                  {access.assignedProjectIds.length} Assigned Project(s)
                                </span>
                                <div className="text-[10px] text-muted truncate max-w-[200px]" title={access.assignedProjectIds.map(id => projectMap.get(id)?.name || id).join(", ")}>
                                  {access.assignedProjectIds.map(id => projectMap.get(id)?.name || id).slice(0, 2).join(", ")}
                                  {access.assignedProjectIds.length > 2 && "..."}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                <Globe className="h-3 w-3" /> Global (All Projects)
                              </span>
                            )}
                          </td>

                          {/* 5. Granular CRUD Matrix Badges */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                  access?.canMatrixEdit ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"
                                }`}
                                title="Tender Matrix Edit"
                              >
                                Matrix
                              </span>
                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                  access?.canDrawingsUpload ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"
                                }`}
                                title="Drawing Upload"
                              >
                                Upload
                              </span>
                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                  access?.canDrawingsApproveGfc ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"
                                }`}
                                title="GFC Release & Stamp Approval"
                              >
                                GFC Stamp
                              </span>
                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                  access?.canTransmittalsCreate ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"
                                }`}
                                title="Transmittals Dispatch"
                              >
                                Dispatch
                              </span>
                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                  access?.canRfisManage ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" : "bg-muted/30 text-muted/50 border-border/40 line-through"
                                }`}
                                title="RFI & Site Queries"
                              >
                                RFIs
                              </span>
                            </div>
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(user)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Configure Scope, Roles & CRUD Capabilities"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                                <span>Configure</span>
                              </button>

                              {user.designAccess && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeAccess(user)}
                                  className="p-1.5 text-xs font-semibold rounded-lg text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer"
                                  title="Revoke Design Tracking Access"
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
            
            {/* Table Footer Summary */}
            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/40 border-t border-border/80 flex items-center justify-between text-xs text-muted">
              <span>Showing {filteredUsers.length} of {mergedUsers.length} total personnel</span>
              <div className="flex items-center gap-4">
                <span>💡 Click <strong>Configure</strong> on any row to fine-tune project allocations or capability switches.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLE-BASED POLICY MATRIX (PROJECT & MODULE CRUD TABLE)              */}
      {/* ========================================================================= */}
      {activeTab === "ROLES_MATRIX" && (
        <div className="space-y-5">
          {/* Dimension Selectors: Role & Project Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs">
            {/* 1. Target Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-purple-600" />
                <span>1. Select Target Engineering Role:</span>
              </label>
              <select
                value={matrixRole}
                onChange={(e) => setMatrixRole(e.target.value as DesignRoleCode)}
                className="w-full text-xs font-bold bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                {Object.entries(DESIGN_ROLE_DEFINITIONS).map(([code, meta]) => (
                  <option key={code} value={code}>{meta.label} ({code})</option>
                ))}
              </select>
              <p className="text-[11px] text-muted">
                {DESIGN_ROLE_DEFINITIONS[matrixRole]?.description}
              </p>
            </div>

            {/* 2. Target Project Scope */}
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

          {/* Full Interactive Policy Matrix Table */}
          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/80 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>CRUD & Approval Permissions Matrix</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${DESIGN_ROLE_DEFINITIONS[matrixRole]?.badgeColor}`}>
                    {DESIGN_ROLE_DEFINITIONS[matrixRole]?.label}
                  </span>
                </h3>
                <p className="text-xs text-muted">
                  Configure exact Create, Read, Update, Delete, GFC Approval, and Export capabilities per module.
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
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-100/60 dark:bg-slate-900/80 border-b border-border/80 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Functional Module</th>
                    <th className="py-3 px-3 text-center">Create [C]</th>
                    <th className="py-3 px-3 text-center">Read / View [R]</th>
                    <th className="py-3 px-3 text-center">Update / Edit [U]</th>
                    <th className="py-3 px-3 text-center">Delete / Archive [D]</th>
                    <th className="py-3 px-3 text-center">GFC Approval [A]</th>
                    <th className="py-3 px-3 text-center">Export / Reports [E]</th>
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
      {/* TAB 3: WORKSPACE MODULES CROSS-AUDIT                                      */}
      {/* ========================================================================= */}
      {activeTab === "MODULE_ENTITLEMENTS" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-foreground">
              Workspace Operational Module Entitlements Cross-Reference
            </h3>
            <p className="text-xs text-muted mt-1">
              Shows multi-module access allocations across <strong>Task & Operations Workflow</strong>, <strong>Fleet Management Desk</strong>, and <strong>Design & Engineering Tracking</strong> for all enterprise staff accounts.
            </p>
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3.5 px-4">Personnel</th>
                    <th className="py-3.5 px-3">Task & Operations</th>
                    <th className="py-3.5 px-3">Fleet Desk</th>
                    <th className="py-3.5 px-3">Design Tracking</th>
                    <th className="py-3.5 px-4 text-right">Direct Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {mergedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{u.fullName}</div>
                        <div className="text-[11px] text-muted">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          <FolderKanban className="h-3 w-3" /> Enabled
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Car className="h-3 w-3" /> Fleet Enabled
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.hasModuleAccess ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Design Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/40 text-muted border border-border/60">
                            Restricted
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleModuleAccess(u)}
                          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          {u.hasModuleAccess ? "Revoke Tracking" : "Grant Tracking"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER PERMISSION DRAWER FOR SPECIFIC USER DEEP CONFIGURATION          */}
      {/* ========================================================================= */}
      {isDrawerOpen && selectedDrawerUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface dark:bg-slate-900 border-l border-border w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25 shrink-0">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Configure Access & Permissions
                  </h3>
                  <p className="text-xs text-muted">
                    {selectedDrawerUser.fullName} ({selectedDrawerUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveDrawerAccess} className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Section 1: Module Access Switch */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Design Tracking Module Entitlement
                  </span>
                  <span className="text-[11px] text-muted block">
                    Allows personnel to navigate to Design Tracking and access architectural registers.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawerHasModuleAccess}
                    onChange={(e) => setDrawerHasModuleAccess(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Section 2: Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Select Assigned Engineering Role:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(DESIGN_ROLE_DEFINITIONS).map(([code, meta]) => {
                    const isSelected = drawerDesignRole === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => applyRoleDefaults(code as DesignRoleCode)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500 shadow-xs"
                            : "bg-background hover:bg-muted/40 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{meta.label}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted mt-1 line-clamp-2">{meta.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Project Scope Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground block">
                  Project Governance Scope:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerProjectAccessType("ALL");
                      setDrawerAssignedProjectIds([]);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      drawerProjectAccessType === "ALL"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 shadow-xs"
                        : "bg-background hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      <span>Global Access</span>
                    </div>
                    <p className="text-[10px] text-muted mt-1">All current and future projects</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerProjectAccessType("SPECIFIC")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      drawerProjectAccessType === "SPECIFIC"
                        ? "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500 shadow-xs"
                        : "bg-background hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-cyan-500" />
                      <span>Specific Projects</span>
                    </div>
                    <p className="text-[10px] text-muted mt-1">Restricted to selected sites only</p>
                  </button>
                </div>

                {/* Searchable Checkboxes when Specific Scope is selected */}
                {drawerProjectAccessType === "SPECIFIC" && (
                  <div className="p-3.5 rounded-2xl bg-muted/20 border border-border space-y-3 animate-in fade-in">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search projects by name, location..."
                        value={drawerProjectSearch}
                        onChange={(e) => setDrawerProjectSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {filteredDrawerProjects.length === 0 ? (
                        <p className="text-xs text-muted text-center py-3">No matching projects</p>
                      ) : (
                        filteredDrawerProjects.map(p => {
                          const isAssigned = drawerAssignedProjectIds.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleProjectAssignment(p.id)}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isAssigned 
                                  ? "bg-cyan-50/60 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800 font-semibold text-foreground"
                                  : "bg-background hover:bg-muted/40 border-border text-muted"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                  isAssigned ? "bg-cyan-600 border-cyan-600 text-white" : "border-slate-300 dark:border-slate-700"
                                }`}>
                                  {isAssigned && <Check className="h-3 w-3" />}
                                </div>
                                <span>{p.name}</span>
                              </div>
                              <span className="text-[10px] text-muted">{p.location || "Site"}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <span className="text-[10px] text-muted block">
                      {drawerAssignedProjectIds.length} of {projects.length} project(s) selected
                    </span>
                  </div>
                )}
              </div>

              {/* Section 4: Fine-Grained Functional Switches */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground block">
                  Fine-Grained Capability Switches:
                </label>
                <div className="space-y-2 p-3.5 rounded-2xl bg-muted/20 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Tender Matrix Modification</span>
                      <span className="text-[10px] text-muted">Update package statuses and planned delivery dates</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permMatrixEdit}
                      onChange={e => setPermMatrixEdit(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Drawing Sheets Upload</span>
                      <span className="text-[10px] text-muted">Upload revision drawing files and transmittals</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permDrawingsUpload}
                      onChange={e => setPermDrawingsUpload(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">GFC Approval & Signature Stamping</span>
                      <span className="text-[10px] text-muted">Authority to release drawings for site execution</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permGfcApproval}
                      onChange={e => setPermGfcApproval(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Transmittals & Dispatch Creation</span>
                      <span className="text-[10px] text-muted">Issue formal transmittal dispatch slips</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permTransmittalsCreate}
                      onChange={e => setPermTransmittalsCreate(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <div>
                      <span className="text-xs font-bold text-foreground block">RFI & Query Management</span>
                      <span className="text-[10px] text-muted">Raise, respond to and resolve site technical queries</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permRfisManage}
                      onChange={e => setPermRfisManage(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Master Data Governance</span>
                      <span className="text-[10px] text-muted">Add or edit projects, towers, work packages & authorities</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permMastersManage}
                      onChange={e => setPermMastersManage(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Drawer Submit Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-foreground rounded-xl border border-border cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-theme-btn-primary hover:bg-theme-btn-primary-secondary rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>{isSaving ? "Saving..." : "Commit Permissions"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
