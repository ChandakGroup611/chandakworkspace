"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DesignRbacPolicy } from "../types/masterTypes";
import { DesignMasterStore } from "../services/designMasterStore";
import { 
  saveRbacPoliciesAction, 
  fetchRbacPoliciesAction, 
  saveSingleDesignRbacPolicyAction 
} from "@/lib/actions/designTracking";
import { 
  ShieldCheck, 
  X, 
  Check, 
  RotateCcw, 
  Save, 
  Building2, 
  Users, 
  Layers, 
  Lock, 
  CheckCircle2, 
  Info,
  SlidersHorizontal,
  FileText,
  Clock,
  Send,
  HelpCircle,
  UserCheck
} from "lucide-react";
import { DesignRbacGovernance } from "./DesignRbacGovernance";
import { confirmAction } from "@/components/ui/feedback/confirm";

interface DesignRbacModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  { code: "SUPER_ADMIN", name: "Super Administrator", desc: "Full root access to all projects and modules" },
  { code: "DESIGN_DIRECTOR", name: "Director of Design & Engineering", desc: "Full CRUD governance across design modules" },
  { code: "PROJECT_MANAGER", name: "Senior Project Manager", desc: "Execution controls & matrix updates for assigned projects" },
  { code: "SITE_ENGINEER", name: "Site Execution Engineer", desc: "View drawings/matrix, manage transmittals & RFIs" },
  { code: "CONSULTANT", name: "Empanelled Consultant Partner", desc: "Upload drawings, review RFIs & respond to queries" },
  { code: "VIEWER", name: "Read-Only Stakeholder / Auditor", desc: "Auditing and analytics view only" }
];

const MODULES: Array<{ code: DesignRbacPolicy["module"]; label: string; icon: any }> = [
  { code: "DESIGN_MATRIX", label: "Tender Design Matrix", icon: Layers },
  { code: "DRAWINGS", label: "Drawing sheet register", icon: FileText },
  { code: "CONSULTANTS", label: "Consultant Directory", icon: Users },
  { code: "LOOK_AHEAD", label: "30/60 Day Look-Ahead", icon: Clock },
  { code: "LIAISON", label: "Statutory Liaisoning", icon: ShieldCheck },
  { code: "TRANSMITTALS", label: "Transmittal dispatch", icon: Send },
  { code: "RFIS", label: "RFI & site queries", icon: HelpCircle }
];

