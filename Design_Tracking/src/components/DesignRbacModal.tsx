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
  { code: "DRAWINGS", label: "Drawing Sheet Register", icon: FileText },
  { code: "CONSULTANTS", label: "Consultant Directory", icon: Users },
  { code: "LOOK_AHEAD", label: "30/60 Day Look-Ahead", icon: Clock },
  { code: "LIAISON", label: "Statutory Liaisoning", icon: ShieldCheck },
  { code: "TRANSMITTALS", label: "Transmittal Dispatch", icon: Send },
  { code: "RFIS", label: "RFI & Site Queries", icon: HelpCircle }
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
    if (confirm("Reset all RBAC policies to system recommended defaults?")) {
      const defaults = DesignMasterStore.buildDefaultRbacPolicies();
      setPolicies(defaults);
      DesignMasterStore.bulkSaveRbacPolicies(defaults);
      await saveRbacPoliciesAction(defaults);
      setSaveSuccessMessage("Policies reset to default configurations.");
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-4xl rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/25">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Enterprise Identity Governance</span>
              </span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                RBAC Access Policies: Project-wise / Role-based / CRUD Options
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure fine-grained Create [C], Read [R], Update [U], Delete [D] permissions per role and development project.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Workspace User Access & Scopes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab("ROLES")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeModalTab === "ROLES"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Role Matrix & CRUD Defaults</span>
          </button>
        </div>

        {activeModalTab === "USERS" ? (
          <div className="py-2">
            <DesignRbacGovernance />
          </div>
        ) : (
          <>
            {saveSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Dimension Selectors: Role & Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border">
              {/* 1. Select Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span>1. Target User Role:</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
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
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>2. Project Scope (Project-Wise):</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option value="ALL">🏢 All Development Projects (Global Default)</option>
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
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  CRUD Capability Configuration for [{currentRoleObj.name}] on [{selectedProject === "ALL" ? "All Projects" : (storeState.projects.find(p => p.id === selectedProject)?.name || selectedProject)}]
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  [C] Create • [R] Read • [U] Update • [D] Delete
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-foreground">
                    <tr>
                      <th className="p-3 w-1/3">Module / Resource Area</th>
                      <th className="p-3 text-center">Create [C]</th>
                      <th className="p-3 text-center">Read / View [R]</th>
                      <th className="p-3 text-center">Update [U]</th>
                      <th className="p-3 text-center">Delete [D]</th>
                      <th className="p-3 text-right">Quick Preset</th>
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
                            <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{mod.label}</div>
                              <span className="text-[10px] text-muted-foreground font-mono">{mod.code}</span>
                            </div>
                          </td>

                          {/* Create [C] */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleTogglePermission(mod.code, "canCreate")}
                              className={`h-7 w-7 rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canCreate 
                                  ? "bg-emerald-600 text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle Create Permission"
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
                              className={`h-7 w-7 rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canRead 
                                  ? "bg-blue-600 text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle Read Permission"
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
                              className={`h-7 w-7 rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canUpdate 
                                  ? "bg-amber-600 text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle Update Permission"
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
                              className={`h-7 w-7 rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                                policy.canDelete 
                                  ? "bg-rose-600 text-white shadow-xs" 
                                  : "bg-muted text-muted-foreground border border-border"
                              } ${isSuper ? "opacity-75 cursor-not-allowed" : ""}`}
                              title="Toggle Delete Permission"
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
                              className="px-2 py-1 rounded-md text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 mr-1.5 cursor-pointer disabled:opacity-50"
                            >
                              Full CRUD
                            </button>
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() => handleRevokeAll(mod.code)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Recommended Defaults</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSavePolicies}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
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
