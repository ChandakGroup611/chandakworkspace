"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { fetchUserModuleAccessAction } from "@/lib/actions/users";
import { 
  ShieldCheck, 
  Search, 
  User, 
  Layers, 
  FolderKanban, 
  Car, 
  Compass, 
  Video, 
  Landmark, 
  LineChart, 
  MessageSquare,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight
} from "lucide-react";

interface ModuleRoleDef {
  module_code: string;
  role_code: string;
  name: string;
  description?: string;
  permissions: string[];
}

interface UserOption {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  roleCode?: string;
}

interface AccessMatrixClientProps {
  moduleRoles: ModuleRoleDef[];
  users: UserOption[];
}

const MODULE_META: Record<string, { name: string; icon: any; standardRole: string }> = {
  TASK_WORKFLOW: { name: "Workspace & Tasks", icon: FolderKanban, standardRole: "MEMBER" },
  VEHICLE_DESK: { name: "Vehicle Management Desk", icon: Car, standardRole: "REQUESTER" },
  DESIGN_TRACKING: { name: "Design & Drawing Tracking", icon: Compass, standardRole: "VIEWER" },
  CHANDAK_MEET: { name: "Chandak Meet", icon: Video, standardRole: "PARTICIPANT" },
  ORG_BUDGET: { name: "Organization Budget", icon: Landmark, standardRole: "VIEWER" },
  DASHBOARDS: { name: "Executive Dashboards", icon: LineChart, standardRole: "VIEWER" },
  CHANDAK_MESSENGER: { name: "Enterprise Messenger", icon: MessageSquare, standardRole: "MEMBER" },
};

