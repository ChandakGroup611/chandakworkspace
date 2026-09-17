"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Sliders
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
  ProjectMaster 
} from "../types/masterTypes";
import { 
  fetchDesignWorkspaceUsersAction, 
  saveDesignUserAccessAction, 
  deleteDesignUserAccessAction 
} from "@/lib/actions/designTracking";

// Role configuration metadata
const DESIGN_ROLE_DEFINITIONS: Record<DesignRoleCode, {
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
    description: "Full administrative control across all projects, masters, and access permissions.",
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

export const DesignRbacGovernance: React.FC = () => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [workspaceUsers, setWorkspaceUsers] = useState<DesignWorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [moduleAccessFilter, setModuleAccessFilter] = useState<string>("ALL");

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDesignRole, setSelectedDesignRole] = useState<DesignRoleCode>("DESIGN_COORDINATOR");
  const [projectAccessType, setProjectAccessType] = useState<DesignProjectAccessType>("ALL");
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  
  // Granular permissions in form
  const [permMatrixEdit, setPermMatrixEdit] = useState(true);
  const [permDrawingsUpload, setPermDrawingsUpload] = useState(true);
  const [permGfcApproval, setPermGfcApproval] = useState(false);
  const [permTransmittalsCreate, setPermTransmittalsCreate] = useState(true);
  const [permRfisManage, setPermRfisManage] = useState(true);
  const [permMastersManage, setPermMastersManage] = useState(false);

  // Listen to DesignMasterStore
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
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

        // Synchronize store's local user access list with remote if needed
        res.users.forEach(u => {
          if (u.designAccess) {
            DesignMasterStore.saveUserAccess(u.designAccess);
          }
        });
      } else {
        // Fallback: build mock representation from store's userAccessList
        const storeAccess = DesignMasterStore.getUserAccessList();
        const fallbackUsers: DesignWorkspaceUser[] = storeAccess.map(a => ({
          id: a.userId,
          fullName: `User (${a.userId.slice(0, 8)})`,
          email: `${a.userId}@chandakgroup.com`,
          isActive: true,
          hasModuleAccess: true,
          designAccess: a
        }));
        setWorkspaceUsers(fallbackUsers);
      }
    } catch (err: any) {
      console.warn("Could not fetch workspace users, using local store:", err);
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

  // Merge workspace users with any local store access updates
  const mergedUsers = useMemo(() => {
    const storeAccessMap = new Map(DesignMasterStore.getUserAccessList().map(a => [a.userId, a]));
    
    return workspaceUsers.map(u => {
      const localAccess = storeAccessMap.get(u.id);
      return {
        ...u,
        designAccess: localAccess || u.designAccess
      };
    });
  }, [workspaceUsers, storeState.userAccessList]);

  // Filtered users
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
        if (moduleAccessFilter === "PENDING" && u.hasModuleAccess) return false;
      }

      return true;
    });
  }, [mergedUsers, searchQuery, roleFilter, scopeFilter, moduleAccessFilter]);

  // KPI Metrics
  const totalWorkspaceCount = mergedUsers.length;
  const configuredDesignUsersCount = mergedUsers.filter(u => !!u.designAccess).length;
  const adminLeadCount = mergedUsers.filter(u => 
    u.designAccess?.designRole === "DESIGN_ADMIN" || u.designAccess?.designRole === "DESIGN_LEAD"
  ).length;
  const specificScopeCount = mergedUsers.filter(u => 
    u.designAccess?.projectAccessType === "SPECIFIC"
  ).length;

  // Handle opening Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("CREATE");
    // Default to first user without access or first user
    const unconfigured = mergedUsers.find(u => !u.designAccess);
    setSelectedUserId(unconfigured ? unconfigured.id : (mergedUsers[0]?.id || ""));
    applyRoleDefaults("DESIGN_COORDINATOR");
    setProjectAccessType("ALL");
    setAssignedProjectIds([]);
    setIsModalOpen(true);
  };

  // Handle opening Edit Modal for specific user
  const handleOpenEditModal = (user: DesignWorkspaceUser) => {
    setModalMode("EDIT");
    setSelectedUserId(user.id);
    if (user.designAccess) {
      setSelectedDesignRole(user.designAccess.designRole);
      setProjectAccessType(user.designAccess.projectAccessType || "ALL");
      setAssignedProjectIds(user.designAccess.assignedProjectIds || []);
      setPermMatrixEdit(user.designAccess.canMatrixEdit);
      setPermDrawingsUpload(user.designAccess.canDrawingsUpload);
      setPermGfcApproval(user.designAccess.canDrawingsApproveGfc);
      setPermTransmittalsCreate(user.designAccess.canTransmittalsCreate);
      setPermRfisManage(user.designAccess.canRfisManage);
      setPermMastersManage(user.designAccess.canMastersManage);
    } else {
      applyRoleDefaults("DESIGN_COORDINATOR");
      setProjectAccessType("ALL");
      setAssignedProjectIds([]);
    }
    setIsModalOpen(true);
  };

  // Apply default permissions when role is selected
  const applyRoleDefaults = (role: DesignRoleCode) => {
    setSelectedDesignRole(role);
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
    setAssignedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  // Save access configuration
  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert("Please select a valid user.");
      return;
    }

    if (projectAccessType === "SPECIFIC" && assignedProjectIds.length === 0) {
      alert("Please select at least one project for project-specific access.");
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    const accessRecord: DesignUserAccessRecord = {
      userId: selectedUserId,
      designRole: selectedDesignRole,
      projectAccessType: projectAccessType,
      assignedProjectIds: projectAccessType === "SPECIFIC" ? assignedProjectIds : [],
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
      // 1. Save locally to DesignMasterStore for instant reactive UI updates
      DesignMasterStore.saveUserAccess(accessRecord);

      // 2. Persist to Supabase database via server action
      const res = await saveDesignUserAccessAction({
        userId: selectedUserId,
        designRole: selectedDesignRole,
        projectAccessType: projectAccessType,
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
          text: `Permissions successfully configured and synchronized for user.`
        });
        setIsModalOpen(false);
        await loadWorkspaceUsers();
      } else {
        setFeedbackMessage({
          type: "success",
          text: `Permissions saved locally in store. Remote sync: ${res.error || "Pending"}`
        });
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error("Save access error:", err);
      setFeedbackMessage({
        type: "error",
        text: `Error saving access: ${err.message || "Unknown error"}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Revoke user access
  const handleRevokeAccess = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to revoke Design Tracking access and role privileges for "${userName}"?`)) {
      return;
    }

    try {
      DesignMasterStore.deleteUserAccess(userId);
      await deleteDesignUserAccessAction(userId);
      setFeedbackMessage({
        type: "success",
        text: `Access revoked for ${userName}.`
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

  const selectedUserObject = useMemo(() => {
    return mergedUsers.find(u => u.id === selectedUserId);
  }, [mergedUsers, selectedUserId]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-background border border-border/70 rounded-xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                RBAC Policies & User Access Governance
              </h2>
              <p className="text-xs text-muted-foreground">
                Provision Chandak Workspace users, assign engineering roles, govern project scopes, and configure fine-grained permissions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadWorkspaceUsers}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title="Refresh Users from Workspace"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-500" : ""}`} />
            <span>Sync Workspace</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 hover:shadow-purple-500/25 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Assign User Access</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-lg border flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 ${
          feedbackMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMessage(null)}
            className="hover:opacity-75 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace Users
            </span>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {totalWorkspaceCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Central Chandak Directory</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Configured Design Users
            </span>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
              {configuredDesignUsersCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Active Module Permissions</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admins & Leads
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {adminLeadCount}
            </div>
            <p className="text-[10px] text-muted-foreground">GFC & Matrix Approval Authority</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project-Restricted
            </span>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">
              {specificScopeCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Specific Project Scopes</p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/20">
            <Building2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            aria-label="Search users by name, email, department, code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by Design Role"
            className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">All Roles</option>
            {Object.entries(DESIGN_ROLE_DEFINITIONS).map(([code, meta]) => (
              <option key={code} value={code}>{meta.label}</option>
            ))}
            <option value="UNASSIGNED">Unassigned Access</option>
          </select>

          {/* Scope Filter */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            aria-label="Filter by Project Scope"
            className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">All Scopes</option>
            <option value="GLOBAL">Global (All Projects)</option>
            <option value="SPECIFIC">Specific Projects</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>

          {/* Module Access Filter */}
          <select
            value={moduleAccessFilter}
            onChange={(e) => setModuleAccessFilter(e.target.value)}
            aria-label="Filter by Workspace Module Access"
            className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ENABLED">Module Enabled</option>
            <option value="PENDING">Module Pending</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4">User & Workspace Identity</th>
                <th className="py-3 px-3">Design Role</th>
                <th className="py-3 px-3">Project Access Scope</th>
                <th className="py-3 px-3">Engineering Privileges</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-purple-500" />
                      <span>Loading Workspace IAM & RBAC Permissions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-7 w-7 text-muted-foreground/50" />
                      <p className="font-medium text-foreground">No users found matching current filters</p>
                      <p className="text-[11px]">Clear search or filters, or assign new permissions to workspace users.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const access = user.designAccess;
                  const roleMeta = access ? DESIGN_ROLE_DEFINITIONS[access.designRole] : null;

                  return (
                    <tr 
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold shrink-0 overflow-hidden text-xs">
                            {user.profilePhoto ? (
                              <img src={user.profilePhoto} alt={user.fullName} className="h-full w-full object-cover" />
                            ) : (
                              user.fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-xs truncate">
                                {user.fullName}
                              </span>
                              {user.userCode && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted text-muted-foreground rounded">
                                  {user.userCode}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                              {user.departmentName && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-2.5 w-2.5" />
                                  {user.departmentName}
                                </span>
                              )}
                              {user.designationName && (
                                <span className="opacity-75">• {user.designationName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Design Role */}
                      <td className="py-3.5 px-3">
                        {roleMeta ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleMeta.badgeColor}`}>
                              <ShieldCheck className="h-3 w-3" />
                              {roleMeta.label}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Not Configured
                          </span>
                        )}
                      </td>

                      {/* Project Scope */}
                      <td className="py-3.5 px-3">
                        {access ? (
                          access.projectAccessType === "ALL" ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <Globe className="h-3.5 w-3.5 shrink-0" />
                              <span>All Projects (Global)</span>
                            </div>
                          ) : (
                            <div className="space-y-1 max-w-[200px]">
                              <div className="flex items-center gap-1 text-[11px] font-medium text-cyan-600 dark:text-cyan-400">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span>{access.assignedProjectIds.length} Selected Projects:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {access.assignedProjectIds.map(pId => {
                                  const prj = projectMap.get(pId);
                                  return (
                                    <span 
                                      key={pId} 
                                      className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 rounded truncate max-w-[130px]"
                                      title={prj?.name || pId}
                                    >
                                      {prj?.name || pId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">None</span>
                        )}
                      </td>

                      {/* Engineering Privileges */}
                      <td className="py-3.5 px-3">
                        {access ? (
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                                access.canMatrixEdit 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                  : "bg-muted text-muted-foreground/50 border-transparent line-through"
                              }`}
                              title="Matrix Edit Permission"
                            >
                              <FileSpreadsheet className="h-2.5 w-2.5" />
                              Matrix Edit
                            </span>

                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                                access.canDrawingsUpload 
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
                                  : "bg-muted text-muted-foreground/50 border-transparent line-through"
                              }`}
                              title="Drawing Upload Permission"
                            >
                              <FileText className="h-2.5 w-2.5" />
                              Upload
                            </span>

                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                                access.canDrawingsApproveGfc 
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                                  : "bg-muted text-muted-foreground/50 border-transparent line-through"
                              }`}
                              title="GFC Stamping / Approval Permission"
                            >
                              <ShieldCheck className="h-2.5 w-2.5" />
                              GFC Approve
                            </span>

                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                                access.canTransmittalsCreate 
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" 
                                  : "bg-muted text-muted-foreground/50 border-transparent line-through"
                              }`}
                              title="Transmittal Creation Permission"
                            >
                              <Send className="h-2.5 w-2.5" />
                              Transmittals
                            </span>

                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                                access.canRfisManage 
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" 
                                  : "bg-muted text-muted-foreground/50 border-transparent line-through"
                              }`}
                              title="RFI Management Permission"
                            >
                              <HelpCircle className="h-2.5 w-2.5" />
                              RFIs
                            </span>

                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                                access.canMastersManage 
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" 
                                  : "bg-muted text-muted-foreground/50 border-transparent line-through"
                              }`}
                              title="Masters Configuration Permission"
                            >
                              <Settings className="h-2.5 w-2.5" />
                              Masters
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No privileges granted</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
                            title="Edit Permissions & Scope"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {access && (
                            <button
                              type="button"
                              onClick={() => handleRevokeAccess(user.id, user.fullName)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors"
                              title="Revoke Access"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Slide-over / Modal for Access Configuration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/30">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {modalMode === "CREATE" ? "Assign Design Tracking Access" : "Edit Access & Permissions"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure role classification, project access scope, and engineering capabilities.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveAccess} className="p-5 space-y-6 flex-1">
              {/* User Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  <span>Workspace User</span>
                </label>

                {modalMode === "CREATE" ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    aria-label="Select Workspace User"
                    className="w-full text-xs bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="" disabled>-- Select a Workspace User --</option>
                    {mergedUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email}) - {u.departmentName || "Workspace"} {u.designAccess ? `[Assigned: ${u.designAccess.designRole}]` : "[No Access]"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-600 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedUserObject?.fullName.slice(0, 2).toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{selectedUserObject?.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">{selectedUserObject?.email} • {selectedUserObject?.departmentName || "Workspace"}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-purple-500" />
                  <span>Design Tracking Role</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(DESIGN_ROLE_DEFINITIONS).map(([code, meta]) => {
                    const isSelected = selectedDesignRole === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => applyRoleDefaults(code as DesignRoleCode)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500/30"
                            : "border-border/70 hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-foreground">{meta.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-purple-500" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {meta.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Project Scope Selection */}
              <div className="space-y-3 p-4 bg-muted/30 border border-border/70 rounded-xl">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-purple-500" />
                  <span>Project Access Scope</span>
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs flex-1 transition-colors ${
                    projectAccessType === "ALL" 
                      ? "border-emerald-500/50 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}>
                    <input
                      type="radio"
                      name="projectAccessType"
                      checked={projectAccessType === "ALL"}
                      onChange={() => setProjectAccessType("ALL")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>All Workspace Projects (Global)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs flex-1 transition-colors ${
                    projectAccessType === "SPECIFIC" 
                      ? "border-cyan-500/50 bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-300"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}>
                    <input
                      type="radio"
                      name="projectAccessType"
                      checked={projectAccessType === "SPECIFIC"}
                      onChange={() => setProjectAccessType("SPECIFIC")}
                      className="text-cyan-600 focus:ring-cyan-500"
                    />
                    <Building className="h-4 w-4 shrink-0" />
                    <span>Specific Projects Only</span>
                  </label>
                </div>

                {/* Specific Projects Multi-Select */}
                {projectAccessType === "SPECIFIC" && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <span className="text-[11px] font-medium text-foreground block">
                      Select Permitted Projects ({assignedProjectIds.length} selected):
                    </span>
                    {projects.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground bg-muted/40 rounded-lg text-center">
                        No projects created yet in Masters. You can create projects in the "Masters Setup" tab.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                        {projects.map(p => {
                          const isAssigned = assignedProjectIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProjectAssignment(p.id)}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-colors ${
                                isAssigned 
                                  ? "border-cyan-500 bg-cyan-500/15 text-foreground font-semibold"
                                  : "border-border text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              <div className="truncate mr-2">
                                <div>{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">{p.code} • {p.location}</div>
                              </div>
                              {isAssigned && <Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Granular Permissions Switches */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-purple-500" />
                  <span>Granular Engineering Privileges</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/80 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permMatrixEdit}
                      onChange={(e) => setPermMatrixEdit(e.target.checked)}
                      className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-foreground">Tender Matrix Edit</div>
                      <p className="text-[11px] text-muted-foreground leading-tight">Update deliverable delivery statuses, planned & actual dates.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/80 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permDrawingsUpload}
                      onChange={(e) => setPermDrawingsUpload(e.target.checked)}
                      className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-foreground">Drawings Upload</div>
                      <p className="text-[11px] text-muted-foreground leading-tight">Upload new drawing sheets, revisions, CAD files & PDFs.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/80 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permGfcApproval}
                      onChange={(e) => setPermGfcApproval(e.target.checked)}
                      className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-foreground">GFC Stamping & Approval</div>
                      <p className="text-[11px] text-muted-foreground leading-tight">Issue Good For Construction releases and digital stamps.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/80 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permTransmittalsCreate}
                      onChange={(e) => setPermTransmittalsCreate(e.target.checked)}
                      className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-foreground">Transmittals Management</div>
                      <p className="text-[11px] text-muted-foreground leading-tight">Create document packages and issue transmittals to contractors.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/80 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permRfisManage}
                      onChange={(e) => setPermRfisManage(e.target.checked)}
                      className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-foreground">RFI & Query Resolution</div>
                      <p className="text-[11px] text-muted-foreground leading-tight">Raise queries, track responses, and resolve site clashes.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/80 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permMastersManage}
                      onChange={(e) => setPermMastersManage(e.target.checked)}
                      className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-foreground">Masters Configuration</div>
                      <p className="text-[11px] text-muted-foreground leading-tight">Add/delete projects, towers, disciplines & work packages.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border sticky bottom-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-foreground border border-border bg-background hover:bg-muted rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save & Synchronize</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