export const DesignRbacModal: React.FC<DesignRbacModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeModalTab, setActiveModalTab] = useState<"USERS" | "ROLES">("USERS");
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [policies, setPolicies] = useState<DesignRbacPolicy[]>(() => DesignMasterStore.getRbacPolicies());
  const [selectedRole, setSelectedRole] = useState<string>("PROJECT_MANAGER");
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchRbacPoliciesAction().then(res => {
      if (res.success && res.policies) {
        setPolicies(res.policies);
        DesignMasterStore.bulkSaveRbacPolicies(res.policies);
      }
    }).catch(err => console.warn("Failed to load design policies:", err));

    const unsub = DesignMasterStore.subscribe(() => {
      const s = DesignMasterStore.getState();
      setStoreState(s);
      setPolicies(DesignMasterStore.getRbacPolicies());
    });
    return unsub;
  }, []);

  if (!isOpen || !mounted) return null;

  const currentRoleObj = ROLES.find(r => r.code === selectedRole) || ROLES[0];

  // Helper to find or create policy entry
  const getPolicyForModule = (moduleCode: DesignRbacPolicy["module"]) => {
    const found = policies.find(p => 
      p.roleCode === selectedRole && 
      p.projectId === selectedProject && 
      p.module === moduleCode
    );

    if (found) return found;

    // Fallback if not configured for this specific project yet
    const fallbackAll = policies.find(p => 
      p.roleCode === selectedRole && 
      p.projectId === "ALL" && 
      p.module === moduleCode
    );

    return fallbackAll || {
      id: `rbac-${selectedRole.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: selectedRole,
      roleName: currentRoleObj.name,
      projectId: selectedProject,
      projectName: selectedProject === "ALL" ? "All Development Projects" : (storeState.projects.find(p => p.id === selectedProject)?.name || selectedProject),
      module: moduleCode,
      canCreate: selectedRole === "SUPER_ADMIN" || selectedRole === "DESIGN_DIRECTOR",
      canRead: true,
      canUpdate: selectedRole !== "VIEWER",
      canDelete: selectedRole === "SUPER_ADMIN" || selectedRole === "DESIGN_DIRECTOR",
      updatedAt: new Date().toISOString()
    };
  };

  const handleTogglePermission = (
    moduleCode: DesignRbacPolicy["module"],
    action: "canCreate" | "canRead" | "canUpdate" | "canDelete"
  ) => {
    const targetPolicy = getPolicyForModule(moduleCode);
    const updatedPolicy: DesignRbacPolicy = {
      ...targetPolicy,
      projectId: selectedProject,
      projectName: selectedProject === "ALL" ? "All Development Projects" : (storeState.projects.find(p => p.id === selectedProject)?.name || selectedProject),
      [action]: !targetPolicy[action],
      updatedAt: new Date().toISOString()
    };

    DesignMasterStore.saveRbacPolicy(updatedPolicy);
    saveSingleDesignRbacPolicyAction(updatedPolicy).catch(e => console.error("Auto-save policy error:", e));

    setPolicies(DesignMasterStore.getRbacPolicies());
  };

  const handleGrantAll = (moduleCode: DesignRbacPolicy["module"]) => {
    const updatedPolicy: DesignRbacPolicy = {
      id: `rbac-${selectedRole.toLowerCase()}-${selectedProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: selectedRole,
      roleName: currentRoleObj.name,
      projectId: selectedProject,
      projectName: selectedProject === "ALL" ? "All Development Projects" : (storeState.projects.find(p => p.id === selectedProject)?.name || selectedProject),
      module: moduleCode,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canApprove: true,
      canExport: true,
      updatedAt: new Date().toISOString()
    };

    DesignMasterStore.saveRbacPolicy(updatedPolicy);
    saveSingleDesignRbacPolicyAction(updatedPolicy).catch(e => console.error("Auto-save grant error:", e));

    setPolicies(DesignMasterStore.getRbacPolicies());
  };

  const handleRevokeAll = (moduleCode: DesignRbacPolicy["module"]) => {
    const updatedPolicy: DesignRbacPolicy = {
      id: `rbac-${selectedRole.toLowerCase()}-${selectedProject.toLowerCase()}-${moduleCode.toLowerCase()}`,
      roleCode: selectedRole,
      roleName: currentRoleObj.name,
      projectId: selectedProject,
      projectName: selectedProject === "ALL" ? "All Development Projects" : (storeState.projects.find(p => p.id === selectedProject)?.name || selectedProject),
      module: moduleCode,
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canApprove: false,
      canExport: false,
      updatedAt: new Date().toISOString()
    };

    DesignMasterStore.saveRbacPolicy(updatedPolicy);
    saveSingleDesignRbacPolicyAction(updatedPolicy).catch(e => console.error("Auto-save revoke error:", e));

    setPolicies(DesignMasterStore.getRbacPolicies());
  };

  const handleSavePolicies = async () => {
    setIsSaving(true);
    try {
      const current = DesignMasterStore.getRbacPolicies();
      await saveRbacPoliciesAction(current);
      setSaveSuccessMessage("RBAC Policies saved and synchronized successfully!");
    } catch (err: any) {
      console.error("Save policies error:", err);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    }
  };

  const handleResetDefaults = async () => {
    if ((await confirmAction("Reset all RBAC policies to system recommended defaults?"))) {
      const defaults = DesignMasterStore.buildDefaultRbacPolicies();
      setPolicies(defaults);
      DesignMasterStore.bulkSaveRbacPolicies(defaults);
      await saveRbacPoliciesAction(defaults);
      setSaveSuccessMessage("Policies reset to default configurations.");
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-4xl rounded-3xl shadow-lg p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info-soft text-info-text flex items-center justify-center border border-info-border">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-info-text flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Enterprise identity governance</span>
              </span>
              <h3 className="text-lg font-semibold text-foreground mt-0.5">
                RBAC access policies: project-wise / role-based / CRUD options
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure fine-grained Create [C], Read [R], Update [U], Delete [D] permissions per role and development project.
              </p>
            </div>
          </div>

          <button aria-label="Close"
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveModalTab("USERS")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeModalTab === "USERS"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Workspace user access & scopes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab("ROLES")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeModalTab === "ROLES"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Role matrix & CRUD defaults</span>
          </button>
        </div>

        {activeModalTab === "USERS" ? (
          <div className="py-2">
            <DesignRbacGovernance />
          </div>
        ) : (
          <>
            {saveSuccessMessage && (
              <div className="p-3 rounded-lg bg-success-soft border border-success-border text-success-text text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Dimension Selectors: Role & Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
              {/* 1. Select Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-info-text" />
                  <span>1. Target user role:</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  {ROLES.map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground italic">
                  {currentRoleObj.desc}
                </p>
              </div>

              {/* 2. Select Project Scope */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-info-text" />
                  <span>2. Project scope (project-wise):</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All development projects (global default)</option>
                  {storeState.projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location || "Site"})</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {selectedProject === "ALL" ? "Applies universally across all projects unless overridden." : "Custom overrides for this specific project site."}
                </p>
              </div>
            </div>

            {/* CRUD Permission Matrix Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground">
                  CRUD capability configuration for [{currentRoleObj.name}] on [{selectedProject === "ALL" ? "All Projects" : (storeState.projects.find(p => p.id === selectedProject)?.name || selectedProject)}]
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  [C] create • [r] read • [u] update • [d] delete
                </span>
              </div>

              <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-foreground">
                    <tr>
                      <th className="p-3 w-1/3">Module / resource area</th>
                      <th className="p-3 text-center">Create [C]</th>
                      <th className="p-3 text-center">Read / view [r]</th>
                      <th className="p-3 text-center">Update [U]</th>
                      <th className="p-3 text-center">Delete [D]</th>
                      <th className="p-3 text-right">Quick preset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {MODULES.map(mod => {
                      const Icon = mod.icon;
                      const policy = getPolicyForModule(mod.code);
                      const isSuper = selectedRole === "SUPER_ADMIN";

                      return (
                        <tr key={mod.code} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-info-soft text-info-text flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{mod.label}</div>
                              <span className="text-[11px] text-muted-foreground font-mono">{mod.code}</span>
                            </div>
                          </td>

                          {/* Create [C] */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleTogglePermission(mod.code, "canCreate")}
                              className={`h-7 w-7 rounded-lg font-semibold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canCreate 
                                  ? "bg-success text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle create permission"
                            >
                              {policy.canCreate ? "✓" : "—"}
                            </button>
                          </td>

                          {/* Read [R] */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleTogglePermission(mod.code, "canRead")}
                              className={`h-7 w-7 rounded-lg font-semibold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canRead 
                                  ? "bg-accent-soft text-accent-soft-text font-semibold" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle read permission"
                            >
                              {policy.canRead ? "✓" : "—"}
                            </button>
                          </td>

                          {/* Update [U] */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleTogglePermission(mod.code, "canUpdate")}
                              className={`h-7 w-7 rounded-lg font-semibold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canUpdate 
                                  ? "bg-warning text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle update permission"
                            >
                              {policy.canUpdate ? "✓" : "—"}
                            </button>
                          </td>

                          {/* Delete [D] */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleTogglePermission(mod.code, "canDelete")}
                              className={`h-7 w-7 rounded-lg font-semibold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canDelete 
                                  ? "bg-danger-solid text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle delete permission"
                            >
                              {policy.canDelete ? "✓" : "—"}
                            </button>
                          </td>

                          {/* Quick Actions */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleGrantAll(mod.code)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-info-text hover:bg-info-soft mr-1.5 cursor-pointer disabled:opacity-50"
                            >
                              Full CRUD
                            </button>
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleRevokeAll(mod.code)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset recommended defaults</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSavePolicies}
                  className="px-5 py-2 rounded-lg bg-surface border border-border-active hover:bg-surface-hover text-foreground font-semibold shadow-md inline-flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? "Saving..." : "Save RBAC Policies"}</span>
                </button>
              </div>
            </div>
        </>
      )}
      </div>
    </div>,
    document.body
  );
};
