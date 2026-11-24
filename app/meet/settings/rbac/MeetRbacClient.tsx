"use client";

import React, { useState, useTransition } from "react";
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
  saveMeetRolePolicyAction,
  resetMeetRoleToDefaultAction,
  type MeetRoleData,
} from "@/lib/actions/meet/rbac";

interface MeetRbacClientProps {
  manifest: any;
  initialRoles: MeetRoleData[];
  initialAuditLogs: any[];
}

export default function MeetRbacClient({
  manifest,
  initialRoles,
  initialAuditLogs,
}: MeetRbacClientProps) {
  const [roles, setRoles] = useState<MeetRoleData[]>(initialRoles);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("STANDARD");
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active role data
  const activeRole = roles.find((r) => r.role_code === selectedRoleCode) || roles[0];
  const [activePerms, setActivePerms] = useState<string[]>(activeRole?.permissions || []);

  const handleSelectRole = (roleCode: string) => {
    setSelectedRoleCode(roleCode);
    const target = roles.find((r) => r.role_code === roleCode);
    setActivePerms(target?.permissions || []);
    setStatusMessage(null);
  };

  const handleTogglePerm = (permCode: string) => {
    setActivePerms((prev) =>
      prev.includes(permCode) ? prev.filter((p) => p !== permCode) : [...prev, permCode]
    );
  };

  const handleSavePolicy = () => {
    if (!activeRole) return;
    setStatusMessage(null);

    startTransition(async () => {
      const res = await saveMeetRolePolicyAction(activeRole.role_code, activePerms);
      if (res.success) {
        setStatusMessage({ type: "success", text: `Policy for ${activeRole.name} updated successfully.` });
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
      const res = await resetMeetRoleToDefaultAction(activeRole.role_code);
      if (res.success) {
        const defaultPerms = manifest?.defaultPolicies[activeRole.role_code] || [];
        setActivePerms(defaultPerms);
        setStatusMessage({
          type: "success",
          text: `Role ${activeRole.name} reset to manifest default policy.`,
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
  const categories = ["VIEW", "CREATE", "EDIT", "ADMINISTER", "APPROVE", "CONFIGURE", "DELETE"];

  const hasChanges =
    JSON.stringify([...activePerms].sort()) !==
    JSON.stringify([...(activeRole?.permissions || [])].sort());

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-heading">
              Chandak Meet · Autonomous RBAC Module Policy
            </h2>
            <p className="text-xs text-muted">
              Scope: Module-scoped roles & permissions. Super Admin holds trusted platform-wide override.
            </p>
          </div>
        </div>
        <Link href="/meet/admin">
          <AppButton variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Meet Admin
          </AppButton>
        </Link>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-success-soft border-success-border text-success-text"
              : "bg-danger-soft border-danger-border text-danger-text"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  : "bg-surface border-border hover:bg-elevated"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-semibold text-sm text-heading">{r.name}</span>
                {r.role_code === "STANDARD" ? (
                  <span className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-success-soft text-success-text border border-success-border">
                    CANONICAL STANDARD
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[12px] font-medium bg-sunken text-muted">
                    v{r.policy_version}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted line-clamp-2 mb-3">{r.description}</p>
              <div className="flex items-center justify-between text-[12.5px] text-subtle border-t border-border/50 pt-2">
                <span>{r.permissions.length} permissions</span>
                <span className="font-medium text-heading">
                  {r.user_count} user{r.user_count !== 1 ? "s" : ""} assigned
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
                {activeRole.is_customized && (
                  <span className="px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-soft text-warning-text border border-warning-border">
                    Customized Policy
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {activeRole.description}
              </p>
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
                  <h4 className="text-[12.5px] font-bold text-muted uppercase tracking-wider">
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
                              : "bg-elevated/40 border-border hover:bg-elevated text-muted"
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
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[12px] font-bold bg-danger-soft text-danger-text border border-danger-border">
                                  <Lock className="h-2.5 w-2.5" />
                                  Sensitive
                                </span>
                              )}
                            </div>
                            <p className="text-[12.5px] text-subtle mt-0.5 leading-relaxed">
                              {perm.description}
                            </p>
                            <span className="text-[12px] text-muted/60 font-mono mt-1 block">
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
          <h3 className="text-sm font-semibold text-heading">Recent RBAC Policy Audit History</h3>
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
                    <AppTableCell className="whitespace-nowrap text-muted">
                      {new Date(log.executed_at).toLocaleString()}
                    </AppTableCell>
                    <AppTableCell>
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-success-text">
                        <ShieldCheck className="h-3 w-3" />
                        {log.sync_status}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="font-mono text-[12.5px]">v{log.new_version}</AppTableCell>
                    <AppTableCell>
                      {(log.modified_roles || []).join(", ") || "—"}
                    </AppTableCell>
                    <AppTableCell className="text-muted font-mono text-[12.5px]">
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
  );
}
