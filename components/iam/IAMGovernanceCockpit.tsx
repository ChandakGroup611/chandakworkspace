"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppCard } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import {
  ShieldCheck,
  Search,
  Copy,
  Trash2,
  Power,
  Building,
  ChevronRight,
  Plus,
  Zap,
  Lock,
  Layers,
  Settings,
  ArrowRight,
  Filter,
  Check
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  fetchRoles, 
  fetchPermissions, 
  fetchRolePermissions, 
  createRole, 
  syncRolePermissions,
  cloneRole,
  deleteRole,
  updateRole
} from "@/lib/actions/iam";

interface IAMGovernanceCockpitProps {
  initialRoles?: any[];
  initialPermissions?: any[];
  roles?: any[];
  permissions?: any[];
  onRefresh?: () => Promise<void> | void;
}

export default function IAMGovernanceCockpit({
  initialRoles = [],
  initialPermissions = [],
  roles = [],
  permissions = []
}: IAMGovernanceCockpitProps) {
  const { theme } = useTheme();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const resolvedRoles = initialRoles.length > 0 ? initialRoles : roles;
  const resolvedPermissions = initialPermissions.length > 0 ? initialPermissions : permissions;

  // Data States
  const [rolesList, setRolesList] = useState<any[]>(resolvedRoles);
  const [permissionsList, setPermissionsList] = useState<any[]>(resolvedPermissions);
  const [activeRoleID, setActiveRoleID] = useState<string | null>(null);
  const [activeRolePerms, setActiveRolePerms] = useState<string[]>([]);
  const [rolePermsCache, setRolePermsCache] = useState<Record<string, string[]>>({});
  
  // UI & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [permSearchQuery, setPermSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [newRoleName, setNewRoleName] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load initial roles and permissions if not provided
  useEffect(() => {
    async function loadData() {
      try {
        const [r, p] = await Promise.all([fetchRoles(), fetchPermissions()]);
        setRolesList(r);
        setPermissionsList(p);
        if (r.length > 0 && !activeRoleID) {
          setActiveRoleID(r[0].id);
        }
      } catch (err) {
        console.error("Failed to load IAM data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (resolvedRoles.length === 0 || resolvedPermissions.length === 0) {
      loadData();
    } else {
      if (resolvedRoles.length > 0 && !activeRoleID) {
        setActiveRoleID(resolvedRoles[0].id);
      }
      setIsLoading(false);
    }
  }, [resolvedRoles, resolvedPermissions]);

  // Fetch active role permissions when selection changes (with caching support)
  useEffect(() => {
    if (activeRoleID) {
      if (rolePermsCache[activeRoleID]) {
        setActiveRolePerms(rolePermsCache[activeRoleID]);
        return;
      }

      async function loadRolePerms() {
        setIsRoleLoading(true);
        try {
          const perms = await fetchRolePermissions(activeRoleID!);
          setActiveRolePerms(perms);
          setRolePermsCache(prev => ({ ...prev, [activeRoleID!]: perms }));
        } catch (err) {
          console.error("Failed to load role permissions:", err);
        } finally {
          setIsRoleLoading(false);
        }
      }
      loadRolePerms();
    } else {
      setActiveRolePerms([]);
    }
  }, [activeRoleID, rolePermsCache]);

  // Role Filtering logic
  const filteredRoles = useMemo(() => {
    return rolesList.filter((r: any) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rolesList, searchQuery]);

  const activeRole = useMemo(() => rolesList.find((r: any) => r.id === activeRoleID), [rolesList, activeRoleID]);

  // Dynamic Module Tabs list
  const uniqueModules = useMemo(() => {
    const mods = new Set<string>();
    permissionsList.forEach((p: any) => {
      if (p.module) mods.add(p.module.toUpperCase());
    });
    return ["ALL", ...Array.from(mods)].sort();
  }, [permissionsList]);

  // Tab count stats
  const moduleStats = useMemo(() => {
    const stats: Record<string, { active: number; total: number }> = {
      ALL: { active: activeRolePerms.length, total: permissionsList.length }
    };
    
    permissionsList.forEach((p: any) => {
      const mod = p.module ? p.module.toUpperCase() : "GENERAL";
      if (!stats[mod]) {
        stats[mod] = { active: 0, total: 0 };
      }
      stats[mod].total += 1;
      if (activeRolePerms.includes(p.id)) {
        stats[mod].active += 1;
      }
    });
    
    return stats;
  }, [permissionsList, activeRolePerms]);

  // Filtering Permissions list based on module tab and search term
  const filteredPermissions = useMemo(() => {
    return permissionsList.filter((p: any) => {
      const mod = p.module ? p.module.toUpperCase() : "GENERAL";
      const matchesModule = selectedModule === "ALL" || mod === selectedModule.toUpperCase();
      const matchesSearch = p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                            p.code.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                            (p.submodule && p.submodule.toLowerCase().includes(permSearchQuery.toLowerCase()));
      return matchesModule && matchesSearch;
    });
  }, [permissionsList, selectedModule, permSearchQuery]);

  // Grouping filtered permissions by module dynamically
  const groupedFilteredPermissions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPermissions.forEach((p: any) => {
      const mod = p.module ? p.module.toUpperCase() : "GENERAL";
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    });
    return groups;
  }, [filteredPermissions]);

  // Group the standard permissions by module for the 5-column grid representation
  const gridModules = useMemo(() => {
    const modulesMap = new Map<string, { name: string; module: string; submodule: string; code: string; perms: any[] }>();
    
    permissionsList.forEach((p: any) => {
      const modName = p.module ? p.module.toUpperCase() : "GENERAL";
      const subModName = p.submodule || "Core";
      const groupKey = `${modName}__${subModName}`;
      
      if (!modulesMap.has(groupKey)) {
        const codeParts = p.code.split("_");
        const lastPart = codeParts[codeParts.length - 1];
        if (["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"].includes(lastPart?.toUpperCase())) {
          codeParts.pop();
        }
        const baseCode = codeParts.join("_");
        
        modulesMap.set(groupKey, { 
          name: `${modName} - ${subModName}`, 
          module: modName,
          submodule: subModName,
          code: baseCode, 
          perms: [] 
        });
      }
      modulesMap.get(groupKey)!.perms.push(p);
    });

    return Array.from(modulesMap.values()).filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                            m.perms.some(p => p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(permSearchQuery.toLowerCase()));
      const matchesTab = selectedModule === "ALL" || m.module === selectedModule.toUpperCase();
      return matchesSearch && matchesTab;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [permissionsList, permSearchQuery, selectedModule]);

  const handleTogglePermissionByCode = async (permissionId: string, action: string) => {
    if (!activeRoleID) return;
    if (activeRole?.code === "SUPER_ADMIN") return;

    const permission = permissionsList.find((p: any) => p.id === permissionId);
    if (!permission) return;

    const isCurrentlyEnabled = activeRolePerms.includes(permission.id);
    let newPermIds = [...activeRolePerms];

    const modulePerms = permissionsList.filter((p: any) => 
      p.module?.toUpperCase() === permission.module?.toUpperCase() && 
      (p.submodule || 'Core') === (permission.submodule || 'Core')
    );
    const viewPerm = modulePerms.find((p: any) => p.action?.toUpperCase() === "VIEW");
    const createPerm = modulePerms.find((p: any) => p.action?.toUpperCase() === "CREATE");
    const updatePerm = modulePerms.find((p: any) => p.action?.toUpperCase() === "UPDATE");
    const deletePerm = modulePerms.find((p: any) => p.action?.toUpperCase() === "DELETE");
    const managePerm = modulePerms.find((p: any) => p.action?.toUpperCase() === "MANAGE");

    if (!isCurrentlyEnabled) {
      newPermIds.push(permission.id);

      if (["CREATE", "UPDATE", "DELETE", "MANAGE"].includes(action) && viewPerm) {
        if (!newPermIds.includes(viewPerm.id)) newPermIds.push(viewPerm.id);
      }

      if (action === "MANAGE") {
        if (createPerm && !newPermIds.includes(createPerm.id)) newPermIds.push(createPerm.id);
        if (updatePerm && !newPermIds.includes(updatePerm.id)) newPermIds.push(updatePerm.id);
        if (deletePerm && !newPermIds.includes(deletePerm.id)) newPermIds.push(deletePerm.id);
      }
    } else {
      newPermIds = newPermIds.filter(id => id !== permission.id);

      if (action === "VIEW") {
        if (createPerm) newPermIds = newPermIds.filter(id => id !== createPerm.id);
        if (updatePerm) newPermIds = newPermIds.filter(id => id !== updatePerm.id);
        if (deletePerm) newPermIds = newPermIds.filter(id => id !== deletePerm.id);
        if (managePerm) newPermIds = newPermIds.filter(id => id !== managePerm.id);
      }

      if (["CREATE", "UPDATE", "DELETE"].includes(action) && managePerm) {
        newPermIds = newPermIds.filter(id => id !== managePerm.id);
      }
    }

    newPermIds = Array.from(new Set(newPermIds));
    const previousPerms = activeRolePerms;
    setActiveRolePerms(newPermIds);
    setRolePermsCache(prev => ({ ...prev, [activeRoleID!]: newPermIds }));

    setIsSaving(true);
    try {
      await syncRolePermissions(activeRoleID, newPermIds);
    } catch (err) {
      console.error("Failed to sync permissions:", err);
      setActiveRolePerms(previousPerms);
      setRolePermsCache(prev => ({ ...prev, [activeRoleID!]: previousPerms }));
    } finally {
      setIsSaving(false);
    }
  };

  // Database Actions
  const handleTogglePermission = async (permissionId: string) => {
    if (!activeRoleID) return;
    
    const isAdding = !activeRolePerms.includes(permissionId);
    let newPerms: string[];
    if (isAdding) {
      newPerms = [...activeRolePerms, permissionId];
    } else {
      newPerms = activeRolePerms.filter(id => id !== permissionId);
    }
    
    // Optimistic update
    const previousPerms = activeRolePerms;
    setActiveRolePerms(newPerms);
    setRolePermsCache(prev => ({ ...prev, [activeRoleID!]: newPerms }));
    
    setIsSaving(true);
    try {
      await syncRolePermissions(activeRoleID, newPerms);
    } catch (err) {
      console.error("Failed to sync permissions:", err);
      setActiveRolePerms(previousPerms);
      setRolePermsCache(prev => ({ ...prev, [activeRoleID!]: previousPerms }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    const code = `ROLE_${newRoleName.toUpperCase().replace(/\s+/g, '_')}`;
    setIsLoading(true);
    try {
      const newRole = await createRole({ 
        name: newRoleName, 
        code, 
        description: "Custom organizational role." 
      });
      setRolesList([newRole, ...rolesList]);
      setActiveRoleID(newRole.id);
      setNewRoleName("");
    } catch (err) {
      console.error("Failed to create role:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloneRole = async (role: any) => {
    setIsLoading(true);
    try {
      const cloned = await cloneRole(
        role.id, 
        `${role.name} (Clone)`, 
        `${role.code}_CLONE_${Date.now()}`
      );
      setRolesList([cloned, ...rolesList]);
      setActiveRoleID(cloned.id);
    } catch (err) {
      console.error("Failed to clone role:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (role: any) => {
    const originalActive = role.is_active;
    setRolesList(rolesList.map(r => r.id === role.id ? { ...r, is_active: !r.is_active } : r));
    
    try {
      await updateRole(role.id, { is_active: !role.is_active });
    } catch (err) {
      console.error("Failed to toggle status:", err);
      setRolesList(rolesList.map(r => r.id === role.id ? { ...r, is_active: originalActive } : r));
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (!confirm(`Are you sure you want to delete the ${role.name} role?`)) return;
    setIsLoading(true);
    try {
      await deleteRole(role.id);
      const remaining = rolesList.filter(r => r.id !== role.id);
      setRolesList(remaining);
      setActiveRoleID(remaining[0]?.id || null);
    } catch (err) {
      console.error("Failed to delete role:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || permsLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className={cn("text-xs font-bold uppercase tracking-widest animate-pulse", "text-gray-400")}>
          Verifying Credentials...
        </span>
      </div>
    );
  }

  if (!hasPermission("IAM_VIEW")) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className={cn("text-lg font-bold", "text-foreground")}>Access Denied</h2>
        <p className="text-xs text-gray-500 max-w-sm">You do not have capabilities to view the IAM Governance Cockpit.</p>
      </div>
    );
  }

  if (isLoading && rolesList.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className={cn("text-xs font-bold uppercase tracking-widest animate-pulse", "text-gray-400")}>
          Synchronizing Security Engine...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 w-full pb-20 relative">
      {/* Background Decorative Elements */}
      <div className={cn("absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] rounded-full -z-10", "bg-accent/[0.02]")} />
      <div className={cn("absolute bottom-0 left-0 w-[400px] h-[400px] blur-[120px] rounded-full -z-10", "bg-accent/[0.02]")} />

      {/* Header Section */}
      <div className={cn("flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b pb-8", "border-border")}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20">
              <ShieldCheck className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className={cn("text-2xl font-bold tracking-tight flex items-center gap-3", "text-foreground")}>
                IAM Governance Cockpit
                <AppBadge variant="info" className={cn("py-0.5 px-2", "bg-accent/10 text-accent border-accent/30/50")}>
                  v2.0 Realtime
                </AppBadge>
              </h1>
              <p className={cn("text-sm font-medium", "text-muted")}>
                Enterprise Identity & Access Management powered by ADIOS Governance Engine.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300",
            isSaving 
              ? ("bg-emerald-50 border-emerald-200 text-emerald-600")
              : ("bg-elevated border-border text-muted")
          )}>
            <Zap className={`h-4 w-4 ${isSaving ? "animate-pulse" : ""}`} />
            <span className="text-xs font-bold uppercase tracking-widest">
              {isSaving ? "Syncing Logic Gates..." : "Snapshot Synced"}
            </span>
          </div>
          <AppButton variant="primary" className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 border-none shadow-lg shadow-indigo-500/10">
            Audit Export
          </AppButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Role Directory Pane */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <AppCard className={cn("overflow-hidden flex-1 flex flex-col", "border-border bg-surface shadow-[var(--shadow-ambient)]")}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" />
                  <span className={cn("text-xs font-bold uppercase tracking-widest", "text-muted")}>Role Registry</span>
                </div>
                <AppBadge className={cn("font-mono text-xs", "bg-elevated text-muted border-border/50")}>{rolesList.length} Units</AppBadge>
              </div>

              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-accent transition-colors" />
                <AppInput 
                  placeholder="Search by role or code..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("pl-10 h-11 transition-all text-xs", "bg-gray-50 border-border focus:border-accent text-foreground placeholder:text-gray-400")}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px] px-2 space-y-2 custom-scrollbar pb-6">
              {filteredRoles.map((role) => {
                const isSelected = activeRoleID === role.id;
                return (
                  <div 
                    key={role.id}
                    onClick={() => setActiveRoleID(role.id)}
                    className={cn("group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                      isSelected
                        ? ("bg-accent/10/50 border-accent/30 shadow-sm shadow-indigo-500/5")
                        : ("bg-transparent border-transparent hover:bg-elevated/80 hover:border-border")
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    )}
                    
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold transition-colors", isSelected ? ("text-foreground") : ("text-muted group-hover:text-foreground"))}>
                            {role.name}
                          </span>
                          {role.is_system && <ShieldCheck className="h-3.5 w-3.5 text-amber-500/80" />}
                          {!role.is_active && (
                            <AppBadge variant="danger" className="text-[0.65rem] py-0 px-1 font-mono uppercase bg-rose-500/10 border-rose-500/20 text-rose-400">Disabled</AppBadge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-600 uppercase tracking-tighter">{role.code}</span>
                          {role.department && (
                            <>
                              <div className={cn("w-1 h-1 rounded-full", "bg-gray-300")} />
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Building className="h-2.5 w-2.5" />
                                {role.department.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={cn("p-2 rounded-xl transition-all", isSelected ? ("bg-accent/10 text-accent") : ("bg-elevated text-gray-400 group-hover:text-muted"))}>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasPermission("IAM_CREATE") && (
              <div className={cn("p-6 border-t", "border-border bg-gray-50/50")}>
                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Add Custom Role</span>
                    <Settings className="h-3 w-3 text-gray-600" />
                  </div>
                  <div className="flex gap-2">
                    <AppInput 
                      placeholder="New role name..."
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className={cn("h-10 text-xs", "bg-surface border-border text-foreground focus:border-accent focus:bg-white")}
                    />
                    <AppButton 
                      variant="secondary" 
                      type="submit" 
                      className="h-10 px-4 bg-accent hover:bg-indigo-400 text-white border-none shadow-lg shadow-indigo-500/20"
                    >
                      <Plus className="h-4 w-4" />
                    </AppButton>
                  </div>
                </form>
              </div>
            )}
          </AppCard>
        </div>

        {/* Capability Matrix Pane */}
        <div className="lg:col-span-8 flex flex-col">
          <AppCard className={cn("flex-1 overflow-hidden flex flex-col relative", "border-border bg-surface shadow-[var(--shadow-ambient)]")}>
            {isRoleLoading && (
              <div className="absolute inset-0 bg-[#0A0D14]/30 backdrop-blur-[2px] dark:bg-[#0A0D14]/30 bg-white/30 flex flex-col items-center justify-center space-y-3 z-50">
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
                <span className={cn("text-xs font-bold uppercase tracking-widest animate-pulse", "text-muted")}>
                  Loading Capabilities...
                </span>
              </div>
            )}
            {activeRole ? (
              <>
                {/* Visual Premium Header inside Matrix */}
                <div className={cn("p-6 border-b space-y-4", "border-border")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <h3 className={cn("text-lg font-bold tracking-tight", "text-foreground")}>
                          Capability Matrix: <span className="text-accent">{activeRole.name}</span>
                        </h3>
                        {activeRole.is_system && (
                          <AppBadge className="bg-amber-500/10 text-amber-500 border-amber-500/20 py-0.5 px-1.5 text-[0.65rem] font-mono uppercase">System</AppBadge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono text-xs">
                          {activeRole.code}
                        </span>
                        <div className={cn("w-1 h-1 rounded-full", "bg-gray-200")} />
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Lock className="h-3 w-3" />
                          Protected Logic Gates
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasPermission("IAM_UPDATE") && (
                        <AppButton
                          onClick={() => handleToggleStatus(activeRole)}
                          className={cn("h-9 px-3 text-xs font-semibold gap-1.5 transition-all border",
                            activeRole.is_active
                              ? "bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {activeRole.is_active ? "Disable Role" : "Enable Role"}
                        </AppButton>
                      )}
                      
                      {hasPermission("IAM_CREATE") && (
                        <AppButton
                          onClick={() => handleCloneRole(activeRole)}
                          className="h-9 px-3 text-xs font-semibold gap-1.5 bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Clone Role
                        </AppButton>
                      )}

                      {!activeRole.is_system && hasPermission("IAM_DELETE") && (
                        <AppButton
                          onClick={() => handleDeleteRole(activeRole)}
                          className="h-9 px-3 text-xs font-semibold gap-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </AppButton>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filters and Permission Search Row */}
                <div className={cn("p-6 border-b space-y-4 bg-transparent", "border-border")}>
                  {/* Module Horizontal Filter Tabs */}
                  <div className="space-y-2">
                    <span className={cn("text-[0.7rem] font-bold uppercase tracking-widest block", "text-gray-400")}>Filter by Module</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar">
                      {uniqueModules.map((mod) => {
                        const isTabSelected = selectedModule === mod;
                        const stats = moduleStats[mod] || { active: 0, total: 0 };
                        return (
                          <button
                            key={mod}
                            onClick={() => setSelectedModule(mod)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer",
                              isTabSelected
                                ? "bg-accent border-accent text-white shadow-md shadow-indigo-500/10"
                                : "bg-elevated border-border text-muted hover:bg-elevated hover:text-muted"
                            )}
                          >
                            <span>{mod === "ALL" ? "All Capabilities" : mod}</span>
                            <span className={cn(
                              "text-[0.7rem] font-mono font-bold px-1.5 py-0.5 rounded-md",
                              isTabSelected
                                ? "bg-white/20 text-white"
                                : "bg-gray-200/50 text-muted"
                            )}>
                              {stats.active}/{stats.total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matrix Permission Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <AppInput
                      placeholder={`Search permissions in ${selectedModule === "ALL" ? "all modules" : selectedModule}...`}
                      value={permSearchQuery}
                      onChange={(e) => setPermSearchQuery(e.target.value)}
                      className={cn("pl-11 h-11 text-xs", "bg-gray-50 border-border focus:border-accent text-foreground placeholder:text-gray-400")}
                    />
                  </div>
                </div>

                {/* Matrix Grid: Responsive 5-column Table */}
                <div className="flex-1 overflow-y-auto p-6 max-h-[600px] custom-scrollbar">
                  {gridModules.length > 0 ? (
                    <div className="overflow-x-auto">
                      <AppTable>
                        <AppTableHeader>
                          <AppTableRow>
                            <AppTableHead>Module Directory</AppTableHead>
                            <AppTableHead className="text-center">View</AppTableHead>
                            <AppTableHead className="text-center">Create</AppTableHead>
                            <AppTableHead className="text-center">Update</AppTableHead>
                            <AppTableHead className="text-center">Delete</AppTableHead>
                            <AppTableHead className="text-center">Manage</AppTableHead>
                          </AppTableRow>
                        </AppTableHeader>
                        <AppTableBody>
                          {(() => {
                            const groupedByModule = gridModules.reduce((acc, m) => {
                              if (!acc[m.module]) acc[m.module] = [];
                              acc[m.module].push(m);
                              return acc;
                            }, {} as Record<string, typeof gridModules>);

                            return Object.keys(groupedByModule).sort().map(moduleName => (
                              <React.Fragment key={moduleName}>
                                <AppTableRow className={cn("border-y", "bg-accent/10/30")}>
                                  <AppTableCell colSpan={6} className="py-2">
                                    <span className="text-[0.65rem] font-bold uppercase tracking-widest text-accent">
                                      {moduleName} DIRECTORY
                                    </span>
                                  </AppTableCell>
                                </AppTableRow>
                                {groupedByModule[moduleName].sort((a, b) => a.submodule.localeCompare(b.submodule)).map((m) => {
                                  const isSuperAdmin = activeRole?.code === "SUPER_ADMIN";

                                  const getPermIdByAction = (action: string) => m.perms.find(p => p.action?.toUpperCase() === action.toUpperCase())?.id;
                                  const isActionChecked = (action: string) => {
                                    if (isSuperAdmin) return true;
                                    const id = getPermIdByAction(action);
                                    return id ? activeRolePerms.includes(id) : false;
                                  };

                                  const actions = ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"];

                                  return (
                                    <AppTableRow 
                                      key={m.name}
                                      className={cn(
                                        "group/row transition-colors hover:bg-white/[0.01]",
                                        "hover:bg-elevated/40"
                                      )}
                                    >
                                      <AppTableCell className="pl-6">
                                        <div className="space-y-0.5">
                                          <div className={cn("text-xs font-bold transition-colors", "text-foreground group-hover/row:text-accent")}>
                                            {m.submodule}
                                          </div>
                                          <div className="text-[0.7rem] font-mono text-gray-500 uppercase tracking-tighter">
                                            {m.code}_*
                                          </div>
                                        </div>
                                      </AppTableCell>
                                      {actions.map((act) => {
                                        const checked = isActionChecked(act);
                                        const exists = !!getPermIdByAction(act);
                                        return (
                                          <AppTableCell key={act} className="text-center">
                                            {exists ? (
                                              <div className="flex justify-center">
                                                <button
                                                  type="button"
                                                  disabled={isSuperAdmin || !hasPermission("IAM_UPDATE")}
                                                  onClick={() => {
                                                    const permId = getPermIdByAction(act);
                                                    if (permId) {
                                                      handleTogglePermissionByCode(permId, act);
                                                    }
                                                  }}
                                                  className={cn(
                                                    "relative h-5 w-5 rounded-md border flex items-center justify-center transition-all duration-300",
                                                    checked
                                                      ? "bg-accent border-accent text-white shadow-md shadow-indigo-600/25 scale-105"
                                                      : "border-border bg-surface hover:border-accent",
                                                    isSuperAdmin || !hasPermission("IAM_UPDATE") ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                                                  )}
                                                >
                                                  {checked && <Check className="h-3.5 w-3.5 stroke-[3] animate-in zoom-in-50 duration-200" />}
                                                </button>
                                              </div>
                                            ) : (
                                              <span className="text-xs text-gray-600 font-mono">-</span>
                                            )}
                                          </AppTableCell>
                                        );
                                      })}
                                    </AppTableRow>
                                  );
                                })}
                              </React.Fragment>
                            ));
                          })()}
                        </AppTableBody>
                      </AppTable>
                    </div>
                  ) : (
                    <div className="h-60 flex flex-col items-center justify-center space-y-2 border border-dashed rounded-2xl border-white/5">
                      <Filter className={cn("h-6 w-6", "text-gray-300")} />
                      <span className={cn("text-xs font-semibold", "text-gray-400")}>No matching capabilities found.</span>
                      <span className="text-xs text-gray-500">Try adjusting your filters or search query.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={cn("flex-1 flex flex-col items-center justify-center space-y-3", "text-gray-400")}>
                <Layers className="h-8 w-8 opacity-40 animate-pulse text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider">No Active Selection</span>
                <span className="text-xs text-gray-500">Select a role from the registry registry list to begin matrix audits.</span>
              </div>
            )}

            {/* Matrix Footer */}
            <div className={cn("p-8 border-t bg-gradient-to-r from-transparent to-transparent", "border-border via-gray-50/50")}>
              <div className="flex items-start gap-4 max-w-3xl">
                <div className={cn("p-3 rounded-2xl shadow-inner", "bg-accent/10 border border-indigo-100")}>
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div className="space-y-2">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest", "text-muted")}>Recursive Governance Enforcement</h4>
                  <p className="text-[0.8rem] text-gray-500 leading-relaxed font-medium">
                    State transitions committed in this matrix are recursively propagated to the <span className="text-accent font-bold">Identity Cache</span>.
                    Authorization policies will reflect system-wide without session invalidation. System-critical roles enforce immutable logic gates.
                  </p>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
