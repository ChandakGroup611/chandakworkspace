"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { fetchUserModuleAccessAction, saveUserModuleAccessAction } from "@/lib/actions/users";
import { DASHBOARDS } from "@/lib/dashboards/registry";
import { 
  X, 
  Check, 
  FolderKanban, 
  Car, 
  Compass, 
  LineChart, 
  Video, 
  Landmark, 
  MessageSquare,
  AlertCircle,
  Save,
  Loader2
} from "lucide-react";

export interface UserModuleAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  moduleRoles: Array<{ module_code: string; role_code: string; name: string; description?: string; permissions: string[] }>;
  designProjects?: Array<{ id: string; code: string; name: string }>;
  designTowers?: Array<{ id: string; project_id: string; tower_name: string }>;
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

export function UserModuleAccessModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  moduleRoles,
  designProjects = [],
  designTowers = [],
  isCallerSuperAdmin
}: UserModuleAccessModalProps) {
  const [designProjectIds, setDesignProjectIds] = useState<string[]>([]);
  const [designSubProjectIds, setDesignSubProjectIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Module configs: modCode -> { enabled, role_code, scopeType }
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, { enabled: boolean; role_code: string; scopeType: string }>>({});
  // Dashboard configs: dashKey -> { enabled, role_code }
  const [dashboardConfigs, setDashboardConfigs] = useState<Record<string, { enabled: boolean; role_code: "VIEWER" | "EDITOR" }>>({});
  const [defaultModule, setDefaultModule] = useState<string>("TASK_WORKFLOW");

  // Load existing entitlements
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    async function loadData() {
      try {
        const rows = await fetchUserModuleAccessAction(user!.id);
        if (!isMounted) return;

        const newModConfigs: Record<string, { enabled: boolean; role_code: string; scopeType: string }> = {};
        // Initialize defaults
        for (const m of MODULE_DEFINITIONS) {
          newModConfigs[m.code] = { enabled: false, role_code: m.defaultRole, scopeType: "all" };
        }

        const newDashConfigs: Record<string, { enabled: boolean; role_code: "VIEWER" | "EDITOR" }> = {};
        for (const d of DASHBOARDS) {
          newDashConfigs[d.key] = { enabled: false, role_code: "VIEWER" };
        }

        let defaultFound = "TASK_WORKFLOW";

        for (const r of rows) {
          if (r.module_code === "DASHBOARDS") {
            if (r.dashboard_key) {
              newDashConfigs[r.dashboard_key] = {
                enabled: true,
                role_code: (r.role_code as "VIEWER" | "EDITOR") || "VIEWER"
              };
            }
            if (r.is_default) defaultFound = "DASHBOARDS";
          } else if (newModConfigs[r.module_code]) {
            const resolvedRole = (r.module_code === "CHANDAK_MEET" && r.role_code === "PARTICIPANT")
              ? "STANDARD"
              : r.role_code;
            newModConfigs[r.module_code] = {
              enabled: true,
              role_code: resolvedRole,
              scopeType: (r.scope as any)?.type || "all"
            };
            if (r.is_default) defaultFound = r.module_code;
          }
        }

        setModuleConfigs(newModConfigs);
        setDashboardConfigs(newDashConfigs);
        setDefaultModule(defaultFound);
      } catch (err: any) {
        if (isMounted) setErrorMsg(err.message || "Failed to load user module access.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [isOpen, user]);

  const getRolesForModule = (modCode: string) => {
    const list = moduleRoles.filter(r => r.module_code === modCode);
    return [...list].sort((a, b) => {
      if (a.role_code === "STANDARD") return -1;
      if (b.role_code === "STANDARD") return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const moduleAccessToSave = Object.entries(moduleConfigs)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([modCode, cfg]) => ({
          module_code: modCode,
          role_code: cfg.role_code,
          scope:
            modCode === "DESIGN_TRACKING" && cfg.scopeType === "projects"
              ? { type: "projects", project_ids: designProjectIds, sub_project_ids: designSubProjectIds }
              : { type: cfg.scopeType || "all" },
          is_default: modCode === defaultModule
        }));

      const dashboardAccessToSave = Object.entries(dashboardConfigs)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([dKey, cfg]) => ({
          dashboard_key: dKey,
          role_code: cfg.role_code,
          company_ids: []
        }));

      const res = await saveUserModuleAccessAction(
        user.id,
        moduleAccessToSave,
        dashboardAccessToSave,
        defaultModule
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to update module access.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Configure Module Access &amp; Roles
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              User: <span className="font-medium text-foreground">{user.full_name}</span> ({user.email})
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
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
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading module entitlements...</span>
            </div>
          ) : (
            <>
              {/* Operational Modules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Operational Modules
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Assign role per active module
                  </span>
                </div>

                <div className="space-y-2">
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
                                  {mod.code === "DESIGN_TRACKING" ? (
                                    <option value="projects">SPECIFIC (Projects &amp; Sub-projects)</option>
                                  ) : (
                                    <option value="departments">SPECIFIC (Department / Scoped)</option>
                                  )}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground ml-6 mt-1">
                          {mod.desc}
                        </p>

                        {cfg.enabled && mod.code === "DESIGN_TRACKING" && cfg.scopeType === "projects" && (
                          <div className="ml-6 mt-2.5 p-2.5 rounded-lg border border-border bg-surface space-y-2 text-[11px]">
                            <div className="font-semibold text-foreground">Assign Projects</div>
                            <div className="flex flex-wrap gap-1.5">
                              {designProjects.map((p) => {
                                const checked = designProjectIds.includes(p.id);
                                return (
                                  <label key={p.id} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer ${checked ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border"}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setDesignProjectIds((prev) =>
                                          checked ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                                        );
                                      }}
                                    />
                                    <span>{p.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {designProjectIds.length > 0 && (
                              <>
                                <div className="font-semibold text-foreground pt-1">Assign Sub-projects (leave empty for all in selected projects)</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {designTowers
                                    .filter((t) => designProjectIds.includes(t.project_id))
                                    .map((t) => {
                                      const checked = designSubProjectIds.includes(t.id);
                                      return (
                                        <label key={t.id} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer ${checked ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border"}`}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              setDesignSubProjectIds((prev) =>
                                                checked ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                                              );
                                            }}
                                          />
                                          <span>{t.tower_name}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Executive Dashboards */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Executive Dashboards
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Per-dashboard access level
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DASHBOARDS.map(d => {
                    const cfg = dashboardConfigs[d.key] || { enabled: false, role_code: "VIEWER" };
                    return (
                      <div 
                        key={d.key}
                        className={`p-2.5 rounded-lg border transition-all ${
                          cfg.enabled ? "bg-surface border-border-active shadow-xs" : "bg-surface/40 border-border opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
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
                            <span className="text-xs font-semibold text-foreground">{d.name}</span>
                          </label>

                          {cfg.enabled && (
                            <select
                              className="text-[11px] bg-surface border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary font-medium"
                              value={cfg.role_code}
                              onChange={e => {
                                const newRole = e.target.value as "VIEWER" | "EDITOR";
                                setDashboardConfigs(prev => ({
                                  ...prev,
                                  [d.key]: { ...cfg, role_code: newRole }
                                }));
                              }}
                            >
                              <option value="VIEWER">VIEWER</option>
                              <option value="EDITOR">EDITOR</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Default Landing Module */}
              <div className="pt-3 border-t border-border">
                <label className="text-xs font-semibold block text-foreground mb-1.5">
                  Default Landing Module:
                </label>
                <select
                  className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                  value={defaultModule}
                  onChange={e => setDefaultModule(e.target.value)}
                >
                  {MODULE_DEFINITIONS.filter(m => moduleConfigs[m.code]?.enabled).map(m => (
                    <option key={m.code} value={m.code}>{m.name}</option>
                  ))}
                  {Object.values(dashboardConfigs).some(d => d.enabled) && (
                    <option value="DASHBOARDS">Executive Dashboards</option>
                  )}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised flex items-center justify-between">
          <AppButton
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </AppButton>

          <AppButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? "Saving..." : <><Save className="h-4 w-4 mr-1.5" /> Save Module Access</>}
          </AppButton>
        </div>

      </div>
    </div>
  );
}