export default function AccessMatrixClient({ moduleRoles, users }: AccessMatrixClientProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "user_inspector">("matrix");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [matrixSearch, setMatrixSearch] = useState<string>("");

  // User Inspector State
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || "");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userAccessList, setUserAccessList] = useState<any[]>([]);
  const [loadingUserAccess, setLoadingUserAccess] = useState<boolean>(false);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  // Load user access details when user changes
  useEffect(() => {
    if (!selectedUserId) return;
    let isMounted = true;
    setLoadingUserAccess(true);

    async function load() {
      try {
        const data = await fetchUserModuleAccessAction(selectedUserId);
        if (isMounted) setUserAccessList(data || []);
      } catch (err) {
        console.error("Failed to fetch user access:", err);
      } finally {
        if (isMounted) setLoadingUserAccess(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedUserId]);

  const uniqueModules = useMemo(() => {
    const list = Array.from(new Set(moduleRoles.map((r) => r.module_code)));
    return ["ALL", ...list];
  }, [moduleRoles]);

  const filteredRoles = useMemo(() => {
    return moduleRoles.filter((r) => {
      const matchMod = selectedModule === "ALL" || r.module_code === selectedModule;
      const matchSearch =
        matrixSearch === "" ||
        r.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        r.role_code.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(matrixSearch.toLowerCase());
      return matchMod && matchSearch;
    });
  }, [moduleRoles, selectedModule, matrixSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  const isSuperAdminUser = useMemo(() => {
    const code = (selectedUser?.roleCode || "").toUpperCase();
    return code === "SUPER_ADMIN" || code === "ROLE_SUPER_ADMIN";
  }, [selectedUser]);

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-theme-btn-primary" />
            Module Access Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Canonical read-only reference of module roles, operational capabilities, and per-user entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-border">
          <AppButton
            variant={activeTab === "matrix" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("matrix")}
          >
            Module Roles Matrix
          </AppButton>
          <AppButton
            variant={activeTab === "user_inspector" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("user_inspector")}
          >
            User Access Inspector
          </AppButton>
        </div>
      </div>

      {activeTab === "matrix" ? (
        /* TAB 1: MASTER ROLES MATRIX */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Module Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {uniqueModules.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedModule(m)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedModule === m
                      ? "bg-foreground text-background font-semibold"
                      : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "ALL" ? "All Modules" : MODULE_META[m]?.name || m}
                </button>
              ))}
            </div>

            {/* Matrix Search */}
            <div className="w-full sm:w-64">
              <AppInput
                placeholder="Search roles or permissions..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
          </div>

          {/* Roles Table */}
          <AppCard className="overflow-hidden p-0">
            <AppTable>
              <AppTableHeader>
                <AppTableRow>
                  <AppTableHead className="w-48">Module</AppTableHead>
                  <AppTableHead className="w-44">Role Code</AppTableHead>
                  <AppTableHead className="w-56">Role Name</AppTableHead>
                  <AppTableHead>Operational Capabilities (Permissions)</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {filteredRoles.map((role) => {
                  const meta = MODULE_META[role.module_code];
                  const Icon = meta?.icon || Layers;
                  const isStandard = meta?.standardRole === role.role_code;

                  return (
                    <AppTableRow key={`${role.module_code}:${role.role_code}`}>
                      <AppTableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{meta?.name || role.module_code}</span>
                        </div>
                      </AppTableCell>
                      <AppTableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {role.role_code}
                          </code>
                          {isStandard && (
                            <AppBadge variant="accent" className="text-[10px] px-1 py-0">
                              STANDARD
                            </AppBadge>
                          )}
                        </div>
                      </AppTableCell>
                      <AppTableCell>
                        <div className="font-semibold text-foreground text-sm">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {role.description}
                          </div>
                        )}
                      </AppTableCell>
                      <AppTableCell>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {role.permissions.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded font-mono text-foreground"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </AppTableCell>
                    </AppTableRow>
                  );
                })}
              </AppTableBody>
            </AppTable>
          </AppCard>
        </div>
      ) : (
        /* TAB 2: USER ACCESS INSPECTOR */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: User Directory Selector */}
          <AppCard className="p-4 space-y-3 lg:col-span-1">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" />
              Select User ({filteredUsers.length})
            </h3>
            <AppInput
              placeholder="Search user..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
            />
            <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1 divide-y divide-border/40">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const isSuper = (u.roleCode || "").toUpperCase().includes("SUPER_ADMIN");

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-theme-btn-primary/10 border border-theme-btn-primary/30"
                        : "hover:bg-surface"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-sm text-foreground truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    {isSuper ? (
                      <AppBadge variant="danger" className="text-[10px] shrink-0">
                        SUPER ADMIN
                      </AppBadge>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </AppCard>

          {/* Right Column: User Entitlements Inspection */}
          <div className="lg:col-span-2 space-y-4">
            {selectedUser && (
              <AppCard className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{selectedUser.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AppBadge variant={selectedUser.is_active ? "success" : "neutral"}>
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </AppBadge>
                    <AppBadge variant={isSuperAdminUser ? "danger" : "neutral"}>
                      {isSuperAdminUser ? "SUPER_ADMIN" : "STANDARD"}
                    </AppBadge>
                  </div>
                </div>

                {isSuperAdminUser ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-sm text-foreground flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Root Super Administrator Global Authority
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        This user holds the platform SUPER_ADMIN role. They possess unrestricted, non-bypassable access across all 11 modules, all workspaces, projects, vehicles, and settings.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Module Roles & Scopes ({userAccessList.length} assigned)
                    </h3>

                    {loadingUserAccess ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Loading user module entitlements...
                      </div>
                    ) : userAccessList.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground bg-surface rounded-lg border border-border">
                        No explicit module roles assigned. User has zero module access.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userAccessList.map((access, idx) => {
                          const meta = MODULE_META[access.module_code];
                          const Icon = meta?.icon || Layers;
                          const roleDef = moduleRoles.find(
                            (r) => r.module_code === access.module_code && r.role_code === access.role_code
                          );

                          return (
                            <div
                              key={idx}
                              className="p-3 bg-surface rounded-lg border border-border space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-theme-btn-primary shrink-0" />
                                  <span className="font-semibold text-sm text-foreground">
                                    {meta?.name || access.module_code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono font-semibold">
                                    {access.role_code}
                                  </code>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    Scope: {access.scope?.type || "all"}
                                  </span>
                                </div>
                              </div>

                              {roleDef && (
                                <div className="pt-2 border-t border-border/50">
                                  <div className="text-xs text-muted-foreground mb-1.5">
                                    Active Permissions ({roleDef.permissions.length}):
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {roleDef.permissions.map((p) => (
                                      <span
                                        key={p}
                                        className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </AppCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
