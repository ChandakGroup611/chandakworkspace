"use client";

import React, { useState, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { inviteUserAction, InviteUserPayload } from "@/lib/actions/users";
import { DASHBOARDS } from "@/lib/dashboards/registry";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Shield, 
  User, 
  FolderKanban, 
  Car, 
  Compass, 
  LineChart, 
  Video, 
  Landmark, 
  MessageSquare,
  AlertCircle,
  Sparkles,
  Lock
} from "lucide-react";

export interface UserInviteWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Array<{ id: string; name: string }>;
  designations: Array<{ id: string; name: string; department_id: string }>;
  managers: Array<{ id: string; full_name: string; email: string }>;
  roles: Array<{ id: string; code: string; name: string }>;
  moduleRoles: Array<{ module_code: string; role_code: string; name: string; description?: string; permissions: string[] }>;
  isCallerSuperAdmin: boolean;
}

const MODULE_DEFINITIONS = [
  { 
    code: "TASK_WORKFLOW", 
    name: "Workspace & Tasks", 
    desc: "Workspaces, tasks, sprints, tickets, requirements, AMC & SLA", 
    icon: FolderKanban, 
    defaultRole: "MEMBER" 
  },
  { 
    code: "VEHICLE_DESK", 
    name: "Vehicle Management Desk", 
    desc: "Fleet roster, vehicle requisition, maintenance, drivers & trips", 
    icon: Car, 
    defaultRole: "REQUESTER" 
  },
  { 
    code: "DESIGN_TRACKING", 
    name: "Design & Drawing Tracking", 
    desc: "Drawing register, revisions, GFC authorization, RFIs & transmittals", 
    icon: Compass, 
    defaultRole: "VIEWER" 
  },
  { 
    code: "CHANDAK_MEET", 
    name: "Chandak Meet", 
    desc: "Meeting cadences, live session running, published MOM & action items", 
    icon: Video, 
    defaultRole: "STANDARD" 
  },
  { 
    code: "ORG_BUDGET", 
    name: "Organization Budget", 
    desc: "Project budgets, towers, cost heads, workings, approvals & actuals", 
    icon: Landmark, 
    defaultRole: "VIEWER" 
  }
];

const WIZARD_STEPS = [
  { id: 1, title: "Identity", desc: "Basic details" },
  { id: 2, title: "Platform Role", desc: "Governance level" },
  { id: 3, title: "Modules & Scope", desc: "Module roles" },
  { id: 4, title: "Dashboards", desc: "Executive reports" },
  { id: 5, title: "Default Landing", desc: "Primary view" },
  { id: 6, title: "Review & Send", desc: "Confirmation" }
];

