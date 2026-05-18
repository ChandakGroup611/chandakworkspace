"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppCard } from "@/components/ui/AppCard";
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
  const isLight = theme === "executive-light";

  const resolvedRoles = initialRoles.length > 0 ? initialRoles : roles;
  const resolvedPermissions = initialPermissions.length > 0 ? initialPermissions : permissions;

  // Data States
  const [rolesList, setRolesList] = useState<any[]>(resolvedRoles);
  const [permissionsList, setPermissionsList] = useState<any[]>(resolvedPermissions);
  const [activeRoleID, setActiveRoleID] = useState<string | null>(null);
  const [activeRolePerms, setActiveRolePerms] = useState<string[]>([]);
  
  // UI & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [permSearchQuery, setPermSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [newRoleName, setNewRoleName] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  // Fetch active role permissions when selection changes
  useEffect(() => {
    if (activeRoleID) {
      async function loadRolePerms() {
        try {
          const perms = await fetchRolePermissions(activeRoleID!);
          setActiveRolePerms(perms);
        } catch (err) {
          console.error("Failed to load role permissions:", err);
        }
      }
      loadRolePerms();
    }
  }, [activeRoleID]);

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
      if (p.module) mods.add(p.module);
    });
    return ["ALL", ...Array.from(mods)].sort();
  }, [permissionsList]);

  // Tab count stats
  const moduleStats = useMemo(() => {
    const stats: Record<string, { active: number; total: number }> = {
      ALL: { active: activeRolePerms.length, total: permissionsList.length }
    };
    
    permissionsList.forEach((p: any) => {
      if (!stats[p.module]) {
        stats[p.module] = { active: 0, total: 0 };
      }
      stats[p.module].total += 1;
      if (activeRolePerms.includes(p.id)) {
        stats[p.module].active += 1;
      }
    });
    
    return stats;
  }, [permissionsList, activeRolePerms]);

  // Filtering Permissions list based on module tab and search term
  const filteredPermissions = useMemo(() => {
    return permissionsList.filter((p: any) => {
      const matchesModule = selectedModule === "ALL" || p.module === selectedModule;
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
      const mod = p.module || "General";
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    });
    return groups;
  }, [filteredPermissions]);

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
    
    setIsSaving(true);
    try {
      await syncRolePermissions(activeRoleID, newPerms);
    } catch (err) {
      console.error("Failed to sync permissions:", err);
      setActiveRolePerms(previousPerms);
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

  if (isLoading && rolesList.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className={cn("text-xs font-bold uppercase tracking-widest animate-pulse", isLight ? "text-gray-400" : "text-gray-500")}>
          Synchronizing Security Engine...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 w-full pb-20 relative">
      {/* Background Decorative Elements */}
      <div className={cn("absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] rounded-full -z-10", isLight ? "bg-indigo-500/[0.02]" : "bg-indigo-500/5")} />
      <div className={cn("absolute bottom-0 left-0 w-[400px] h-[400px] blur-[120px] rounded-full -z-10", isLight ? "bg-blue-500/[0.02]" : "bg-blue-500/5")} />

      {/* Header Section */}
      <div className={cn("flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b pb-8", isLight ? "border-gray-200" : "border-white/5")}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={cn("text-2xl font-bold tracking-tight flex items-center gap-3", isLight ? "text-gray-900" : "text-white")}>
                IAM Governance Cockpit
                <AppBadge variant="info" className={cn("py-0.5 px-2", isLight ? "bg-indigo-50 text-indigo-600 border-indigo-200/50" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20")}>
                  v2.0 Realtime
                </AppBadge>
              </h1>
              <p className={cn("text-sm font-medium", isLight ? "text-gray-500" : "text-gray-400")}>
                Enterprise Identity & Access Management powered by ADIOS Governance Engine.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300",
            isSaving 
              ? (isLight ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")
              : (isLight ? "bg-gray-50 border-gray-200 text-gray-500" : "bg-white/[0.02] border-white/5 text-gray-500")
          )}>
            <Zap className={`h-4 w-4 ${isSaving ? "animate-pulse" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
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
          <AppCard className={cn("overflow-hidden flex-1 flex flex-col", isLight ? "border-gray-200 bg-white shadow-sm" : "border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl")}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span className={cn("text-xs font-bold uppercase tracking-widest", isLight ? "text-gray-700" : "text-gray-200")}>Role Registry</span>
                </div>
                <AppBadge className={cn("font-mono text-[10px]", isLight ? "bg-gray-100 text-gray-600 border-gray-200/50" : "bg-white/5 text-gray-400")}>{rolesList.length} Units</AppBadge>
              </div>

              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                <AppInput 
                  placeholder="Search by role or code..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("pl-10 h-11 transition-all text-xs", isLight ? "bg-gray-50 border-gray-200 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400" : "bg-black/40 border-white/5 focus:border-indigo-500/50 text-white")}
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
                        ? (isLight ? "bg-indigo-50/50 border-indigo-200 shadow-sm shadow-indigo-500/5" : "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5")
                        : (isLight ? "bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100" : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5")
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    )}
                    
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold transition-colors", isSelected ? (isLight ? "text-gray-900" : "text-white") : (isLight ? "text-gray-600 group-hover:text-gray-900" : "text-gray-400 group-hover:text-gray-200"))}>
                            {role.name}
                          </span>
                          {role.is_system && <ShieldCheck className="h-3.5 w-3.5 text-amber-500/80" />}
                          {!role.is_active && (
                            <AppBadge variant="danger" className="text-[8px] py-0 px-1 font-mono uppercase bg-rose-500/10 border-rose-500/20 text-rose-400">Disabled</AppBadge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-tighter">{role.code}</span>
                          {role.department && (
                            <>
                              <div className={cn("w-1 h-1 rounded-full", isLight ? "bg-gray-300" : "bg-gray-700")} />
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Building className="h-2.5 w-2.5" />
                                {role.department.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={cn("p-2 rounded-xl transition-all", isSelected ? (isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400") : (isLight ? "bg-gray-100 text-gray-400 group-hover:text-gray-600" : "bg-white/5 text-gray-600 group-hover:text-gray-400"))}>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={cn("p-6 border-t", isLight ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-black/20")}>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add Custom Role</span>
                  <Settings className="h-3 w-3 text-gray-600" />
                </div>
                <div className="flex gap-2">
                  <AppInput 
                    placeholder="New role name..." 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className={cn("h-10 text-xs", isLight ? "bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white" : "bg-black/40 border-white/5 focus:border-indigo-500/50 text-white")}
                  />
                  <AppButton variant="secondary" type="submit" className="h-10 px-4 bg-indigo-500 hover:bg-indigo-400 text-white border-none shadow-lg shadow-indigo-500/20">
                    <Plus className="h-4 w-4" />
                  </AppButton>
                </div>
              </form>
            </div>
          </AppCard>
        </div>

        {/* Capability Matrix Pane */}
        <div className="lg:col-span-8 flex flex-col">
          <AppCard className={cn("flex-1 overflow-hidden flex flex-col", isLight ? "border-gray-200 bg-white shadow-sm" : "border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl")}>
            {activeRole ? (
              <>
                {/* Visual Premium Header inside Matrix */}
                <div className={cn("p-6 border-b space-y-4", isLight ? "border-gray-100" : "border-white/5")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <h3 className={cn("text-lg font-bold tracking-tight", isLight ? "text-gray-900" : "text-white")}>
                          Capability Matrix: <span className="text-indigo-500">{activeRole.name}</span>
                        </h3>
                        {activeRole.is_system && (
                          <AppBadge className="bg-amber-500/10 text-amber-500 border-amber-500/20 py-0.5 px-1.5 text-[8px] font-mono uppercase">System</AppBadge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono text-[10px]">
                          {activeRole.code}
                        </span>
                        <div className={cn("w-1 h-1 rounded-full", isLight ? "bg-gray-200" : "bg-gray-800")} />
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Lock className="h-3 w-3" />
                          Protected Logic Gates
                        </span>
                      </div>
                    </div>

                    {/* Role Administration Action Row */}
                    <div className="flex items-center gap-2">
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
                      
                      <AppButton
                        onClick={() => handleCloneRole(activeRole)}
                        className="h-9 px-3 text-xs font-semibold gap-1.5 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Clone Role
                      </AppButton>

                      {!activeRole.is_system && (
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
                <div className={cn("p-6 border-b space-y-4 bg-transparent", isLight ? "border-gray-100" : "border-white/5")}>
                  {/* Module Horizontal Filter Tabs */}
                  <div className="space-y-2">
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest block", isLight ? "text-gray-400" : "text-gray-500")}>Filter by Module</span>
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
                                ? "bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                                : isLight
                                  ? "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                  : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <span>{mod === "ALL" ? "All Capabilities" : mod}</span>
                            <span className={cn(
                              "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                              isTabSelected
                                ? "bg-white/20 text-white"
                                : isLight
                                  ? "bg-gray-200/50 text-gray-600"
                                  : "bg-white/5 text-gray-400"
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
                      className={cn("pl-11 h-11 text-xs", isLight ? "bg-gray-50 border-gray-100 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400" : "bg-black/20 border-white/5 focus:border-indigo-500/50 text-white")}
                    />
                  </div>
                </div>

                {/* Matrix Redesigned spacious Row List with Visual Module Groupings */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[600px] custom-scrollbar">
                  {filteredPermissions.length > 0 ? (
                    Object.entries(groupedFilteredPermissions).map(([moduleName, perms]: any) => (
                      <div key={moduleName} className="space-y-3">
                        {/* Beautiful Visual Module Section Header */}
                        <div className="flex items-center gap-3 px-1 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          <span className={cn("text-[10px] font-extrabold uppercase tracking-[0.25em] font-mono",
                            isLight ? "text-indigo-600" : "text-indigo-400"
                          )}>
                            {moduleName}
                          </span>
                          <AppBadge className={cn("font-mono text-[8px] py-0 px-1.5 border", 
                            isLight ? "bg-gray-150 text-gray-500 border-gray-200" : "bg-white/5 text-gray-400 border-white/5"
                          )}>
                            {perms.length} {perms.length === 1 ? 'Gate' : 'Gates'}
                          </AppBadge>
                          <div className={cn("flex-1 h-[1px]", isLight ? "bg-gray-100" : "bg-white/5")} />
                        </div>

                        {/* List of Permissions in this group */}
                        <div className="space-y-3">
                          {perms.map((p: any) => {
                            const isEnabled = activeRolePerms.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200",
                                  isLight
                                    ? "bg-gray-50/20 border-gray-100 hover:border-gray-200/80 hover:bg-gray-50/50"
                                    : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                                )}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  {/* Active access indicator dot */}
                                  <div className={cn(
                                    "w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0",
                                    isEnabled
                                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                                      : (isLight ? "bg-gray-200" : "bg-gray-800")
                                  )} />

                                  {/* Permission Metadata */}
                                  <div className="space-y-1 flex-1 pr-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={cn("text-xs font-bold transition-colors", isLight ? "text-gray-800 group-hover:text-indigo-600" : "text-gray-200 group-hover:text-white")}>
                                        {p.name}
                                      </span>
                                    </div>
                                    <div className={cn("text-[10px] flex items-center gap-1.5", isLight ? "text-gray-400" : "text-gray-500")}>
                                      <span>{p.submodule || "General"}</span>
                                      <ArrowRight className="h-2.5 w-2.5 opacity-60" />
                                      <span className="font-semibold uppercase text-[9px]">{p.action}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Switch & Badge Action Side */}
                                <div className="flex items-center gap-6">
                                  <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded-md border hidden sm:inline-block",
                                    isLight ? "text-gray-500 bg-gray-50 border-gray-150" : "text-gray-600 bg-white/[0.03] border-white/5"
                                  )}>
                                    {p.code}
                                  </span>
                                  
                                  <button
                                    onClick={() => handleTogglePermission(p.id)}
                                    disabled={activeRole?.is_system && activeRole?.code === 'SUPER_ADMIN'}
                                    className={cn(
                                      "group/switch relative h-5.5 w-11 rounded-full transition-all duration-300 flex-shrink-0",
                                      isEnabled 
                                        ? "bg-indigo-500 shadow-md shadow-indigo-500/20" 
                                        : (isLight ? "bg-gray-200" : "bg-white/10"),
                                      (activeRole?.is_system && activeRole?.code === 'SUPER_ADMIN') ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300 top-0.75",
                                      isEnabled ? "left-6" : "left-0.75"
                                    )} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-60 flex flex-col items-center justify-center space-y-2 border border-dashed rounded-2xl border-white/5">
                      <Filter className={cn("h-6 w-6", isLight ? "text-gray-300" : "text-gray-600")} />
                      <span className={cn("text-xs font-semibold", isLight ? "text-gray-400" : "text-gray-500")}>No matching capabilities found.</span>
                      <span className="text-[10px] text-gray-500">Try adjusting your filters or search query.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={cn("flex-1 flex flex-col items-center justify-center space-y-3", isLight ? "text-gray-400" : "text-gray-500")}>
                <Layers className="h-8 w-8 opacity-40 animate-pulse text-indigo-500" />
                <span className="text-xs font-semibold uppercase tracking-wider">No Active Selection</span>
                <span className="text-[10px] text-gray-500">Select a role from the registry registry list to begin matrix audits.</span>
              </div>
            )}

            {/* Matrix Footer */}
            <div className={cn("p-8 border-t bg-gradient-to-r from-transparent to-transparent", isLight ? "border-gray-100 via-gray-50/50" : "border-white/5 via-white/[0.01]")}>
              <div className="flex items-start gap-4 max-w-3xl">
                <div className={cn("p-3 rounded-2xl shadow-inner", isLight ? "bg-indigo-50 border border-indigo-100" : "bg-indigo-500/10 border border-indigo-500/20")}>
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest", isLight ? "text-gray-700" : "text-gray-200")}>Recursive Governance Enforcement</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                    State transitions committed in this matrix are recursively propagated to the <span className="text-indigo-400 font-bold">Identity Cache</span>.
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
