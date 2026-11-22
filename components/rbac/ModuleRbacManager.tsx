"use client";

import React, { useState, useTransition, useCallback } from "react";
import {
  Shield,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  ArrowLeft,
  ExternalLink,
  Car,
  Video,
  Wallet,
  LineChart,
  Layers,
  Key,
  Users,
  CheckSquare,
  ChevronRight,
  Database,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";
import {
  AppTableContainer,
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableRow,
  AppTableHead,
  AppTableCell,
} from "@/components/ui/AppTable";
import {
  saveModuleRolePolicyAction,
  resetModuleRoleToDefaultAction,
  getModuleRbacDataAction,
  type ModuleRoleData,
  type ModuleSummaryData,
} from "@/lib/actions/module-rbac";

interface ModuleRbacManagerProps {
  initialModuleCode?: string;
  manifest?: any;
  initialRoles?: ModuleRoleData[];
  initialAuditLogs?: any[];
  allModulesSummaries?: ModuleSummaryData[];
  showModuleSwitcher?: boolean;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  childrenLegacyIAM?: React.ReactNode;
}

const MODULE_ICONS: Record<string, any> = {
  CHANDAK_MEET: Video,
  TASK_WORKFLOW: CheckSquare,
  VEHICLE_DESK: Car,
  DESIGN_TRACKING: Layers,
  ORG_BUDGET: Wallet,
  DASHBOARDS: LineChart,
  AMC: ShieldCheck,
};

export default function ModuleRbacManager({
  initialModuleCode = "CHANDAK_MEET",
  manifest: initialManifest,
  initialRoles = [],
  initialAuditLogs = [],
  allModulesSummaries = [],
  showModuleSwitcher = false,
  title,
  description,
  backHref,
  backLabel,
  childrenLegacyIAM,
}: ModuleRbacManagerProps) {
  // Navigation / active module tab: "OVERVIEW" | <MODULE_CODE> | "LEGACY_IAM"
  const [activeTab, setActiveTab] = useState<string>(
    showModuleSwitcher && allModulesSummaries.length > 0 ? "OVERVIEW" : initialModuleCode
  );

  const [activeModuleCode, setActiveModuleCode] = useState<string>(initialModuleCode);
  const [manifest, setManifest] = useState<any>(initialManifest);
  const [roles, setRoles] = useState<ModuleRoleData[]>(initialRoles);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("STANDARD");
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);

  const [isPending, startTransition] = useTransition();
  const [isLoadingModule, setIsLoadingModule] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active role data
  const activeRole = roles.find((r) => r.role_code === selectedRoleCode) || roles[0];
  const [activePerms, setActivePerms] = useState<string[]>(activeRole?.permissions || []);

  // Update perms when role changes
  const handleSelectRole = (roleCode: string) => {
    setSelectedRoleCode(roleCode);
    const target = roles.find((r) => r.role_code === roleCode);
    setActivePerms(target?.permissions || []);
    setStatusMessage(null);
  };

  // Switch active business module (when module switcher is visible)
  const handleSwitchModule = useCallback(
    (moduleCode: string) => {
      setStatusMessage(null);
      if (moduleCode === "OVERVIEW" || moduleCode === "LEGACY_IAM") {
        setActiveTab(moduleCode);
        return;
      }

      setActiveTab(moduleCode);
      setActiveModuleCode(moduleCode);
      setIsLoadingModule(true);

      startTransition(async () => {
        const res = await getModuleRbacDataAction(moduleCode);
        setIsLoadingModule(false);
        if (res.success && res.manifest) {
          setManifest(res.manifest);
          const newRoles = res.roles || [];
          setRoles(newRoles);
          setAuditLogs(res.auditLogs || []);

          // Pick STANDARD role if available
          const hasStandard = newRoles.find((r) => r.role_code === "STANDARD");
          const defaultRole = hasStandard ? "STANDARD" : newRoles[0]?.role_code || "";
          setSelectedRoleCode(defaultRole);
          const target = newRoles.find((r) => r.role_code === defaultRole);
          setActivePerms(target?.permissions || []);
        } else {
          setStatusMessage({ type: "error", text: res.error || `Failed to load ${moduleCode} RBAC.` });
        }
      });
    },
    [startTransition]
  );

  const handleTogglePerm = (permCode: string) => {
    setActivePerms((prev) =>
      prev.includes(permCode) ? prev.filter((p) => p !== permCode) : [...prev, permCode]
    );
  };

  const handleSavePolicy = () => {
    if (!activeRole) return;
    setStatusMessage(null);

    startTransition(async () => {
      const res = await saveModuleRolePolicyAction(activeModuleCode, activeRole.role_code, activePerms);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Policy for ${activeRole.name} (${activeRole.role_code}) saved and active on production.`,
        });
        setRoles((prev) =>
          prev.map((r) =>
            r.role_code === activeRole.role_code
              ? {
                  ...r,
                  permissions: activePerms,
                  policy_version: r.policy_version + 1,
                  is_customized: true,
                }
              : r
          )
        );
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to save policy." });
      }
    });
  };

  const handleResetToDefault = () => {
    if (!activeRole) return;
    setStatusMessage(null);

    startTransition(async () => {
      const res = await resetModuleRoleToDefaultAction(activeModuleCode, activeRole.role_code);
      if (res.success) {
        const defaultPerms = manifest?.defaultPolicies[activeRole.role_code] || [];
        setActivePerms(defaultPerms);
        setStatusMessage({
          type: "success",
          text: `Role ${activeRole.name} successfully reset to manifest default policy.`,
        });
        setRoles((prev) =>
          prev.map((r) =>
            r.role_code === activeRole.role_code
              ? {
                  ...r,
                  permissions: defaultPerms,
                  policy_version: r.policy_version + 1,
                  is_customized: false,
                }
              : r
          )
        );
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to reset policy." });
      }
    });
  };

  // Group permissions by category
  const declaredPerms = manifest?.permissions || [];
  const categories = ["VIEW", "CREATE", "EDIT", "ADMINISTER", "APPROVE", "CONFIGURE", "EXPORT", "DELETE"];

  const hasChanges =
    JSON.stringify([...activePerms].sort()) !==
    JSON.stringify([...(activeRole?.permissions || [])].sort());

  const IconComponent = MODULE_ICONS[activeModuleCode] || Shield;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Module Switcher Bar (Rendered when showModuleSwitcher is active) */}
      {showModuleSwitcher && (
        <div className="bg-surface border border-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-xs text-muted">
            <span className="font-semibold text-heading uppercase tracking-wider text-[11px]">
              Business Modules RBAC Directory
            </span>
            <span>7 Autonomous Modules · Deterministic Default-Deny</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <AppButton
              variant={activeTab === "OVERVIEW" ? "primary" : "ghost"}
              size="sm"
              onClick={() => handleSwitchModule("OVERVIEW")}
              className={`gap-2 text-xs font-medium whitespace-nowrap ${
                activeTab === "OVERVIEW"
                  ? "bg-theme-btn-primary text-theme-btn-primary-text font-semibold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              All Modules Overview
            </AppButton>

            {allModulesSummaries.map((mod) => {
              const ModIcon = MODULE_ICONS[mod.code] || Shield;
              const isSelected = activeTab === mod.code;
              return (
                <AppButton
                  key={mod.code}
                  variant={isSelected ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => handleSwitchModule(mod.code)}
                  className={`gap-2 text-xs font-medium whitespace-nowrap ${
                    isSelected
                      ? "bg-theme-btn-primary text-theme-btn-primary-text font-semibold shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <ModIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{mod.name}</span>
                  {mod.hasStandardRole && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  )}
                </AppButton>
              );
            })}

            {childrenLegacyIAM && (
              <AppButton
                variant={activeTab === "LEGACY_IAM" ? "primary" : "ghost"}
                size="sm"
                onClick={() => handleSwitchModule("LEGACY_IAM")}
                className={`gap-2 text-xs font-medium whitespace-nowrap ${
                  activeTab === "LEGACY_IAM"
                    ? "bg-theme-btn-primary text-theme-btn-primary-text font-semibold shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span>Global Workspace IAM</span>
              </AppButton>
            )}
          </div>
        </div>
      )}

      {/* VIEW A: All Modules Overview Cards */}
      {activeTab === "OVERVIEW" && allModulesSummaries.length > 0 && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-heading">
              Module-by-Module Access Control & RBAC Governance
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
              Chandak Workspace implements independent module authority. Chandak Workspace assigns{" "}
              <strong>WHO</strong> has access and in what role, while each business module independently owns{" "}
              <strong>WHAT</strong> that role can perform within its perimeter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allModulesSummaries.map((mod) => {
              const ModIcon = MODULE_ICONS[mod.code] || Shield;
              return (
                <div
                  key={mod.code}
                  className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:border-theme-btn-primary/50 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center">
                          <ModIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-heading">{mod.name}</h3>
                          <span className="text-[10px] font-mono text-muted">{mod.code}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        STANDARD
                      </span>
                    </div>

                    <p className="text-xs text-muted line-clamp-2 mb-4 leading-relaxed">
                      {mod.description}
                    </p>

                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-surface-elevated/50 rounded-lg text-center mb-4 border border-border/50">
                      <div>
                        <span className="block text-[10px] text-subtle">Roles</span>
                        <span className="text-xs font-bold text-heading">{mod.totalRoles}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-subtle">Perms</span>
                        <span className="text-xs font-bold text-heading">{mod.totalPermissions}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-subtle">Users</span>
                        <span className="text-xs font-bold text-heading">{mod.assignedUsersCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                    <AppButton
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs font-semibold gap-1.5"
                      onClick={() => handleSwitchModule(mod.code)}
                    >
                      <Key className="h-3.5 w-3.5" />
                      Configure RBAC
                    </AppButton>
                    <Link href={mod.routePath}>
                      <AppButton variant="outline" size="sm" className="px-2.5" title="Go to module">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </AppButton>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: Global Legacy IAM */}
      {activeTab === "LEGACY_IAM" && childrenLegacyIAM && (
        <div className="space-y-4">{childrenLegacyIAM}</div>
      )}

      {/* VIEW C: Dedicated Module Policy Editor */}
      {activeTab !== "OVERVIEW" && activeTab !== "LEGACY_IAM" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-heading">
                    {title || `${manifest?.name || activeModuleCode} · RBAC Access Policies`}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sunken text-muted">
                    {activeModuleCode}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {description ||
                    "Independent module roles, permission matrix, and autonomous policy synchronization"}
                </p>
              </div>
            </div>

            {backHref && (
              <Link href={backHref}>
                <AppButton variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backLabel || "Back to Module"}
                </AppButton>
              </Link>
            )}
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {roles.map((r) => {
              const isSelected = r.role_code === selectedRoleCode;
              return (
                <div
                  key={r.role_code}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectRole(r.role_code)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectRole(r.role_code);
                    }
                  }}
                  className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
                    isSelected
                      ? "bg-theme-btn-primary/10 border-theme-btn-primary ring-1 ring-theme-btn-primary"
                      : "bg-surface border-border hover:bg-surface-elevated"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-sm text-heading">{r.name}</span>
                    {r.role_code === "STANDARD" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        STANDARD
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sunken text-muted">
                        v{r.policy_version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted line-clamp-2 mb-3">{r.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-subtle border-t border-border/50 pt-2">
                    <span>{r.permissions.length} permissions</span>
                    <span className="font-medium text-heading">
                      {r.user_count} user{r.user_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Role Configuration Section */}
          {activeRole && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-heading">
                      {activeRole.name} ({activeRole.role_code})
                    </h3>
                    {activeRole.is_customized ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Customized Policy
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        Manifest Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{activeRole.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    onClick={handleResetToDefault}
                    disabled={isPending}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Defaults
                  </AppButton>
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={handleSavePolicy}
                    isLoading={isPending}
                    disabled={!hasChanges}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Policy
                  </AppButton>
                </div>
              </div>

              {/* Permissions Matrix by Category */}
              <div className="space-y-6">
                {categories.map((cat) => {
                  const catPerms = declaredPerms.filter((p: any) => p.category === cat);
                  if (catPerms.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-2.5">
                      <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        {cat} Operations
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {catPerms.map((perm: any) => {
                          const isGranted = activePerms.includes(perm.code);
                          return (
                            <div
                              key={perm.code}
                              onClick={() => handleTogglePerm(perm.code)}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isGranted
                                  ? "bg-theme-btn-primary/5 border-theme-btn-primary/40 text-foreground"
                                  : "bg-surface-elevated/40 border-border hover:bg-surface-elevated text-muted"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isGranted}
                                onChange={() => {}} // Controlled via parent div click
                                className="mt-0.5 rounded border-border text-theme-btn-primary focus:ring-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-semibold ${
                                      isGranted ? "text-heading" : "text-muted"
                                    }`}
                                  >
                                    {perm.name}
                                  </span>
                                  {perm.isSensitive && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                      <Lock className="h-2.5 w-2.5" />
                                      Sensitive
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-subtle mt-0.5 leading-relaxed">
                                  {perm.description}
                                </p>
                                <span className="text-[10px] text-muted/60 font-mono mt-1 block">
                                  {perm.code}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audit Logs Section */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <History className="h-4 w-4 text-muted" />
              <h3 className="text-sm font-semibold text-heading">
                Recent RBAC Policy Audit History ({activeModuleCode})
              </h3>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted">No policy modification events recorded yet.</p>
            ) : (
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <AppTableRow>
                      <AppTableHead>Timestamp</AppTableHead>
                      <AppTableHead>Status</AppTableHead>
                      <AppTableHead>Policy Version</AppTableHead>
                      <AppTableHead>Modified Roles</AppTableHead>
                      <AppTableHead>Executed By</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {auditLogs.map((log: any) => (
                      <AppTableRow key={log.id}>
                        <AppTableCell className="whitespace-nowrap text-muted text-xs">
                          {new Date(log.executed_at).toLocaleString()}
                        </AppTableCell>
                        <AppTableCell>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <ShieldCheck className="h-3 w-3" />
                            {log.sync_status}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="font-mono text-[11px]">v{log.new_version}</AppTableCell>
                        <AppTableCell className="text-xs">
                          {(log.modified_roles || []).join(", ") || "—"}
                        </AppTableCell>
                        <AppTableCell className="text-muted font-mono text-[10px]">
                          {log.executed_by}
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