export function UserInviteWizardModal({
  isOpen,
  onClose,
  onSuccess,
  departments,
  designations,
  managers,
  roles,
  moduleRoles,
  isCallerSuperAdmin
}: UserInviteWizardModalProps) {
  // Wizard State
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [managerId, setManagerId] = useState("");

  // Step 2: Platform Role
  const [platformRole, setPlatformRole] = useState<"STANDARD" | "USER_ADMIN" | "SUPER_ADMIN">("STANDARD");

  // Step 3: Modules & Scope
  // Map of module_code -> { enabled: boolean, role_code: string, scopeType: 'all' }
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, { enabled: boolean; role_code: string; scopeType: string }>>({
    TASK_WORKFLOW: { enabled: true, role_code: "MEMBER", scopeType: "all" },
    VEHICLE_DESK: { enabled: false, role_code: "REQUESTER", scopeType: "all" },
    DESIGN_TRACKING: { enabled: false, role_code: "VIEWER", scopeType: "all" },
    CHANDAK_MEET: { enabled: true, role_code: "STANDARD", scopeType: "all" },
    ORG_BUDGET: { enabled: false, role_code: "VIEWER", scopeType: "all" }
  });

  // Step 4: Dashboards
  // Map of dashboard_key -> { enabled: boolean, role_code: 'VIEWER' | 'EDITOR' }
  const [dashboardConfigs, setDashboardConfigs] = useState<Record<string, { enabled: boolean; role_code: "VIEWER" | "EDITOR" }>>({
    it: { enabled: false, role_code: "VIEWER" },
    mkt: { enabled: false, role_code: "VIEWER" },
    adm: { enabled: false, role_code: "VIEWER" },
    engg: { enabled: false, role_code: "VIEWER" },
    sfdc: { enabled: false, role_code: "VIEWER" },
    cws: { enabled: false, role_code: "VIEWER" }
  });

  // Step 5: Default Landing
  const [defaultModule, setDefaultModule] = useState<string>("TASK_WORKFLOW");

  // Filter designations by selected department
  const filteredDesignations = useMemo(() => {
    if (!departmentId) return designations;
    return designations.filter(d => d.department_id === departmentId);
  }, [designations, departmentId]);

  // Available module roles per module code
  const getRolesForModule = (modCode: string) => {
    const list = moduleRoles.filter(r => r.module_code === modCode);
    return [...list].sort((a, b) => {
      if (a.role_code === "STANDARD") return -1;
      if (b.role_code === "STANDARD") return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Enabled modules list for Step 5 & 6
  const enabledModules = useMemo(() => {
    return MODULE_DEFINITIONS.filter(m => moduleConfigs[m.code]?.enabled);
  }, [moduleConfigs]);

  const enabledDashboards = useMemo(() => {
    return DASHBOARDS.filter(d => dashboardConfigs[d.key]?.enabled);
  }, [dashboardConfigs]);

  // Validation before advancing
  const canAdvance = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!email.trim() || !email.includes("@")) {
        setErrorMsg("Please provide a valid corporate email address.");
        return false;
      }
      if (!fullName.trim()) {
        setErrorMsg("Please provide the user's full name.");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (enabledModules.length === 0 && enabledDashboards.length === 0 && platformRole !== "SUPER_ADMIN") {
        setErrorMsg("Please select at least one module for the user.");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (canAdvance()) {
      setStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Submit Handler
  const handleSubmit = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // Find roleId for platformRole
      let resolvedRoleId: string | null = null;
      if (platformRole === "SUPER_ADMIN") {
        const sa = roles.find(r => ["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN"].includes(r.code?.toUpperCase()));
        resolvedRoleId = sa?.id || null;
      } else if (platformRole === "USER_ADMIN") {
        const ua = roles.find(r => ["USER_ADMIN", "ADMIN"].includes(r.code?.toUpperCase()));
        resolvedRoleId = ua?.id || null;
      } else {
        const std = roles.find(r => ["STANDARD", "ROLE_AGENT", "MEMBER"].includes(r.code?.toUpperCase()));
        resolvedRoleId = std?.id || null;
      }

      // Format moduleAccess
      const moduleAccessToSave = Object.entries(moduleConfigs)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([modCode, cfg]) => ({
          module_code: modCode,
          role_code: cfg.role_code,
          scope: { type: cfg.scopeType || "all" }
        }));

      // Format dashboardAccess
      const dashboardAccessToSave = Object.entries(dashboardConfigs)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([dKey, cfg]) => ({
          dashboard_key: dKey,
          role_code: cfg.role_code,
          company_ids: []
        }));

      const activeModuleCodes = moduleAccessToSave.map(m => m.module_code);
      if (dashboardAccessToSave.length > 0) {
        activeModuleCodes.push("DASHBOARDS");
      }

      const payload: InviteUserPayload = {
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        roleId: resolvedRoleId,
        departmentId: departmentId || null,
        designationId: designationId || null,
        managerId: managerId || null,
        moduleCodes: activeModuleCodes,
        defaultModuleCode: defaultModule,
        dashboardKeys: dashboardAccessToSave.map(d => d.dashboard_key),
        moduleAccess: moduleAccessToSave,
        dashboardAccess: dashboardAccessToSave
      };

      const result = await inviteUserAction(payload);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(result.error || "Failed to dispatch user invitation.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during invite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                {step}
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Onboard Personnel &rarr; Step {step} of 6: {WIZARD_STEPS[step - 1].title}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {WIZARD_STEPS[step - 1].desc} &bull; Enterprise Module-Wise RBAC
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="grid grid-cols-6 border-b border-border bg-surface text-[11px] font-medium">
          {WIZARD_STEPS.map((s) => {
            const isDone = s.id < step;
            const isCurrent = s.id === step;
            return (
              <div 
                key={s.id}
                className={`py-2 text-center border-r last:border-r-0 border-border transition-colors ${
                  isCurrent 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : isDone 
                      ? "text-foreground" 
                      : "text-muted-foreground/60"
                }`}
              >
                <span className="hidden sm:inline">{s.id}. </span>{s.title}
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">
                    Full Name *
                  </label>
                  <AppInput
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">
                    Corporate Email Address *
                  </label>
                  <AppInput
                    type="email"
                    placeholder="user@chandakgroup.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">
                    Department
                  </label>
                  <select
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    value={departmentId}
                    onChange={e => {
                      setDepartmentId(e.target.value);
                      setDesignationId("");
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">
                    Designation
                  </label>
                  <select
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    value={designationId}
                    onChange={e => setDesignationId(e.target.value)}
                  >
                    <option value="">Select Designation</option>
                    {filteredDesignations.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block text-foreground">
                  Reporting Manager
                </label>
                <select
                  className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                  value={managerId}
                  onChange={e => setManagerId(e.target.value)}
                >
                  <option value="">Select Reporting Manager (Optional)</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: PLATFORM ROLE */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                The platform role defines governance authority in <code className="text-xs">user_master</code>. Operational capabilities are configured separately in Step 3.
              </p>

              <div className="space-y-2.5">
                {/* STANDARD */}
                <label 
                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                    platformRole === "STANDARD"
                      ? "bg-primary/5 border-primary shadow-xs"
                      : "bg-surface border-border hover:border-border-active"
                  }`}
                >
                  <input
                    type="radio"
                    name="platformRole"
                    value="STANDARD"
                    checked={platformRole === "STANDARD"}
                    onChange={() => setPlatformRole("STANDARD")}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">STANDARD — Standard Collaborator</span>
                      <AppBadge variant="info">Recommended</AppBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Standard enterprise member. Capabilities are strictly bounded by module roles assigned in Step 3.
                    </p>
                  </div>
                </label>

                {/* USER_ADMIN */}
                <label 
                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                    platformRole === "USER_ADMIN"
                      ? "bg-primary/5 border-primary shadow-xs"
                      : "bg-surface border-border hover:border-border-active"
                  }`}
                >
                  <input
                    type="radio"
                    name="platformRole"
                    value="USER_ADMIN"
                    checked={platformRole === "USER_ADMIN"}
                    onChange={() => setPlatformRole("USER_ADMIN")}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">USER_ADMIN — User Administrator</span>
                      <AppBadge variant="warning">Administrative</AppBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Authorized to invite personnel, update directory profiles, and configure module entitlements.
                    </p>
                  </div>
                </label>

                {/* SUPER_ADMIN */}
                {isCallerSuperAdmin && (
                  <label 
                    className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                      platformRole === "SUPER_ADMIN"
                        ? "bg-primary/5 border-primary shadow-xs"
                        : "bg-surface border-border hover:border-border-active"
                    }`}
                  >
                    <input
                      type="radio"
                      name="platformRole"
                      value="SUPER_ADMIN"
                      checked={platformRole === "SUPER_ADMIN"}
                      onChange={() => setPlatformRole("SUPER_ADMIN")}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">SUPER_ADMIN — Platform Root Administrator</span>
                        <AppBadge variant="danger">Root Control</AppBadge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Root platform owner with absolute, non-bypassable global override across all modules and dashboards.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: MODULES & SCOPE */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Assign module-wise roles and data boundaries. Unchecked modules will be completely hidden from the user.
              </p>

              <div className="space-y-2.5">
                {MODULE_DEFINITIONS.map(mod => {
                  const cfg = moduleConfigs[mod.code] || { enabled: false, role_code: mod.defaultRole, scopeType: "all" };
                  const Icon = mod.icon;
                  const rolesForMod = getRolesForModule(mod.code);

                  return (
                    <div 
                      key={mod.code}
                      className={`p-3 rounded-lg border transition-all ${
                        cfg.enabled ? "bg-surface border-border-active shadow-xs" : "bg-surface/40 border-border opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={e => {
                              const checked = e.target.checked;
                              setModuleConfigs(prev => ({
                                ...prev,
                                [mod.code]: { ...cfg, enabled: checked }
                              }));
                            }}
                            className="rounded"
                          />
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                          </div>
                        </label>

                        {cfg.enabled && (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] text-muted-foreground font-medium">Role:</label>
                              <select
                                className="text-xs bg-surface border border-border rounded-md px-2 py-1 outline-none focus:border-primary font-medium"
                                value={cfg.role_code}
                                onChange={e => {
                                  const newRole = e.target.value;
                                  setModuleConfigs(prev => ({
                                    ...prev,
                                    [mod.code]: { ...cfg, role_code: newRole }
                                  }));
                                }}
                              >
                                {rolesForMod.map(r => (
                                  <option key={r.role_code} value={r.role_code}>
                                    {r.role_code === "STANDARD" ? `${r.name} (STANDARD)` : r.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] text-muted-foreground font-medium">Scope:</label>
                              <select
                                className="text-xs bg-surface border border-border rounded-md px-2 py-1 outline-none focus:border-primary font-medium"
                                value={cfg.scopeType || "all"}
                                onChange={e => {
                                  const newScope = e.target.value;
                                  setModuleConfigs(prev => ({
                                    ...prev,
                                    [mod.code]: { ...cfg, scopeType: newScope }
                                  }));
                                }}
                              >
                                <option value="all">ALL (Unrestricted)</option>
                                <option value="departments">SPECIFIC (Department / Scoped)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground ml-6 mt-1">
                        {mod.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: DASHBOARDS */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Grant granular access to Executive IN4 Financial & Operational Dashboards.
              </p>

              <div className="space-y-2.5">
                {DASHBOARDS.map(d => {
                  const cfg = dashboardConfigs[d.key] || { enabled: false, role_code: "VIEWER" };
                  return (
                    <div 
                      key={d.key}
                      className={`p-3 rounded-lg border transition-all ${
                        cfg.enabled ? "bg-surface border-border-active shadow-xs" : "bg-surface/40 border-border opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={e => {
                              const checked = e.target.checked;
                              setDashboardConfigs(prev => ({
                                ...prev,
                                [d.key]: { ...cfg, enabled: checked }
                              }));
                            }}
                            className="rounded"
                          />
                          <div>
                            <span className="text-xs font-semibold text-foreground">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">({d.key})</span>
                          </div>
                        </label>

                        {cfg.enabled && (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-muted-foreground">Level:</label>
                            <select
                              className="text-xs bg-surface border border-border rounded-md px-2 py-1 outline-none focus:border-primary font-medium"
                              value={cfg.role_code}
                              onChange={e => {
                                const newRole = e.target.value as "VIEWER" | "EDITOR";
                                setDashboardConfigs(prev => ({
                                  ...prev,
                                  [d.key]: { ...cfg, role_code: newRole }
                                }));
                              }}
                            >
                              <option value="VIEWER">VIEWER (Read-only KPI + drilldown)</option>
                              <option value="EDITOR">EDITOR (Export, AI Chat, Config)</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">
                        {d.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: DEFAULT LANDING */}
          {step === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select which operational module opens automatically when this user logs into Chandak Workspace.
              </p>

              <div className="space-y-2">
                {enabledModules.map(mod => {
                  const Icon = mod.icon;
                  const isSelected = defaultModule === mod.code;
                  return (
                    <label 
                      key={mod.code}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-primary/5 border-primary shadow-xs" 
                          : "bg-surface border-border hover:border-border-active"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="defaultModule"
                          value={mod.code}
                          checked={isSelected}
                          onChange={() => setDefaultModule(mod.code)}
                        />
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                      </div>
                      {isSelected && <AppBadge variant="info">Default Landing</AppBadge>}
                    </label>
                  );
                })}

                {enabledDashboards.length > 0 && (
                  <label 
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      defaultModule === "DASHBOARDS" 
                        ? "bg-primary/5 border-primary shadow-xs" 
                        : "bg-surface border-border hover:border-border-active"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="defaultModule"
                        value="DASHBOARDS"
                        checked={defaultModule === "DASHBOARDS"}
                        onChange={() => setDefaultModule("DASHBOARDS")}
                      />
                      <LineChart className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Executive Dashboards</span>
                    </div>
                    {defaultModule === "DASHBOARDS" && <AppBadge variant="info">Default Landing</AppBadge>}
                  </label>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & SEND */}
          {step === 6 && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg border border-border bg-surface-raised space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{fullName}</h4>
                    <p className="text-xs text-muted-foreground">{email}</p>
                  </div>
                  <AppBadge variant={platformRole === "SUPER_ADMIN" ? "danger" : platformRole === "USER_ADMIN" ? "warning" : "info"}>
                    {platformRole}
                  </AppBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Department: </span>
                    {departments.find(d => d.id === departmentId)?.name || "Not Assigned"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Designation: </span>
                    {designations.find(d => d.id === designationId)?.name || "Not Assigned"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Manager: </span>
                    {managers.find(m => m.id === managerId)?.full_name || "None"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Default Landing: </span>
                    {MODULE_DEFINITIONS.find(m => m.code === defaultModule)?.name || defaultModule}
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-xs text-foreground mb-1.5">Provisioned Operational Modules:</h5>
                <div className="space-y-1.5">
                  {enabledModules.map(mod => {
                    const cfg = moduleConfigs[mod.code];
                    const roleName = getRolesForModule(mod.code).find(r => r.role_code === cfg.role_code)?.name || cfg.role_code;
                    return (
                      <div key={mod.code} className="p-2.5 rounded-md border border-border bg-surface flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{mod.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">[{cfg.scopeType || "all"}]</span>
                        </div>
                        <AppBadge variant={cfg.role_code === "STANDARD" ? "success" : "neutral"}>
                          {cfg.role_code === "STANDARD" ? `${roleName} (STANDARD)` : roleName}
                        </AppBadge>
                      </div>
                    );
                  })}
                  {enabledModules.length === 0 && (
                    <p className="text-muted-foreground text-xs italic">No operational modules enabled.</p>
                  )}
                </div>
              </div>

              {enabledDashboards.length > 0 && (
                <div>
                  <h5 className="font-semibold text-xs text-foreground mb-1.5">Granted Executive Dashboards:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {enabledDashboards.map(d => {
                      const cfg = dashboardConfigs[d.key];
                      return (
                        <div key={d.key} className="p-2 rounded-md border border-border bg-surface flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{d.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{cfg.role_code}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised flex items-center justify-between">
          <AppButton
            variant="outline"
            size="sm"
            onClick={step === 1 ? onClose : handlePrev}
            disabled={isSubmitting}
          >
            {step === 1 ? "Cancel" : <><ChevronLeft className="h-4 w-4 mr-1" /> Back</>}
          </AppButton>

          {step < 6 ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={handleNext}
            >
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </AppButton>
          ) : (
            <AppButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Dispatching Invitation..." : "Confirm & Send Invitation"}
            </AppButton>
          )}
        </div>

      </div>
    </div>
  );
}
